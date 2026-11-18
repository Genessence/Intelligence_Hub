import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, BellOff, Check, CheckCheck, Clock, Mail, MessageSquare, Smartphone, MessageSquareText, UserPlus, X } from 'lucide-react'
import type { Recommendation, Signal } from '@/data/types'
import { useNexus, useCurrentUser, useDb, useTenantUsers, useCtx, useValue, canResolve } from '@/store/useNexus'
import { computeAudience } from '@/engine/audience'
import { impactOf, isQuantified } from '@/engine/scenarios'
import { shipmentDetail } from '@/engine/scenarios/shipment'
import { decisionLatency } from '@/engine/latency'
import { buildRipple } from '@/engine/ripple'
import { fmtDateTime, fmtDuration, fmtInr } from '@/engine/format'
import { getPlant, getRole, getShipment, getUser } from '@/engine/lookup'
import { RippleGraph } from '@/components/RippleGraph'
import { WorkflowDialog } from '@/components/WorkflowDialog'
import { WhatHappened } from '@/components/WhatHappened'
import { openAssistant } from '@/components/assistantBus'
import { Avatar, Button, Card, cx, Empty, Kv, Num, SapRef, SeverityBadge, SimulatedTag, SourceChip, StatusBadge, Tip, VALUE_TYPE_LABEL, ValueStatusBadge } from '@/components/ui/primitives'

export function ImpactExplorer() {
  const { id } = useParams()
  const db = useDb()
  const signal = db.signals.find((s) => s.id === id)
  if (!signal) return <Empty icon={<X size={28} />} title="Signal not found" body="It may belong to another tenant, or it was removed when the demo was reset." />
  return <Explorer key={signal.id} signal={signal} />
}

function Explorer({ signal }: { signal: Signal }) {
  const db = useDb()
  const ctx = useCtx()
  const user = useCurrentUser()!
  const users = useTenantUsers()
  const { signals, audit, acknowledge, dismiss, resolve, snooze, assign } = useNexus()
  const value = useValue()
  const rt = signals[signal.id]
  const audience = useMemo(() => computeAudience(db, users, signal), [db, users, signal])
  const quantified = isQuantified(signal)
  const impact = impactOf(db, signal, rt.done, ctx)
  const base = impactOf(db, signal, [], ctx)
  const shipBase = signal.type === 'shipment_delay' && quantified ? shipmentDetail(db, signal, []) : undefined
  const ripple = useMemo(() => buildRipple(db, signal, audience, users, shipBase), [db, signal, audience, users, shipBase])
  const latency = decisionLatency(signal, rt.acks)
  const mine = audience.find((r) => r.userId === user.id)
  const [wf, setWf] = useState<Recommendation | null>(null)
  const [dismissOpen, setDismissOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const entries = value.filter((v) => v.signalId === signal.id)
  const log = audit.filter((a) => a.signalId === signal.id).slice().reverse()
  const closed = rt.status === 'resolved' || rt.status === 'dismissed'
  const owner = signal.ownerId ? users.find((u) => u.id === signal.ownerId) : undefined
  const assignee = rt.assignee ? users.find((u) => u.id === rt.assignee) : undefined
  const mayResolve = canResolve(db, user, signal, rt.assignee)

  return (
    <>
      <Link to="/signals" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"><ArrowLeft size={15} /> Signal Inbox</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge s={signal.severity} />
            <SourceChip id={signal.sourceId} />
            <StatusBadge s={rt.status} />
            {rt.snoozed && <span className="inline-flex h-5 items-center gap-1 rounded-full bg-surface-2 px-2 text-xs text-ink-2"><BellOff size={12} /> Snoozed</span>}
            {rt.liveAt && <span className="inline-flex h-5 items-center rounded-full bg-critical-bg px-2 text-xs font-medium text-critical">Live</span>}
            <span className="font-mono text-xs text-ink-3">{signal.id}</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">{signal.title}</h1>
          <p className="mt-1 text-sm text-ink-2">{signal.summary}</p>
          <p className="mt-2 text-xs text-ink-3">
            Raised {fmtDateTime(signal.raisedAt)} by rule <span className="font-mono">{signal.ruleId}</span>
            {owner && <> · Owner <span className="text-ink-2">{owner.name}</span></>}
            {assignee && <> · Assigned to <span className="text-ink-2">{assignee.name}</span></>}
            {mine ? ` · You are here because: ${mine.reasons.join('; ')}` : ' · You are viewing this outside your scope'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!closed && !rt.acks[user.id] && <Button variant="primary" onClick={() => acknowledge(signal.id)}><Check size={15} /> Acknowledge</Button>}
          {rt.acks[user.id] && <span className="inline-flex h-9 items-center gap-1.5 px-2 text-sm text-ink-2"><CheckCheck size={15} /> Acknowledged by you</span>}
          {!closed && <Button onClick={() => setAssignOpen(true)}><UserPlus size={15} /> Assign</Button>}
          {!closed && <Button variant="ghost" onClick={() => snooze(signal.id)}><BellOff size={15} /> {rt.snoozed ? 'Unsnooze' : 'Snooze'}</Button>}
          {rt.status === 'in_action' && mayResolve && <Button onClick={() => resolve(signal.id)}>Mark resolved</Button>}
          {!closed && rt.done.length === 0 && <Button variant="ghost" onClick={() => setDismissOpen(true)}>Dismiss</Button>}
          <Button variant="ghost" onClick={() => openAssistant(`Why is ${signal.id} ${signal.severity}?`, signal.id)}><MessageSquareText size={15} /> Ask Nexus</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="What happened" action={<span className="text-xs text-ink-3">First known by {signal.firstKnownBy}</span>}>
          <WhatHappened db={db} signal={signal} done={rt.done} ctx={ctx} />
        </Card>
        <div className="space-y-4">
          <Card title="Impact">
            {impact && base ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-ink-3">{impact.inrLabel}{impact.inrAtRisk !== base.inrAtRisk ? ', after actions taken' : ''}</div>
                  <Num source={impact.inrSource} className={cx('text-2xl font-semibold', impact.inrAtRisk > 0 ? 'text-critical' : 'text-ink')}>{fmtInr(impact.inrAtRisk)}</Num>
                  {impact.inrAtRisk !== base.inrAtRisk && <span className="num ml-2 text-sm text-ink-3 line-through">{fmtInr(base.inrAtRisk)}</span>}
                  <div className="num mt-1 text-xs text-ink-2">{impact.inrFormula}</div>
                </div>
                <dl className="divide-y divide-line">
                  {impact.metrics.map((m) => (
                    <Kv key={m.label} label={<span className="flex items-center gap-1.5">{m.label}{m.sap && <SapRef code={m.sap} />}</span>}>
                      {m.source ? <Tip text={m.source}><span tabIndex={0} className={cx('num cursor-help underline decoration-dotted underline-offset-4', m.tone === 'critical' ? 'text-critical' : m.tone === 'attention' ? 'text-attention' : 'text-ink')}>{m.value}</span></Tip>
                        : <span className={cx('num', m.tone === 'critical' ? 'text-critical' : m.tone === 'attention' ? 'text-attention' : 'text-ink')}>{m.value}</span>}
                    </Kv>
                  ))}
                  {!impact.metrics.some((m) => m.label === 'Plants affected') && <Kv label="Plants affected">{impact.plants.map((p) => `${getPlant(db, p).name} (${p})`).join(', ')}</Kv>}
                </dl>
                {shipBase && (
                  <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2">
                    A vessel rolled at origin does not add demurrage. Port risk comes after arrival: each day past {getShipment(db, shipBase.shipmentRef).freeDaysAtPort} free days would cost <Num source="Engine: containers × (ZDCS + ZCDT rate)">{fmtInr(shipBase.portDayCostInr)}</Num> for {shipBase.containers} containers <SapRef code="COND-ZDCS" /> <SapRef code="COND-ZCDT" />. File the BOE in advance.
                  </p>
                )}
              </div>
            ) : <p className="text-sm text-ink-2">This signal is informational. Nexus routes it to the right people; there is no money model for it in this concept.</p>}
          </Card>
          <Card title="Decision latency"><Latency l={latency} /></Card>
        </div>
      </div>

      <Card className="mt-4" title="Ripple across the business" action={<span className="text-xs text-ink-3">Click any node for its SAP and module data</span>} pad={false}>
        <div className="p-4"><RippleGraph nodes={ripple.nodes} edges={ripple.edges} /></div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Recommended workflows" action={rt.done.length > 0 && <span className="num text-xs text-ink-2">{rt.done.length} of {signal.recommendations.length} done</span>}>
          {signal.recommendations.length === 0 && <p className="text-sm text-ink-2">No workflow is configured for this signal. Acknowledge it so the team knows you own it.</p>}
          <div className="space-y-2.5">
            {signal.recommendations.map((r) => <RecRow key={r.id} rec={r} done={rt.done.includes(r.id)} disabled={closed} onProceed={() => setWf(r)} />)}
          </div>
          {entries.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-3"><span>Value booked on this signal</span><Link to="/value" className="text-accent-ink hover:underline">Value Ledger</Link></div>
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="min-w-0 truncate text-ink-2"><span className="font-mono text-xs text-ink-3">{e.id}</span> {VALUE_TYPE_LABEL[e.type]} · {e.lever}</span>
                  <span className="flex shrink-0 items-center gap-2"><ValueStatusBadge s={e.status} /><span className="num font-semibold text-ink">{fmtInr(e.amountInr)}</span></span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="lg:col-span-2" title={`Who knows (${audience.length})`} action={<span className="text-xs text-ink-3">Computed from role and scope</span>}>
          <ul className="-my-1 divide-y divide-line">
            {audience.map((r) => {
              const u = getUser(users, r.userId)
              const ack = rt.acks[u.id]
              return (
                <li key={u.id} className="flex items-start gap-3 py-2.5">
                  <Avatar name={u.name} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm"><span className="truncate font-medium text-ink">{u.name}</span>{u.id === user.id && <span className="text-xs text-ink-3">(you)</span>}{u.addedInDemo && <span className="rounded bg-accent-soft px-1 text-xs text-accent-ink">new</span>}</div>
                    <div className="truncate text-xs text-ink-2">{getRole(db, u.roleId).name}</div>
                    <div className="mt-0.5 text-xs text-ink-3">{r.reasons.join('; ')}</div>
                    {r.onLeave && <div className="mt-0.5 text-xs text-attention">On leave, routed to {getUser(users, r.onLeave.delegateId).name}</div>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Channels critical={signal.severity === 'critical'} />
                    <span className={cx('text-xs', ack ? 'text-ink' : 'text-ink-3')}>{ack ? 'Acknowledged' : r.onLeave ? 'Away' : 'Not yet seen'}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <Card className="mt-4" title="Activity on this signal">
        {log.length === 0 ? <p className="text-sm text-ink-2">No actions yet.</p> : (
          <ol className="space-y-2">
            {log.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:gap-3">
                <span className="num shrink-0 text-xs text-ink-3 sm:w-44">{fmtDateTime(a.at)}</span>
                <span><span className="font-medium text-ink">{users.find((u) => u.id === a.userId)?.name ?? 'System'}</span> <span className="text-ink-2">{a.action}: {a.detail}</span></span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {wf && <WorkflowDialog signal={signal} rec={wf} open={!!wf} onClose={() => setWf(null)} />}
      <DismissDialog open={dismissOpen} onClose={() => setDismissOpen(false)} onConfirm={(r) => { dismiss(signal.id, r); setDismissOpen(false) }} />
      <AssignDialog open={assignOpen} people={audience.map((r) => getUser(users, r.userId))} onClose={() => setAssignOpen(false)} onPick={(id) => { assign(signal.id, id); setAssignOpen(false) }} />
    </>
  )
}

function RecRow({ rec, done, disabled, onProceed }: { rec: Recommendation; done: boolean; disabled: boolean; onProceed: () => void }) {
  const db = useDb()
  return (
    <div className={cx('flex items-start gap-3 rounded-xl border border-line p-3.5', done && 'bg-surface-2')}>
      <span className={cx('mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full', done ? 'bg-resolved-bg text-resolved' : 'bg-surface-2 text-ink-3')}>{done ? <Check size={14} /> : <Clock size={14} />}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">{rec.title}{rec.writeBack && <span className="rounded bg-info-bg px-1.5 text-xs font-medium text-info">SAP write-back</span>}</div>
        <div className="mt-0.5 text-sm text-ink-2">{rec.effect}</div>
        <div className="mt-1 text-xs text-ink-3">Owner: {getRole(db, rec.ownerRoleId).name} · Creates: {rec.target.recordType} in {rec.target.system}</div>
      </div>
      {done ? <span className="text-xs font-medium text-resolved">Done</span> : <Button size="sm" variant="primary" disabled={disabled} onClick={onProceed}>Proceed</Button>}
    </div>
  )
}

function Channels({ critical }: { critical: boolean }) {
  return (
    <Tip text={<>In-app{critical ? ', email, Teams and WhatsApp' : ' and email'}. Email, Teams and WhatsApp are simulated in this concept.</>}>
      <span tabIndex={0} className="flex items-center gap-1 text-ink-3" aria-label="Channels"><Smartphone size={13} /> <Mail size={13} /> {critical && <MessageSquare size={13} />}</span>
    </Tip>
  )
}

function Latency({ l }: { l: ReturnType<typeof decisionLatency> }) {
  const users = useNexus((s) => s.users)
  const team = l.firstKnownBy.split(' (')[0]
  return (
    <ol className="relative space-y-3 border-l border-line pl-4 text-sm">
      <li><Dot tone="var(--critical)" /><div className="text-ink">{l.firstKnownBy} knew</div><div className="num text-xs text-ink-3">{fmtDateTime(l.firstKnownAt)}</div></li>
      {l.knownToNexusMs > 0 && <li><Dot tone="var(--attention)" /><div className="text-ink">Sat with {team} for <span className="num font-semibold">{fmtDuration(l.knownToNexusMs)}</span></div><div className="text-xs text-ink-3">Before Nexus, no one outside {team} was told</div></li>}
      <li><Dot tone="var(--accent)" /><div className="text-ink">Nexus routed it to the people affected</div><div className="num text-xs text-ink-3">{fmtDateTime(l.raisedAt)}</div></li>
      <li><Dot tone={l.ackAt ? 'var(--accent)' : 'var(--border-strong)'} />
        {l.ackAt && l.ackBy ? <><div className="text-ink">{users.find((u) => u.id === l.ackBy)?.name} acknowledged {l.nexusToAckMs! > 0 ? <><span className="num font-semibold">{fmtDuration(l.nexusToAckMs!)}</span> later</> : 'straight away'}</div><div className="num text-xs text-ink-3">{fmtDateTime(l.ackAt)}</div></> : <div className="text-ink-3">Waiting for the first acknowledgement</div>}
      </li>
      <li className="text-xs text-ink-3"><SimulatedTag what="event timestamps" /></li>
    </ol>
  )
}
const Dot = ({ tone }: { tone: string }) => <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-surface" style={{ background: tone }} aria-hidden />

function DismissDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const reasons = ['Already handled outside Nexus', 'Not relevant to my scope', 'Duplicate of another signal', 'Data is wrong']
  const [r, setR] = useState(reasons[0])
  return (
    <Modal open={open} onClose={onClose} title="Dismiss this signal" description="The reason is logged and helps tune the rule.">
      <div className="mt-4 space-y-1.5" role="radiogroup">
        {reasons.map((x) => (
          <label key={x} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm text-ink has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
            <input type="radio" name="reason" checked={r === x} onChange={() => setR(x)} className="accent-[var(--accent)]" /> {x}
          </label>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => onConfirm(r)}>Dismiss</Button></div>
    </Modal>
  )
}

function AssignDialog({ open, people, onClose, onPick }: { open: boolean; people: { id: string; name: string; title: string }[]; onClose: () => void; onPick: (id: string) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Assign this signal" description="Pick someone who already has it in scope.">
      <ul className="mt-4 max-h-80 space-y-1 overflow-y-auto">
        {people.map((p) => (
          <li key={p.id}><button onClick={() => onPick(p.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2"><Avatar name={p.name} size={28} /><span className="min-w-0"><span className="block truncate text-sm text-ink">{p.name}</span><span className="block truncate text-xs text-ink-3">{p.title}</span></span></button></li>
        ))}
      </ul>
    </Modal>
  )
}

export function Modal({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40" style={{ background: 'var(--overlay)' }} />
        <Dialog.Content className="page-enter fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-5 shadow-pop">
          <Dialog.Title className="text-base font-semibold text-ink">{title}</Dialog.Title>
          {description && <Dialog.Description className="mt-1 text-sm text-ink-2">{description}</Dialog.Description>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
