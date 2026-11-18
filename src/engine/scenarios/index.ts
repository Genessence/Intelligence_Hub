import type { Db, Recommendation, Signal, SignalType } from '@/data/types'
import { commodityScenario } from './commodity'
import { demandScenario } from './demand'
import { obsolescenceScenario } from './obsolescence'
import { passThroughScenario } from './passThrough'
import { qualityScenario } from './quality'
import { shipmentScenario } from './shipment'
import { toolingScenario, toolState } from './tooling'
import { shipmentDetail } from './shipment'
import { fmtInr } from '../format'
import type { Booking, RuntimeCtx, Scenario, ScenarioImpact } from './types'

const REGISTRY: Partial<Record<SignalType, Scenario>> = {
  shipment_delay: shipmentScenario,
  commodity_spike: commodityScenario,
  pass_through: passThroughScenario,
  ecn_obsolescence: obsolescenceScenario,
  supplier_quality: qualityScenario,
  tool_trial_fail: toolingScenario,
  demand_uplift: demandScenario,
}

/** Quantified only when a scenario exists and the signal has recommendations. */
export const isQuantified = (s: Signal) => !!REGISTRY[s.type] && s.recommendations.length > 0

export function impactOf(db: Db, s: Signal, done: string[], ctx: RuntimeCtx): ScenarioImpact | null {
  return isQuantified(s) ? REGISTRY[s.type]!.impact(db, s, done, ctx) : null
}

/** Gate slip one signal causes on each customer gate (after float), given its own actions. */
function gateSlips(db: Db, s: Signal, done: string[]): Map<string, number> {
  const out = new Map<string, number>()
  if (!s.recommendations.length) return out
  if (s.type === 'shipment_delay') shipmentDetail(db, s, done).projectSlips.forEach((p) => p.gate && out.set(p.projectId, Math.max(out.get(p.projectId) ?? 0, p.gate.slipDays)))
  if (s.type === 'tool_trial_fail') { const t = toolState(db, s, done); out.set(t.feeds.id, t.gateSlip) }
  return out
}

/** A gate slips by its worst open cause, not the sum, so a penalty is booked only on the change in that worst cause. */
function attributeGatePenalty(db: Db, s: Signal, rec: Recommendation, done: string[], ctx: RuntimeCtx, b: Booking): Booking {
  if (!b.entries.some((e) => e.type === 'penalty_avoided')) return b
  const own0 = gateSlips(db, s, done)
  const own1 = gateSlips(db, s, [...done, rec.id])
  const others = new Map<string, number>()
  for (const o of db.signals.filter((x) => x.id !== s.id)) {
    for (const [pid, d] of gateSlips(db, o, ctx.doneBySignal?.[o.id] ?? [])) others.set(pid, Math.max(others.get(pid) ?? 0, d))
  }
  let days = 0
  let rate = 0
  for (const [pid, before] of own0) {
    const other = others.get(pid) ?? 0
    const after = own1.get(pid) ?? 0
    days += Math.max(before, other) - Math.max(after, other)
    rate = rate || (db.projects.find((p) => p.id === pid)?.latePenaltyPerDayInr ?? 0)
  }
  const entries = b.entries.flatMap((e) => {
    if (e.type !== 'penalty_avoided') return [e]
    if (days <= 0 || !rate) return []
    return [{ ...e, amountInr: days * rate, formula: `${days} days customer gate slip avoided × ${fmtInr(rate)} per day (the gate moves by its worst open cause)` }]
  })
  const dropped = entries.length < b.entries.length
  return { ...b, entries, note: dropped ? `${b.note ? b.note + ' ' : ''}No gate penalty booked: another open signal still holds the same gate back.` : b.note }
}

export function previewBooking(db: Db, s: Signal, rec: Recommendation, done: string[], ctx: RuntimeCtx): Booking {
  const sc = REGISTRY[s.type]
  if (!sc) throw new Error(`No scenario for ${s.type}`)
  return attributeGatePenalty(db, s, rec, done, ctx, sc.book(db, s, rec, done, ctx))
}

export type { Booking, RuntimeCtx, ScenarioImpact } from './types'
