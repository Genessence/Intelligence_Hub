import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, LogIn, Plus, ScrollText, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser, useDb, useNexus, useTenantUsers, useValue, useVisibleSignals } from '@/store/useNexus'
import type { Db, RoleTemplate, Scope, Severity, SignalType, UserProfile } from '@/data/types'
import { computeAudience } from '@/engine/audience'
import { KPIS, defaultLayout } from '@/engine/kpis'
import { fmtDate, fmtDateTime, fmtInr, fmtNum } from '@/engine/format'
import { getRole } from '@/engine/lookup'
import { landingFor } from '@/config/routes'
import { PageHeader } from '@/components/Shell'
import { Modal } from '@/pages/ImpactExplorer'
import { Avatar, Button, Card, cx, Empty, Kv, ModuleBadge, SapRef, SimulatedTag } from '@/components/ui/primitives'

const SIGNAL_TYPES: SignalType[] = ['shipment_delay', 'commodity_spike', 'tool_trial_fail', 'supplier_quality', 'demand_uplift', 'pass_through', 'ecn_obsolescence', 'vendor_compliance', 'capex_delay']
const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical']
const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
const CHANNELS = ['In-app', 'Email', 'Teams', 'WhatsApp']

/** Role template with any saved edits from People & Roles applied. */
function useRole(db: Db) {
  const overrides = useNexus((s) => s.roleOverrides)
  return (id: string): RoleTemplate => ({ ...getRole(db, id), ...overrides[id] })
}

// --- Rules -------------------------------------------------------------------

const RULE_TEXT: Record<string, string> = {
  'R-EXIM-ETA-SLIP': 'WHEN a shipment ETA moves later than plan AND a part on it is below cover before arrival THEN notify EXIM, Planning, the plant and owners of projects that need the part',
  'R-COST-INDEX-5PCT': 'WHEN a commodity index changes more than 5% in 14 days AND part sensitivity > 0.3 THEN notify Sourcing owner + NPD PM of projects in PP Pricing, severity High',
  'R-COST-INDEX-3PCT': 'WHEN a commodity index changes more than 3% in 14 days AND part sensitivity > 0.3 THEN notify Sourcing and Cost Engineering',
  'R-COST-PASSTHROUGH': 'WHEN the quarterly index average falls AND POs raised after the fall keep the old price THEN notify the category manager and Finance with the recoverable amount',
  'R-NTD-TRIAL-FAIL': 'WHEN a tool trial fails THEN notify Tooling, NPD and the owner of the gate the tool feeds',
  'R-QM-REJECTION': 'WHEN weekly GRs into blocked stock (103) plus returns (122) exceed 1% of receipts (101) THEN notify Quality, Sourcing and the plant',
  'R-ECN-EXCESS': 'WHEN an ECN supersedes a part AND stock + open POs exceed demand to cut-in THEN notify Stores, Planning, the buyer and Finance',
  'R-DEMAND-UPLIFT': 'WHEN a demand data drop exceeds plan AND a constrained part or capacity cannot cover it THEN notify Planning, Sourcing and the plant',
  'R-VMS-DOC-EXPIRY': 'WHEN a vendor compliance document expires within 7 days THEN notify the category manager and SQE',
  'R-HISTORY': 'Historical rules that raised resolved signals',
}
const EXTRA_RULES: [string, string][] = [
  ['R-PLIFZ-DRIFT', 'WHEN average GRN delay days over 90 days > 30% of planned delivery time (MARC-PLIFZ) THEN suggest a MARC-PLIFZ update (write-back, Simulated) to the Planner'],
  ['R-CAPEX-LATE', 'WHEN a capex machine delivery slips more than 14 days AND it enables capacity for a planned part THEN notify the plant head and Planning'],
]

export function Rules() {
  const db = useDb()
  const signals = useVisibleSignals()
  const { ruleToggles, toggleRule, customRules, addRule } = useNexus()
  const [open, setOpen] = useState(false)
  const ids = [...new Set(db.signals.map((s) => s.ruleId))]
  const rows = [
    ...ids.map((id) => {
      const fired = signals.filter((s) => s.ruleId === id)
      return { id, text: RULE_TEXT[id] ?? id, count: fired.length, last: fired.map((s) => s.raisedAt).sort().slice(-1)[0] }
    }),
    ...EXTRA_RULES.map(([id, text]) => ({ id, text, count: 0, last: undefined as string | undefined })),
    ...customRules.map((r) => ({ id: r.id, text: `WHEN ${r.when} THEN ${r.then}, severity ${r.severity}`, count: 0, last: undefined as string | undefined })),
  ]
  return (
    <>
      <PageHeader title="Rules" sub="What makes a system event a signal, and who it goes to. Audiences are computed from role and scope, so rules never list people." actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={15} /> New rule</Button>} />
      <Card pad={false}>
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const on = ruleToggles[r.id] ?? true
            return (
              <li key={r.id} className="flex flex-wrap items-start gap-4 px-4 py-3">
                <button role="switch" aria-checked={on} aria-label={`${r.id} ${on ? 'on' : 'off'}`} onClick={() => toggleRule(r.id)} className={cx('mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors', on ? 'bg-accent-strong' : 'bg-line-strong')}><span className={cx('size-4 rounded-full bg-surface transition-transform', on && 'translate-x-4')} /></button>
                <div className="min-w-0 flex-1"><div className="font-mono text-xs text-ink-3">{r.id}</div><div className={cx('mt-0.5 text-sm', on ? 'text-ink' : 'text-ink-3')}>{r.text}</div></div>
                <div className="w-44 text-right text-xs text-ink-3"><div className="num">Fired {fmtNum(r.count)} {r.count === 1 ? 'time' : 'times'}</div><div>{r.last ? `Last ${fmtDateTime(r.last)}` : 'Not fired yet'}</div></div>
              </li>
            )
          })}
        </ul>
      </Card>
      <NewRule open={open} onClose={() => setOpen(false)} onSave={(r) => { addRule(r); setOpen(false); toast.success('Rule saved') }} />
    </>
  )
}

function NewRule({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (r: { when: string; then: string; severity: string }) => void }) {
  const [source, setSource] = useState('Commodity index')
  const [cond, setCond] = useState('changes more than 5% in 14 days')
  const [then, setThen] = useState('notify the Sourcing owner and Cost Engineering')
  const [sev, setSev] = useState('high')
  const sel = 'h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink'
  return (
    <Modal open={open} onClose={onClose} title="New rule" description="Pick the event and the action. Nexus works out the audience from role and scope.">
      <div className="mt-4 space-y-3 text-sm">
        <label className="block"><span className="text-xs text-ink-3">When</span><select className={sel} value={source} onChange={(e) => setSource(e.target.value)}>{['Commodity index', 'Shipment ETA', 'GRN rejections (103 + 122)', 'Stock cover (MARD-LABST)', 'Capex delivery', 'Data drop value'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block"><span className="text-xs text-ink-3">Condition</span><input className={sel} value={cond} onChange={(e) => setCond(e.target.value)} /></label>
        <label className="block"><span className="text-xs text-ink-3">Then</span><input className={sel} value={then} onChange={(e) => setThen(e.target.value)} /></label>
        <label className="block"><span className="text-xs text-ink-3">Severity</span><select className={sel} value={sev} onChange={(e) => setSev(e.target.value)}>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => onSave({ when: `${source} ${cond}`, then, severity: sev })}>Save rule</Button></div>
    </Modal>
  )
}

// --- Audit -------------------------------------------------------------------

export function Audit() {
  const audit = useNexus((s) => s.audit)
  const users = useTenantUsers()
  const [who, setWho] = useState('all')
  const [wbOnly, setWbOnly] = useState(false)
  const [q, setQ] = useState('')
  const rows = audit.slice().reverse().filter((a) => (who === 'all' || a.userId === who) && (!wbOnly || a.writeBack) && `${a.action} ${a.detail} ${a.signalId ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Audit Trail" sub="Append-only. Every sign-in, action, approval, value booking and SAP write-back, in order." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={who} onChange={(e) => setWho(e.target.value)} className="h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink" aria-label="Filter by person"><option value="all">Everyone</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <label className="flex h-8 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink"><input type="checkbox" checked={wbOnly} onChange={(e) => setWbOnly(e.target.checked)} className="accent-[var(--accent)]" /> SAP write-backs only</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-8 w-56 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink outline-none placeholder:text-ink-3" aria-label="Search audit" />
      </div>
      <Card pad={false}>
        {rows.length === 0 ? <Empty icon={<ScrollText size={26} />} title="Nothing logged yet" body="Sign in, acknowledge a signal or run a workflow; every step lands here." /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-ink-3">{['Entry', 'When', 'Who', 'Action', 'Detail', 'Signal'].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{rows.map((a) => (
              <tr key={a.id} className="align-top"><td className="px-4 py-2 font-mono text-xs text-ink-3">{a.id}</td><td className="num px-4 py-2 text-xs whitespace-nowrap text-ink-2">{fmtDateTime(a.at)}</td><td className="px-4 py-2 whitespace-nowrap text-ink">{users.find((u) => u.id === a.userId)?.name ?? 'System'}</td><td className="px-4 py-2 text-ink">{a.action}{a.writeBack && <span className="ml-1.5 rounded bg-info-bg px-1.5 text-xs text-info">SAP write-back</span>}</td><td className="px-4 py-2 text-ink-2">{a.detail}</td><td className="px-4 py-2 font-mono text-xs text-ink-3">{a.signalId ?? ''}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  )
}

// --- Scope picker (shared by People and Onboarding) --------------------------

function scopeOptions(db: Db) {
  const pg = new Set<string>(), mrp = new Set<string>(), l4 = new Set<string>()
  db.parts.forEach((p) => { l4.add(p.commodityHierarchy.l4); p.plants.forEach((x) => { pg.add(x.purchasingGroup); mrp.add(x.mrpController) }) })
  const customers = new Set<string>([...db.productModels.map((m) => m.customer), ...db.projects.flatMap((p) => (p.customer ? [p.customer] : []))])
  return {
    plants: db.plants.map((p) => [p.sapPlant, `${p.sapPlant} ${p.name}`]),
    purchasingGroups: [...pg].sort().map((x) => [x, x]),
    mrpControllers: [...mrp].sort().map((x) => [x, x]),
    commodities: [...l4].sort().map((x) => [x, x]),
    projects: db.projects.map((p) => [p.id, p.id]),
    vendors: db.vendors.map((v) => [v.sapVendor, `${v.name} (${v.sapVendor})`]),
    customers: [...customers].map((c) => [c, c]),
  } as Record<keyof Omit<Scope, 'all' | 'shipmentsAll'>, [string, string][]>
}
const SCOPE_META: [keyof Omit<Scope, 'all' | 'shipmentsAll'>, string, string | null][] = [
  ['plants', 'Plants', 'MARC-WERKS'], ['purchasingGroups', 'Purchasing groups', 'EKKO-EKGRP'], ['mrpControllers', 'MRP controllers', 'MARC-DISPO'],
  ['commodities', 'Commodities (L4)', 'Material Master:L4 Commodity'], ['projects', 'Projects', null], ['vendors', 'Vendors', 'LFA1-LIFNR'], ['customers', 'Customers (OBU)', 'Material Master:OBU Customer'],
]
export const emptyScope = (): Scope => ({ plants: [], purchasingGroups: [], mrpControllers: [], commodities: [], projects: [], vendors: [], customers: [] })

function ScopePicker({ scope, onChange }: { scope: Scope; onChange: (s: Scope) => void }) {
  const db = useDb()
  const opts = useMemo(() => scopeOptions(db), [db])
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={!!scope.all} onChange={(e) => onChange({ ...scope, all: e.target.checked })} className="accent-[var(--accent)]" /> All (leadership scope)</label>
      {!scope.all && SCOPE_META.map(([k, label, code]) => (
        <div key={k}>
          <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-3">{label}{code && <SapRef code={code} />}</div>
          <div className="flex flex-wrap gap-1.5">{opts[k].map(([v, l]) => {
            const on = scope[k].includes(v)
            return <button key={v} type="button" aria-pressed={on} onClick={() => onChange({ ...scope, [k]: on ? scope[k].filter((x) => x !== v) : [...scope[k], v] })} className={cx('h-7 rounded-full border px-2.5 text-xs', on ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink-2 hover:text-ink')}>{l}</button>
          })}</div>
        </div>
      ))}
    </div>
  )
}

const scopeSummary = (db: Db, s: Scope) => s.all ? 'All' : s.shipmentsAll ? 'All import shipments' : [
  s.plants.length && `Plant ${s.plants.join(', ')}`, s.purchasingGroups.length && `PG ${s.purchasingGroups.join(', ')}`, s.mrpControllers.length && `MRP ${s.mrpControllers.join(', ')}`,
  s.commodities.length && s.commodities.join(', '), s.projects.length && s.projects.join(', '),
  s.vendors.length && s.vendors.map((v) => db.vendors.find((x) => x.sapVendor === v)?.name ?? v).join(', '), s.customers.length && s.customers.join(', '),
].filter(Boolean).join(' · ') || 'No scope'

// --- People & Roles ------------------------------------------------------------

export function People() {
  const db = useDb()
  const role = useRole(db)
  const users = useTenantUsers()
  const [tab, setTab] = useState<'users' | 'roles' | 'audience' | 'access'>('users')
  return (
    <>
      <PageHeader title="People & Roles" sub="Every employee has a profile. A role template gives defaults, a scope says what is theirs, and Nexus computes what each person sees." />
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist">{([['users', `Users (${users.length})`], ['roles', 'Role templates'], ['audience', 'Audience preview'], ['access', 'Field access']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('h-8 rounded-full border px-3 text-xs font-medium', tab === k ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink-2')}>{l}</button>)}</div>
      {tab === 'users' && <Users />}
      {tab === 'roles' && <Roles />}
      {tab === 'audience' && <AudiencePreview />}
      {tab === 'access' && <FieldAccess role={role} />}
    </>
  )
}

function Users() {
  const db = useDb()
  const users = useTenantUsers()
  const nav = useNavigate()
  const { login, addUser, updateUser, tenantId } = useNexus()
  const [adding, setAdding] = useState(false)
  const [delegateFor, setDelegateFor] = useState<UserProfile | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const signIn = (u: UserProfile) => { login(u.id); nav(u.onboarded === false ? '/onboarding' : landingFor(u.roleId)) }
  return (
    <>
      <div className="mb-3 flex justify-end"><Button variant="primary" onClick={() => setAdding(true)}><UserPlus size={15} /> Add user</Button></div>
      {justAdded && (() => { const u = users.find((x) => x.id === justAdded); return u && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink"><Check size={16} /> {u.name} added. Nexus will route matching signals to them straight away.<Button size="sm" variant="primary" className="ml-auto" onClick={() => signIn(u)}><LogIn size={14} /> Sign in as {u.name.split(' ')[0]}</Button></div>
      ) })()}
      <Card pad={false}>
        <ul className="divide-y divide-line">{users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <Avatar name={u.name} size={30} />
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-sm font-medium text-ink">{u.name}{u.addedInDemo && <span className="rounded bg-accent-soft px-1 text-xs text-accent-ink">new</span>}</div><div className="truncate text-xs text-ink-2">{u.title} · {getRole(db, u.roleId).name}</div></div>
            <div className="hidden w-72 truncate text-xs text-ink-3 lg:block">{scopeSummary(db, u.scope)}</div>
            <div className="w-40 text-xs text-ink-3">{u.delegate ? `Delegate ${users.find((x) => x.id === u.delegate!.userId)?.name ?? ''}, ${fmtDate(u.delegate.from)} to ${fmtDate(u.delegate.to)}` : ''}</div>
            <Button size="sm" variant="ghost" onClick={() => setDelegateFor(u)}>Delegate</Button>
            <Button size="sm" onClick={() => signIn(u)}><LogIn size={14} /> Sign in</Button>
          </li>
        ))}</ul>
      </Card>
      <AddUser open={adding} onClose={() => setAdding(false)} onAdd={(u) => { const id = `u-new-${users.length + 1}-${u.name.split(' ')[0].toLowerCase()}`; addUser({ ...u, id, tenantId, onboarded: false }); setJustAdded(id); setAdding(false); toast.success(`${u.name} added`) }} />
      {delegateFor && <DelegateDialog user={delegateFor} users={users} onClose={() => setDelegateFor(null)} onSave={(d) => { updateUser(delegateFor.id, { delegate: d }); setDelegateFor(null) }} />}
    </>
  )
}

function AddUser({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (u: Omit<UserProfile, 'id'>) => void }) {
  const db = useDb()
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [roleId, setRoleId] = useState('sqe')
  const [scope, setScope] = useState<Scope>(emptyScope())
  const sundara = db.vendors.find((v) => v.id === 'v-sundara')
  const demo = () => { setName('Ritu Sharma'); setTitle('Supplier Quality Engineer, Rajpura'); setRoleId('sqe'); setScope({ ...emptyScope(), plants: ['1001'], commodities: ['BLDC Motor'], vendors: sundara ? [sundara.sapVendor] : [] }) }
  const inp = 'h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm text-ink'
  return (
    <Modal open={open} onClose={onClose} title="Add a user" description="Role template plus scope. No rule or signal needs editing.">
      <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {sundara && <button onClick={demo} className="w-full rounded-lg border border-dashed border-accent px-3 py-2 text-left text-xs text-accent-ink hover:bg-accent-soft">Fill the demo user: Supplier Quality Engineer, plant 1001, BLDC Motor, Sundara Precision Components</button>}
        <label className="block text-xs text-ink-3">Name<input className={inp} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block text-xs text-ink-3">Title<input className={inp} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="block text-xs text-ink-3">Role template<select className={inp} value={roleId} onChange={(e) => setRoleId(e.target.value)}>{db.roles.filter((r) => r.status !== 'Roadmap').map((r) => <option key={r.id} value={r.id}>{r.function}: {r.name}</option>)}</select></label>
        <ScopePicker scope={scope} onChange={setScope} />
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={() => onAdd({ name: name.trim(), title: title.trim() || getRole(db, roleId).name, roleId, scope })}>Add user</Button></div>
    </Modal>
  )
}

function DelegateDialog({ user, users, onClose, onSave }: { user: UserProfile; users: UserProfile[]; onClose: () => void; onSave: (d: UserProfile['delegate']) => void }) {
  const [to, setTo] = useState(user.delegate?.userId ?? '')
  const [from, setFrom] = useState(user.delegate?.from ?? '2026-11-16')
  const [until, setUntil] = useState(user.delegate?.to ?? '2026-11-20')
  const inp = 'h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm text-ink'
  return (
    <Modal open onClose={onClose} title={`Delegate for ${user.name}`} description="While they are away, their signals and approvals route to the delegate too.">
      <div className="mt-4 space-y-3">
        <label className="block text-xs text-ink-3">Delegate<select className={inp} value={to} onChange={(e) => setTo(e.target.value)}><option value="">None</option>{users.filter((u) => u.id !== user.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs text-ink-3">From<input type="date" className={inp} value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="text-xs text-ink-3">To<input type="date" className={inp} value={until} onChange={(e) => setUntil(e.target.value)} /></label></div>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => onSave(to ? { userId: to, from, to: until } : undefined)}>Save</Button></div>
    </Modal>
  )
}

function Roles() {
  const db = useDb()
  const role = useRole(db)
  const setOverride = useNexus((s) => s.setRoleOverride)
  const [id, setId] = useState(db.roles[0].id)
  const r = role(id)
  const sub = (t: SignalType) => r.subscribes.find((x) => x.signalType === t)
  const setSub = (t: SignalType, min: Severity | null) => setOverride(id, { subscribes: [...r.subscribes.filter((x) => x.signalType !== t), ...(min ? [{ signalType: t, minSeverity: min }] : [])] })
  const kpis = defaultLayout(r.defaultKpis)
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <Card pad={false} className="lg:col-span-1"><ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">{db.roles.map((x) => <li key={x.id}><button onClick={() => setId(x.id)} className={cx('flex w-full items-center justify-between px-3 py-2 text-left text-sm', id === x.id ? 'bg-accent-soft text-accent-ink' : 'text-ink hover:bg-surface-2')}><span><span className="block">{x.name}</span><span className="block text-xs text-ink-3">{x.function}</span></span>{x.status && <ModuleBadge s={x.status} />}</button></li>)}</ul></Card>
      <div className="space-y-4 lg:col-span-3">
        <Card title={`Subscriptions: ${r.name}`} action={<span className="text-xs text-ink-3">Saved as you change them</span>}>
          {r.status === 'Roadmap' ? <p className="text-sm text-ink-2">Vendors stay in the Vendor Portal. Nexus shows which signals are shared with them there. <SimulatedTag what="vendor sharing" /></p> : (
            <table className="w-full text-sm"><tbody className="divide-y divide-line">{SIGNAL_TYPES.map((t) => (
              <tr key={t}><td className="py-2 text-ink">{typeLabel(t)}</td><td className="py-2 text-right"><select value={sub(t)?.minSeverity ?? ''} onChange={(e) => setSub(t, (e.target.value || null) as Severity | null)} className="h-8 rounded-md border border-line bg-surface px-2 text-xs text-ink" aria-label={`${typeLabel(t)} minimum severity`}><option value="">Not subscribed</option>{SEVERITIES.map((s) => <option key={s} value={s}>{s} and above</option>)}</select></td></tr>
            ))}</tbody></table>
          )}
          <p className="mt-3 text-xs text-ink-3">Edits here are saved for the template and re-route signals at once: the computed audience reads the edited subscriptions.</p>
        </Card>
        <Card title="Default dashboard KPIs">
          <div className="flex flex-wrap gap-1.5">{KPIS.map((k) => { const on = kpis.includes(k.id); return <button key={k.id} aria-pressed={on} onClick={() => setOverride(id, { defaultKpis: on ? kpis.filter((x) => x !== k.id) : [...kpis, k.id] })} className={cx('h-7 rounded-full border px-2.5 text-xs', on ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink-2')}>{k.label}</button> })}</div>
        </Card>
        <Card title="Approvals and access">
          <dl className="divide-y divide-line">
            <Kv label="Can approve">{r.approvals.length ? r.approvals.map((a) => `${typeLabel(a.type)}${a.limitInr ? ` up to ${fmtInr(a.limitInr)}` : ''}`).join(', ') : 'Nothing'}</Kv>
            <Kv label="Lands on">{r.landing === '/' ? 'Command Center' : r.landing}</Kv>
            <Kv label="Permissions">{r.permissions.join(', ') || 'None'}</Kv>
          </dl>
        </Card>
      </div>
    </div>
  )
}

function AudiencePreview() {
  const db = useDb()
  const users = useTenantUsers()
  const signals = useVisibleSignals().filter((s) => s.ruleId !== 'R-HISTORY')
  const [id, setId] = useState(signals[0]?.id ?? '')
  const s = signals.find((x) => x.id === id)
  const aud = s ? computeAudience(db, users, s) : []
  return (
    <Card title="Who would be told, and why">
      <select value={id} onChange={(e) => setId(e.target.value)} className="h-9 w-full max-w-xl rounded-lg border border-line bg-surface px-2 text-sm text-ink" aria-label="Pick a signal">{signals.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.title}</option>)}</select>
      <ul className="mt-4 divide-y divide-line">{aud.map((r) => { const u = users.find((x) => x.id === r.userId)!; return (
        <li key={r.userId} className="flex items-start gap-3 py-2.5"><Avatar name={u.name} size={28} /><div><div className="text-sm text-ink">{u.name} <span className="text-xs text-ink-3">· {getRole(db, u.roleId).name}</span></div><div className="text-xs text-ink-2">{r.reasons.join('; ')}</div></div></li>
      ) })}</ul>
      {s && aud.length === 0 && <p className="mt-3 text-sm text-ink-2">No one in this tenant has this signal in scope.</p>}
    </Card>
  )
}

function FieldAccess({ role }: { role: (id: string) => RoleTemplate }) {
  const db = useDb()
  const cols: [string, string, (p: string[]) => 'Full' | 'Read' | 'Hidden'][] = [
    ['Prices and PO values', 'EKPO-NETPR', (p) => (p.includes('all') || p.includes('sourcing') || p.includes('cost') || p.includes('finance') ? 'Full' : p.includes('npd') || p.includes('plant') ? 'Read' : 'Hidden')],
    ['Stock and MRP', 'MARD-LABST', (p) => (p.length ? (p.includes('all') || p.includes('planning') || p.includes('plant') ? 'Full' : 'Read') : 'Hidden')],
    ['Vendor master (bank, PAN)', 'LFA1-LIFNR', (p) => (p.includes('all') || p.includes('finance') ? 'Full' : p.includes('sourcing') || p.includes('quality') ? 'Read' : 'Hidden')],
    ['Capex budgets', 'ANLC-KANSW', (p) => (p.includes('all') || p.includes('finance') ? 'Full' : p.includes('plant') ? 'Read' : 'Hidden')],
    ['Value Ledger', '', (p) => (p.includes('all') || p.includes('finance') ? 'Full' : 'Read')],
  ]
  return (
    <Card title="Field access by role" pad={false}>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left text-xs text-ink-3"><th className="px-4 py-2 font-medium">Role</th>{cols.map(([l, c]) => <th key={l} className="px-3 py-2 font-medium"><span className="flex items-center gap-1">{l}{c && <SapRef code={c} />}</span></th>)}</tr></thead>
        <tbody className="divide-y divide-line">{db.roles.filter((r) => r.status !== 'Roadmap').map((r0) => { const r = role(r0.id); return (
          <tr key={r.id}><td className="px-4 py-2 text-ink">{r.name}</td>{cols.map(([l, , f]) => { const v = f(r.permissions); return <td key={l} className={cx('px-3 py-2 text-xs', v === 'Full' ? 'text-ink' : v === 'Read' ? 'text-ink-2' : 'text-ink-3')}>{v}</td> })}</tr>
        ) })}</tbody>
      </table></div>
      <p className="border-t border-line px-4 py-2.5 text-xs text-ink-3">The Assistant answers only with what the asker's role may see. Hidden fields are refused politely.</p>
    </Card>
  )
}

// --- Onboarding and My Profile --------------------------------------------------

export function Onboarding() {
  const db = useDb()
  const user = useCurrentUser()!
  const users = useTenantUsers()
  const signals = useVisibleSignals()
  const runtime = useNexus((s) => s.signals)
  const updateUser = useNexus((s) => s.updateUser)
  const nav = useNavigate()
  const role = getRole(db, user.roleId)
  const [step, setStep] = useState(0)
  const [scope, setScope] = useState<Scope>(user.scope)
  const [channels, setChannels] = useState<Record<Severity, string[]>>(user.channels ?? { critical: ['In-app', 'Email', 'Teams'], high: ['In-app', 'Email'], medium: ['In-app'], low: ['In-app'] })
  const draft: UserProfile = { ...user, scope }
  const matching = signals.filter((s) => !['resolved', 'dismissed'].includes(runtime[s.id].status) && computeAudience(db, [...users.filter((u) => u.id !== user.id), draft], s).some((r) => r.userId === user.id))
  const finish = () => { updateUser(user.id, { scope, channels, onboarded: true }); nav(landingFor(user.roleId)) }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} sub="Three quick steps and Nexus builds your dashboard and inbox." />
      <ol className="mb-4 flex gap-2 text-xs">{['Confirm role', 'Pick scope', 'Pick channels', 'Ready'].map((s, i) => <li key={s} className={cx('rounded-full border px-3 py-1', i === step ? 'border-accent bg-accent-soft font-medium text-accent-ink' : 'border-line text-ink-3')}>{i + 1}. {s}</li>)}</ol>
      <Card>
        {step === 0 && <dl className="divide-y divide-line"><Kv label="Role template">{role.name}</Kv><Kv label="Function">{role.function}</Kv><Kv label="You will receive">{role.subscribes.map((x) => typeLabel(x.signalType)).join(', ') || 'No signal types'}</Kv><Kv label="Your dashboard starts with">{defaultLayout(role.defaultKpis).map((k) => KPIS.find((x) => x.id === k)?.label).join(', ')}</Kv></dl>}
        {step === 1 && <ScopePicker scope={scope} onChange={setScope} />}
        {step === 2 && (
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-ink-3"><th className="py-2 font-medium">Severity</th>{CHANNELS.map((c) => <th key={c} className="py-2 font-medium">{c}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{(['critical', 'high', 'medium', 'low'] as Severity[]).map((sev) => (
              <tr key={sev}><td className="py-2 text-ink capitalize">{sev}</td>{CHANNELS.map((c) => <td key={c} className="py-2"><input type="checkbox" aria-label={`${sev} via ${c}`} disabled={c === 'In-app'} checked={channels[sev].includes(c) || c === 'In-app'} onChange={(e) => setChannels({ ...channels, [sev]: e.target.checked ? [...channels[sev], c] : channels[sev].filter((x) => x !== c) })} className="accent-[var(--accent)]" /></td>)}</tr>
            ))}</tbody></table>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-ink">Here's what Nexus will watch for you</h2>
            <p className="text-sm text-ink-2">{role.subscribes.map((x) => `${typeLabel(x.signalType)} (${x.minSeverity}+)`).join(', ') || 'Nothing yet'} in {scopeSummary(db, scope)}.</p>
            <p className="text-sm text-ink"><span className="num font-semibold">{fmtNum(matching.length)}</span> open {matching.length === 1 ? 'signal already matches' : 'signals already match'} your scope{matching.length ? `: ${matching.map((s) => s.title).join('; ')}` : '.'}</p>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 3 ? <Button variant="primary" onClick={() => setStep(step + 1)}>Continue</Button> : <Button variant="primary" onClick={finish}>Go to my workspace</Button>}
        </div>
      </Card>
      <p className="mt-2 text-xs text-ink-3">Email, Teams and WhatsApp are <SimulatedTag what="notification channels" /> in this concept.</p>
    </div>
  )
}

export function MyProfile() {
  const db = useDb()
  const user = useCurrentUser()!
  const users = useTenantUsers()
  const value = useValue()
  const runtime = useNexus((s) => s.signals)
  const role = useRole(db)(user.roleId)
  const owned = db.projects.filter((p) => p.ownerId === user.id)
  const signalsOwned = db.signals.filter((s) => s.ownerId === user.id && !['resolved', 'dismissed'].includes(runtime[s.id].status))
  const booked = value.filter((e) => e.ownerId === user.id)
  const delegate = user.delegate ? users.find((u) => u.id === user.delegate!.userId) : undefined
  const ch = user.channels ?? { critical: ['In-app', 'Email', 'Teams'], high: ['In-app', 'Email'], medium: ['In-app'], low: ['In-app'] }
  return (
    <>
      <PageHeader title="My Profile" sub={`${user.title}`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Role and scope">
          <div className="mb-3 flex items-center gap-3"><Avatar name={user.name} size={40} /><div><div className="font-semibold text-ink">{user.name}</div><div className="text-xs text-ink-2">{role.name} · {role.function}</div></div></div>
          <dl className="divide-y divide-line"><Kv label="Scope">{scopeSummary(db, user.scope)}</Kv><Kv label="Delegate">{delegate && user.delegate ? `${delegate.name}, ${fmtDate(user.delegate.from)} to ${fmtDate(user.delegate.to)}` : 'None'}</Kv><Kv label="Quiet hours">{user.quietHours ? `${user.quietHours.from} to ${user.quietHours.to} IST` : '22:00 to 07:00 IST, critical always comes through'}</Kv></dl>
        </Card>
        <Card title="What I own">
          <div className="text-xs text-ink-3">Projects</div>
          <ul className="mb-3 text-sm text-ink">{owned.length ? owned.map((p) => <li key={p.id}>{p.id} · {p.title}</li>) : <li className="text-ink-2">None</li>}</ul>
          <div className="text-xs text-ink-3">Open signals I own</div>
          <ul className="text-sm text-ink">{signalsOwned.length ? signalsOwned.map((s) => <li key={s.id}>{s.title}</li>) : <li className="text-ink-2">None</li>}</ul>
        </Card>
        <Card title="Value I booked this year">
          <div className="num text-2xl font-semibold text-ink">{fmtInr(booked.reduce((a, e) => a + e.amountInr, 0))}</div>
          <div className="text-xs text-ink-2">{fmtNum(booked.length)} Value Ledger entries</div>
        </Card>
        <Card title="Subscriptions" className="lg:col-span-2">
          <ul className="flex flex-wrap gap-1.5">{role.subscribes.map((x) => <li key={x.signalType} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-2">{typeLabel(x.signalType)}, {x.minSeverity} and above</li>)}</ul>
        </Card>
        <Card title="Channels">
          <dl className="divide-y divide-line">{(['critical', 'high', 'medium', 'low'] as Severity[]).map((s) => <Kv key={s} label={<span className="capitalize">{s}</span>}>{ch[s].join(', ')}</Kv>)}</dl>
          <div className="mt-2"><SimulatedTag what="email, Teams and WhatsApp" /></div>
        </Card>
      </div>
    </>
  )
}
