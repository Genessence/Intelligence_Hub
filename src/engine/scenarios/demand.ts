// S5: demand uplift from a data drop. Revenue is protected only when both constraints are covered:
// compressors (75-day import lead time) and fan-guard capacity (capex machine late).
import type { Db, Recommendation, Signal } from '@/data/types'
import { addDays, daysBetween } from '../dates'
import { fmtDay, fmtInr, fmtNum } from '../format'
import { getModel, partPlant } from '../lookup'
import { type Booking, type DraftEntry, entryBase, type RuntimeCtx, type Scenario, type ScenarioImpact } from './types'

export function demandState(db: Db, s: Signal, done: string[], ctx: RuntimeCtx) {
  const drop = db.dataDrops.find((d) => d.id === s.requiresDataDrop)!
  const ingested = ctx.dataDrops.includes(drop.id)
  const rows = drop.demand ?? []
  const uplift = ingested ? rows.reduce((a, r) => a + (r.forecast - r.baseline), 0) : 0
  const kinds = s.recommendations.filter((r) => done.includes(r.id)).map((r) => r.kind)
  const compCovered = kinds.includes('planned_prs') ? uplift : 0
  const fgCovered = kinds.includes('outsource_moulding') || kinds.includes('expedite_capex') ? uplift : 0
  const covered = Math.min(compCovered, fgCovered)
  const capex = db.capex.find((c) => c.no === s.entityRefs.find((r) => r.kind === 'capex')!.id)!
  const comp = partPlant(db, s.entityRefs.find((r) => r.kind === 'part')!.id, '1001')
  const firstMonth = rows[0]?.month ?? '2027-03'
  const orderBy = addDays(`${firstMonth}-01`, -comp.plannedDelivDays)
  const capacityLost = capex.enables!.capacityPerDay * daysBetween(capex.deliveryPlanned, capex.deliveryRevised ?? capex.deliveryPlanned)
  return { drop, ingested, rows, uplift, compCovered, fgCovered, covered, unitsAtRisk: uplift - covered, capex, comp, orderBy, capacityLost, model: rows[0] ? getModel(db, rows[0].productModelId) : undefined }
}

function toImpact(db: Db, s: Signal, done: string[], ctx: RuntimeCtx): ScenarioImpact {
  const k = demandState(db, s, done, ctx)
  const c = db.tenant.contributionPerUnitInr
  return {
    inrAtRisk: k.unitsAtRisk * c,
    inrLabel: 'Revenue at risk from the uplift',
    inrFormula: `${fmtNum(k.unitsAtRisk)} units × ${fmtInr(c, { compact: false })} contribution`,
    inrSource: `Engine: ${k.drop.fileName} (data drop), SAP MARC-PLIFZ, Capex delivery dates`,
    unitsAtRisk: k.unitsAtRisk,
    plants: ['1001', k.capex.plant],
    metrics: [
      ...k.rows.map((r) => ({ label: `Uplift ${r.month}`, value: `+${fmtNum(r.forecast - r.baseline)} units`, source: `${k.drop.fileName}: forecast ${fmtNum(r.forecast)} vs plan ${fmtNum(r.baseline)}` })),
      { label: 'Order compressors by', value: fmtDay(k.orderBy), tone: 'attention', sap: 'MARC-PLIFZ' },
      { label: 'Fan-guard capacity lost to the late machine', value: `${fmtNum(k.capacityLost)} parts`, source: `${k.capex.no}: ${fmtDay(k.capex.deliveryPlanned)} to ${fmtDay(k.capex.deliveryRevised ?? k.capex.deliveryPlanned)}` },
      { label: 'Compressors covered', value: k.compCovered ? 'Yes' : 'Not yet' },
      { label: 'Fan guards covered', value: k.fgCovered ? 'Yes' : 'Not yet' },
    ],
  }
}

export const demandScenario: Scenario = {
  impact: toImpact,
  book(db, s, rec: Recommendation, done, ctx): Booking {
    const before = toImpact(db, s, done, ctx)
    const after = toImpact(db, s, [...done, rec.id], ctx)
    const k = demandState(db, s, [...done, rec.id], ctx)
    const delta = (before.unitsAtRisk ?? 0) - (after.unitsAtRisk ?? 0)
    const c = db.tenant.contributionPerUnitInr
    const entries: DraftEntry[] = []
    if (delta > 0) entries.push({ ...entryBase(s, rec, '1001'), lever: 'Uplift supply secured', type: 'revenue_protected', baseline: { kind: 'Uplift without supply', value: `${fmtNum(before.unitsAtRisk ?? 0)} units` }, formula: `${fmtNum(delta)} units × ${fmtInr(c, { compact: false })} contribution (both constraints now covered)`, amountInr: delta * c, units: delta })
    const costInr = rec.kind === 'outsource_moulding' ? Number(rec.params.deltaPerUnitInr) * k.uplift : Number(rec.params.feeInr ?? 0)
    const missing = !k.compCovered ? 'compressors' : !k.fgCovered ? 'fan guards' : ''
    return { entries, costInr, costLabel: costInr ? (rec.kind === 'outsource_moulding' ? `Price delta: ${fmtNum(k.uplift)} parts × ${fmtInr(Number(rec.params.deltaPerUnitInr))}` : `Expedite fee: ${fmtInr(costInr)}`) : undefined, before, after, note: entries.length ? undefined : missing ? `Value books when ${missing} are also covered. Both constraints must be closed.` : 'Already covered by an earlier action.' }
  },
}
