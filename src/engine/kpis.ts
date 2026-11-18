// KPI catalogue (spec 7.5). Every KPI is computed from the seed and runtime state; nothing is typed in.
import type { Db, Signal, UserProfile, ValueEntry } from '@/data/types'
import type { SignalRuntime } from '@/store/useNexus'
import { computeAudience } from './audience'
import { impactOf, type RuntimeCtx } from './scenarios'
import { shipmentDetail } from './scenarios/shipment'
import { toolState } from './scenarios/tooling'
import { qualityState } from './scenarios/quality'
import { daysBetween } from './dates'
import { fmtDuration, fmtInr, fmtNum, toInstant } from './format'
import { delivered, validated } from './valueLedger'

export interface KpiCtx {
  db: Db
  rt: Record<string, SignalRuntime>
  value: ValueEntry[]
  users: UserProfile[]
  user: UserProfile
  ctx: RuntimeCtx
  signals: Signal[] // visible in tenant
}

export interface KpiResult { value: number; display: string; sub?: string; tone?: 'critical' | 'attention' | 'good' }
export interface KpiDef {
  id: string
  label: string
  unit: string
  sourceFields: string // provenance shown on hover
  goodDirection: 'up' | 'down'
  drill: string
  compute: (k: KpiCtx) => KpiResult
}

const open = (k: KpiCtx, s: Signal) => !['resolved', 'dismissed'].includes(k.rt[s.id]?.status)
const mine = (k: KpiCtx) => k.signals.filter((s) => open(k, s) && (k.user.scope.all || computeAudience(k.db, k.users, s).some((r) => r.userId === k.user.id)))
const impactSum = (k: KpiCtx, ss: Signal[]) => ss.reduce((a, s) => a + (impactOf(k.db, s, k.rt[s.id].done, k.ctx)?.inrAtRisk ?? 0), 0)
const median = (xs: number[]) => { if (!xs.length) return 0; const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)] }
const byType = (k: KpiCtx, types: ValueEntry['type'][]) => k.value.filter((e) => types.includes(e.type) && e.status !== 'identified').reduce((a, e) => a + e.amountInr, 0)

function projectSlips(k: KpiCtx) {
  const out = new Map<string, number>()
  for (const s of k.signals.filter((x) => open(k, x) && x.recommendations.length)) {
    if (s.type === 'shipment_delay') shipmentDetail(k.db, s, k.rt[s.id].done).projectSlips.forEach((p) => out.set(p.projectId, Math.max(out.get(p.projectId) ?? 0, p.gate?.slipDays ?? p.slipDays)))
    if (s.type === 'tool_trial_fail') { const t = toolState(k.db, s, k.rt[s.id].done); out.set(t.feeds.id, Math.max(out.get(t.feeds.id) ?? 0, t.gateSlip)) }
  }
  return out
}

export const KPIS: KpiDef[] = [
  { id: 'value_fytd', label: 'Value delivered FYTD', unit: '₹', goodDirection: 'up', drill: '/value', sourceFields: 'Value Ledger: committed, realised and validated entries', compute: (k) => { const v = delivered(k.value); return { value: v, display: fmtInr(v), sub: `${fmtInr(validated(k.value))} finance-validated`, tone: 'good' } } },
  { id: 'value_validated', label: 'Value validated FYTD', unit: '₹', goodDirection: 'up', drill: '/value', sourceFields: 'Value Ledger: finance-validated entries', compute: (k) => { const v = validated(k.value); return { value: v, display: fmtInr(v), tone: 'good' } } },
  { id: 'value_awaiting_validation', label: 'Value awaiting validation', unit: '₹', goodDirection: 'down', drill: '/value', sourceFields: 'Value Ledger: realised entries with SAP evidence', compute: (k) => { const v = k.value.filter((e) => e.status === 'realised').reduce((a, e) => a + e.amountInr, 0); return { value: v, display: fmtInr(v), sub: `${k.value.filter((e) => e.status === 'realised').length} entries`, tone: v ? 'attention' : undefined } } },
  { id: 'roi', label: 'ROI on Nexus', unit: '×', goodDirection: 'up', drill: '/value', sourceFields: 'Validated value ÷ annual subscription (tenant config)', compute: (k) => { const r = validated(k.value) / k.db.subscriptionFeeInr; return { value: r, display: `${r.toFixed(1)}×`, sub: `on ${fmtInr(k.db.subscriptionFeeInr)} a year`, tone: r >= 1 ? 'good' : undefined } } },
  { id: 'inr_at_risk', label: '₹ at risk, open signals', unit: '₹', goodDirection: 'down', drill: '/signals', sourceFields: 'Engine: impact of every open signal in your scope, each on its own horizon (shown on the signal). Money recoverable from vendors is excluded: it has its own KPI.', compute: (k) => { const ss = mine(k).filter((s) => s.type !== 'pass_through'); const v = impactSum(k, ss); return { value: v, display: fmtInr(v), sub: `${ss.filter((s) => s.recommendations.length).length} quantified signals`, tone: v ? 'critical' : undefined } } },
  { id: 'critical_open', label: 'Critical signals open', unit: '#', goodDirection: 'down', drill: '/signals', sourceFields: 'Signal Inbox: open, severity critical, in your scope', compute: (k) => { const n = mine(k).filter((s) => s.severity === 'critical').length; return { value: n, display: fmtNum(n), sub: `${mine(k).length} open in total`, tone: n ? 'critical' : undefined } } },
  { id: 'launches_at_risk', label: 'Launches at risk', unit: '#', goodDirection: 'down', drill: '/signals', sourceFields: 'Engine: gate slip after float from EXIM, Tooling and R&D', compute: (k) => { const m = projectSlips(k); const n = [...m.values()].filter((d) => d > 0).length; return { value: n, display: fmtNum(n), sub: n ? `worst gate slip ${Math.max(...m.values())} days` : 'all gates hold', tone: n ? 'critical' : 'good' } } },
  { id: 'gate_slip', label: 'Worst gate slip', unit: 'days', goodDirection: 'down', drill: '/signals', sourceFields: 'Engine: gate slip after float', compute: (k) => { const v = Math.max(0, ...projectSlips(k).values()); return { value: v, display: `${v} days`, tone: v ? 'attention' : 'good' } } },
  { id: 'shipments_delayed', label: 'Shipments delayed', unit: '#', goodDirection: 'down', drill: '/signals', sourceFields: 'EXIM: revised ETA later than planned', compute: (k) => { const d = k.db.shipments.filter((s) => s.etaRevised && s.etaRevised > s.etaPlanned); return { value: d.length, display: fmtNum(d.length), sub: `of ${k.db.shipments.length} in transit or booked`, tone: d.length ? 'attention' : 'good' } } },
  { id: 'commodity_exposure', label: 'Commodity exposure, 3 months', unit: '₹', goodDirection: 'down', drill: '/signals', sourceFields: 'Engine: Cost Engine forecast × SAP prices and demand', compute: (k) => { const v = impactSum(k, k.signals.filter((s) => s.type === 'commodity_spike' && open(k, s))); return { value: v, display: fmtInr(v), tone: v ? 'attention' : undefined } } },
  { id: 'pass_through_recoverable', label: 'Pass-through recoverable', unit: '₹', goodDirection: 'down', drill: '/signals', sourceFields: 'Engine: SAP EKPO-NETPR vs index-adjusted price × GRN quantity', compute: (k) => { const v = impactSum(k, k.signals.filter((s) => s.type === 'pass_through' && open(k, s))); return { value: v, display: fmtInr(v), tone: v ? 'attention' : undefined } } },
  { id: 'savings_vs_target', label: 'Savings vs target', unit: '%', goodDirection: 'up', drill: '/value', sourceFields: 'Value Ledger hard saving + cost avoidance ÷ tenant FY targets', compute: (k) => { const s = byType(k, ['hard', 'avoidance']); const t = Object.values(k.db.savingsTargetsInr).reduce((a, x) => a + x, 0); const p = t ? s / t : 0; return { value: p, display: `${(p * 100).toFixed(0)}%`, sub: `${fmtInr(s)} of ${fmtInr(t)}`, tone: p >= 0.5 ? 'good' : 'attention' } } },
  { id: 'price_lock_savings', label: 'Price-lock and forward-buy savings', unit: '₹', goodDirection: 'up', drill: '/value', sourceFields: 'Value Ledger: avoidance entries from price locks', compute: (k) => { const v = k.value.filter((e) => /lock|forward/i.test(e.lever) && e.status !== 'identified').reduce((a, e) => a + e.amountInr, 0); return { value: v, display: fmtInr(v), tone: 'good' } } },
  { id: 'decision_latency', label: 'Decision latency', unit: 'h', goodDirection: 'down', drill: '/signals', sourceFields: 'First system knew → first person acknowledged (median)', compute: (k) => {
    const before = median(k.signals.map((s) => toInstant(s.raisedAt) - toInstant(s.firstKnownAt)).filter((x) => x > 0))
    const after = median(k.signals.flatMap((s) => { const a = Object.values(k.rt[s.id]?.acks ?? {}).sort()[0]; return a ? [toInstant(a) - toInstant(s.raisedAt)] : [] }))
    return { value: after, display: after ? fmtDuration(after) : 'Not yet', sub: `was ${fmtDuration(before)} before Nexus routed it`, tone: 'good' }
  } },
  { id: 'supplier_ppm', label: 'Worst supplier rejection rate', unit: '%', goodDirection: 'down', drill: '/signals', sourceFields: 'SAP GRN: movement 103 + 122 over 101, last week', compute: (k) => { const s = k.signals.find((x) => x.type === 'supplier_quality' && x.recommendations.length); if (!s) return { value: 0, display: 'n/a' }; const q = qualityState(k.db, s, k.rt[s.id].done); return { value: q.rate, display: `${(q.rate * 100).toFixed(1)}%`, sub: q.vendor.name, tone: q.rate > 0.01 ? 'critical' : undefined } } },
  { id: 'qi_blocked_value', label: 'QI and blocked stock value', unit: '₹', goodDirection: 'down', drill: '/signals', sourceFields: 'SAP MARD-INSME + MARD-SPEME × MBEW-VERPR', compute: (k) => { const v = k.db.stock.reduce((a, st) => { const p = k.db.parts.find((x) => x.code === st.material)?.plants.find((x) => x.plant === st.plant); return a + (st.qualityInsp + st.blocked) * (p?.movingPrice ?? 0) }, 0); return { value: v, display: fmtInr(v) } } },
  { id: 'capex_util', label: 'Capex utilisation', unit: '%', goodDirection: 'up', drill: '/apps/capex', sourceFields: 'Capex: committed ÷ budget (FA codes ANLA / ANLC on capitalisation)', compute: (k) => { const b = k.db.capex.reduce((a, c) => a + c.budgetCr, 0); const c = k.db.capex.reduce((a, x) => a + x.committedCr, 0); const p = b ? c / b : 0; return { value: p, display: b ? `${(p * 100).toFixed(0)}%` : 'n/a', sub: b ? `₹ ${c.toFixed(2)} Cr of ₹ ${b.toFixed(2)} Cr` : undefined } } },
  { id: 'capex_on_time', label: 'Capex machines late', unit: '#', goodDirection: 'down', drill: '/apps/capex', sourceFields: 'Capex: revised delivery later than planned', compute: (k) => { const n = k.db.capex.filter((c) => c.deliveryRevised && c.deliveryRevised > c.deliveryPlanned).length; return { value: n, display: fmtNum(n), tone: n ? 'attention' : 'good' } } },
  { id: 'critical_below_cover', label: 'Critical parts below safety stock in 14 days', unit: '#', goodDirection: 'down', drill: '/signals', sourceFields: 'SAP MARC-KZKRI, MARD-LABST, MARC-EISBE, daily use', compute: (k) => {
    const plants = k.user.scope.all ? null : new Set(k.user.scope.plants)
    let n = 0
    for (const p of k.db.parts) for (const pp of p.plants) {
      if (!pp.criticalPart || !pp.dailyUse || (plants && !plants.has(pp.plant))) continue
      const st = k.db.stock.filter((s) => s.material === p.code && s.plant === pp.plant).reduce((a, s) => a + s.unrestricted, 0)
      if (st && (st - pp.safetyStock) / pp.dailyUse < 14) n++
    }
    return { value: n, display: fmtNum(n), tone: n ? 'critical' : 'good' }
  } },
  { id: 'obsolescence_avoided', label: 'Obsolescence avoided', unit: '₹', goodDirection: 'up', drill: '/value', sourceFields: 'Value Ledger: entries from ECN signals', compute: (k) => { const ids = new Set(k.signals.filter((s) => s.type === 'ecn_obsolescence').map((s) => s.id)); const v = k.value.filter((e) => e.signalId && ids.has(e.signalId)).reduce((a, e) => a + e.amountInr, 0); return { value: v, display: fmtInr(v), tone: 'good' } } },
  { id: 'penalty_avoided', label: 'Penalties avoided', unit: '₹', goodDirection: 'up', drill: '/value', sourceFields: 'Value Ledger: penalty avoided (LD, demurrage and detention)', compute: (k) => { const v = byType(k, ['penalty_avoided']); return { value: v, display: fmtInr(v), tone: 'good' } } },
  { id: 'revenue_protected', label: 'Revenue protected', unit: '₹', goodDirection: 'up', drill: '/value', sourceFields: 'Value Ledger: revenue protected', compute: (k) => { const v = byType(k, ['revenue_protected']); return { value: v, display: fmtInr(v), tone: 'good' } } },
  { id: 'blockers_open', label: 'Signals blocking projects', unit: '#', goodDirection: 'down', drill: '/signals', sourceFields: 'Open signals that reference a project in your scope', compute: (k) => { const n = mine(k).filter((s) => s.entityRefs.some((r) => r.kind === 'project')).length; return { value: n, display: fmtNum(n), tone: n ? 'attention' : 'good' } } },
  { id: 'stock_cover', label: 'Lowest cover on a critical part', unit: 'days', goodDirection: 'up', drill: '/signals', sourceFields: 'SAP MARD-LABST ÷ daily use, critical parts (MARC-KZKRI)', compute: (k) => {
    let best: { d: number; name: string } | null = null
    for (const p of k.db.parts) for (const pp of p.plants) {
      if (!pp.criticalPart || !pp.dailyUse) continue
      const st = k.db.stock.filter((s) => s.material === p.code && s.plant === pp.plant).reduce((a, s) => a + s.unrestricted, 0)
      if (!st) continue
      const d = Math.floor(st / pp.dailyUse)
      if (!best || d < best.d) best = { d, name: p.description }
    }
    return best ? { value: best.d, display: `${best.d} days`, sub: best.name, tone: best.d < 14 ? 'critical' : undefined } : { value: 0, display: 'n/a' }
  } },
  { id: 'days_to_cutin', label: 'Days to next ECN cut-in', unit: 'days', goodDirection: 'up', drill: '/signals', sourceFields: 'NPD: ECN cut-in dates', compute: (k) => { const c = k.db.projects.filter((p) => p.cutIn).map((p) => daysBetween('2026-11-16', p.cutIn!)).sort((a, b) => a - b)[0]; return { value: c ?? 0, display: c !== undefined ? `${c} days` : 'n/a' } } },
]

export const KPI_BY_ID = new Map(KPIS.map((k) => [k.id, k]))

const FALLBACK = ['value_fytd', 'inr_at_risk', 'critical_open', 'decision_latency']
/** Role default layout, keeping only KPIs that exist, padded to at least four. */
export function defaultLayout(ids: string[]) {
  const out = ids.filter((id) => KPI_BY_ID.has(id))
  for (const f of FALLBACK) if (out.length < 4 && !out.includes(f)) out.push(f)
  return out
}
