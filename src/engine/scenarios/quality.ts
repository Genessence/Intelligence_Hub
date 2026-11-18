// S4: supplier quality from SAP stock and GRN data (movement types 101, 103, 122) and stock (MARD-INSME, MARD-SPEME).
import type { Db, Recommendation, Signal } from '@/data/types'
import { fmtInr, fmtNum } from '../format'
import { getPart, getVendor, partPlant, stockOf } from '../lookup'
import { type Booking, type DraftEntry, entryBase, type Scenario, type ScenarioImpact } from './types'

export function qualityState(db: Db, s: Signal, done: string[]) {
  const part = getPart(db, s.entityRefs.find((r) => r.kind === 'part')!.id)
  const vendor = getVendor(db, s.entityRefs.find((r) => r.kind === 'vendor')!.id)
  const plant = s.entityRefs.find((r) => r.kind === 'plant')!.id
  const grs = db.goodsReceipts.filter((g) => g.material === part.code && g.vendorId === vendor.id && g.plant === plant)
  const weeks = [...new Set(grs.map((g) => g.postingDate))].sort().map((d) => {
    const w = grs.filter((g) => g.postingDate === d)
    const sum = (m: string) => w.filter((g) => g.movementType === m).reduce((a, g) => a + g.qty, 0)
    const received = sum('101')
    return { d, received, blocked: sum('103'), returned: sum('122'), rate: received ? (sum('103') + sum('122')) / received : 0 }
  })
  const rate = weeks[weeks.length - 1]?.rate ?? 0
  const pp = partPlant(db, part.code, plant)
  const st = stockOf(db, part.code, plant)
  const shift = s.recommendations.find((r) => r.kind === 'shift_share')!
  const p = shift.params
  const monthly = pp.dailyUse * Number(p.workingDaysPerMonth)
  const unitCost = pp.movingPrice + Number(p.reworkCostInr)
  const shifted = done.includes(shift.id) ? Number(p.share) : 0
  const effRate = rate * (1 - shifted) + Number(p.altRejectRate) * shifted
  const annualCost = monthly * Number(p.months) * effRate * unitCost
  const rtvDone = s.recommendations.some((r) => r.kind === 'return_to_vendor' && done.includes(r.id))
  const blockedValue = rtvDone ? 0 : st.blocked * pp.movingPrice
  return { part, vendor, plant, weeks, rate, effRate, pp, st, monthly, unitCost, annualCost, blockedValue, shiftParams: p }
}

const pctStr = (x: number) => `${(x * 100).toFixed(1)}%`

function toImpact(db: Db, s: Signal, done: string[]): ScenarioImpact {
  const k = qualityState(db, s, done)
  const first = k.weeks[0]?.rate ?? 0
  return {
    inrAtRisk: k.annualCost + k.blockedValue,
    inrLabel: 'Cost of poor quality, next 12 months',
    inrFormula: `${fmtNum(k.monthly)} a month × 12 × ${pctStr(k.effRate)} rejected × ${fmtInr(k.unitCost, { compact: false })}, plus blocked stock value`,
    inrSource: 'Engine: SAP GRN MSEG-BWART 103 and 122 over 101, MBEW-VERPR, MARD-SPEME',
    plants: [k.plant],
    metrics: [
      { label: 'Rejection rate, 6 weeks', value: `${pctStr(first)} to ${pctStr(k.rate)}`, tone: 'critical', sap: 'MSEG-BWART' },
      { label: 'In quality inspection', value: `${fmtNum(k.st.qualityInsp)} units`, sap: 'MARD-INSME' },
      { label: 'In blocked stock', value: `${fmtNum(k.st.blocked)} units`, sap: 'MARD-SPEME' },
      { label: 'Vendor', value: `${k.vendor.name} (${k.vendor.sapVendor})` },
    ],
  }
}

export const qualityScenario: Scenario = {
  impact: (db, s, done) => toImpact(db, s, done),
  book(db, s, rec: Recommendation, done): Booking {
    const before = toImpact(db, s, done)
    const after = toImpact(db, s, [...done, rec.id])
    const k = qualityState(db, s, done)
    const entries: DraftEntry[] = []
    const base = entryBase(s, rec, k.plant)
    if (rec.kind === 'return_to_vendor' && k.blockedValue > 0) {
      entries.push({ ...base, lever: 'Returned to vendor with debit note', type: 'cash', baseline: { kind: 'Blocked stock value', value: `${fmtNum(k.st.blocked)} units` }, formula: `${fmtNum(k.st.blocked)} units × ${fmtInr(k.pp.movingPrice, { compact: false })} moving price`, amountInr: k.blockedValue, units: k.st.blocked })
    }
    if (rec.kind === 'shift_share') {
      const delta = before.inrAtRisk - after.inrAtRisk
      if (delta > 0) entries.push({ ...base, lever: 'Share of business shifted', type: 'avoidance', baseline: { kind: 'Expected rejection cost', value: `${pctStr(k.rate)} rate, 12 months` }, formula: `${fmtNum(k.monthly)} a month × 12 × ${Number(k.shiftParams.share) * 100}% share × (${pctStr(k.rate)} − ${pctStr(Number(k.shiftParams.altRejectRate))}) × ${fmtInr(k.unitCost, { compact: false })}`, amountInr: delta })
    }
    return { entries, costInr: 0, before, after, note: entries.length ? undefined : rec.kind === 'hold_npd' ? 'No value booked. This stops new exposure before it starts.' : 'No value booked. The 8D drives the root cause.' }
  },
}
