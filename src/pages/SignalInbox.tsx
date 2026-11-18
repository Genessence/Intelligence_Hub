import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Inbox, Users } from 'lucide-react'
import { useNexus, useCurrentUser, useDb, useTenantUsers, useVisibleSignals, useCtx } from '@/store/useNexus'
import { computeAudience } from '@/engine/audience'
import { impactOf } from '@/engine/scenarios'
import { fmtDateTime, fmtInr, plural } from '@/engine/format'
import { getPlant } from '@/engine/lookup'
import { PageHeader } from '@/components/Shell'
import { cx, Empty, Num, SeverityBadge, SOURCE_LABEL, SourceChip, StatusBadge } from '@/components/ui/primitives'
import type { Severity, SignalStatus, SourceId } from '@/data/types'

const SEV_ORDER: Severity[] = ['critical', 'high', 'medium', 'low']

export function SignalInbox() {
  const user = useCurrentUser()!
  const db = useDb()
  const ctx = useCtx()
  const users = useTenantUsers()
  const visibleSignals = useVisibleSignals()
  const runtime = useNexus((s) => s.signals)
  const [mine, setMine] = useState(true)
  const [sev, setSev] = useState<Severity | 'all'>('all')
  const [src, setSrc] = useState<SourceId | 'all'>('all')
  const [plant, setPlant] = useState<string>('all')
  const [status, setStatus] = useState<'open' | SignalStatus | 'all'>('open')

  const rows = useMemo(() => visibleSignals.map((s) => {
    const audience = computeAudience(db, users, s)
    const me = audience.find((r) => r.userId === user.id) ?? (runtime[s.id].assignee === user.id ? { userId: user.id, reasons: ['Assigned to you'] } : undefined)
    const impact = impactOf(db, s, runtime[s.id].done, ctx)
    return { s, rt: runtime[s.id], audience, me, impact, plants: s.entityRefs.filter((r) => r.kind === 'plant').map((r) => r.id) }
  }), [db, users, user.id, runtime, visibleSignals, ctx])

  const visible = rows
    .filter((r) => (!mine || r.me) && (sev === 'all' || r.s.severity === sev) && (src === 'all' || r.s.sourceId === src) && (plant === 'all' || r.plants.includes(plant)))
    .filter((r) => status === 'all' || (status === 'open' ? !['resolved', 'dismissed'].includes(r.rt.status) && !r.rt.snoozed : r.rt.status === status))
    .sort((a, b) => SEV_ORDER.indexOf(a.s.severity) - SEV_ORDER.indexOf(b.s.severity) || b.s.raisedAt.localeCompare(a.s.raisedAt))

  const sources = [...new Set(visibleSignals.map((s) => s.sourceId))]
  const plants = [...new Set(rows.flatMap((r) => r.plants))]

  return (
    <>
      <PageHeader title="Signal Inbox" sub={mine ? `Signals routed to you by role and scope. ${plural(visible.length, 'signal')} shown.` : `Every signal in ${db.tenant.name}. ${plural(visible.length, 'signal')} shown.`} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex h-8 rounded-lg border border-line bg-surface p-0.5 text-xs font-medium" role="radiogroup" aria-label="Whose signals">
          {[['Mine', true], ['Everyone', false]].map(([l, v]) => (
            <button key={String(l)} role="radio" aria-checked={mine === v} onClick={() => setMine(v as boolean)} className={cx('rounded-md px-3', mine === v ? 'bg-surface-2 text-ink' : 'text-ink-3 hover:text-ink')}>{l as string}</button>
          ))}
        </div>
        <Select label="Severity" value={sev} onChange={(v) => setSev(v as Severity | 'all')} options={[['all', 'All severities'], ...SEV_ORDER.map((x) => [x, x[0].toUpperCase() + x.slice(1)] as [string, string])]} />
        <Select label="Source" value={src} onChange={(v) => setSrc(v as SourceId | 'all')} options={[['all', 'All sources'], ...sources.map((x) => [x, SOURCE_LABEL[x]] as [string, string])]} />
        <Select label="Plant" value={plant} onChange={setPlant} options={[['all', 'All plants'], ...plants.map((p) => [p, `${p} ${getPlant(db, p).name}`] as [string, string])]} />
        <Select label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} options={[['open', 'Open'], ['all', 'All statuses'], ['new', 'New'], ['acknowledged', 'Acknowledged'], ['in_action', 'In action'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed']]} />
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card">
        {visible.length === 0 && <Empty icon={<Inbox size={28} />} title="Nothing here" body="No signals match these filters. Nexus routes new signals to you as soon as a system raises one in your scope." />}
        {visible.map(({ s, rt, audience, me, impact }, i) => (
          <Link key={s.id} to={`/signals/${s.id}`} className={cx('group flex gap-4 px-4 py-4 transition-colors hover:bg-surface-2 md:px-5', i > 0 && 'border-t border-line')}>
            <span className={cx('mt-1.5 size-2 shrink-0 rounded-full', rt.status === 'new' && !rt.acks[user.id] ? 'bg-accent' : 'bg-transparent')} aria-label={rt.status === 'new' ? 'Unread' : undefined} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge s={s.severity} />
                <SourceChip id={s.sourceId} />
                <StatusBadge s={rt.status} />
                {rt.liveAt && <span className="inline-flex h-5 items-center rounded-full bg-critical-bg px-2 text-xs font-medium text-critical">Live</span>}
                <span className="font-mono text-xs text-ink-3">{s.id}</span>
              </div>
              <div className="mt-1.5 text-sm font-semibold text-ink group-hover:text-accent-ink">{s.title}</div>
              <p className="mt-0.5 line-clamp-2 text-sm text-ink-2">{s.summary}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
                <span>Raised {fmtDateTime(s.raisedAt)}</span>
                <span className="inline-flex items-center gap-1"><Users size={13} aria-hidden /> {plural(audience.length, 'person', 'people')} told</span>
                {me && <span className="text-ink-2">Why you: {me.reasons[0]}</span>}
              </div>
            </div>
            {impact && (
              <div className="hidden w-40 shrink-0 text-right sm:block">
                <div className="truncate text-xs text-ink-3">{impact.inrLabel}</div>
                <Num source={impact.inrSource} className={cx('text-base font-semibold', impact.inrAtRisk > 0 ? 'text-critical' : 'text-ink')}>{fmtInr(impact.inrAtRisk)}</Num>
                {impact.slipLabel && <div className="num mt-0.5 text-xs text-ink-2">{impact.slipLabel} {impact.slipDays} days</div>}
              </div>
            )}
            <ArrowUpRight size={16} className="mt-1 shrink-0 text-ink-3 opacity-0 transition group-hover:opacity-100" aria-hidden />
          </Link>
        ))}
      </div>
    </>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex h-8 items-center rounded-lg border border-line bg-surface pr-1 pl-2.5 text-xs">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-full bg-transparent pr-1 font-medium text-ink outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}
