// Renders Assistant answer blocks with the app's own components and tokens.
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { useNexus } from '@/store/useNexus'
import { useState } from 'react'
import { fmtDateTime, fmtInr, fmtNum } from '@/engine/format'
import { DEMO_NOW } from '@/config/demoClock'
import { Button, cx, SimulatedTag } from '@/components/ui/primitives'
import type { Block, Tone } from './intents'

const TONE: Record<Tone, string> = { accent: 'var(--accent)', critical: 'var(--critical)', attention: 'var(--attention)', info: 'var(--info)' }
const axis = { tick: { fill: 'var(--text-3)', fontSize: 12 }, tickLine: false }

export function BlockView({ b }: { b: Block }) {
  switch (b.kind) {
    case 'text': return <p className="text-sm leading-relaxed text-ink">{b.text}</p>
    case 'kpi': return (
      <div className="grid grid-cols-2 gap-2">
        {b.items.map((k) => (
          <div key={k.label} className="rounded-lg border border-line bg-surface p-2.5">
            <div className="text-xs text-ink-3">{k.label}</div>
            <div className={cx('num text-base font-semibold', k.tone === 'critical' ? 'text-critical' : k.tone === 'attention' ? 'text-attention' : 'text-ink')}>{k.value}</div>
            {k.sub && <div className="text-xs text-ink-2">{k.sub}</div>}
          </div>
        ))}
      </div>
    )
    case 'table': return (
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-line text-left text-ink-3">{b.head.map((h) => <th key={h} className="px-2 py-1.5 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {b.rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j} className="num px-2 py-1.5 align-top text-ink-2">{j === 0 && b.links?.[i] ? <Link to={b.links[i]!} className="text-accent-ink hover:underline">{c}</Link> : c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    case 'chart': {
      const fmt = (n: number) => (b.unit === 'inr' ? fmtInr(n) : b.unit === '%' ? `${n}%` : fmtNum(n))
      const common = { data: b.data, margin: { top: 6, right: 6, bottom: 0, left: 0 } }
      return (
        <div className="h-44 rounded-lg border border-line bg-surface p-2">
          <ResponsiveContainer width="100%" height="100%">
            {b.chart === 'line' ? (
              <LineChart {...common}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey={b.x} {...axis} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
                <YAxis {...axis} axisLine={false} width={52} domain={['auto', 'auto']} tickFormatter={fmt} />
                <RTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }} formatter={(n: number) => fmt(n)} />
                {b.series.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={TONE[s.tone]} strokeWidth={2} dot={false} strokeDasharray={s.tone === 'attention' ? '5 4' : undefined} connectNulls />)}
              </LineChart>
            ) : (
              <BarChart {...common}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey={b.x} {...axis} axisLine={{ stroke: 'var(--border)' }} interval={0} tick={{ fill: 'var(--text-3)', fontSize: 12 }} />
                <YAxis {...axis} axisLine={false} width={52} tickFormatter={fmt} />
                <RTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }} formatter={(n: number) => fmt(n)} />
                {b.series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={TONE[s.tone]} radius={[4, 4, 0, 0]} />)}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )
    }
    case 'links': return (
      <div className="flex flex-wrap gap-1.5">
        {b.items.map((l) => <Link key={l.to + l.label} to={l.to} className="max-w-full truncate rounded-md border border-line bg-surface px-2 py-1 text-xs text-accent-ink hover:bg-surface-2">{l.label}</Link>)}
      </div>
    )
    case 'sources': return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
        <span>Sources:</span>
        {b.items.map((s) => s.code
          ? <Link key={s.label} to={`/sources/sap/fields?q=${encodeURIComponent(s.code)}`} className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-ink-2 hover:text-ink" title={s.label}>SAP {s.code.replace(/^COND-/, '')}</Link>
          : <span key={s.label} className="rounded border border-line px-1.5 py-0.5">{s.label}</span>)}
        <span>· as of {fmtDateTime(DEMO_NOW)}</span>
      </div>
    )
    case 'action': return <ActionCard b={b} />
  }
}

function ActionCard({ b }: { b: Extract<Block, { kind: 'action' }> }) {
  const rt = useNexus((s) => s.signals[b.signalId])
  const record = useNexus((s) => s.records.filter((r) => r.signalId === b.signalId).slice(-1)[0])
  const complete = useNexus((s) => s.completeRecommendation)
  const done = rt?.done.includes(b.recId)
  const [cancelled, setCancelled] = useState(false)
  if (cancelled && !done) return <p className="rounded-lg border border-line px-3 py-2 text-xs text-ink-3">Cancelled. Nothing was changed.</p>
  return (
    <div className="rounded-xl border border-accent bg-surface p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-ink">{b.title}{b.writeBack && <span className="rounded bg-info-bg px-1.5 text-xs text-info">SAP write-back</span>}</div>
      <dl className="space-y-1 text-xs">
        {b.fields.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-ink-3">{k}</dt><dd className="num text-right text-ink">{v}</dd></div>)}
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {done ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-resolved"><Check size={14} /> Done{record ? `: ${record.recordType} ${record.ref} created in ${record.system}` : ''} <SimulatedTag what="write to the target system" /></span>
        ) : (
          <>
            <Button size="sm" variant="primary" onClick={() => { const r = complete(b.signalId, b.recId); if (r.record) toast.success(`${r.record.recordType} ${r.record.ref} created in ${r.record.system}`) }}>Confirm</Button>
            <Link to={`/signals/${b.signalId}`} className="inline-flex h-8 items-center rounded-[var(--radius-ctl)] border border-line px-2.5 text-xs text-ink hover:bg-surface-2">Edit</Link>
            <Button size="sm" variant="ghost" onClick={() => setCancelled(true)}>Cancel</Button>
            <span className="text-xs text-ink-3">Nothing changes until you confirm.</span>
          </>
        )}
      </div>
    </div>
  )
}
