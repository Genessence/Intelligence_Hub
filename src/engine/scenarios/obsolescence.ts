// S7: ECN obsolescence. excess = stock + open qty − demand until cut-in; actions applied in the order they were done.
import type { Db, Recommendation, Signal } from '@/data/types'
import { DEMO_TODAY } from '@/config/demoClock'
import { addDays, daysBetween } from '../dates'
import { fmtDay, fmtInr, fmtNum } from '../format'
import { getPart, getProject, stockOf } from '../lookup'
import { type Booking, type DraftEntry, entryBase, type Scenario, type ScenarioImpact } from './types'

export function obsolescenceState(db: Db, s: Signal, done: string[]) {
  const ecn = getProject(db, s.entityRefs.find((r) => r.kind === 'project')!.id)
  const part = getPart(db, ecn.oldPart!)
  const plants = ecn.cutInPlants ?? [ecn.plant]
  const stock = plants.reduce((a, p) => a + stockOf(db, part.code, p).unrestricted, 0)
  const pos = db.purchaseOrders.filter((p) => p.lines.some((l) => l.material === part.code))
  const open0 = pos.reduce((a, p) => a + p.lines.filter((l) => l.material === part.code).reduce((x, l) => {
    const recv = db.goodsReceipts.filter((g) => g.ebeln === p.ebeln && g.material === part.code).reduce((y, g) => y + (g.movementType === '101' ? g.qty : g.movementType === '122' || g.movementType === '102' ? -g.qty : 0), 0)
    return x + Math.max(0, l.qty - recv)
  }, 0), 0)
  const daily = plants.reduce((a, p) => a + (part.plants.find((x) => x.plant === p)?.dailyUse ?? 0), 0)
  const price = part.plants.find((x) => x.plant === ecn.plant)!.movingPrice
  let cutIn = ecn.cutIn!
  let open = open0
  let onHand = stock
  let absorbed = 0
  const steps: { kind: Recommendation['kind']; unitsDelta: number; lever: string }[] = []
  const excessNow = () => Math.max(0, onHand + open - daily * Math.max(0, daysBetween(DEMO_TODAY, cutIn)) - absorbed)
  for (const id of done) {
    const r = s.recommendations.find((x) => x.id === id)
    if (!r) continue
    const e0 = excessNow()
    if (r.kind === 'reduce_po') open -= Math.min(open, e0)
    if (r.kind === 'move_cutin') cutIn = addDays(cutIn, Number(r.params.days))
    if (r.kind === 'return_to_vendor') onHand -= Math.min(onHand, e0)
    if (r.kind === 'service_spares') absorbed += Math.round(e0 * Number(r.params.servicePct))
    steps.push({ kind: r.kind, unitsDelta: e0 - excessNow(), lever: r.title })
  }
  const demand = daily * Math.max(0, daysBetween(DEMO_TODAY, cutIn))
  return { ecn, part, plants, stock, open0, open, daily, demand, price, cutIn, excess: excessNow(), steps }
}

function toImpact(db: Db, s: Signal, done: string[]): ScenarioImpact {
  const k = obsolescenceState(db, s, done)
  return {
    inrAtRisk: k.excess * k.price,
    inrLabel: 'Excess at risk of write-off',
    inrFormula: `${fmtNum(k.excess)} units × ${fmtInr(k.price, { compact: false })} moving price`,
    inrSource: 'Engine: SAP MARD-LABST + open EKPO-MENGE less GRN, minus demand to cut-in, × MBEW-VERPR',
    unitsAtRisk: k.excess,
    plants: k.plants,
    metrics: [
      { label: 'Stock of the old revision', value: `${fmtNum(k.stock)} units`, sap: 'MARD-LABST' },
      { label: 'Still to deliver on open POs', value: `${fmtNum(k.open)} units`, sap: 'EKPO-MENGE' },
      { label: `Demand until cut-in ${fmtDay(k.cutIn)}`, value: `${fmtNum(k.demand)} units`, source: `Engine: ${fmtNum(k.daily)} a day × days to cut-in` },
      { label: 'Excess', value: `${fmtNum(k.excess)} units`, tone: k.excess ? 'critical' : undefined },
    ],
  }
}

const TYPE: Partial<Record<Recommendation['kind'], { type: 'avoidance' | 'cash'; lever: string }>> = {
  reduce_po: { type: 'avoidance', lever: 'PO quantity reduced' },
  move_cutin: { type: 'avoidance', lever: 'Cut-in moved' },
  return_to_vendor: { type: 'cash', lever: 'Returned to vendor' },
  service_spares: { type: 'avoidance', lever: 'Moved to service spares' },
}

export const obsolescenceScenario: Scenario = {
  impact: (db, s, done) => toImpact(db, s, done),
  book(db, s, rec: Recommendation, done): Booking {
    const before = toImpact(db, s, done)
    const after = toImpact(db, s, [...done, rec.id])
    const k = obsolescenceState(db, s, [...done, rec.id])
    const step = k.steps[k.steps.length - 1]
    const t = TYPE[rec.kind]
    const entries: DraftEntry[] = []
    if (t && step && step.unitsDelta > 0) {
      entries.push({ ...entryBase(s, rec, k.ecn.plant), lever: t.lever, type: t.type, baseline: { kind: 'Write-off at cut-in', value: `${fmtNum(before.unitsAtRisk ?? 0)} units excess` }, formula: `${fmtNum(step.unitsDelta)} units × ${fmtInr(k.price, { compact: false })} moving price`, amountInr: step.unitsDelta * k.price, units: step.unitsDelta })
    }
    return { entries, costInr: 0, before, after, note: entries.length ? undefined : 'No excess left for this action to remove.' }
  },
}
