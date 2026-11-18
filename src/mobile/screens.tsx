// The nine mobile screens (spec 7.3). Shared store and engine with the desktop app.
import { Thread, useChat, useLang } from '@/assistant/chat'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Fingerprint, Mic, Package, Send, MessageSquareText, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { EntityKind, Recommendation, Signal, ValueEntry } from '@/data/types'
import { useNexus, useCurrentUser, useDb, useTenantUsers, useVisibleSignals, useCtx, useValue } from '@/store/useNexus'
import { computeAudience } from '@/engine/audience'
import { impactOf, previewBooking, isQuantified } from '@/engine/scenarios'
import { shipmentDetail } from '@/engine/scenarios/shipment'
import { buildRipple, COLUMNS } from '@/engine/ripple'
import { KPI_BY_ID, defaultLayout, type KpiCtx } from '@/engine/kpis'
import { daysBetween } from '@/engine/dates'
import { fmtDay, fmtInr, fmtNum } from '@/engine/format'
import { getPart, getPlant, getRole, getShipment, getVendor, stockOf } from '@/engine/lookup'
import { useTheme, type ThemePref } from '@/theme/ThemeProvider'
import { BRAND } from '@/config/brand'
import { Logo } from '@/components/Shell'
import { Avatar, cx, SapRef, SeverityBadge, SimulatedTag, SourceChip, StatusBadge, VALUE_TYPE_LABEL } from '@/components/ui/primitives'
import { BottomSheet, SwipeRow, SwipeToApprove, tap } from './mobileUi'

export type Screen =
  | { name: 'lock'; signalId?: string }
  | { name: 'splash'; next?: Screen }
  | { name: 'today' }
  | { name: 'signals' }
  | { name: 'signal'; id: string }
  | { name: 'approvals' }
  | { name: 'ask' }
  | { name: 'me' }
  | { name: 'entity'; kind: EntityKind; id: string; back?: Screen }

interface Nav { go: (s: Screen) => void; phoneTheme?: ThemePref; setPhoneTheme?: (t: ThemePref) => void }
export const NavCtx = createContext<Nav>({ go: () => {} })
const useNav = () => useContext(NavCtx)

const isOpen = (status: string) => status !== 'resolved' && status !== 'dismissed'

/** Signals in my computed audience (leadership: all open). */
export function useMySignals() {
  const db = useDb()
  const user = useCurrentUser()
  const users = useTenantUsers()
  const signals = useVisibleSignals()
  const rt = useNexus((s) => s.signals)
  return useMemo(() => (user ? signals.filter((s) => computeAudience(db, users, s).some((r) => r.userId === user.id) || rt[s.id]?.assignee === user.id) : []), [db, users, signals, user, rt])
}

function Header({ title, back, right }: { title: string; back?: Screen; right?: React.ReactNode }) {
  const { go } = useNav()
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 px-4">
      {back && <button onClick={() => go(back)} className={cx('-ml-2 flex size-11 items-center justify-center rounded-full text-ink-2', tap)} aria-label="Back"><ArrowLeft size={20} /></button>}
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">{title}</h1>
      {right}
    </div>
  )
}

// 1. Lock screen push ----------------------------------------------------
export function LockScreen({ signalId }: { signalId?: string }) {
  const { go } = useNav()
  const db = useDb()
  const mine = useMySignals()
  const s = (signalId && db.signals.find((x) => x.id === signalId)) || mine.find((x) => x.severity === 'critical') || mine[0]
  return (
    <div className="flex h-full flex-col items-center px-4 pt-10 text-center" style={{ background: 'linear-gradient(180deg, var(--accent-strong), var(--surface-2))' }}>
      <div className="num text-6xl font-light text-on-accent">9:41</div>
      <div className="mt-1 text-sm text-on-accent">Monday, {fmtDay('2026-11-16')}</div>
      {s && (
        <button onClick={() => go({ name: 'splash', next: { name: 'signal', id: s.id } })} className={cx('page-enter mt-10 w-full rounded-2xl border border-line bg-surface p-3 text-left shadow-pop', tap)} aria-label={`Open notification: ${s.title}`}>
          <div className="flex items-center gap-2 text-xs text-ink-3"><Logo size={18} /> <span className="font-medium text-ink-2">{BRAND.product}</span><span className="ml-auto">now</span></div>
          <div className="mt-1.5 text-sm font-semibold text-ink">{s.severity === 'critical' ? 'Critical' : 'Signal'}: {s.title}</div>
          <div className="mt-0.5 line-clamp-2 text-sm text-ink-2">{s.summary}</div>
        </button>
      )}
      <div className="mt-auto mb-8 text-xs text-ink-2">Tap the notification to open</div>
    </div>
  )
}

// 2. Splash + biometric ---------------------------------------------------
export function Splash({ next }: { next?: Screen }) {
  const { go } = useNav()
  useEffect(() => { const t = setTimeout(() => go(next ?? { name: 'today' }), 1300); return () => clearTimeout(t) }, [go, next])
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-surface">
      <Logo size={64} />
      <div className="text-xl font-semibold text-ink">{BRAND.full}</div>
      <div className="flex flex-col items-center gap-2 text-ink-2">
        <Fingerprint size={44} className="animate-pulse text-accent" />
        <span className="text-sm">Biometric sign-in</span>
        <SimulatedTag what="biometric sign-in" />
      </div>
    </div>
  )
}

// 3. Today ----------------------------------------------------------------
export function Today() {
  const { go } = useNav()
  const db = useDb()
  const user = useCurrentUser()!
  const users = useTenantUsers()
  const signals = useVisibleSignals()
  const rt = useNexus((s) => s.signals)
  const value = useValue()
  const ctx = useCtx()
  const mine = useMySignals().filter((s) => isOpen(rt[s.id].status) && !rt[s.id].snoozed)
  const role = getRole(db, user.roleId)
  const ids = (user.kpiLayout ?? defaultLayout(role.defaultKpis)).slice(0, 3)
  const kctx: KpiCtx = { db, rt, value, users, user, ctx, signals }
  const needs = mine.filter((s) => !rt[s.id].acks[user.id]).sort((a, b) => sev(a) - sev(b))
  return (
    <div className="pb-4">
      <div className="px-4 pt-2">
        <div className="text-sm text-ink-3">{fmtDay('2026-11-16')} · {db.tenant.name}</div>
        <h1 className="text-2xl font-semibold text-ink">Good morning, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2"><MessageSquareText size={14} className="text-accent" /> {needs.length ? `${needs.length} ${needs.length === 1 ? 'thing needs' : 'things need'} you today.` : 'Nothing new needs you today.'}</p>
      </div>
      <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2" aria-label="Key figures">
        {ids.map((id) => {
          const k = KPI_BY_ID.get(id)!
          const r = k.compute(kctx)
          return (
            <div key={id} className="w-[78%] shrink-0 snap-start rounded-2xl border border-line bg-surface p-4 shadow-card">
              <div className="text-xs text-ink-3">{k.label}</div>
              <div className={cx('num mt-1 text-3xl font-semibold', r.tone === 'critical' ? 'text-critical' : r.tone === 'attention' ? 'text-attention' : 'text-ink')}>{r.display}</div>
              {r.sub && <div className="mt-1 truncate text-xs text-ink-2">{r.sub}</div>}
              <div className="mt-2 text-[12px] text-ink-3">{k.sourceFields}</div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 px-4">
        <div className="mb-2 text-xs font-medium tracking-wide text-ink-3 uppercase">Needs you</div>
        <div className="space-y-2">
          {needs.slice(0, 5).map((s) => <SignalCard key={s.id} s={s} onOpen={() => go({ name: 'signal', id: s.id })} />)}
          {needs.length === 0 && <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2">You are up to date.</p>}
        </div>
      </div>
    </div>
  )
}
const sev = (s: Signal) => ['critical', 'high', 'medium', 'low'].indexOf(s.severity)

function SignalCard({ s, onOpen }: { s: Signal; onOpen: () => void }) {
  const db = useDb()
  const ctx = useCtx()
  const rt = useNexus((x) => x.signals[s.id])
  const imp = impactOf(db, s, rt.done, ctx)
  return (
    <button onClick={onOpen} className={cx('flex w-full min-h-11 items-start gap-3 rounded-2xl border border-line bg-surface p-3 text-left', tap)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5"><SeverityBadge s={s.severity} /><SourceChip id={s.sourceId} />{rt.liveAt && <span className="rounded-full bg-critical-bg px-2 text-xs font-medium text-critical">Live</span>}</div>
        <div className="mt-1 line-clamp-2 text-sm font-semibold text-ink">{s.title}</div>
        {imp && <div className="num mt-0.5 text-xs text-ink-2">{imp.inrLabel}: <span className={imp.inrAtRisk ? 'font-semibold text-critical' : ''}>{fmtInr(imp.inrAtRisk)}</span></div>}
      </div>
      <ChevronRight size={18} className="mt-1 shrink-0 text-ink-3" />
    </button>
  )
}

// 4. Signals feed ----------------------------------------------------------
export function SignalsFeed() {
  const { go } = useNav()
  const rt = useNexus((s) => s.signals)
  const { acknowledge, snooze } = useNexus()
  const user = useCurrentUser()!
  const mine = useMySignals().filter((s) => isOpen(rt[s.id].status) && !rt[s.id].snoozed).sort((a, b) => sev(a) - sev(b))
  const [pull, setPull] = useState(0)
  const [loading, setLoading] = useState(false)
  const [start, setStart] = useState<number | null>(null)
  const release = () => { if (pull > 70) { setLoading(true); setTimeout(() => setLoading(false), 700) } setPull(0); setStart(null) }
  return (
    <div onPointerDown={(e) => { if ((e.currentTarget.parentElement?.scrollTop ?? 0) <= 0) setStart(e.clientY) }} onPointerMove={(e) => start !== null && setPull(Math.max(0, Math.min(100, e.clientY - start)))} onPointerUp={release} onPointerLeave={() => start !== null && release()}>
      <Header title="Signals" right={<span className="text-xs text-ink-3">{mine.length} open</span>} />
      <div style={{ height: pull ? pull / 2 : 0 }} className="flex items-center justify-center overflow-hidden text-xs text-ink-3">{pull > 70 ? 'Release to refresh' : 'Pull to refresh'}</div>
      <p className="px-4 pb-2 text-xs text-ink-3">Swipe right to acknowledge, left to snooze.</p>
      <div className="space-y-2 px-4 pb-4">
        {loading ? [0, 1, 2].map((i) => <div key={i} className="skeleton h-20" />) : mine.map((s) => (
          <SwipeRow key={s.id} rightLabel="Acknowledge" leftLabel="Snooze"
            onSwipeRight={() => { acknowledge(s.id); toast('Acknowledged') }}
            onSwipeLeft={() => { snooze(s.id); toast('Snoozed until tomorrow 09:00 IST') }}>
            <div className="relative">
              {!rt[s.id].acks[user.id] && <span className="absolute top-4 left-1 size-2 rounded-full bg-accent" aria-label="Unread" />}
              <SignalCard s={s} onOpen={() => go({ name: 'signal', id: s.id })} />
            </div>
          </SwipeRow>
        ))}
        {!loading && mine.length === 0 && <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2">No open signals in your scope.</p>}
      </div>
    </div>
  )
}

// 5. Signal detail -----------------------------------------------------------
export function SignalDetail({ id }: { id: string }) {
  const { go } = useNav()
  const db = useDb()
  const ctx = useCtx()
  const users = useTenantUsers()
  const user = useCurrentUser()!
  const s = db.signals.find((x) => x.id === id)
  const rt = useNexus((x) => x.signals[id])
  const { acknowledge } = useNexus()
  const [rec, setRec] = useState<Recommendation | null>(null)
  if (!s || !rt) return <div className="p-4 text-sm text-ink-2">Signal not found in this tenant.</div>
  const imp = impactOf(db, s, rt.done, ctx)
  const audience = computeAudience(db, users, s)
  const ship = s.type === 'shipment_delay' && isQuantified(s) ? shipmentDetail(db, s, rt.done) : undefined
  const ripple = buildRipple(db, s, audience, users, ship ? shipmentDetail(db, s, []) : undefined)
  const part = s.entityRefs.find((r) => r.kind === 'part')?.id
  return (
    <div className="pb-6">
      <Header title={s.id} back={{ name: 'signals' }} />
      <div className="space-y-4 px-4">
        <div>
          <div className="flex flex-wrap gap-1.5"><SeverityBadge s={s.severity} /><SourceChip id={s.sourceId} /><StatusBadge s={rt.status} /></div>
          <h2 className="mt-2 text-lg font-semibold text-ink">{s.title}</h2>
          <p className="mt-1 text-sm text-ink-2">{s.summary}</p>
        </div>
        {ship && <StageRail s={s} />}
        {imp && (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="text-xs text-ink-3">{imp.inrLabel}</div>
            <div className={cx('num text-3xl font-semibold', imp.inrAtRisk ? 'text-critical' : 'text-ink')}>{fmtInr(imp.inrAtRisk)}</div>
            <div className="num mt-0.5 text-xs text-ink-2">{imp.inrFormula}</div>
            <dl className="mt-3 divide-y divide-line">
              {imp.metrics.slice(0, 5).map((m) => <div key={m.label} className="flex justify-between gap-3 py-2 text-sm"><dt className="text-ink-2">{m.label}</dt><dd className={cx('num text-right', m.tone === 'critical' ? 'text-critical' : m.tone === 'attention' ? 'text-attention' : 'text-ink')}>{m.value}</dd></div>)}
            </dl>
          </div>
        )}
        <div>
          <div className="mb-2 text-xs font-medium tracking-wide text-ink-3 uppercase">Ripple</div>
          <ol className="relative space-y-3 border-l border-line pl-4">
            {COLUMNS.map((c, i) => {
              const nodes = ripple.nodes.filter((n) => n.col === i)
              if (!nodes.length) return null
              return (
                <li key={c}>
                  <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full" style={{ background: i === 0 ? 'var(--critical)' : 'var(--accent)' }} aria-hidden />
                  <div className="text-xs font-medium text-ink-3">{c}</div>
                  {nodes.map((n) => (
                    <button key={n.id} disabled={n.kind !== 'part' && n.kind !== 'shipment' && n.kind !== 'vendor'} onClick={() => go({ name: 'entity', kind: n.kind as EntityKind, id: n.id.split(':').slice(1).join(':'), back: { name: 'signal', id } })} className="mt-1 block w-full truncate text-left text-sm text-ink disabled:cursor-default">
                      {n.kind === 'people' ? <span className="inline-flex items-center gap-1.5"><Users size={13} className="text-ink-3" />{n.label}: {n.sub}</span> : <>{n.label} <span className="text-ink-3">· {n.sub}</span></>}
                    </button>
                  ))}
                </li>
              )
            })}
          </ol>
        </div>
        {part && <button onClick={() => go({ name: 'entity', kind: 'part', id: part, back: { name: 'signal', id } })} className={cx('flex min-h-11 w-full items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm text-ink', tap)}><Package size={16} className="text-ink-3" /> Part quick view <ChevronRight size={16} className="ml-auto text-ink-3" /></button>}
        {!rt.acks[user.id] && isOpen(rt.status) && <button onClick={() => acknowledge(s.id)} className={cx('flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-sm font-medium text-ink', tap)}><Check size={16} /> Acknowledge</button>}
        {s.recommendations.length > 0 && <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">Recommended actions</div>}
        {s.recommendations.map((r) => {
          const done = rt.done.includes(r.id)
          return (
            <button key={r.id} disabled={done || !isOpen(rt.status)} onClick={() => setRec(r)} className={cx('flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left', done ? 'bg-surface-2 text-ink-3' : 'bg-accent-strong text-on-accent', tap)}>
              {done ? <Check size={18} /> : <ChevronRight size={18} />}
              <span className="text-sm font-semibold">{r.title}</span>
            </button>
          )
        })}
      </div>
      {rec && <ProceedSheet s={s} rec={rec} onClose={() => setRec(null)} />}
    </div>
  )
}

function StageRail({ s }: { s: Signal }) {
  const db = useDb()
  const rt = useNexus((x) => x.signals[s.id])
  const i = shipmentDetail(db, s, rt.done)
  const sh = getShipment(db, i.shipmentRef)
  const slip = i.projectSlips[0]
  const rows = [
    ['Sails', sh.etdPlanned, sh.etdRevised ?? sh.etdPlanned],
    ['At port', sh.etaPlanned, sh.etaRevised ?? sh.etaPlanned],
    ['At plant', i.plannedArrival, i.revisedArrival],
    ...(slip ? [[slip.forStage, slip.plannedStart, slip.newStart]] : []),
  ]
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-surface p-3">
      {rows.map(([label, a, b]) => {
        const late = daysBetween(a, b) > 0
        return (
          <div key={label} className="min-w-[72px] flex-1">
            <div className={cx('h-1.5 rounded-full', late ? 'bg-critical' : 'bg-line-strong')} />
            <div className="mt-1.5 text-xs font-medium text-ink">{label}</div>
            <div className="num text-xs"><span className={late ? 'text-ink-3 line-through' : 'text-ink-2'}>{fmtDay(a)}</span></div>
            {late && <div className="num text-xs font-medium text-critical">{fmtDay(b)}</div>}
          </div>
        )
      })}
    </div>
  )
}

/** Bottom-sheet stepper: same workflow and value booking as the desktop Impact Explorer. */
function ProceedSheet({ s, rec, onClose }: { s: Signal; rec: Recommendation; onClose: () => void }) {
  const db = useDb()
  const ctx = useCtx()
  const rt = useNexus((x) => x.signals[s.id])
  const { completeRecommendation } = useNexus()
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<ReturnType<typeof completeRecommendation> | null>(null)
  const p = previewBooking(db, s, rec, rt.done, ctx)
  const last = rec.steps.length - 1
  return (
    <BottomSheet open onClose={onClose} title={rec.title}>
      {result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-resolved-bg p-3 text-sm font-medium text-resolved"><Check size={16} /> {result.record?.recordType} <span className="font-mono">{result.record?.ref}</span> created</div>
          {result.entries.map((e) => <div key={e.id} className="flex justify-between rounded-xl border border-line p-3 text-sm"><span className="text-ink-2">{VALUE_TYPE_LABEL[e.type]} · Committed</span><span className="num font-semibold text-ink">{fmtInr(e.amountInr)}</span></div>)}
          <SimulatedTag what={`write to ${rec.target.system}`} />
          <button onClick={onClose} className={cx('h-12 w-full rounded-2xl bg-accent-strong text-sm font-semibold text-on-accent', tap)}>Done</button>
        </div>
      ) : (
        <div className="space-y-3">
          <ol className="space-y-1.5">
            {rec.steps.map((t, i) => (
              <li key={t} className="flex items-center gap-2 text-sm">
                <span className={cx('flex size-6 items-center justify-center rounded-full text-[12px] font-semibold', i < step ? 'bg-accent-strong text-on-accent' : i === step ? 'border border-accent text-accent-ink' : 'border border-line text-ink-3')}>{i < step ? <Check size={12} /> : i + 1}</span>
                <span className={i === step ? 'font-medium text-ink' : 'text-ink-3'}>{t}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-ink-2">{rec.effect}</p>
          {step === last && (
            <div className="space-y-2">
              <div className="flex justify-between rounded-xl border border-line p-3 text-sm"><span className="text-ink-2">{p.before.inrLabel}</span><span className="num"><span className="text-ink-3 line-through">{fmtInr(p.before.inrAtRisk)}</span> <span className="font-semibold text-ink">{fmtInr(p.after.inrAtRisk)}</span></span></div>
              {p.costInr > 0 && <div className="flex justify-between rounded-xl border border-line p-3 text-sm"><span className="text-ink-2">Cost</span><span className="num font-semibold text-ink">{fmtInr(p.costInr)}</span></div>}
              {p.entries.map((e, i) => <div key={i} className="rounded-xl border border-line p-3 text-sm"><div className="flex justify-between"><span className="text-ink">{VALUE_TYPE_LABEL[e.type]}</span><span className="num font-semibold text-ink">{fmtInr(e.amountInr)}</span></div><div className="num mt-0.5 text-xs text-ink-2">{e.formula}</div></div>)}
              {p.entries.length === 0 && <p className="text-xs text-ink-3">{p.note ?? 'No value booked for this action.'}</p>}
            </div>
          )}
          {step < last ? <button onClick={() => setStep(step + 1)} className={cx('h-12 w-full rounded-2xl bg-accent-strong text-sm font-semibold text-on-accent', tap)}>Continue</button>
            : <SwipeToApprove label={rec.writeBack ? 'Swipe to approve and write to SAP' : 'Swipe to confirm'} onApprove={() => setResult(completeRecommendation(s.id, rec.id))} />}
        </div>
      )}
    </BottomSheet>
  )
}

// 6. Approvals -------------------------------------------------------------------
interface Approval { id: string; title: string; sub: string; field?: string; amount?: string; run: () => void }

export function Approvals() {
  const items = useApprovals()
  const [done, setDone] = useState<string[]>([])
  const [open, setOpen] = useState<Approval | null>(null)
  const list = items.filter((a) => !done.includes(a.id))
  return (
    <div className="pb-4">
      <Header title="Approvals" right={<span className="text-xs text-ink-3">{list.length} pending</span>} />
      <div className="space-y-2 px-4">
        {list.map((a) => (
          <button key={a.id} onClick={() => setOpen(a)} className={cx('flex min-h-11 w-full items-start gap-3 rounded-2xl border border-line bg-surface p-3 text-left', tap)}>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">{a.title}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-2">{a.sub}{a.field && <SapRef code={a.field} />}</div>
            </div>
            {a.amount && <span className="num shrink-0 text-sm font-semibold text-ink">{a.amount}</span>}
          </button>
        ))}
        {list.length === 0 && <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2">Nothing waiting for you.</p>}
      </div>
      <BottomSheet open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''}>
        {open && (
          <div className="space-y-3">
            <p className="text-sm text-ink-2">{open.sub}</p>
            {open.amount && <div className="num text-2xl font-semibold text-ink">{open.amount}</div>}
            <SwipeToApprove onApprove={() => { open.run(); setDone([...done, open.id]); toast.success('Approved'); setOpen(null) }} />
            <button onClick={() => { setDone([...done, open.id]); toast('Rejected and logged'); setOpen(null) }} className={cx('h-11 w-full rounded-2xl border border-line text-sm font-medium text-critical', tap)}>Reject</button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

/** Approvals for this user: write-backs and price locks they own, capex releases, Finance validation. */
export function useApprovals(): Approval[] {
  const db = useDb()
  const ctx = useCtx()
  const user = useCurrentUser()
  const rt = useNexus((s) => s.signals)
  const value = useValue()
  const { completeRecommendation, setValueStatus } = useNexus()
  const signals = useVisibleSignals()
  if (!user) return []
  const role = getRole(db, user.roleId)
  const lead = role.function === 'Leadership'
  const can = (t: string) => role.approvals.some((a) => a.type === t)
  const out: Approval[] = []
  for (const s of signals.filter((x) => isOpen(rt[x.id].status))) for (const r of s.recommendations) {
    if (rt[s.id].done.includes(r.id)) continue
    if (!(r.writeBack || r.kind === 'price_lock' || r.kind === 'air_freight_partial')) continue
    if (!lead && r.ownerRoleId !== user.roleId) continue
    const b = previewBooking(db, s, r, rt[s.id].done, ctx)
    const v = b.entries.reduce((a, e) => a + e.amountInr, 0)
    out.push({ id: r.id, title: r.title, sub: `${r.target.system} ${r.target.recordType} · ${s.id}`, field: r.target.recordType === 'Purchase requisition' ? 'EBAN-BANFN' : undefined, amount: v ? `${fmtInr(v)} value` : b.costInr ? `${fmtInr(b.costInr)} cost` : undefined, run: () => completeRecommendation(s.id, r.id) })
  }
  if (can('capex')) for (const c of db.capex.filter((x) => x.status === 'With Plant Head' || x.status === 'Negotiation')) {
    const limit = role.approvals.find((a) => a.type === 'capex')?.limitInr
    if (limit && c.budgetCr * 1_00_00_000 > limit) continue
    // ponytail: capex release approval is local to the preview; the Capex module owns the real release.
    out.push({ id: `cap-${c.no}`, title: `Release capex PO: ${c.title}`, sub: `${c.no} · ${getPlant(db, c.plant).name}`, field: 'EKKO-FRGZU', amount: fmtInr(c.budgetCr * 1_00_00_000), run: () => {} })
  }
  if (can('value_validation')) for (const e of value.filter((x: ValueEntry) => x.status === 'realised')) {
    out.push({ id: e.id, title: `Validate ${e.id}: ${e.lever}`, sub: `${VALUE_TYPE_LABEL[e.type]} · SAP evidence: ${e.evidence[0] ?? 'attached'}`, amount: fmtInr(e.amountInr), run: () => setValueStatus(e.id, 'validated') })
  }
  return out
}

// 7. Ask Nexus: the same Assistant engine and thread as desktop, sized for the phone.
export function Ask() {
  const { messages, ask } = useChat()
  const { hi } = useLang()
  const [q, setQ] = useState('')
  const [listening, setListening] = useState(false)
  const chips = ['What should I focus on today?', 'How much have we saved this quarter?', 'Which launches are at risk because of imports?']
  const send = (text: string) => { if (!text.trim()) return; ask(text); setQ('') }
  const voice = () => { setListening(true); setTimeout(() => { setListening(false); send('Which launches are at risk because of imports?') }, 1400) }
  return (
    <div className="flex h-full flex-col">
      <Header title="Ask Nexus" right={<SimulatedTag what="assistant reasoning" />} />
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {messages.length === 0 ? <p className="text-sm text-ink-2">Ask about any signal, part, vendor or saving. Answers cite the SAP fields and modules they used.</p> : <Thread messages={messages} animId={null} hi={hi} onAsk={send} />}
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        {chips.map((c) => <button key={c} onClick={() => send(c)} className={cx('h-9 shrink-0 rounded-full border border-line bg-surface px-3 text-xs text-ink-2', tap)}>{c}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(q) }} className="flex items-center gap-2 border-t border-line px-3 py-2">
        <button type="button" onClick={voice} className={cx('flex size-11 items-center justify-center rounded-full', listening ? 'bg-critical-bg text-critical' : 'bg-surface-2 text-ink-2', tap)} aria-label="Ask by voice">
          {listening ? <span className="flex h-4 items-end gap-0.5" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className="w-1 animate-pulse rounded bg-critical" style={{ height: 6 + ((i * 5) % 10), animationDelay: `${i * 120}ms` }} />)}</span> : <Mic size={18} />}
        </button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={listening ? 'Listening' : 'Ask Nexus'} className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-ink-3" aria-label="Question" />
        <button type="submit" className={cx('flex size-11 items-center justify-center rounded-full bg-accent-strong text-on-accent', tap)} aria-label="Send"><Send size={17} /></button>
      </form>
    </div>
  )
}

// 8. Entity quick view ---------------------------------------------------------------
export function EntityQuick({ kind, id, back }: { kind: EntityKind; id: string; back?: Screen }) {
  const db = useDb()
  const rows: [string, string, string?][] = []
  let title = id
  try {
    if (kind === 'part') {
      const p = getPart(db, id)
      const pp = p.plants[0]
      const st = stockOf(db, p.code, pp.plant)
      title = p.description
      rows.push(['Material', p.code, 'MARA-MATNR'], ['L4 Commodity', p.commodityHierarchy.l4], ['Plant', pp.plant, 'MARC-WERKS'], ['Planned delivery time', `${pp.plannedDelivDays} days`, 'MARC-PLIFZ'], ['Unrestricted stock', fmtNum(st.unrestricted), 'MARD-LABST'], ['Safety stock', fmtNum(pp.safetyStock), 'MARC-EISBE'], ['Moving price', fmtInr(pp.movingPrice, { compact: false }), 'MBEW-VERPR'], ['Critical part', pp.criticalPart ? 'Yes' : 'No', 'MARC-KZKRI'])
    } else if (kind === 'shipment') {
      const s = getShipment(db, id)
      title = s.ref
      rows.push(['Route', `${s.pol} to ${s.pod}`], ['ETA', fmtDay(s.etaRevised ?? s.etaPlanned)], ['Containers', s.containers.map((c) => c.no).join(', ')], ['PO', s.poNumbers.join(', ') || 'n/a', 'EKKO-EBELN'])
    } else if (kind === 'vendor') {
      const v = getVendor(db, id)
      title = v.name
      rows.push(['Vendor', v.sapVendor, 'LFA1-LIFNR'], ['Category', v.category], ['Country', v.country], ['Status', v.status])
    }
  } catch { /* unknown id: show the code only */ }
  return (
    <div className="pb-6">
      <Header title={title} back={back ?? { name: 'today' }} />
      <dl className="mx-4 divide-y divide-line rounded-2xl border border-line bg-surface px-4">
        {rows.map(([l, v, f]) => <div key={l} className="flex items-center justify-between gap-3 py-3 text-sm"><dt className="flex items-center gap-1.5 text-ink-2">{l}{f && <SapRef code={f} />}</dt><dd className="num text-right text-ink">{v}</dd></div>)}
      </dl>
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => toast('Calling vendor (Simulated)')} className={cx('h-12 rounded-2xl border border-line bg-surface text-sm font-medium text-ink', tap)}>Call vendor</button>
        <button onClick={() => toast('Share sheet opened (Simulated)')} className={cx('h-12 rounded-2xl border border-line bg-surface text-sm font-medium text-ink', tap)}>Share</button>
      </div>
    </div>
  )
}

// 9. Profile ------------------------------------------------------------------------
export function Profile({ onSignOut }: { onSignOut?: () => void }) {
  const db = useDb()
  const user = useCurrentUser()!
  const users = useTenantUsers()
  const { updateUser, logout } = useNexus()
  const theme = useTheme()
  const { phoneTheme, setPhoneTheme } = useNav()
  const pref = phoneTheme ?? theme.pref
  const setPref = setPhoneTheme ?? theme.setPref
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const ch = user.channels ?? { critical: ['in-app', 'push', 'whatsapp'], high: ['in-app', 'push'], medium: ['in-app'], low: ['in-app'] }
  const toggle = (sevName: keyof typeof ch, c: string) => updateUser(user.id, { channels: { ...ch, [sevName]: ch[sevName].includes(c) ? ch[sevName].filter((x) => x !== c) : [...ch[sevName], c] } })
  const delegate = user.delegate && users.find((u) => u.id === user.delegate!.userId)
  const sc = user.scope
  const scope = sc.all ? 'All' : [sc.plants.length && `Plants ${sc.plants.join(', ')}`, sc.purchasingGroups.length && `Purchasing groups ${sc.purchasingGroups.join(', ')}`, sc.commodities.length && sc.commodities.join(', '), sc.projects.length && sc.projects.join(', '), sc.customers.length && sc.customers.join(', '), sc.shipmentsAll && 'All import shipments'].filter(Boolean).join(' · ')
  return (
    <div className="pb-6">
      <Header title={lang === 'hi' ? 'प्रोफ़ाइल' : 'Me'} />
      <div className="mx-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
        <Avatar name={user.name} size={48} />
        <div className="min-w-0"><div className="truncate font-semibold text-ink">{user.name}</div><div className="truncate text-sm text-ink-2">{getRole(db, user.roleId).name}</div></div>
      </div>
      <Section title={lang === 'hi' ? 'थीम' : 'Theme'}>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
          {(['system', 'light', 'dark'] as ThemePref[]).map((t) => <button key={t} onClick={() => setPref(t)} className={cx('h-10 rounded-lg text-sm capitalize', pref === t ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-2')} aria-pressed={pref === t}>{t}</button>)}
        </div>
      </Section>
      <Section title={lang === 'hi' ? 'सूचनाएँ' : 'Notifications by severity'}>
        {(['critical', 'high', 'medium', 'low'] as const).map((sv) => (
          <div key={sv} className="flex items-center justify-between py-2 text-sm">
            <span className="capitalize text-ink">{sv}</span>
            <span className="flex gap-1">{['push', 'email', 'whatsapp'].map((c) => <button key={c} onClick={() => toggle(sv, c)} aria-pressed={ch[sv].includes(c)} className={cx('h-9 rounded-full border px-2.5 text-xs capitalize', ch[sv].includes(c) ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink-3')}>{c}</button>)}</span>
          </div>
        ))}
        <div className="pt-1"><SimulatedTag what="push, email and WhatsApp delivery" /></div>
      </Section>
      <Section title={lang === 'hi' ? 'शांत समय' : 'Quiet hours'}>
        <div className="flex items-center gap-2 text-sm text-ink-2">
          <input type="time" value={user.quietHours?.from ?? '22:00'} onChange={(e) => updateUser(user.id, { quietHours: { from: e.target.value, to: user.quietHours?.to ?? '07:00' } })} className="h-10 rounded-lg border border-line bg-surface px-2 text-ink" aria-label="Quiet hours from" />
          to
          <input type="time" value={user.quietHours?.to ?? '07:00'} onChange={(e) => updateUser(user.id, { quietHours: { from: user.quietHours?.from ?? '22:00', to: e.target.value } })} className="h-10 rounded-lg border border-line bg-surface px-2 text-ink" aria-label="Quiet hours to" />
        </div>
        <p className="mt-1 text-xs text-ink-3">Critical signals still come through.</p>
      </Section>
      <Section title={lang === 'hi' ? 'भाषा' : 'Language'}>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {([['en', 'English'], ['hi', 'हिन्दी']] as const).map(([k, l]) => <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k} className={cx('h-10 rounded-lg text-sm', lang === k ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-2')}>{l}</button>)}
        </div>
      </Section>
      <Section title="My scope"><p className="text-sm text-ink">{scope || 'Not set'}</p><p className="text-xs text-ink-3">Set by your admin from SAP plant, purchasing group and MRP controller.</p></Section>
      <Section title="Delegate"><p className="text-sm text-ink">{delegate ? `${delegate.name}, ${fmtDay(user.delegate!.from)} to ${fmtDay(user.delegate!.to)}` : 'None'}</p></Section>
      <div className="mx-4 mt-4"><button onClick={() => { logout(); onSignOut?.() }} className={cx('h-12 w-full rounded-2xl border border-line text-sm font-medium text-critical', tap)}>Sign out</button></div>
    </div>
  )
}
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mx-4 mt-4 rounded-2xl border border-line bg-surface p-4"><h2 className="mb-2 text-xs font-medium tracking-wide text-ink-3 uppercase">{title}</h2>{children}</section>
)

