// Command Center, Nexus 3.0 direction (docs/DESIGN_SPEC_v3, section 2 bento and section 6 components).
// Every figure is computed by src/engine from the seed and the runtime store.
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Area, Bar, BarChart, ComposedChart, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis } from 'recharts'
import { Activity, Boxes, Gauge, Rocket, Wallet } from 'lucide-react'
import type { Recommendation, Signal, Severity } from '@/data/types'
import { useCtx, useCurrentUser, useDb, useNexus, useTenantUsers, useValue, useVisibleSignals } from '@/store/useNexus'
import { computeAudience } from '@/engine/audience'
import { impactOf, isQuantified, previewBooking } from '@/engine/scenarios'
import { shipmentDetail } from '@/engine/scenarios/shipment'
import { toolState } from '@/engine/scenarios/tooling'
import { KPI_BY_ID, type KpiCtx } from '@/engine/kpis'
import { delivered, validated } from '@/engine/valueLedger'
import { fmtDay, fmtDuration, fmtInr, fmtNum, plural, toInstant } from '@/engine/format'
import { getPart, getPlant, getProject, getRole, getShipment, getUser } from '@/engine/lookup'
import { DEMO_NOW } from '@/config/demoClock'
import { WorkflowDialog } from '@/components/WorkflowDialog'
import { ModuleIcon } from '@/components/ModuleIcon'
import { openAssistant } from '@/components/assistantBus'
import { cx, SimulatedTag, SOURCE_LABEL } from '@/components/ui/primitives'

const SEV_RANK: Record<Severity, number> = { critical: 3, high: 2, medium: 1, low: 0 }
const isOpen = (s: string) => s !== 'resolved' && s !== 'dismissed'

/** "₹ 57.6 L" -> currency, number and unit, so units can be set lighter (spec 4). */
function Money({ v, className }: { v: number; className?: string }) {
  const s = fmtInr(v)
  const m = s.match(/^(−?)₹ ([\d,.]+)(?: (L|Cr))?$/)
  if (!m) return <span className={cx('display', className)}>{s}</span>
  return <span className={cx('display', className)}>{m[1]}<span className="unit" style={{ marginLeft: 0, marginRight: '0.12em' }}>₹</span>{m[2]}{m[3] && <span className="unit">{m[3]}</span>}</span>
}

function Tile({ title, icon, iconColor, action, children, className }: { title?: string; icon?: typeof Gauge; iconColor?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  const Icon = icon
  return (
    <section className={cx('tile rounded-[24px] bg-surface p-6', className)}>
      {title && (
        <header className="mb-4 flex items-center gap-2.5">
          {Icon && <span className="inline-flex size-[26px] items-center justify-center rounded-[8px]" style={{ background: iconColor, color: 'white' }}><Icon size={15} strokeWidth={2.2} aria-hidden /></span>}
          <h2 className="flex-1 text-sm font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

const StatusTag = ({ tone, children, dot }: { tone: 'critical' | 'attention' | 'resolved' | 'neutral'; children: ReactNode; dot?: boolean }) => (
  <span className={cx('inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold', tone === 'critical' ? 'bg-critical-bg text-critical' : tone === 'attention' ? 'bg-attention-bg text-attention' : tone === 'resolved' ? 'bg-resolved-bg text-resolved' : 'bg-surface-2 text-ink-2')}>
    {dot && <span className="size-2 rounded-full" style={{ background: tone === 'critical' ? 'var(--critical-fill)' : tone === 'attention' ? 'var(--attention-fill)' : tone === 'resolved' ? 'var(--resolved-fill)' : 'var(--grey)' }} />}
    {children}
  </span>
)
const sevTone = (s: Severity) => (s === 'critical' ? 'critical' : s === 'high' ? 'attention' : 'neutral') as 'critical' | 'attention' | 'neutral'
const sevWord = (s: Severity) => s[0].toUpperCase() + s.slice(1)

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  const i = options.findIndex(([v]) => v === value)
  return (
    <div role="radiogroup" aria-label={label} className="relative grid rounded-[9px] bg-surface-2 p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span className="absolute top-0.5 bottom-0.5 rounded-[7px] bg-surface shadow-card transition-[left] duration-200" style={{ width: `calc((100% - 4px) / ${options.length})`, left: `calc(2px + ${i} * (100% - 4px) / ${options.length})`, transitionTimingFunction: 'cubic-bezier(.3,.7,.2,1)' }} aria-hidden />
      {options.map(([v, l]) => <button key={v} role="radio" aria-checked={v === value} onClick={() => onChange(v)} className={cx('relative z-10 h-7 px-3 text-[13px] transition-colors', v === value ? 'font-semibold text-ink' : 'text-ink-2')}>{l}</button>)}
    </div>
  )
}

export function CommandCenterV3() {
  const db = useDb()
  const ctx = useCtx()
  const user = useCurrentUser()!
  const users = useTenantUsers()
  const signals = useVisibleSignals()
  const rt = useNexus((s) => s.signals)
  const value = useValue()
  const kctx: KpiCtx = { db, rt, value, users, user, ctx, signals }
  const [wf, setWf] = useState<{ s: Signal; rec: Recommendation } | null>(null)

  const scoped = useMemo(() => signals.filter((s) => isOpen(rt[s.id].status) && (user.scope.all || computeAudience(db, users, s).some((r) => r.userId === user.id))), [signals, rt, db, users, user])
  const needs = useMemo(() => scoped.filter((s) => computeAudience(db, users, s).some((r) => r.userId === user.id)), [scoped, db, users, user])
  const withImpact = useMemo(() => scoped.map((s) => ({ s, i: impactOf(db, s, rt[s.id].done, ctx) })), [scoped, db, rt, ctx])
  const lead = [...(needs.length ? needs : scoped)].map((s) => ({ s, i: impactOf(db, s, rt[s.id].done, ctx) })).sort((a, b) => SEV_RANK[b.s.severity] - SEV_RANK[a.s.severity] || (b.i?.inrAtRisk ?? 0) - (a.i?.inrAtRisk ?? 0))[0]

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1>Command Center</h1>
          <p className="text-[13px] text-ink-2">{fmtDay(DEMO_NOW)} · {db.tenant.name} · {user.scope.all ? 'All plants' : user.scope.plants.length ? `Plant ${user.scope.plants.join(', ')}` : getRole(db, user.roleId).name} · {needs.length ? plural(needs.length, 'decision') + ' for you' : 'Nothing waiting for you'}</p>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">{lead ? <Hero s={lead.s} onApprove={(rec) => setWf({ s: lead.s, rec })} /> : <Tile><p className="text-ink-2">Nothing needs your decision. Nexus is watching {plural(signals.length, 'signal')}.</p></Tile>}</div>
        <div className="col-span-12 lg:col-span-4"><InPlay items={withImpact} kctx={kctx} /></div>
        <div className="col-span-12 lg:col-span-7"><ValueTile kctx={kctx} /></div>
        <div className="col-span-12 lg:col-span-5"><Launches kctx={kctx} /></div>
        <div className="col-span-12 lg:col-span-8"><SignalList items={withImpact} /></div>
        <div className="col-span-12 lg:col-span-4"><Systems /></div>
      </div>
      {wf && <WorkflowDialog signal={wf.s} rec={wf.rec} open onClose={() => setWf(null)} />}
    </div>
  )
}

// 6.1 Hero ----------------------------------------------------------------------------
type Stop = { name: string; delta?: string; meta: string; source?: boolean }
function heroFor(db: ReturnType<typeof useDb>, s: Signal, done: string[]): { headline: string; stops: Stop[] } {
  if (s.type === 'shipment_delay' && s.recommendations.length) {
    const d = shipmentDetail(db, s, done)
    const sh = getShipment(db, d.shipmentRef)
    const part = getPart(db, d.partCode)
    const slip = d.projectSlips[0]
    const stops: Stop[] = [
      { name: 'Shipment', delta: `+${d.delayDays} days`, meta: `${sh.ref} · ETA ${fmtDay(sh.etaPlanned)} → ${fmtDay(sh.etaRevised ?? sh.etaPlanned)}`, source: true },
      { name: `${getPlant(db, d.plant).name} stock`, delta: d.lineStopDays ? `${d.lineStopDays}-day gap` : 'covered', meta: `out ${fmtDay(d.stockOutDate)} · MARD-LABST` },
    ]
    if (slip) {
      stops.push({ name: slip.forStage, delta: `+${slip.slipDays} days`, meta: `${fmtDay(slip.plannedStart)} → ${fmtDay(slip.newStart)}` })
      if (slip.gate) stops.push({ name: slip.gate.name, delta: slip.gate.slipDays ? `+${slip.gate.slipDays} days` : 'holds', meta: `${fmtDay(slip.gate.planned)} · ${slip.gate.floatDays} days float` })
      const p = getProject(db, slip.projectId)
      if (p.customer) stops.push({ name: `${p.customer} launch`, delta: slip.gate?.slipDays ? 'at risk' : 'holds', meta: p.id })
    }
    const kind = part.commodityHierarchy.l3
    return { headline: `${kind} shipment rolled. ${slip ? `${slip.forStage} slips ${plural(slip.slipDays, 'day')}.` : `${d.lineStopDays}-day line stop.`}`, stops }
  }
  const stops: Stop[] = s.entityRefs.slice(0, 5).map((r, i) => ({ name: r.kind[0].toUpperCase() + r.kind.slice(1), meta: r.id, source: i === 0 }))
  return { headline: s.title, stops }
}

function Hero({ s, onApprove }: { s: Signal; onApprove: (rec: Recommendation) => void }) {
  const db = useDb()
  const ctx = useCtx()
  const rt = useNexus((x) => x.signals)[s.id]
  const i = impactOf(db, s, rt.done, ctx)
  const { headline, stops } = heroFor(db, s, rt.done)
  const fix = s.recommendations.filter((r) => !rt.done.includes(r.id)).map((rec) => {
    const b = previewBooking(db, s, rec, rt.done, ctx)
    return { rec, b, net: b.entries.reduce((a, e) => a + e.amountInr, 0) }
  }).sort((a, b) => b.net - a.net)[0]
  const owner = s.ownerId ? getUser(db.users, s.ownerId) : undefined
  return (
    <section className="tile rounded-[24px] bg-surface p-8" aria-label="Decision that needs you">
      <div className="flex flex-wrap items-center gap-2">
        <StatusTag tone={sevTone(s.severity)} dot>{sevWord(s.severity)} · Needs your decision</StatusTag>
        <span className="font-mono text-xs text-ink-2">{s.id} · {SOURCE_LABEL[s.sourceId]}</span>
        {rt.liveAt && <span className="text-xs font-semibold text-critical">Live</span>}
      </div>
      <h2 className="display mt-4 max-w-[22ch] text-[34px] leading-[38px] text-ink md:text-[46px] md:leading-[50px]">{headline}</h2>

      <div className="mt-6 rounded-[18px] p-5" style={{ background: 'color-mix(in oklab, var(--critical-fill) 7%, transparent)' }}>
        <div className="relative grid gap-4" style={{ gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))` }}>
          <span className="absolute top-[7px] h-0.5" style={{ left: `calc(100% / ${stops.length} / 2)`, right: `calc(100% / ${stops.length} / 2)`, background: 'var(--critical-fill)' }} aria-hidden />
          {stops.map((st) => (
            <div key={st.name} className="relative min-w-0 text-center">
              <span className={cx('relative mx-auto block size-4 rounded-full', st.source && rt.status === 'new' && 'pulse-live')} style={{ background: 'var(--critical-fill)', boxShadow: '0 0 0 4px color-mix(in oklab, var(--critical-fill) 7%, var(--surface))' }} aria-hidden />
              <div className="mt-3 truncate text-[15px] font-semibold text-ink">{st.name}</div>
              {st.delta && <div className="text-[13px] font-semibold text-critical">{st.delta}</div>}
              <div className="mt-0.5 truncate font-mono text-xs text-ink-2" title={st.meta}>{st.meta}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid items-end gap-5 md:grid-cols-[1fr_1.2fr_auto]">
        <div>
          <div className="text-[13px] text-ink-2">{i?.inrLabel ?? 'Impact'}</div>
          {i ? <span style={{ color: i.inrAtRisk > 0 ? 'var(--critical-fill)' : 'var(--text)' }}><Money v={i.inrAtRisk} className="block text-[56px] leading-[60px] md:text-[64px] md:leading-[64px]" /></span> : <span className="display text-[32px] text-ink-2">Not quantified</span>}
          {i && <div className="text-[13px] text-ink-2"><span style={{ color: 'var(--critical-fill)' }} className="sr-only">at risk</span>{i.inrFormula}</div>}
        </div>
        {fix ? (
          <div className="rounded-[16px] p-4" style={{ background: 'var(--resolved-bg)' }}>
            <div className="text-[13px] text-ink-2">Fix on the table</div>
            <div className="text-[15px] font-semibold text-ink">{fix.rec.title}</div>
            {fix.net > 0 && <Money v={fix.net} className="mt-1 block text-[32px] leading-[40px] text-resolved" />}
            <div className="text-[13px] text-ink-2">
              {fix.b.costInr > 0 && <>Cost {fmtInr(fix.b.costInr)} · </>}
              {(fix.b.before.slipDays ?? 0) > (fix.b.after.slipDays ?? 0) ? <>recovers {(fix.b.before.slipDays ?? 0) - (fix.b.after.slipDays ?? 0)} of {fix.b.before.slipDays} days · </> : (fix.b.before.unitsAtRisk ?? 0) > (fix.b.after.unitsAtRisk ?? 0) ? <>covers {fmtNum((fix.b.before.unitsAtRisk ?? 0) - (fix.b.after.unitsAtRisk ?? 0))} units · </> : null}
              action owner {getRole(db, fix.rec.ownerRoleId).name}{owner ? ` · signal owner ${owner.name}` : ''}
            </div>
          </div>
        ) : <div />}
        <div className="flex flex-col gap-2">
          {fix && <button onClick={() => onApprove(fix.rec)} className="h-11 rounded-full bg-accent-strong px-5 text-[15px] font-semibold text-on-accent transition-transform hover:bg-accent-strong-hover">Review and approve</button>}
          <button onClick={() => openAssistant(`Why is ${s.id} ${s.severity}?`, s.id)} className="h-11 rounded-full px-5 text-[15px] font-semibold text-ink" style={{ background: 'color-mix(in oklab, var(--grey) 16%, transparent)' }}>Ask Nexus</button>
          <Link to={`/signals/${s.id}`} className="text-center text-[13px] text-accent-ink hover:underline">Open the full impact ›</Link>
        </div>
      </div>
    </section>
  )
}

// In play --------------------------------------------------------------------------------
function InPlay({ items, kctx }: { items: { s: Signal; i: ReturnType<typeof impactOf> }[]; kctx: KpiCtx }) {
  const q = items.filter((x) => x.i && x.s.type !== 'pass_through')
  const bucket = (f: (s: Severity) => boolean) => q.filter((x) => f(x.s.severity))
  const groups = [
    { label: 'Critical', tone: 'var(--critical-fill)', list: bucket((s) => s === 'critical') },
    { label: 'High', tone: 'var(--attention-fill)', list: bucket((s) => s === 'high') },
    { label: 'Medium and low', tone: 'var(--grey)', list: bucket((s) => s === 'medium' || s === 'low') },
  ].map((g) => ({ ...g, inr: g.list.reduce((a, x) => a + (x.i?.inrAtRisk ?? 0), 0) }))
  const total = groups.reduce((a, g) => a + g.inr, 0)
  const lat = KPI_BY_ID.get('decision_latency')!.compute(kctx)
  return (
    <Tile title="In play, open signals" icon={Activity} iconColor="var(--attention-fill)" className="h-full">
      <div className="text-[13px] text-ink-2">₹ at risk across {plural(q.length, 'quantified signal')}</div>
      <Money v={total} className="block text-[56px] leading-[60px] text-ink" />
      <div className="mt-4 flex h-3 gap-[3px]" role="img" aria-label={groups.map((g) => `${g.label} ${fmtInr(g.inr)}`).join(', ')}>
        {groups.filter((g) => g.inr > 0).map((g) => <span key={g.label} className="h-full rounded-[6px]" style={{ flex: g.inr, background: g.tone }} />)}
      </div>
      <div className="mt-3 space-y-1.5">
        {groups.map((g) => (
          <div key={g.label} className="grid grid-cols-[12px_1fr_auto] items-center gap-2 text-[13px]">
            <span className="size-2 rounded-full" style={{ background: g.tone }} />
            <span className="text-ink-2">{g.label} <span className="num">({g.list.length})</span></span>
            <span className="num font-semibold text-ink">{fmtInr(g.inr)}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <div className="text-[13px] text-ink-2">Decision latency, median</div>
        <div className="display text-[32px] leading-[40px] text-ink">{lat.display}</div>
        <div className="text-[13px] text-ink-2">{lat.sub}. Vendor recoveries are tracked separately.</div>
      </div>
    </Tile>
  )
}

// Value delivered ------------------------------------------------------------------------
const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']
const MLABEL = (m: string) => new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(toInstant(`${m}-01`)))
function ValueTile({ kctx }: { kctx: KpiCtx }) {
  const [mode, setMode] = useState<'running' | 'month'>('running')
  const entries = kctx.value.filter((e) => e.status !== 'identified')
  let runV = 0
  let runA = 0
  const data = MONTHS.map((m) => {
    const inM = entries.filter((e) => e.at.slice(0, 7) === m)
    const v = inM.filter((e) => e.status === 'validated').reduce((a, e) => a + e.amountInr, 0) / 1e5
    const a = inM.filter((e) => e.status !== 'validated').reduce((x, e) => x + e.amountInr, 0) / 1e5
    runV += v; runA += a
    return { m: MLABEL(m), validated: Number(v.toFixed(2)), awaiting: Number(a.toFixed(2)), total: Number((runV + runA).toFixed(2)), runValidated: Number(runV.toFixed(2)) }
  })
  const d = delivered(kctx.value)
  const v = validated(kctx.value)
  const roi = KPI_BY_ID.get('roi')!.compute(kctx)
  const tip = { contentStyle: { background: 'var(--text)', color: 'var(--surface)', border: 'none', borderRadius: 10, fontSize: 12, padding: '6px 10px' }, itemStyle: { color: 'var(--surface)' }, labelStyle: { color: 'var(--surface)', fontWeight: 600 }, cursor: { stroke: 'var(--border)', fill: 'transparent' } }
  return (
    <Tile title="Value delivered, FY" icon={Wallet} iconColor="var(--resolved-fill)" className="h-full" action={<Segmented label="Chart view" value={mode} onChange={setMode} options={[['running', 'Running total'], ['month', 'By month']]} />}>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <div><div className="text-[13px] text-ink-2">Delivered FYTD</div><Money v={d} className="block text-[56px] leading-[60px] text-ink" /></div>
        <div className="pb-1.5 text-[13px] text-ink-2"><span className="num font-semibold text-resolved">{fmtInr(v)}</span> validated by Finance · <span className="num font-semibold text-ink">{roi.display}</span> {roi.sub}</div>
      </div>
      <div className="mt-4 h-44" role="img" aria-label={`Value by month: ${data.map((x) => `${x.m} ${x.validated + x.awaiting} lakh`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'running' ? (
            <ComposedChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
              <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--resolved-fill)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--resolved-fill)" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="m" tick={{ fill: 'var(--text-2)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <RTooltip {...tip} formatter={(n: number, k) => [`₹ ${n.toFixed(1)} L`, k === 'total' ? 'Delivered' : 'Validated']} />
              <Area type="monotone" dataKey="total" stroke="var(--resolved-fill)" strokeWidth={2.5} fill="url(#vg)" name="total" />
              <Line type="monotone" dataKey="runValidated" stroke="var(--text)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="runValidated" />
            </ComposedChart>
          ) : (
            <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
              <XAxis dataKey="m" tick={{ fill: 'var(--text-2)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <RTooltip {...tip} formatter={(n: number, k) => [`₹ ${n.toFixed(1)} L`, k === 'validated' ? 'Validated' : 'Awaiting SAP proof']} />
              <Bar dataKey="validated" stackId="a" fill="var(--resolved-fill)" name="validated" animationDuration={300} />
              <Bar dataKey="awaiting" stackId="a" fill="color-mix(in oklab, var(--resolved-fill) 35%, transparent)" radius={[6, 6, 0, 0]} name="awaiting" animationDuration={300} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-ink-2">
        {mode === 'running'
          ? <><span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: 'var(--resolved-fill)' }} />Delivered</span><span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--text)' }} />Validated</span></>
          : <><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: 'var(--resolved-fill)' }} />Validated</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: 'color-mix(in oklab, var(--resolved-fill) 35%, transparent)' }} />Awaiting SAP proof</span></>}
        <Link to="/value" className="ml-auto text-[13px] text-accent-ink hover:underline">Value Ledger ›</Link>
      </div>
    </Tile>
  )
}

// Launches: gate rails ------------------------------------------------------------------
const GATES = ['CE', 'PROTO', 'DV', 'PP', 'MP']
function Launches({ kctx }: { kctx: KpiCtx }) {
  const { db, rt, signals } = kctx
  const late = new Map<string, number>()
  for (const s of signals.filter((x) => isOpen(rt[x.id].status) && isQuantified(x))) {
    if (s.type === 'shipment_delay') shipmentDetail(db, s, rt[s.id].done).projectSlips.forEach((p) => p.gate && late.set(p.projectId, Math.max(late.get(p.projectId) ?? 0, p.gate.slipDays)))
    if (s.type === 'tool_trial_fail') { const t = toolState(db, s, rt[s.id].done); late.set(t.feeds.id, Math.max(late.get(t.feeds.id) ?? 0, t.gateSlip)) }
  }
  const projects = db.projects.filter((p) => p.type === 'RND' && p.nextGate).sort((a, b) => (late.get(b.id) ?? 0) - (late.get(a.id) ?? 0) || (a.nextGate!.planned < b.nextGate!.planned ? -1 : 1)).slice(0, 4)
  return (
    <Tile title="Launches" icon={Rocket} iconColor="var(--id-npd)" className="h-full">
      <div className="space-y-5">
        {projects.map((p) => {
          const cur = Math.max(0, GATES.indexOf(p.stage))
          const slip = late.get(p.id) ?? 0
          return (
            <Link key={p.id} to={`/projects/${p.id}`} className="block rounded-[14px] p-1 hover:bg-surface-2">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-semibold text-ink">{p.title}</div><div className="text-xs text-ink-2">{getPlant(db, p.plant).name} · {p.nextGate!.name} {fmtDay(p.nextGate!.planned)}</div></div>
                {slip > 0 ? <StatusTag tone="critical">Gate +{slip} days</StatusTag> : <StatusTag tone="neutral">On track</StatusTag>}
              </div>
              <div className="relative mt-3 grid grid-cols-5">
                <span className="absolute top-[7px] right-[10%] left-[10%] h-0.5" style={{ background: 'var(--border)' }} aria-hidden />
                {GATES.map((g, gi) => {
                  const state = gi < cur ? 'done' : gi === cur ? (slip > 0 ? 'late' : 'current') : 'future'
                  return (
                    <div key={g} className="relative text-center">
                      <span className="relative mx-auto block size-4 rounded-full" style={{
                        background: state === 'done' ? 'var(--resolved-fill)' : state === 'late' ? 'var(--critical-fill)' : 'var(--surface)',
                        border: state === 'current' ? '3px solid var(--accent)' : state === 'future' ? '2px solid var(--grey)' : 'none',
                        boxShadow: state === 'current' ? '0 0 0 4px var(--accent-soft)' : state === 'late' ? '0 0 0 4px var(--critical-bg)' : undefined,
                      }} aria-label={`${g}: ${state}`} />
                      <div className={cx('mt-1.5 text-xs', state === 'current' || state === 'late' ? 'font-semibold text-ink' : 'text-ink-2')}>{g}</div>
                    </div>
                  )
                })}
              </div>
            </Link>
          )
        })}
      </div>
    </Tile>
  )
}

// Open signals ---------------------------------------------------------------------------
function SignalList({ items }: { items: { s: Signal; i: ReturnType<typeof impactOf> }[] }) {
  const db = useDb()
  const [f, setF] = useState<'all' | 'critical' | 'high' | 'other'>('all')
  const list = items.filter((x) => f === 'all' || (f === 'other' ? SEV_RANK[x.s.severity] < 2 : x.s.severity === f))
    .sort((a, b) => SEV_RANK[b.s.severity] - SEV_RANK[a.s.severity] || (b.i?.inrAtRisk ?? 0) - (a.i?.inrAtRisk ?? 0))
  return (
    <Tile title="Open signals" icon={Gauge} iconColor="var(--critical-fill)" className="h-full" action={<Segmented label="Filter signals" value={f} onChange={setF} options={[['all', 'All'], ['critical', 'Critical'], ['high', 'High'], ['other', 'Other']]} />}>
      <div className="-mx-2">
        {list.slice(0, 9).map(({ s, i }) => {
          const owner = s.ownerId ? db.users.find((u) => u.id === s.ownerId) : undefined
          return (
            <Link key={s.id} to={`/signals/${s.id}`} className="grid grid-cols-[96px_1fr_112px] items-center gap-3 rounded-[14px] px-2 py-2.5 hover:bg-surface-2">
              <span><StatusTag tone={sevTone(s.severity)}>{sevWord(s.severity)}</StatusTag></span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold text-ink">{s.title}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-2"><ModuleIcon id={s.sourceId} />{SOURCE_LABEL[s.sourceId]} · {owner?.name ?? 'Unassigned'} · {fmtDuration(Math.max(0, toInstant(DEMO_NOW) - toInstant(s.raisedAt)))} ago</span>
              </span>
              <span className="text-right">{i ? <><span className="num block text-[17px] font-bold text-ink">{fmtInr(i.inrAtRisk)}</span><span className="block truncate text-xs text-ink-2">{i.inrLabel}</span></> : <span className="text-xs text-ink-2">Informational</span>}</span>
            </Link>
          )
        })}
        {list.length === 0 && <p className="px-2 py-6 text-center text-[13px] text-ink-2">Nothing open at this severity.</p>}
      </div>
      <Link to="/signals" className="mt-2 inline-block text-[13px] text-accent-ink hover:underline">Signal Inbox ›</Link>
    </Tile>
  )
}

// Systems --------------------------------------------------------------------------------
function Systems() {
  const db = useDb()
  const signals = useVisibleSignals()
  const rt = useNexus((s) => s.signals)
  const mods = db.tenant.modules.filter((m) => m.status !== 'Roadmap')
  return (
    <Tile title="Systems" icon={Boxes} iconColor="var(--id-rnd)" className="h-full" action={<SimulatedTag what="connections" />}>
      <div className="grid grid-cols-2 gap-2">
        {mods.map((m) => {
          const open = signals.filter((s) => s.sourceId === m.id && isOpen(rt[s.id].status))
          const worst = open.reduce<Severity | null>((w, s) => (!w || SEV_RANK[s.severity] > SEV_RANK[w] ? s.severity : w), null)
          const tone = worst === 'critical' ? 'var(--critical-fill)' : worst === 'high' ? 'var(--attention-fill)' : 'var(--resolved-fill)'
          return (
            <Link key={m.id} to={`/apps/${m.id}`} className="rounded-[14px] bg-surface-2 p-3 transition-colors hover:brightness-[0.98]">
              <div className="flex items-center gap-2"><ModuleIcon id={m.id} size={26} /><span className="truncate text-sm font-semibold text-ink">{m.name.replace(' connector', '')}</span></div>
              <div className="mt-2 flex items-center gap-1.5 text-xs"><span className="size-2 rounded-full" style={{ background: tone }} /><span className={worst === 'critical' ? 'text-critical' : worst === 'high' ? 'text-attention' : 'text-ink-2'}>{open.length ? `${plural(open.length, 'open signal')}` : 'Healthy'}</span></div>
            </Link>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-ink-2">Through SAP BTP and module APIs.</p>
    </Tile>
  )
}
