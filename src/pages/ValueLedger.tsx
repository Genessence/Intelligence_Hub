import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, FileText, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import type { Db, ValueEntry } from '@/data/types'
import { useNexus, useCurrentUser, useDb, useTenantUsers, useValue } from '@/store/useNexus'
import { fmtDateTime, fmtInr, plural } from '@/engine/format'
import { getPart, getPlant, getRole } from '@/engine/lookup'
import { delivered, totals, validated, VALUE_STATUSES, VALUE_TYPES } from '@/engine/valueLedger'
import { PageHeader } from '@/components/Shell'
import { Button, Card, cx, Empty, Num, VALUE_TYPE_LABEL, ValueStatusBadge } from '@/components/ui/primitives'
import { VALUE_COLOR } from './CommandCenter'

const STATUS_LABEL = { identified: 'Identified', committed: 'Committed', realised: 'Realised', validated: 'Finance-validated' } as const

/** Sourcing category of an entry: the signal's commodity, else its first part's L4, else a target name in its text. */
export function categoryOf(db: Db, e: ValueEntry): string {
  const s = db.signals.find((x) => x.id === e.signalId)
  const c = s?.entityRefs.find((r) => r.kind === 'commodity')?.id
  if (c) return c
  const p = s?.entityRefs.find((r) => r.kind === 'part')?.id
  if (p) { try { return getPart(db, p).commodityHierarchy.l4 } catch { /* fall through */ } }
  const text = `${s?.title ?? ''} ${e.baseline.value} ${e.formula}`.toLowerCase()
  return Object.keys(db.savingsTargetsInr).find((k) => text.includes(k.toLowerCase())) ?? 'Other'
}

type Group = 'type' | 'lever' | 'plant' | 'person'

export function ValueLedger() {
  const db = useDb()
  const value = useValue()
  const users = useTenantUsers()
  const user = useCurrentUser()!
  const setValueStatus = useNexus((s) => s.setValueStatus)
  const [group, setGroup] = useState<Group>('type')
  const canValidate = getRole(db, user.roleId).approvals.some((a) => a.type === 'value_validation')
  const t = totals(value)
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id

  if (value.length === 0) return (<><PageHeader title="Value Ledger" /><Card><Empty icon={<Wallet size={28} />} title="No value booked yet" body="Complete a recommended workflow on a signal and Nexus books its value here as Committed." /></Card></>)

  const waterfall = VALUE_STATUSES.map((s) => ({ s: STATUS_LABEL[s], v: t.byStatus[s], key: s }))
  const keyOf: Record<Group, (e: ValueEntry) => string> = {
    type: (e) => VALUE_TYPE_LABEL[e.type],
    lever: (e) => e.lever,
    plant: (e) => { try { return e.plant ? `${getPlant(db, e.plant).name} (${e.plant})` : 'Group' } catch { return e.plant ?? 'Group' } },
    person: (e) => name(e.ownerId),
  }
  const grouped = Object.entries(value.reduce<Record<string, number>>((a, e) => { const k = keyOf[group](e); a[k] = (a[k] ?? 0) + e.amountInr; return a }, {})).sort((a, b) => b[1] - a[1])
  const max = grouped[0]?.[1] ?? 1
  const targets = Object.entries(db.savingsTargetsInr).map(([cat, target]) => {
    const got = value.filter((e) => (e.type === 'hard' || e.type === 'avoidance') && e.status !== 'identified' && categoryOf(db, e) === cat).reduce((a, e) => a + e.amountInr, 0)
    return { cat, target, got }
  })
  const roi = validated(value) / db.subscriptionFeeInr

  return (
    <>
      <PageHeader
        title="Value Ledger"
        sub="Every rupee Nexus helped protect or save. Values move from Committed to Realised when SAP evidence arrives, then Finance validates them."
        actions={<Link to="/value/board"><Button><FileText size={15} /> Board pack</Button></Link>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Delivered FYTD" value={fmtInr(delivered(value))} source="Committed, realised and validated entries" sub={`${fmtInr(t.byStatus.identified)} more identified`} />
        <Stat label="Finance-validated" value={fmtInr(t.byStatus.validated)} source="Validated by the CFO or Finance Controller" sub={`${fmtInr(t.byStatus.realised)} awaiting validation`} />
        <Stat label="ROI on Nexus" value={`${roi.toFixed(1)}×`} source="Validated value ÷ annual subscription (tenant config)" sub={`on ${fmtInr(db.subscriptionFeeInr)} a year`} />
        <Stat label="Hard saving + avoidance" value={fmtInr(t.byType.hard + t.byType.avoidance)} source="Value Ledger by type" sub={`of ${fmtInr(Object.values(db.savingsTargetsInr).reduce((a, x) => a + x, 0))} FY target`} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="From identified to validated, FYTD">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfall} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="s" tick={{ fill: 'var(--text-3)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 12 }} tickLine={false} axisLine={false} width={64} tickFormatter={(n) => fmtInr(n)} />
                <RTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }} formatter={(n: number) => fmtInr(n)} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]} name="Value">
                  {waterfall.map((w) => <Cell key={w.key} fill={w.key === 'validated' ? 'var(--resolved)' : w.key === 'realised' ? 'var(--accent)' : w.key === 'committed' ? 'var(--info)' : 'var(--border-strong)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-ink-3">Identified is an estimate. Committed means a workflow was completed. Realised needs SAP evidence (for example a GRN at the new price). Only Finance can validate.</p>
        </Card>
        <Card title="Value by" action={
          <div className="flex rounded-lg border border-line p-0.5 text-xs" role="radiogroup" aria-label="Group value by">
            {(['type', 'lever', 'plant', 'person'] as Group[]).map((g) => <button key={g} role="radio" aria-checked={group === g} onClick={() => setGroup(g)} className={cx('rounded-md px-2 py-0.5 capitalize', group === g ? 'bg-surface-2 text-ink' : 'text-ink-3 hover:text-ink')}>{g}</button>)}
          </div>
        }>
          <ul className="space-y-2.5">
            {grouped.slice(0, 7).map(([k, v]) => (
              <li key={k}>
                <div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate text-ink-2">{k}</span><span className="num text-ink">{fmtInr(v)}</span></div>
                <div className="h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${(v / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Savings vs target by sourcing category" action={<span className="text-xs text-ink-3">Hard saving and cost avoidance, committed or later</span>}>
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {targets.map(({ cat, target, got }) => (
              <li key={cat}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-ink-2">{cat}</span><span className="num text-ink">{fmtInr(got)} <span className="text-ink-3">of {fmtInr(target)}</span></span></div>
                <div className="h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (got / target) * 100)}%`, background: got >= target ? 'var(--resolved)' : 'var(--accent)' }} /></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="By value type">
          <ul className="space-y-2 text-sm">
            {VALUE_TYPES.map((k) => <li key={k} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: VALUE_COLOR[k] }} aria-hidden /><span className="flex-1 text-ink-2">{VALUE_TYPE_LABEL[k]}</span><span className="num font-medium text-ink">{fmtInr(t.byType[k])}</span></li>)}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Types are kept apart. Nexus never adds them into one savings number without this split.</p>
        </Card>
      </div>

      <Card title={plural(value.length, 'entry', 'entries')} pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-ink-3">
              <tr className="border-b border-line">{['Entry', 'Type and lever', 'Formula and baseline', 'Evidence', 'Owner', 'Status', 'Amount'].map((h) => <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {[...value].reverse().map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 align-top"><div className="font-mono text-xs text-ink">{e.id}</div>{e.signalId && <Link to={`/signals/${e.signalId}`} className="font-mono text-xs text-accent-ink hover:underline">{e.signalId}</Link>}</td>
                  <td className="px-4 py-3 align-top"><div className="text-ink">{VALUE_TYPE_LABEL[e.type]}</div><div className="text-xs text-ink-2">{e.lever}</div></td>
                  <td className="num max-w-xs px-4 py-3 align-top text-xs text-ink-2">{e.formula}<div className="text-ink-3">Baseline: {e.baseline.kind}, {e.baseline.value}</div></td>
                  <td className="px-4 py-3 align-top text-xs text-ink-2">{e.evidence.length ? e.evidence.map((x) => <div key={x}>{x}</div>) : <span className="text-ink-3">Waiting for SAP evidence</span>}</td>
                  <td className="px-4 py-3 align-top"><div className="text-ink">{name(e.ownerId)}</div><div className="num text-xs text-ink-3">{fmtDateTime(e.at)}</div></td>
                  <td className="px-4 py-3 align-top">
                    <ValueStatusBadge s={e.status} />
                    {e.validatedBy && <div className="mt-1 text-xs text-ink-3">by {name(e.validatedBy)}</div>}
                    {e.status === 'realised' && canValidate && <Button size="sm" variant="primary" className="mt-1.5" onClick={() => setValueStatus(e.id, 'validated')}><BadgeCheck size={13} /> Validate</Button>}
                  </td>
                  <td className="num px-4 py-3 text-right align-top font-semibold text-ink">{fmtInr(e.amountInr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

function Stat({ label, value, source, sub }: { label: string; value: string; source: string; sub?: string }) {
  return (
    <Card>
      <div className="text-xs text-ink-3">{label}</div>
      <Num source={source} className="mt-1 inline-block text-xl font-semibold text-ink">{value}</Num>
      {sub && <div className="mt-0.5 text-xs text-ink-2">{sub}</div>}
    </Card>
  )
}
