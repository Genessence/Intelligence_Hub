import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Database, FileSpreadsheet, Plug, Search, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useDb, useNexus } from '@/store/useNexus'
import { SAP_FIELDS, sapField } from '@/data/sap'
import type { Db, ModuleStatus } from '@/data/types'
import { DEMO_NOW } from '@/config/demoClock'
import { daysBetween } from '@/engine/dates'
import { fmtDate, fmtDateTime, fmtDuration, fmtInr, fmtNum } from '@/engine/format'
import { getPart, getVendor } from '@/engine/lookup'
import { PageHeader } from '@/components/Shell'
import { Button, Card, cx, Empty, Kv, ModuleBadge, SapRef, SimulatedTag, SourceChip } from '@/components/ui/primitives'
import { SAP_USAGE } from './usage'

// Sync freshness is simulated: each source has a fixed sync cadence, minutes before the demo clock.
const ago = (min: number) => fmtDuration(min * 60000) + ' ago'

function moduleRecords(db: Db, id: string): number {
  switch (id) {
    case 'cost': return db.parts.filter((p) => p.costModel).length + db.commodities.length
    case 'exim': return db.shipments.length
    case 'npd': return db.projects.filter((p) => ['NCD', 'NPD', 'ECN', 'AS'].includes(p.type)).length
    case 'tooling': return db.tools.length
    case 'rnd': return db.projects.filter((p) => p.type === 'RND').length
    case 'capex': return db.capex.length
    case 'vendor': return db.vendors.length
    default: return 0
  }
}

const OTHER_CONNECTORS: { name: string; kind: string; status: ModuleStatus; what: string; cadenceMin: number }[] = [
  { name: 'Microsoft Dynamics 365', kind: 'ERP', status: 'Pilot', what: 'Vendor and item masters for clients on Dynamics', cadenceMin: 0 },
  { name: 'Oracle EBS', kind: 'ERP', status: 'Roadmap', what: 'Purchasing and inventory', cadenceMin: 0 },
  { name: 'Tally', kind: 'ERP', status: 'Roadmap', what: 'Ledgers for smaller group companies', cadenceMin: 0 },
  { name: 'Teamcenter PLM', kind: 'PLM', status: 'Pilot', what: 'BOM revisions and ECN releases', cadenceMin: 240 },
  { name: 'ICEGATE', kind: 'Customs', status: 'Live', what: 'BOE status and out-of-charge dates', cadenceMin: 30 },
  { name: 'Container tracking', kind: 'Logistics', status: 'Live', what: 'Vessel ETA and roll-overs', cadenceMin: 60 },
  { name: 'LME and commodity feeds', kind: 'Market data', status: 'Live', what: 'Copper, aluminium, polymers, FX', cadenceMin: 15 },
  { name: 'Email (inbound mailbox)', kind: 'Collaboration', status: 'Pilot', what: 'Data drops sent by email', cadenceMin: 10 },
  { name: 'Microsoft Teams', kind: 'Collaboration', status: 'Live', what: 'Signal notifications and approvals', cadenceMin: 0 },
]

export function SourceHub() {
  const db = useDb()
  const ingested = useNexus((s) => s.dataDrops)
  const modules = db.tenant.modules.filter((m) => m.id !== 'sap' && m.id !== 'datadrop')
  const drops = db.dataDrops.filter((d) => ingested.includes(d.id))
  const sapRecords = db.parts.length + db.purchaseOrders.length + db.goodsReceipts.length + db.stock.length + db.vendors.length
  return (
    <>
      <PageHeader title="Source Hub" sub="Every system and data source feeding Nexus, through three doors: Genessence modules, SAP, and your own data." actions={<Link to="/sources/new"><Button variant="primary"><Upload size={15} /> Bring your data</Button></Link>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Door 2: SAP" className="lg:col-span-1" action={<ModuleBadge s="Live" />}>
          <div className="flex items-center gap-3"><span className="inline-flex size-10 items-center justify-center rounded-lg bg-surface-2"><Database size={18} style={{ color: 'var(--src-sap)' }} /></span><div><div className="font-semibold text-ink">{db.tenant.erp.system}</div><div className="text-xs text-ink-3">{db.tenant.erp.methods.join(' · ')}</div></div></div>
          <dl className="mt-3 divide-y divide-line">
            <Kv label="Health"><span className="text-resolved">Healthy</span></Kv>
            <Kv label="Last sync">{ago(12)}</Kv>
            <Kv label="Records read">{fmtNum(sapRecords)}</Kv>
            <Kv label="Fields in the client dictionary">{fmtNum(SAP_FIELDS.length)}</Kv>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2"><Link to="/sources/sap"><Button size="sm">Connector</Button></Link><Link to="/sources/sap/fields"><Button size="sm">Field Explorer</Button></Link><Link to="/sources/sap/p2p"><Button size="sm">P2P chain</Button></Link></div>
          <div className="mt-2"><SimulatedTag what="SAP connection" /></div>
        </Card>
        <Card title="Door 1: Genessence modules" className="lg:col-span-2" pad={false}>
          <ul className="divide-y divide-line">
            {modules.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                <SourceChip id={m.id} label={m.name} />
                <ModuleBadge s={m.status} />
                <span className="ml-auto text-xs text-ink-3">{m.status === 'Roadmap' ? 'Not connected' : `${fmtNum(moduleRecords(db, m.id))} records · synced ${ago(2 + i * 3)}`}</span>
                <span className={cx('size-2 rounded-full', m.status === 'Roadmap' ? 'bg-line-strong' : 'bg-resolved')} aria-label={m.status === 'Roadmap' ? 'Not connected' : 'Healthy'} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Other connectors" className="lg:col-span-2" pad={false}>
          <ul className="divide-y divide-line">
            {OTHER_CONNECTORS.map((c) => (
              <li key={c.name} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <Plug size={15} className="text-ink-3" aria-hidden />
                <div className="min-w-0 flex-1"><div className="text-sm text-ink">{c.name} <span className="text-xs text-ink-3">· {c.kind}</span></div><div className="text-xs text-ink-2">{c.what}</div></div>
                <ModuleBadge s={c.status} />
                <span className="w-24 text-right text-xs text-ink-3">{c.status === 'Live' ? (c.cadenceMin ? `synced ${ago(c.cadenceMin)}` : 'event driven') : c.status === 'Pilot' ? 'in pilot' : 'planned'}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Door 3: Data drops" action={<SimulatedTag what="file ingestion" />}>
          {drops.length === 0 ? <Empty icon={<FileSpreadsheet size={26} />} title="No data drops yet" body="No software for a function? Upload its Excel or CSV and Nexus runs intelligence on it." /> : (
            <ul className="space-y-2">{drops.map((d) => <li key={d.id} className="rounded-lg border border-line p-3"><div className="font-mono text-xs text-ink">{d.fileName}</div><div className="mt-1 text-xs text-ink-2">{fmtNum(d.rowsOk)} of {fmtNum(d.rows)} rows mapped · refresh weekly · ingested {fmtDateTime(DEMO_NOW)}</div></li>)}</ul>
          )}
          <Link to="/sources/new" className="mt-3 inline-flex items-center gap-1 text-sm text-accent-ink hover:underline">Add a data drop <ArrowRight size={14} /></Link>
        </Card>
      </div>
    </>
  )
}

const MAPPING: [string, string[], string][] = [
  ['Purchase Requisition (ME5A)', ['EBAN-BANFN', 'EBAN-MENGE'], 'Requirement, start of procure-to-pay'],
  ['Purchase Order (ME2N/ME2M)', ['EKKO-EBELN', 'EKPO-NETPR', 'EKET-EINDT'], 'Purchase order, open qty and value, release status'],
  ['GRN', ['MSEG-MBLNR', 'MSEG-BWART', 'MKPF-BUDAT'], 'Goods receipt, short qty, delay days'],
  ['Material Master', ['MARA-MATNR', 'MARC-PLIFZ', 'MBEW-VERPR'], 'Part with plant MRP data, price, approved manufacturers'],
  ['Inventory (MB52)', ['MARD-LABST', 'MARD-INSME', 'MARD-SPEME'], 'Stock by type'],
  ['FA Code', ['ANLA-ANLN1', 'ANLC-KANSW'], 'Capex asset and capitalisation'],
  ['Import expense conditions', ['COND-ZFR2', 'COND-ZDCS', 'COND-ZCHA'], 'Landed cost per shipment and part'],
  ['Vendor Master', ['LFA1-LIFNR', 'LFA1-NAME1'], 'Vendor (standard fields, to confirm with client IT)'],
]

export function SapConnector() {
  const db = useDb()
  const runs = [
    { obj: 'Material Master (MARA, MARC, MBEW)', n: db.parts.reduce((a, p) => a + p.plants.length, 0), min: 12, mode: 'Delta, every 15 min' },
    { obj: 'Purchase Orders (EKKO, EKPO, EKET)', n: db.purchaseOrders.reduce((a, p) => a + p.lines.length, 0), min: 12, mode: 'Delta, every 15 min' },
    { obj: 'GRN (MSEG, MKPF)', n: db.goodsReceipts.length, min: 14, mode: 'IDoc, event driven' },
    { obj: 'Inventory (MARD)', n: db.stock.length, min: 30, mode: 'CDS view, hourly' },
    { obj: 'Vendor master (LFA1)', n: db.vendors.length, min: 600, mode: 'Nightly 02:00 IST' },
  ]
  return (
    <>
      <PageHeader title={`${db.tenant.erp.system} connector`} sub="Read and write-back through standard SAP interfaces. Every field shown in Nexus comes from the client's own field dictionary." actions={<SimulatedTag what="SAP connection" />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Integration methods">
          <ul className="space-y-2 text-sm">
            {[['OData APIs', 'Read', 'Every 15 min'], ['BAPI / RFC', 'Write-back', 'On approval'], ['IDocs', 'Read', 'Event driven'], ['SAP BTP Integration Suite (CPI)', 'Read and write', 'Orchestrated'], ['CDS views', 'Read (analytics)', 'Hourly']].map(([m, d, s]) => (
              <li key={m} className="flex items-baseline justify-between gap-2"><span className="text-ink">{m}{!db.tenant.erp.methods.some((x) => m.startsWith(x.split(' ')[0])) && <span className="ml-1 text-xs text-ink-3">(available)</span>}</span><span className="text-right text-xs text-ink-3">{d} · {s}</span></li>
            ))}
          </ul>
        </Card>
        <Card title="Write-back (needs approval in Nexus)" className="lg:col-span-2">
          <ul className="grid gap-2 sm:grid-cols-2">
            {[['Create a purchase requisition', 'EBAN-BANFN'], ['Update an info-record price', 'EKPO-INFNR'], ['Change PO quantity', 'EKPO-MENGE'], ['Post a return delivery', 'MSEG-BWART']].map(([t, c]) => (
              <li key={t} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"><span className="text-ink">{t}</span><SapRef code={c} /></li>
            ))}
            <li className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"><span className="text-ink">Block a vendor for purchasing</span><SapRef code="LFA1-LIFNR" /></li>
            <li className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-sm"><span className="text-ink-2">Post a quality notification (QM)</span><ModuleBadge s="Roadmap" /></li>
          </ul>
        </Card>
      </div>
      <Card className="mt-4" title="What Nexus reads" pad={false}>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-ink-3"><th className="px-4 py-2 font-medium">Client SAP report</th><th className="px-4 py-2 font-medium">Key fields</th><th className="px-4 py-2 font-medium">Becomes in Nexus</th></tr></thead>
          <tbody className="divide-y divide-line">{MAPPING.map(([r, codes, b]) => <tr key={r}><td className="px-4 py-2.5 text-ink">{r}</td><td className="px-4 py-2.5"><span className="flex flex-wrap gap-1">{codes.map((c) => <SapRef key={c} code={c} />)}</span></td><td className="px-4 py-2.5 text-ink-2">{b}</td></tr>)}</tbody>
        </table></div>
        <p className="border-t border-line px-4 py-2.5 text-xs text-ink-3">Not in the client dictionary yet, shown as Roadmap mappings: QM (QALS, QMEL), SD (VBAK, VBAP), PM (EQUI, AUFK), FI (ACDOCA).</p>
      </Card>
      <Card className="mt-4" title="Last runs" action={<SimulatedTag what="sync log" />} pad={false}>
        <ul className="divide-y divide-line">{runs.map((r) => (
          <li key={r.obj} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm"><Check size={15} className="text-resolved" aria-hidden /><span className="flex-1 text-ink">{r.obj}</span><span className="text-xs text-ink-3">{r.mode}</span><span className="num w-28 text-right text-ink-2">{fmtNum(r.n)} records</span><span className="w-24 text-right text-xs text-ink-3">{ago(r.min)}</span></li>
        ))}</ul>
      </Card>
    </>
  )
}

type FieldStatus = 'mapped' | 'to_confirm' | 'unused'
export function SapFieldExplorer() {
  const db = useDb()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [status, setStatus] = useState<FieldStatus | 'all'>('all')
  const rows = useMemo(() => SAP_FIELDS.map((f) => ({ f, use: SAP_USAGE[f.code], st: (SAP_USAGE[f.code] ? 'mapped' : f.status === 'to_confirm' ? 'to_confirm' : 'unused') as FieldStatus })), [])
  const mapped = rows.filter((r) => r.st === 'mapped').length
  const visible = rows.filter((r) => (status === 'all' || r.st === status) && `${r.f.label} ${r.f.code} ${r.f.tableField} ${r.f.description}`.toLowerCase().includes(q.toLowerCase()))
  const reports = [...new Set(visible.map((r) => r.f.report))]
  const chip: Record<FieldStatus, [string, string]> = { mapped: ['Mapped', 'bg-accent-soft text-accent-ink'], to_confirm: ['To confirm with client IT', 'bg-attention-bg text-attention'], unused: ['Not used yet', 'bg-surface-2 text-ink-3'] }
  return (
    <>
      <PageHeader title="SAP Field Explorer" sub={db.tenant.id === 'amber' ? "Amber's own SAP field dictionary, as supplied by Amber IT. We already speak your SAP." : `${db.tenant.name} has not supplied a field dictionary yet. Shown: the standard Genessence SAP template, built from a client dictionary.`} />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-6">
          <div><div className="text-xs text-ink-3">Coverage</div><div className="num text-xl font-semibold text-ink">{fmtNum(mapped)} of {fmtNum(rows.length)} fields mapped</div></div>
          <div className="h-2 min-w-48 flex-1 rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${(mapped / rows.length) * 100}%` }} /></div>
          <div className="text-xs text-ink-3">{fmtNum(rows.filter((r) => r.f.status === 'to_confirm').length)} fields marked "confirm in SE11" or custom Z-fields</div>
        </div>
        <p className="mt-3 text-xs text-ink-2">Note: in Amber's dictionary, the "Vendor Master" sheet is a copy of the PO sheet. Standard vendor fields (LFA1, LFB1, LFM1) are shown as To confirm with client IT until the real sheet arrives.</p>
      </Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3"><Search size={15} className="text-ink-3" aria-hidden /><input value={q} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {})} placeholder="Search label, table-field or meaning" className="w-72 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3" aria-label="Search SAP fields" /></label>
        {(['all', 'mapped', 'to_confirm', 'unused'] as const).map((s) => <button key={s} onClick={() => setStatus(s)} className={cx('h-8 rounded-full border px-3 text-xs font-medium', status === s ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink-2')}>{s === 'all' ? `All (${rows.length})` : chip[s][0]}</button>)}
      </div>
      {reports.length === 0 && <Card><Empty icon={<Search size={26} />} title="No fields match" body="Try a table name like EKPO or a word like delivery." /></Card>}
      {reports.map((rep) => (
        <Card key={rep} className="mb-4" title={`${rep} (${visible.filter((r) => r.f.report === rep).length})`} pad={false}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-ink-3">{['Field', 'Table-field', 'Type', 'Meaning', 'Used by Nexus for', 'Status'].map((h) => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {visible.filter((r) => r.f.report === rep).map(({ f, use, st }) => (
                <tr key={f.code} className="align-top">
                  <td className="px-3 py-2 text-ink">{f.label}</td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-ink-2">{f.tableField}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-ink-3">{f.dataType}</td>
                  <td className="max-w-md px-3 py-2 text-xs text-ink-2">{f.description}</td>
                  <td className="px-3 py-2 text-xs text-ink-2">{use ?? ''}</td>
                  <td className="px-3 py-2"><span className={cx('inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap', chip[st][1])}>{chip[st][0]}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Card>
      ))}
    </>
  )
}

// ponytail: the PR and invoice on this chain are sample document numbers; the seed has POs and GRNs only.
const SAMPLE_PR = { banfn: '1000044920', badat: '2026-09-28', item: '00010' }
const SAMPLE_IR = { belnr: '5105600231', date: '2026-10-29' }

export function P2PChain() {
  const db = useDb()
  // Pick the receipt with the largest delay against the schedule line (EKET-EINDT).
  const chains = db.goodsReceipts.filter((g) => g.movementType === '101').map((g) => {
    const po = db.purchaseOrders.find((p) => p.ebeln === g.ebeln)!
    const line = po.lines.find((l) => l.item === g.ebelp) ?? po.lines[0]
    return { g, po, line, delay: daysBetween(line.deliveryDate, g.postingDate) }
  }).sort((a, b) => b.delay - a.delay)
  const c = chains[0]
  if (!c) return <><PageHeader title="Procure-to-pay chain" /><Card><Empty icon={<Database size={26} />} title="No receipts in this tenant yet" body="The chain appears once SAP goods receipts are synced." /></Card></>
  const part = getPart(db, c.line.material)
  const v = getVendor(db, c.po.vendorId)
  const steps = [
    { t: 'Purchase requisition', code: 'EBAN-BANFN', ref: SAMPLE_PR.banfn, rows: [['Item', SAMPLE_PR.item], ['Requisition date', fmtDate(SAMPLE_PR.badat)], ['Material', part.description]], sample: true },
    { t: 'Purchase order', code: 'EKKO-EBELN', ref: `${c.po.ebeln} / ${c.line.item}`, rows: [['Vendor', v.name], ['Net price', fmtInr(c.line.netPrice, { compact: false })], ['Quantity', fmtNum(c.line.qty)], ['Delivery date', fmtDate(c.line.deliveryDate)]] },
    { t: 'Goods receipt', code: 'MSEG-MBLNR', ref: c.g.mblnr, rows: [['Movement type', c.g.movementType], ['Posting date', fmtDate(c.g.postingDate)], ['Quantity', fmtNum(c.g.qty)], ['Delivery note', c.g.deliveryNote]] },
    { t: 'Invoice receipt', code: 'RBKP-BELNR', ref: SAMPLE_IR.belnr, rows: [['Posted', fmtDate(SAMPLE_IR.date)], ['Match', '3-way, within tolerance']], sample: true },
  ]
  return (
    <>
      <PageHeader title="Procure-to-pay chain" sub="One requirement followed through SAP, linked by document numbers. The same chain gives Nexus its delay days and its Value Ledger evidence." />
      <div className="grid gap-3 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Card key={s.t} className="relative">
            <div className="flex items-center justify-between"><span className="text-xs text-ink-3">Step {i + 1}</span><SapRef code={s.code} /></div>
            <div className="mt-1 font-semibold text-ink">{s.t}</div>
            <div className="font-mono text-sm text-ink-2">{s.ref}</div>
            <dl className="mt-2 divide-y divide-line">{s.rows.map(([k, val]) => <Kv key={k} label={k}>{val}</Kv>)}</dl>
            {s.sample && <div className="mt-2"><SimulatedTag what="sample document number" /></div>}
            {i < 3 && <ArrowRight size={18} className="absolute top-1/2 -right-3 hidden text-ink-3 lg:block" aria-hidden />}
          </Card>
        ))}
      </div>
      <Card className="mt-4" title="Delay days">
        <p className="text-sm text-ink-2">Delay days = GR posting date <SapRef code="MKPF-BUDAT" /> − delivery date on the schedule line <SapRef code="EKET-EINDT" />.</p>
        <p className="num mt-2 text-lg font-semibold text-ink">{fmtDate(c.g.postingDate)} − {fmtDate(c.line.deliveryDate)} = {c.delay} days {c.delay < 0 ? '(early)' : c.delay > 0 ? '(late)' : '(on time)'}</p>
        <p className="mt-1 text-xs text-ink-3">Across {fmtNum(chains.length)} receipts in this tenant, {fmtNum(chains.filter((x) => x.delay > 0).length)} arrived late. The lead-time drift rule compares these against planned delivery time <SapRef code="MARC-PLIFZ" />.</p>
      </Card>
    </>
  )
}

export function BringYourData() {
  const db = useDb()
  const nav = useNavigate()
  const { ingestDataDrop, dataDrops } = useNexus()
  const [pick, setPick] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [targets, setTargets] = useState<Record<string, string>>({})
  const drop = db.dataDrops.find((d) => d.id === pick)
  const STEPS = ['Upload', 'Auto-detect', 'Map columns', 'Data quality', 'Schedule refresh', 'First insights']
  if (!db.dataDrops.length) return <><PageHeader title="Bring your data" /><Card><Empty icon={<FileSpreadsheet size={26} />} title="No sample files for this tenant" body="Production plan and quality files are configured during onboarding for this client." /></Card></>
  const finish = () => {
    if (!drop) return
    ingestDataDrop(drop.id)
    toast.success(`${drop.fileName} ingested`)
    setStep(5)
  }
  const uplift = drop?.demand?.reduce((a, r) => a + (r.forecast - r.baseline), 0) ?? 0
  return (
    <>
      <PageHeader title="Bring your data" sub="No software for a function? Give us its data. Nexus maps it to your SAP entities and runs intelligence on it." actions={<SimulatedTag what="file parsing" />} />
      <ol className="mb-4 flex flex-wrap gap-2 text-xs" aria-label="Wizard steps">{STEPS.map((s, i) => <li key={s} className={cx('rounded-full border px-3 py-1', i === step ? 'border-accent bg-accent-soft font-medium text-accent-ink' : i < step ? 'border-line text-ink-2' : 'border-line text-ink-3')}>{i + 1}. {s}</li>)}</ol>
      <Card>
        {step === 0 && (
          <div>
            <p className="mb-3 text-sm text-ink-2">Pick a file. Excel, CSV, a shared folder, an email-in mailbox or an API push all land the same way.</p>
            <div className="grid gap-3 sm:grid-cols-2">{db.dataDrops.map((d) => (
              <button key={d.id} onClick={() => setPick(d.id)} className={cx('flex items-center gap-3 rounded-xl border p-4 text-left', pick === d.id ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2')}>
                <FileSpreadsheet size={22} className="text-ink-3" aria-hidden />
                <span><span className="block font-mono text-sm text-ink">{d.fileName}</span><span className="block text-xs text-ink-2">{fmtNum(d.rows)} rows · {d.kind === 'sales_forecast' ? 'Sales forecast' : 'Incoming inspection'}{dataDrops.includes(d.id) ? ' · already ingested' : ''}</span></span>
              </button>
            ))}</div>
          </div>
        )}
        {step === 1 && drop && <div className="text-sm text-ink-2"><p>Detected sheet <span className="font-mono text-ink">Sheet1</span>, header on row 1, {fmtNum(drop.rows)} data rows, {drop.columns.length} columns.</p><ul className="mt-3 flex flex-wrap gap-2">{drop.columns.map((c) => <li key={c.source} className="rounded border border-line bg-surface-2 px-2 py-1 font-mono text-xs text-ink">{c.source}</li>)}</ul></div>}
        {step === 2 && drop && (
          <table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-ink-3"><th className="py-2 font-medium">Your column</th><th className="py-2 font-medium">Nexus entity</th><th className="py-2 text-right font-medium">Confidence</th></tr></thead>
            <tbody className="divide-y divide-line">{drop.columns.map((c) => (
              <tr key={c.source}><td className="py-2 font-mono text-xs text-ink">{c.source}</td>
                <td className="py-2"><select value={targets[c.source] ?? c.target} onChange={(e) => setTargets({ ...targets, [c.source]: e.target.value })} className="h-8 rounded-md border border-line bg-surface px-2 text-sm text-ink" aria-label={`Map ${c.source}`}>{[...new Set([c.target, ...drop.columns.map((x) => x.target), 'Ignore this column'])].map((t) => <option key={t}>{t}</option>)}</select></td>
                <td className={cx('num py-2 text-right', c.confidence >= 0.9 ? 'text-ink' : 'text-attention')}>{Math.round(c.confidence * 100)}%{targets[c.source] && ' (edited)'}</td></tr>
            ))}</tbody></table>
        )}
        {step === 3 && drop && <dl className="divide-y divide-line"><Kv label="Rows OK">{fmtNum(drop.rowsOk)}</Kv><Kv label="Unknown part or model code">{fmtNum(drop.unknownParts)}</Kv><Kv label="Duplicates removed">{fmtNum(drop.duplicates)}</Kv><Kv label="Matched against">SAP material master <SapRef code="MARA-MATNR" /> and vendor master <SapRef code="LFA1-LIFNR" /></Kv></dl>}
        {step === 4 && <div className="space-y-2 text-sm text-ink-2"><p>Refresh: <span className="text-ink">weekly, Monday 07:00 IST</span>, from the shared folder <span className="font-mono text-ink">/Sales/Forecast</span>.</p><p>Owner: the uploader. Nexus emails them if a refresh fails or the column layout changes.</p></div>}
        {step === 5 && drop && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-resolved-bg px-3 py-2 text-sm text-resolved"><Check size={16} /> {drop.fileName} is now a live source. Powered by your data today, native module coming.</div>
            {drop.kind === 'sales_forecast'
              ? <p className="text-sm text-ink-2">First insight: pre-booking is <span className="num font-semibold text-ink">+{fmtNum(uplift)} units</span> above plan for {drop.demand?.map((d) => d.month).join(', ')}. Compressors need a long import lead time. Nexus raised a signal to the planners.</p>
              : <p className="text-sm text-ink-2">First insight: {db.vendors.filter((x) => x.aliases.some((a) => a.sourceId === 'excel')).map((x) => x.name).join(', ')} appear in this file and in active NPD or quality signals.</p>}
            <div className="flex gap-2">{drop.kind === 'sales_forecast' && <Button variant="primary" onClick={() => nav('/signals/SIG-2026-1150')}>Open the new signal</Button>}<Button onClick={() => nav('/sources')}>Back to Source Hub</Button></div>
          </div>
        )}
        {step < 5 && (
          <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
            {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
            {step < 4 ? <Button variant="primary" disabled={!drop} onClick={() => setStep(step + 1)}>Continue</Button> : <Button variant="primary" onClick={finish}>Ingest and run intelligence</Button>}
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-ink-3">Accepted inputs: Excel or CSV upload, SharePoint, Google Drive or SFTP folder, email-in mailbox, REST API push, scheduled SAP extract.</p>
    </>
  )
}

// Keep the usage map honest at runtime: an unknown code would throw here in development.
Object.keys(SAP_USAGE).forEach((c) => sapField(c))
