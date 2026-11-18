// Value Ledger (spec 7.4): seed history (amount = qty × rate − less) plus entries booked by workflows.
import type { Db, ValueEntry, ValueSeed, ValueStatus, ValueType } from '@/data/types'
import { DEMO_NOW } from '@/config/demoClock'
import type { Booking } from './scenarios'

export const seedAmount = (v: ValueSeed) => v.calc.qty * v.calc.rate - (v.calc.less ?? 0)

export const seedEntries = (db: Db): ValueEntry[] =>
  db.valueHistory.map((v) => ({ id: v.id, signalId: v.signalId, lever: v.lever, type: v.type, baseline: v.baseline, formula: v.formula, amountInr: seedAmount(v), ownerId: v.ownerId, plant: v.plant, status: v.status, evidence: v.evidence, sharedWith: [], at: v.at, validatedBy: v.validatedBy }))

export function stampEntries(p: Booking, ownerId: string, existingCount: number): ValueEntry[] {
  return p.entries.map((e, i) => ({ ...e, id: `VAL-FY27-${String(existingCount + i + 1).padStart(4, '0')}`, ownerId, at: DEMO_NOW }))
}

export const VALUE_TYPES: ValueType[] = ['hard', 'avoidance', 'cash', 'revenue_protected', 'penalty_avoided']
export const VALUE_STATUSES: ValueStatus[] = ['identified', 'committed', 'realised', 'validated']

export function totals(entries: ValueEntry[]) {
  const byType = Object.fromEntries(VALUE_TYPES.map((t) => [t, entries.filter((e) => e.type === t).reduce((a, e) => a + e.amountInr, 0)])) as Record<ValueType, number>
  const byStatus = Object.fromEntries(VALUE_STATUSES.map((s) => [s, entries.filter((e) => e.status === s).reduce((a, e) => a + e.amountInr, 0)])) as Record<ValueStatus, number>
  const total = entries.reduce((a, e) => a + e.amountInr, 0)
  return { byType, byStatus, total }
}

/** Value that counts as "delivered": committed or later (identified is only an estimate). */
export const delivered = (entries: ValueEntry[]) => entries.filter((e) => e.status !== 'identified').reduce((a, e) => a + e.amountInr, 0)
export const validated = (entries: ValueEntry[]) => entries.filter((e) => e.status === 'validated').reduce((a, e) => a + e.amountInr, 0)
