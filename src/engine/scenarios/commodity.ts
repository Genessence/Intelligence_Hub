// S1: commodity spike. Should-cost exposure on L4-matched parts; price lock and forward buy cover days of demand.
import type { Db, Part, Recommendation, Signal } from '@/data/types'
import { changeOver, commodityByName, forecast30, pct } from '../commodity'
import { fmtInr, fmtNum } from '../format'
import { getModel, getProject } from '../lookup'
import { type Booking, type DraftEntry, entryBase, type Scenario, type ScenarioImpact } from './types'

const HORIZON_DAYS = 75 // three months of working days
const SENSITIVITY = 0.3

const plantOf = (db: Db, s: Signal) => s.entityRefs.find((r) => r.kind === 'plant')?.id ?? db.plants[0].sapPlant
let PLANT = '1001' // set per computation; the scenario reads one plant's prices and demand
function affected(db: Db, s: Signal) {
  PLANT = plantOf(db, s)
  const name = s.entityRefs.find((r) => r.kind === 'commodity')!.id
  const c = commodityByName(db, name)
  const parts = db.parts.filter((p) => p.costModel?.commodity === c.slug && p.costModel.share >= SENSITIVITY && p.plants.some((x) => x.plant === PLANT && x.dailyUse > 0))
  return { c, parts }
}
const price = (p: Part) => p.plants.find((x) => x.plant === PLANT)!.movingPrice
const daily = (p: Part) => p.plants.find((x) => x.plant === PLANT)!.dailyUse

/** Days of demand already covered at today's price, per part, from completed actions. */
function coveredDays(s: Signal, done: string[], part: Part) {
  let d = 0
  for (const r of s.recommendations.filter((x) => done.includes(x.id))) {
    if (r.kind === 'price_lock') d += Number(r.params.months) * Number(r.params.workingDaysPerMonth)
    if (r.kind === 'forward_buy' && r.params.partCode === part.code) d += Number(r.params.months) * Number(r.params.workingDaysPerMonth)
  }
  return Math.min(HORIZON_DAYS, d)
}

function compute(db: Db, s: Signal, done: string[]) {
  const { c, parts } = affected(db, s)
  const change = changeOver(c, 14)
  const f = forecast30(c)
  const rows = parts.map((p) => {
    const share = p.costModel!.share
    const uncovered = HORIZON_DAYS - coveredDays(s, done, p)
    return { p, share, exposure: daily(p) * uncovered * price(p) * share * f.mid, covered: coveredDays(s, done, p) }
  })
  const project = s.entityRefs.find((r) => r.kind === 'project')
  const model = project ? getProject(db, project.id).productModelId : undefined
  const perUnit = model ? getModel(db, model).bom.reduce((a, b) => {
    const p = parts.find((x) => x.code === b.partCode)
    return p ? a + b.qtyPer * price(p) * p.costModel!.share * change : a
  }, 0) : 0
  const quarter = db.productModels.reduce((a, m) => a + 3 * m.decemberPlanUnits * m.bom.reduce((x, b) => {
    const p = parts.find((y) => y.code === b.partCode)
    return p ? x + b.qtyPer * price(p) * p.costModel!.share * change : x
  }, 0), 0)
  return { c, change, f, rows, perUnit, quarter, model }
}

function toImpact(db: Db, s: Signal, done: string[]): ScenarioImpact {
  const k = compute(db, s, done)
  const total = k.rows.reduce((a, r) => a + r.exposure, 0)
  return {
    inrAtRisk: total,
    inrLabel: 'Forward cost exposure, next 3 months',
    inrFormula: `Σ daily use × uncovered days × price × ${k.c.name} share × forecast ${pct(k.f.mid)}`,
    inrSource: 'Engine: Cost Engine forecast × SAP MBEW-VERPR × MARC demand',
    plants: [PLANT],
    metrics: [
      { label: `${k.c.name}, 14 days`, value: pct(k.change), tone: 'critical', source: `Cost Engine: LME feed, ${k.c.unit}` },
      { label: 'Forecast, 30 days', value: `${pct(k.f.low)} to ${pct(k.f.high)}`, tone: 'attention', source: 'Cost Engine forecast band' },
      { label: 'Parts above sensitivity 0.3', value: fmtNum(k.rows.length), source: 'Amber Z-field L4 Commodity + should-cost breakdown' },
      ...(k.model ? [{ label: `Should-cost per unit, ${getModel(db, k.model).name.replace(/ Inverter.*| Split.*/, '')}`, value: `+${fmtInr(k.perUnit, { compact: false })}`, tone: 'attention' as const, source: 'Engine: Σ BOM qty × price × share × index change' }] : []),
      { label: 'Price already moved, this quarter\u2019s plan', value: fmtInr(k.quarter), source: 'Engine: should-cost delta per unit from the 14-day move × three months of planned units at this plant. Separate from the forward exposure above, which uses the forecast.' },
    ],
  }
}

export const commodityScenario: Scenario = {
  impact: (db, s, done) => toImpact(db, s, done),
  book(db, s, rec: Recommendation, done): Booking {
    const before = toImpact(db, s, done)
    const after = toImpact(db, s, [...done, rec.id])
    const delta = before.inrAtRisk - after.inrAtRisk
    const k = compute(db, s, done)
    const entries: DraftEntry[] = []
    const base = entryBase(s, rec, plantOf(db, s))
    if ((rec.kind === 'price_lock' || rec.kind === 'forward_buy') && delta > 0) {
      entries.push({ ...base, lever: rec.kind === 'price_lock' ? 'Price lock' : 'Forward buy', type: 'avoidance', baseline: { kind: 'Forecast price', value: `${k.c.name} ${pct(k.f.mid)} in 30 days` }, formula: `Locked quantity × price × ${k.c.name} share × ${pct(k.f.mid)} avoided`, amountInr: delta })
    }
    return { entries, costInr: 0, before, after, note: rec.kind === 'price_revision_notice' ? 'No value booked until the customer accepts the revision.' : rec.kind === 'rerun_shouldcost' ? 'No value booked. This sets the ceiling for PP Pricing.' : undefined }
  },
}

export const commodityRows = (db: Db, s: Signal, done: string[]) => compute(db, s, done)
