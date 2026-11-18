import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'
import type { Signal } from '@/data/types'
import { useNexus } from '@/store/useNexus'
import { sapField } from '@/data/sap'
import { Card, cx, Empty, Num, SeverityBadge, SourceChip, StatusBadge, Tip } from '@/components/ui/primitives'

export interface Kpi { label: string; value: string; source: string; tone?: 'critical' | 'attention' }

/** Shared 360 layout: identity header, KPI strip, related signals, then entity-specific panels. */
export function EntityLayout({ kind, title, sub, chips, kpis, signals, children }: { kind: string; title: ReactNode; sub?: ReactNode; chips?: ReactNode; kpis: Kpi[]; signals: Signal[]; children: ReactNode }) {
  return (
    <>
      <button onClick={() => history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"><ArrowLeft size={15} /> Back</button>
      <div className="mb-6">
        <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">{kind} 360</div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-2">{sub}</p>}
        {chips && <div className="mt-2 flex flex-wrap items-center gap-1.5">{chips}</div>}
      </div>
      {kpis.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label}>
              <div className="text-xs text-ink-3">{k.label}</div>
              <Num source={k.source} className={cx('mt-1 inline-block text-xl font-semibold', k.tone === 'critical' ? 'text-critical' : k.tone === 'attention' ? 'text-attention' : 'text-ink')}>{k.value}</Num>
            </Card>
          ))}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">{children}</div>
        <div className="space-y-4"><RelatedSignals signals={signals} /></div>
      </div>
    </>
  )
}

export function RelatedSignals({ signals }: { signals: Signal[] }) {
  const rt = useNexus((s) => s.signals)
  return (
    <Card title={`Signals (${signals.length})`}>
      {signals.length === 0 && <p className="text-sm text-ink-2">No signals touch this record.</p>}
      <ul className="-my-1 divide-y divide-line">
        {signals.map((s) => (
          <li key={s.id}>
            <Link to={`/signals/${s.id}`} className="block py-2.5 hover:text-accent-ink">
              <div className="flex flex-wrap items-center gap-1.5"><SeverityBadge s={s.severity} /><SourceChip id={s.sourceId} /><StatusBadge s={rt[s.id]?.status ?? s.status} /></div>
              <div className="mt-1 text-sm text-ink">{s.title}</div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Amber custom Z-field row: technical name unknown, so it carries the "To confirm with Amber IT" tag. */
export function ZField({ code, value }: { code: string; value: ReactNode }) {
  const f = sapField(code)
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="flex items-center gap-1.5 text-ink-2">
        {f.label}
        <Tip text={<><div className="font-medium">{f.label}</div><div className="mt-1 text-ink-2">{f.description}</div><div className="mt-1 text-ink-3">Amber custom Z-field · To confirm with Amber IT</div></>}>
          <span tabIndex={0} className="cursor-help rounded border border-dashed border-line-strong px-1 text-xs text-ink-3">Z-field, to confirm</span>
        </Tip>
      </dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  )
}

export const NotFound = ({ what }: { what: string }) => <Empty icon={<SearchX size={28} />} title={`${what} not found`} body="It may belong to the other tenant. Switch tenant from the sign-in page, or search with Cmd K." />
