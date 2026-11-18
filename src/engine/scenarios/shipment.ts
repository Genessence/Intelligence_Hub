// S2: shipment delay. Marginal attribution: each action books only what it changes on top of earlier actions.
import type { Db, Recommendation, Signal } from '@/data/types'
import { DEMO_TODAY } from '@/config/demoClock'
import { addDays, daysBetween } from '../dates'
import { fmtDay, fmtInr, fmtNum, plural } from '../format'
import { getPlant, getProject } from '../lookup'
import { type Mitigation, NO_MITIGATION, type ShipmentImpact, shipmentImpact } from '../slipPropagation'
import { type Booking, type DraftEntry, entryBase, type Scenario, type ScenarioImpact } from './types'

function projectNeedQty(db: Db, s: Signal) {
  return s.entityRefs.filter((r) => r.kind === 'project').flatMap((r) => getProject(db, r.id).needs).reduce((a, n) => a + n.qty, 0)
}

export function mitigationFor(db: Db, s: Signal, done: string[]): Mitigation {
  const m: Mitigation = { ...NO_MITIGATION, inflows: [] }
  const recs = s.recommendations.filter((r) => done.includes(r.id))
  const resequenced = recs.some((r) => r.kind === 'resequence')
  for (const rec of recs) {
    if (rec.kind === 'resequence') m.stockDrawForProject += Number(rec.params.qty)
    if (rec.kind === 'alternate_supplier') m.inflows.push({ date: addDays(DEMO_TODAY, Number(rec.params.firstDeliveryDays)), qty: Number(rec.params.qty), label: 'Alternate supplier' })
    if (rec.kind === 'air_freight_partial') {
      const lands = addDays(DEMO_TODAY, Number(rec.params.transitDays))
      // The air partial serves the project build first, unless the build is already served from stock.
      const forProject = resequenced ? 0 : projectNeedQty(db, s)
      if (!resequenced) m.projectPartsArrive = lands
      m.inflows.push({ date: lands, qty: Math.max(0, Number(rec.params.qty) - forProject), label: 'Air partial' })
    }
  }
  return m
}

export const shipmentDetail = (db: Db, s: Signal, done: string[]) => shipmentImpact(db, s, mitigationFor(db, s, done))

function toImpact(db: Db, i: ShipmentImpact): ScenarioImpact {
  const slip = i.projectSlips[0]
  return {
    inrAtRisk: i.inrAtRisk,
    inrLabel: 'Revenue at risk',
    inrFormula: `${fmtNum(i.unitsAtRisk)} units × ${fmtInr(i.contributionPerUnit, { compact: false })} contribution`,
    inrSource: 'Engine: line-stop shortfall × contribution (EXIM ETA, SAP MARD-LABST, MARC-EISBE)',
    unitsAtRisk: i.unitsAtRisk,
    slipDays: i.maxSlipDays,
    slipLabel: slip ? `${slip.forStage} slip` : undefined,
    plants: [i.plant],
    metrics: [
      { label: 'Line stop', value: `${plural(i.lineStopDays, 'day')} (${fmtDay(i.stockOutDate)} to ${fmtDay(i.revisedArrival)})`, tone: i.lineStopDays ? 'critical' : undefined },
      { label: 'Units at risk', value: `${fmtNum(i.unitsAtRisk)}${i.unitsCovered ? ` (${fmtNum(i.unitsCovered)} covered)` : ''}`, source: 'Engine: units short by the revised arrival, less the original plan and units covered' },
      ...(slip ? [{ label: `${slip.forStage} slip`, value: plural(slip.slipDays, 'day'), tone: slip.slipDays ? ('critical' as const) : undefined, source: `Parts ready ${fmtDay(slip.readyRevised)}; ${slip.slotRule}: ${fmtDay(slip.newStart)}` }] : []),
      ...(slip?.gate ? [{ label: `${slip.gate.name} slip`, value: plural(slip.gate.slipDays, 'day'), tone: slip.gate.slipDays ? ('attention' as const) : undefined, source: `${plural(slip.gate.floatDays, 'day')} of float between the build and the ${slip.gate.name} on ${fmtDay(slip.gate.planned)}` }] : []),
      { label: 'Plants affected', value: `${getPlant(db, i.plant).name} (${i.plant})` },
    ],
  }
}

export const shipmentScenario: Scenario = {
  impact: (db, s, done) => toImpact(db, shipmentDetail(db, s, done)),
  book(db, s, rec: Recommendation, done): Booking {
    const b = shipmentDetail(db, s, done)
    const a = shipmentDetail(db, s, [...done, rec.id])
    const c = db.tenant.contributionPerUnitInr
    const unitsDelta = b.unitsAtRisk - a.unitsAtRisk
    const gateDelta = b.maxGateSlipDays - a.maxGateSlipDays
    const base = entryBase(s, rec, b.plant)
    const entries: DraftEntry[] = []
    const penaltyPerDay = s.entityRefs.filter((r) => r.kind === 'project').map((r) => getProject(db, r.id).latePenaltyPerDayInr ?? 0)[0] ?? 0
    let costInr = 0
    let costLabel: string | undefined
    let tradeOff: string | undefined
    const baseline = { kind: 'Line stop without action', value: `${fmtNum(b.unitsAtRisk)} units at risk` }
    if (rec.kind === 'air_freight_partial') {
      costInr = Number(rec.params.qty) * Number(rec.params.airCostPerUnitInr)
      costLabel = `Air freight (ZFR1): ${fmtNum(Number(rec.params.qty))} units × ${fmtInr(Number(rec.params.airCostPerUnitInr), { compact: false })}`
      const net = unitsDelta * c - costInr
      if (net > 0) entries.push({ ...base, lever: 'Air-freight partial', type: 'revenue_protected', baseline, formula: `${fmtNum(unitsDelta)} units × ${fmtInr(c, { compact: false })} contribution − ${fmtInr(costInr)} air freight`, amountInr: net, units: unitsDelta })
    }
    if (rec.kind === 'alternate_supplier' && unitsDelta > 0) {
      entries.push({ ...base, lever: 'Alternate supplier', type: 'revenue_protected', baseline, formula: `${fmtNum(unitsDelta)} units covered × ${fmtInr(c, { compact: false })} contribution`, amountInr: unitsDelta * c, units: unitsDelta })
    }
    if (rec.kind === 'resequence' && unitsDelta < 0) {
      tradeOff = `Drawing ${fmtNum(Number(rec.params.qty))} units from stock for the build adds ${fmtNum(-unitsDelta)} units at risk on the line (${fmtInr(-unitsDelta * c)}).`
    }
    // Penalty is booked only on the customer gate, after float, never on an internal milestone.
    if (gateDelta > 0 && penaltyPerDay > 0) {
      const g = b.projectSlips.find((x) => x.gate)?.gate
      entries.push({ ...base, lever: rec.kind === 'resequence' ? 'Re-sequenced build' : 'Gate protected', type: 'penalty_avoided', baseline: { kind: 'Customer launch LD clause (launch tied to the PP gate)', value: `${fmtInr(penaltyPerDay)} per day` }, formula: `${gateDelta} days ${g?.name ?? 'gate'} slip avoided × ${fmtInr(penaltyPerDay)} per day`, amountInr: gateDelta * penaltyPerDay })
    }
    return { entries, costInr, costLabel, tradeOff, before: toImpact(db, b), after: toImpact(db, a) }
  },
}

export const daysLate = (planned: string, revised: string) => Math.max(0, daysBetween(planned, revised))
