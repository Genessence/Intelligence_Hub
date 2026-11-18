import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { useNexus, useDb, useCtx, useTenantUsers, useVisibleSignals, useValue } from '@/store/useNexus'
import { DEMO_TODAY } from '@/config/demoClock'
import { impactOf } from '@/engine/scenarios'
import { shipmentDetail } from '@/engine/scenarios/shipment'
import { toolState } from '@/engine/scenarios/tooling'
import { fmtDate, fmtInr } from '@/engine/format'
import { getProject } from '@/engine/lookup'
import { totals, validated, VALUE_STATUSES, VALUE_TYPES } from '@/engine/valueLedger'
import { BRAND } from '@/config/brand'
import { Logo } from '@/components/Shell'
import { Button, SimulatedTag, VALUE_TYPE_LABEL } from '@/components/ui/primitives'

const STATUS_LABEL = { identified: 'Identified', committed: 'Committed', realised: 'Realised', validated: 'Finance-validated' } as const

/** Print-styled board pack (spec 7.4). Rendered without the app shell so it prints cleanly. */
export function BoardPack() {
  const db = useDb()
  const ctx = useCtx()
  const users = useTenantUsers()
  const signals = useVisibleSignals()
  const rt = useNexus((s) => s.signals)
  const value = useValue()
  const t = totals(value)
  const open = signals.filter((s) => !['resolved', 'dismissed'].includes(rt[s.id].status))
  const risks = open.map((s) => ({ s, i: impactOf(db, s, rt[s.id].done, ctx) })).filter((x) => x.i).sort((a, b) => b.i!.inrAtRisk - a.i!.inrAtRisk).slice(0, 5)
  const wins = value.filter((e) => e.status !== 'identified').sort((a, b) => b.amountInr - a.amountInr).slice(0, 5)
  const launches = new Map<string, number>()
  for (const s of open.filter((x) => x.recommendations.length)) {
    if (s.type === 'shipment_delay') shipmentDetail(db, s, rt[s.id].done).projectSlips.forEach((p) => launches.set(p.projectId, Math.max(launches.get(p.projectId) ?? 0, p.gate?.slipDays ?? p.slipDays)))
    if (s.type === 'tool_trial_fail') { const k = toolState(db, s, rt[s.id].done); launches.set(k.feeds.id, Math.max(launches.get(k.feeds.id) ?? 0, k.gateSlip)) }
  }
  const atRisk = [...launches].filter(([, d]) => d > 0)
  const maxStatus = Math.max(1, ...VALUE_STATUSES.map((s) => t.byStatus[s]))
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id

  return (
    <div className="min-h-full bg-bg print:bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link to="/value" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"><ArrowLeft size={15} /> Value Ledger</Link>
          <div className="flex items-center gap-2">
            <SimulatedTag what="email to board" />
            <Button onClick={() => toast.success('Board pack sent to the board distribution list')}><Mail size={15} /> Email to board</Button>
            <Button variant="primary" onClick={() => window.print()}><Printer size={15} /> Print</Button>
          </div>
        </div>

        <article className="rounded-[var(--radius-card)] border border-line bg-surface p-8 shadow-card print:border-0 print:p-0 print:shadow-none">
          <header className="mb-8 flex items-start justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">Board pack</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{db.tenant.name}</h1>
              <p className="mt-1 text-sm text-ink-2">Value delivered and open risks, as of {fmtDate(DEMO_TODAY)}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-2"><Logo size={28} /> {BRAND.full}</div>
          </header>

          <section className="mb-8 grid grid-cols-3 gap-4">
            <Fig label="Delivered FYTD" value={fmtInr(t.total - t.byStatus.identified)} />
            <Fig label="Finance-validated" value={fmtInr(validated(value))} />
            <Fig label="ROI on Nexus" value={`${(validated(value) / db.subscriptionFeeInr).toFixed(1)}×`} />
          </section>

          <Section title="Value waterfall">
            <ul className="space-y-2">
              {VALUE_STATUSES.map((s) => (
                <li key={s} className="grid grid-cols-[9rem_1fr_6rem] items-center gap-3 text-sm">
                  <span className="text-ink-2">{STATUS_LABEL[s]}</span>
                  <span className="h-2.5 rounded-full bg-surface-2"><span className="block h-full rounded-full bg-accent" style={{ width: `${(t.byStatus[s] / maxStatus) * 100}%` }} /></span>
                  <span className="num text-right text-ink">{fmtInr(t.byStatus[s])}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-3">By type: {VALUE_TYPES.map((k) => `${VALUE_TYPE_LABEL[k]} ${fmtInr(t.byType[k])}`).join(' · ')}</p>
          </Section>

          <Section title="Top 5 wins">
            <Rows rows={wins.map((e) => [e.lever, `${VALUE_TYPE_LABEL[e.type]} · ${name(e.ownerId)} · ${STATUS_LABEL[e.status]}`, fmtInr(e.amountInr)])} empty="No value booked yet." />
          </Section>

          <Section title="Top 5 open risks">
            <Rows rows={risks.map(({ s, i }) => [s.title, `${s.id} · ${i!.inrLabel}`, fmtInr(i!.inrAtRisk)])} empty="No open quantified risks." />
          </Section>

          <Section title="Launches at risk">
            <Rows rows={atRisk.map(([pid, d]) => { const p = getProject(db, pid); return [p.title, `${p.id} · ${p.nextGate?.name ?? 'Next gate'} ${p.nextGate ? fmtDate(p.nextGate.planned) : ''}`, `+${d} days`] })} empty="All gates hold." />
          </Section>

          <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-3">Every figure is computed from module and SAP data in {BRAND.full}. Concept demo with fictional data.</footer>
        </article>
      </div>
    </div>
  )
}

const Fig = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-line p-4"><div className="text-xs text-ink-3">{label}</div><div className="num mt-1 text-xl font-semibold text-ink">{value}</div></div>
)
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8 break-inside-avoid"><h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>{children}</section>
)
const Rows = ({ rows, empty }: { rows: string[][]; empty: string }) => rows.length === 0 ? <p className="text-sm text-ink-2">{empty}</p> : (
  <ol className="divide-y divide-line">
    {rows.map(([a, b, c], i) => (
      <li key={i} className="flex items-baseline gap-3 py-2 text-sm">
        <span className="num w-5 text-xs text-ink-3">{i + 1}</span>
        <span className="min-w-0 flex-1"><span className="block text-ink">{a}</span><span className="block text-xs text-ink-3">{b}</span></span>
        <span className="num font-semibold text-ink">{c}</span>
      </li>
    ))}
  </ol>
)
