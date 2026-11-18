import { useTheme } from '@/theme/ThemeProvider'
import { CommandCenterV3 } from './CommandCenterV3'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Gauge, Pencil, Plus, RotateCcw, Ship, MessageSquareText, Trash2, Wrench } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import type { Signal, SourceId, ValueType } from '@/data/types'
import { useNexus, useCurrentUser, useDb, useTenantUsers, useCtx, useVisibleSignals, useValue } from '@/store/useNexus'
import { DEMO_NOW, DEMO_TODAY } from '@/config/demoClock'
import { KPIS, KPI_BY_ID, defaultLayout, type KpiCtx } from '@/engine/kpis'
import { computeAudience } from '@/engine/audience'
import { impactOf } from '@/engine/scenarios'
import { shipmentDetail } from '@/engine/scenarios/shipment'
import { toolState } from '@/engine/scenarios/tooling'
import { changeOver, forecast30, latest, pct } from '@/engine/commodity'
import { addDays, daysBetween } from '@/engine/dates'
import { fmtDate, fmtDay, fmtInr, fmtNum, plural } from '@/engine/format'
import { getRole } from '@/engine/lookup'
import { totals, VALUE_TYPES } from '@/engine/valueLedger'
import { KpiTile } from '@/components/KpiTile'
import { openAssistant } from '@/components/assistantBus'
import { Modal } from '@/pages/ImpactExplorer'
import { Button, Card, cx, ModuleBadge, Num, SeverityBadge, SOURCE_LABEL, SourceChip, Tip, VALUE_TYPE_LABEL, ValueStatusBadge } from '@/components/ui/primitives'

export const VALUE_COLOR: Record<ValueType, string> = {
  hard: 'var(--accent)', avoidance: 'var(--info)', cash: 'var(--src-vendor)', revenue_protected: 'var(--src-rnd)', penalty_avoided: 'var(--attention)',
}

const isOpen = (status: string) => status !== 'resolved' && status !== 'dismissed'

export function CommandCenter() {
  const { ui } = useTheme()
  return ui === 'apple' ? <CommandCenterV3 /> : <CommandCenterClassic />
}

function CommandCenterClassic() {
  const db = useDb()
  const user = useCurrentUser()!
  const users = useTenantUsers()
  const ctx = useCtx()
  const signals = useVisibleSignals()
  const rt = useNexus((s) => s.signals)
  const value = useValue()
  const role = getRole(db, user.roleId)
  const leader = role.function === 'Leadership'
  const kctx: KpiCtx = { db, rt, value, users, user, ctx, signals }

  const risks = useMemo(() => signals
    .filter((s) => isOpen(rt[s.id].status) && (user.scope.all || computeAudience(db, users, s).some((r) => r.userId === user.id)))
    .map((s) => ({ s, impact: impactOf(db, s, rt[s.id].done, ctx) }))
    .sort((a, b) => (b.impact?.inrAtRisk ?? 0) - (a.impact?.inrAtRisk ?? 0) || sevRank(b.s) - sevRank(a.s)), [signals, rt, db, users, user, ctx])

  // "Needs you" uses the computed audience (same as the pop-up and the inbox); Top risks stays group-wide for leadership.
  const needs = risks.filter((r) => computeAudience(db, users, r.s).some((x) => x.userId === user.id)).sort((a, b) => sevRank(b.s) - sevRank(a.s) || (b.impact?.inrAtRisk ?? 0) - (a.impact?.inrAtRisk ?? 0))
  const critical = needs.filter((r) => r.s.severity === 'critical').length
  const brief = needs.length
    ? `${plural(needs.length, 'thing')} need${needs.length === 1 ? 's' : ''} you today${critical ? `, ${critical} critical` : ''}. Start with: ${needs[0].s.title}.`
    : 'Nothing open in your scope. Nexus is watching.'
  const hour = Number(DEMO_NOW.slice(11, 13)) // DEMO_NOW is written in IST
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const scope = user.scope.all ? 'All plants' : user.scope.plants.length ? `Plant ${user.scope.plants.join(', ')}` : 'Your scope'

  const kpiRow = <KpiRow kctx={kctx} />
  const riskRow = (
    <div className="grid gap-4 lg:grid-cols-3">
      <TopRisks risks={risks} leader={leader} />
      <Pulse signals={signals} />
    </div>
  )

  return (
    <>
      <section className="hero-panel relative mb-6 overflow-hidden rounded-2xl px-6 py-7 shadow-pop md:px-8">
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-3xl">
            <div className="text-xs font-medium tracking-[0.14em] text-on-brand-2 uppercase">{fmtDate(DEMO_TODAY)} · {db.tenant.name} · {scope}</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-brand md:text-4xl">{greeting}, {user.name.split(' ')[0]}</h1>
            <button onClick={() => openAssistant('What should I focus on today?')} className="mt-4 flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm backdrop-blur-sm" style={{ background: 'color-mix(in oklab, var(--on-brand) 10%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--on-brand) 18%, transparent)' }}>
              <MessageSquareText size={16} className="mt-0.5 shrink-0 text-on-brand" aria-hidden />
              <span className="text-on-brand"><span className="font-semibold">Nexus brief: </span>{brief}</span>
            </button>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs text-on-brand-2">{role.name}</span>
            <button onClick={() => openAssistant('What should I focus on today?')} className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-card transition hover:-translate-y-0.5" style={{ background: 'var(--on-brand)', color: 'var(--brand-panel)' }}><MessageSquareText size={15} /> Ask Nexus</button>
          </div>
        </div>
      </section>
      <div className="space-y-4">
        {leader ? <>{kpiRow}{riskRow}</> : <>{riskRow}{kpiRow}</>}
        <div className="grid gap-4 lg:grid-cols-3">
          <LaunchTimeline kctx={kctx} />
          <CommodityWatch />
        </div>
        <ValueRow />
      </div>
    </>
  )
}

const sevRank = (s: Signal) => ({ critical: 3, high: 2, medium: 1, low: 0 })[s.severity]

function KpiRow({ kctx }: { kctx: KpiCtx }) {
  const role = getRole(kctx.db, kctx.user.roleId)
  const updateUser = useNexus((s) => s.updateUser)
  const layout = kctx.user.kpiLayout?.filter((id) => KPI_BY_ID.has(id)) ?? defaultLayout(role.defaultKpis)
  const [editing, setEditing] = useState(false)
  return (
    <section aria-label="Key figures">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-wide text-ink-3 uppercase">Your dashboard</h2>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil size={13} /> Edit dashboard</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {layout.map((id) => { const d = KPI_BY_ID.get(id)!; return <KpiTile key={id} def={d} result={d.compute(kctx)} compact={layout.length > 4} /> })}
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit dashboard" description="Add, remove and reorder tiles. Saved to your profile.">
        <EditLayout layout={layout} onChange={(l) => updateUser(kctx.user.id, { kpiLayout: l })} onReset={() => updateUser(kctx.user.id, { kpiLayout: undefined })} />
      </Modal>
    </section>
  )
}

function EditLayout({ layout, onChange, onReset }: { layout: string[]; onChange: (l: string[]) => void; onReset: () => void }) {
  const move = (i: number, d: number) => { const l = [...layout]; [l[i], l[i + d]] = [l[i + d], l[i]]; onChange(l) }
  const available = KPIS.filter((k) => !layout.includes(k.id))
  return (
    <div className="mt-4 space-y-4">
      <ul className="space-y-1">
        {layout.map((id, i) => (
          <li key={id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm">
            <span className="flex-1 truncate text-ink">{KPI_BY_ID.get(id)!.label}</span>
            <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-ink-3 hover:text-ink disabled:opacity-30"><ChevronUp size={15} /></button>
            <button aria-label="Move down" disabled={i === layout.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-ink-3 hover:text-ink disabled:opacity-30"><ChevronDown size={15} /></button>
            <button aria-label="Remove" onClick={() => onChange(layout.filter((x) => x !== id))} className="rounded p-1 text-ink-3 hover:text-critical"><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
      {available.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-ink-3">Add from the catalogue</div>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {available.map((k) => <button key={k.id} onClick={() => onChange([...layout, k.id])} className="inline-flex h-7 items-center gap-1 rounded-full border border-line px-2.5 text-xs text-ink-2 hover:border-accent hover:text-ink"><Plus size={12} /> {k.label}</button>)}
          </div>
        </div>
      )}
      <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={onReset}><RotateCcw size={13} /> Reset to role default</Button></div>
    </div>
  )
}

function TopRisks({ risks, leader }: { risks: { s: Signal; impact: ReturnType<typeof impactOf> }[]; leader: boolean }) {
  const users = useTenantUsers()
  return (
    <Card className="lg:col-span-2" title={leader ? 'Top risks across the group' : 'Your queue'} action={<Link to="/signals" className="text-xs text-accent-ink hover:underline">Signal Inbox</Link>} pad={false}>
      {risks.length === 0 && <p className="p-4 text-sm text-ink-2">Nothing open in your scope.</p>}
      <ol className="divide-y divide-line">
        {risks.slice(0, leader ? 5 : 6).map(({ s, impact }, i) => (
          <li key={s.id}>
            <Link to={`/signals/${s.id}`} className="flex gap-3 px-4 py-3 hover:bg-surface-2">
              <span className="num w-5 shrink-0 pt-0.5 text-xs text-ink-3">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5"><SeverityBadge s={s.severity} /><SourceChip id={s.sourceId} />
                  {s.entityRefs.filter((r) => r.kind === 'project' || r.kind === 'plant').slice(0, 3).map((r) => <span key={r.kind + r.id} className="inline-flex h-5 items-center rounded-md bg-surface-2 px-1.5 font-mono text-xs text-ink-2">{r.id}</span>)}
                </div>
                <div className="mt-1 truncate text-sm font-medium text-ink">{s.title}</div>
                <div className="mt-0.5 text-xs text-ink-3">Owner: {users.find((u) => u.id === s.ownerId)?.name ?? 'Unassigned'}{impact?.slipLabel && impact.slipDays ? ` · ${impact.slipLabel} ${impact.slipDays} days` : ''}</div>
              </div>
              {impact && (
                <div className="shrink-0 text-right">
                  <Num source={impact.inrSource} className={cx('font-semibold', impact.inrAtRisk ? 'text-critical' : 'text-ink', leader && 'text-base')}>{fmtInr(impact.inrAtRisk)}</Num>
                  <div className="max-w-36 truncate text-xs text-ink-3">{impact.inrLabel}</div>
                </div>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function Pulse({ signals }: { signals: Signal[] }) {
  const db = useDb()
  const rt = useNexus((s) => s.signals)
  const rows = db.tenant.modules.filter((m) => m.status !== 'Roadmap').map((m) => {
    const open = signals.filter((s) => s.sourceId === m.id && isOpen(rt[s.id].status))
    const health: 'critical' | 'attention' | 'ok' = open.some((s) => s.severity === 'critical') ? 'critical' : open.some((s) => s.severity === 'high') ? 'attention' : 'ok'
    return { m, open: open.length, health }
  })
  const TONE = { critical: ['bg-critical-bg text-critical', 'Critical'], attention: ['bg-attention-bg text-attention', 'Attention'], ok: ['bg-surface-2 text-ink-2', 'On track'] } as const
  return (
    <Card title="Cross-system pulse" action={<Link to="/sources" className="text-xs text-accent-ink hover:underline">Source Hub</Link>} pad={false}>
      <ul className="divide-y divide-line">
        {rows.map(({ m, open, health }) => (
          <li key={m.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
            <span className="size-2 shrink-0 rounded-full" style={{ background: `var(--src-${m.id as SourceId})` }} aria-hidden />
            <span className="flex-1 truncate text-ink">{m.id === 'sap' || m.id === 'datadrop' ? m.name : SOURCE_LABEL[m.id]}</span>
            <ModuleBadge s={m.status} />
            <span className="num w-14 text-right text-xs text-ink-3">{open ? `${open} open` : ''}</span>
            <span className={cx('inline-flex h-5 w-20 items-center justify-center rounded-full text-xs font-medium', TONE[health][0])}>{TONE[health][1]}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function LaunchTimeline({ kctx }: { kctx: KpiCtx }) {
  const { db, rt, signals } = kctx
  // Slip markers by cause, computed from open quantified signals.
  const markers = new Map<string, { cause: 'import' | 'tooling' | 'cost'; days: number; signalId: string }[]>()
  const push = (pid: string, m: { cause: 'import' | 'tooling' | 'cost'; days: number; signalId: string }) => markers.set(pid, [...(markers.get(pid) ?? []), m])
  for (const s of signals.filter((x) => isOpen(rt[x.id].status) && x.recommendations.length)) {
    if (s.type === 'shipment_delay') shipmentDetail(db, s, rt[s.id].done).projectSlips.forEach((p) => push(p.projectId, { cause: 'import', days: p.gate?.slipDays ?? p.slipDays, signalId: s.id }))
    if (s.type === 'tool_trial_fail') { const t = toolState(db, s, rt[s.id].done); push(t.feeds.id, { cause: 'tooling', days: t.gateSlip, signalId: s.id }) }
    if (s.type === 'commodity_spike') s.entityRefs.filter((r) => r.kind === 'project').forEach((r) => push(r.id, { cause: 'cost', days: 0, signalId: s.id }))
  }
  const projects = db.projects.filter((p) => p.nextGate || markers.has(p.id))
  const end = addDays(DEMO_TODAY, 45)
  const span = daysBetween(DEMO_TODAY, end)
  const x = (d: string) => `${Math.min(100, Math.max(0, (daysBetween(DEMO_TODAY, d) / span) * 100))}%`
  const ICON = { import: Ship, tooling: Wrench, cost: Gauge }
  return (
    <Card className="lg:col-span-2" title="Launch timeline" action={<span className="flex items-center gap-3 text-xs text-ink-3"><span className="inline-flex items-center gap-1"><Ship size={12} /> import</span><span className="inline-flex items-center gap-1"><Wrench size={12} /> tooling</span><span className="inline-flex items-center gap-1"><Gauge size={12} /> cost</span></span>}>
      {projects.length === 0 && <p className="text-sm text-ink-2">No projects with gates in this tenant yet.</p>}
      <div className="space-y-3">
        {projects.map((p) => {
          const ms = markers.get(p.id) ?? []
          const slip = Math.max(0, ...ms.map((m) => m.days))
          const forecast = p.nextGate ? addDays(p.nextGate.planned, slip) : undefined
          return (
            <div key={p.id} className="grid grid-cols-[minmax(0,14rem)_1fr] items-center gap-3">
              <Link to={`/projects/${p.id}`} className="min-w-0"><div className="truncate text-sm text-ink hover:text-accent-ink">{p.title}</div><div className="truncate font-mono text-xs text-ink-3">{p.id} · {p.stage}</div></Link>
              <div className="relative h-8 rounded-md bg-surface-2">
                {p.nextGate && <>
                  <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-line-strong" style={{ left: 0, width: x(p.nextGate.planned) }} />
                  <Tip text={`${p.nextGate.name} planned ${fmtDay(p.nextGate.planned)}`}><span tabIndex={0} className="absolute top-1 h-6 w-1 -translate-x-1/2 rounded bg-ink-2" style={{ left: x(p.nextGate.planned) }} /></Tip>
                  {slip > 0 && forecast && <>
                    <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-critical" style={{ left: x(p.nextGate.planned), width: `calc(${x(forecast)} - ${x(p.nextGate.planned)})` }} />
                    <Tip text={`Forecast ${fmtDay(forecast)}, +${slip} days`}><span tabIndex={0} className="absolute top-1 h-6 w-1 -translate-x-1/2 rounded bg-critical" style={{ left: x(forecast) }} /></Tip>
                  </>}
                </>}
                <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                  {ms.map((m, i) => { const I = ICON[m.cause]; return <Tip key={i} text={`${m.cause === 'cost' ? 'Cost pressure' : `${m.days} days gate slip`} from ${m.signalId}`}><Link to={`/signals/${m.signalId}`} className={cx('inline-flex size-6 items-center justify-center rounded-md', m.days > 0 ? 'bg-critical-bg text-critical' : 'bg-attention-bg text-attention')}><I size={13} /></Link></Tip> })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,14rem)_1fr] gap-3 text-xs text-ink-3"><span /><span className="flex justify-between"><span>{fmtDay(DEMO_TODAY)}</span><span>{fmtDay(end)}</span></span></div>
    </Card>
  )
}

function CommodityWatch() {
  const db = useDb()
  return (
    <Card title="Commodity watch" action={<span className="text-xs text-ink-3">30 days</span>} pad={false}>
      <ul className="divide-y divide-line">
        {db.commodities.map((c) => {
          const ch = changeOver(c, 30)
          const f = forecast30(c).mid
          const data = c.series.slice(-30).map((p) => ({ v: p.v }))
          const up = ch >= 0
          return (
            <li key={c.slug}>
              <Link to={`/commodities/${c.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                <div className="min-w-0 flex-1"><div className="truncate text-sm text-ink">{c.name}</div><div className="num text-xs text-ink-3">{fmtNum(latest(c))} {c.unit}</div></div>
                <div className="h-8 w-20" aria-hidden><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><Line type="monotone" dataKey="v" dot={false} strokeWidth={1.5} stroke={up ? 'var(--critical)' : 'var(--accent)'} /></LineChart></ResponsiveContainer></div>
                <Tip text={`30-day change ${pct(ch)}. Forecast mid ${pct(f)} over the next 30 days (Cost Engine).`}>
                  <span tabIndex={0} className="flex w-20 flex-col items-end">
                    <span className={cx('num text-sm font-medium', up ? 'text-critical' : 'text-ink')}>{pct(ch)}</span>
                    <span className="num inline-flex items-center gap-0.5 text-xs text-ink-3">{f >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{pct(f)}</span>
                  </span>
                </Tip>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function ValueRow() {
  const value = useValue()
  const users = useTenantUsers()
  const t = totals(value)
  const sum = VALUE_TYPES.reduce((a, k) => a + t.byType[k], 0)
  const wins = value.filter((e) => e.status !== 'identified').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3)
  return (
    <Card title="Value" action={<Link to="/value" className="text-xs text-accent-ink hover:underline">Value Ledger</Link>}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-baseline justify-between"><span className="text-xs text-ink-3">All value booked, by type</span><Num source="Value Ledger: all entries, all statuses" className="text-lg font-semibold text-ink">{fmtInr(sum)}</Num></div>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Value by type">
            {VALUE_TYPES.filter((k) => t.byType[k] > 0).map((k) => <div key={k} style={{ width: `${(t.byType[k] / (sum || 1)) * 100}%`, background: VALUE_COLOR[k] }} title={`${VALUE_TYPE_LABEL[k]} ${fmtInr(t.byType[k])}`} />)}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {VALUE_TYPES.map((k) => <li key={k} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: VALUE_COLOR[k] }} aria-hidden /><span className="flex-1 text-ink-2">{VALUE_TYPE_LABEL[k]}</span><span className="num text-ink">{fmtInr(t.byType[k])}</span></li>)}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-xs text-ink-3">Latest wins</div>
          <ul className="divide-y divide-line">
            {wins.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1"><div className="truncate text-ink">{e.lever}</div><div className="truncate text-xs text-ink-3">{VALUE_TYPE_LABEL[e.type]} · {users.find((u) => u.id === e.ownerId)?.name}</div></div>
                <ValueStatusBadge s={e.status} />
                <span className="num w-20 text-right font-semibold text-ink">{fmtInr(e.amountInr)}</span>
              </li>
            ))}
            {wins.length === 0 && <li className="py-2 text-sm text-ink-2">No value booked yet.</li>}
          </ul>
        </div>
      </div>
    </Card>
  )
}

