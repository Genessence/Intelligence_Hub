import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Upload } from 'lucide-react'
import { useDb, useNexus, useVisibleSignals } from '@/store/useNexus'
import { PageHeader } from '@/components/Shell'
import { Table, Td } from '@/components/WhatHappened'
import { Button, Card, Empty, ModuleBadge, SeverityBadge, SimulatedTag, StatusBadge } from '@/components/ui/primitives'
import { fmtDay, fmtInr, fmtNum } from '@/engine/format'
import { getPlant, getVendor } from '@/engine/lookup'
import type { Db } from '@/data/types'
import { catalogue, syncedAt } from './apps'

export function AppSummary() {
  const { id } = useParams()
  const db = useDb()
  const signals = useVisibleSignals()
  const rt = useNexus((s) => s.signals)
  const drops = useNexus((s) => s.dataDrops)
  const app = catalogue(db).find((a) => a.id === id)
  if (!app) return <Empty icon={<ExternalLink size={28} />} title="App not found" body="Open the App Launcher to see every system in this tenant." />
  const related = app.sourceId ? signals.filter((s) => s.sourceId === app.sourceId) : []

  if (app.status === 'Roadmap') {
    const drop = app.dataDrop ? db.dataDrops.find((d) => d.id === app.dataDrop) : undefined
    const powered = !!(drop && drops.includes(drop.id))
    return (
      <>
        <PageHeader title={<span className="flex items-center gap-2">{app.name} <ModuleBadge s="Roadmap" /></span>} sub={app.desc} />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="What this module will do">
            <p className="text-sm text-ink-2">{app.desc} It plugs into the same data fabric as every other module, so its signals reach the right people on day one, with the same audit trail and Value Ledger.</p>
            {app.willRaise && (
              <>
                <h3 className="mt-4 mb-2 text-xs font-medium text-ink-3">Signals it will raise</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-ink-2">{app.willRaise.map((w) => <li key={w}>{w}</li>)}</ul>
              </>
            )}
          </Card>
          <Card title="Intelligence first, software later">
            {drop ? (powered ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-accent-ink">Powered by your data today</p>
                <p className="text-ink-2"><span className="font-mono text-ink">{drop.fileName}</span> is ingested: {fmtNum(drop.rowsOk)} of {fmtNum(drop.rows)} rows mapped.</p>
                <p className="text-ink-2">The native module is coming. Until then Nexus raises signals from this file.</p>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="text-ink-2">No software for this yet? Give Nexus the data. A sample file, <span className="font-mono text-ink">{drop.fileName}</span>, is ready to upload.</p>
                <Link to="/sources/new"><Button variant="primary"><Upload size={15} /> Bring your data</Button></Link>
              </div>
            )) : <p className="text-sm text-ink-2">Nexus can run this on a spreadsheet or an SAP extract before the module is built.</p>}
          </Card>
        </div>
      </>
    )
  }

  const kpis = app.kpis(db, signals)
  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2">{app.name} <ModuleBadge s={app.status} /></span>}
        sub={<>{app.desc} Synced {syncedAt(app.syncMinsAgo)}.</>}
        actions={<><Button onClick={() => undefined}><ExternalLink size={15} /> Open {app.group === 'SAP Fiori' ? 'in SAP Fiori' : app.name}</Button><SimulatedTag what="deep link to the source application" /></>}
      />
      {kpis.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => <Card key={k.label}><div className="text-xs text-ink-3">{k.label}</div><div className="num mt-1 text-xl font-semibold text-ink">{k.value}</div></Card>)}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Recent records (read-only)"><Records db={db} id={app.id} /></Card>
        <Card title={`Signals from ${app.name} (${related.length})`}>
          {related.length === 0 && <p className="text-sm text-ink-2">No signals from this system right now.</p>}
          <ul className="-my-1 divide-y divide-line">
            {related.map((s) => (
              <li key={s.id}><Link to={`/signals/${s.id}`} className="block py-2.5 hover:text-accent-ink"><div className="flex items-center gap-1.5"><SeverityBadge s={s.severity} /><StatusBadge s={rt[s.id]?.status ?? s.status} /></div><div className="mt-1 text-sm text-ink">{s.title}</div></Link></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}

function Records({ db, id }: { db: Db; id: string }) {
  switch (id) {
    case 'exim':
      return <Table head={['Shipment', 'Route', 'Stage', 'ETA']}>{db.shipments.map((s) => <tr key={s.ref}><Td><Link to={`/shipments/${s.ref}`} className="font-mono text-accent-ink hover:underline">{s.ref}</Link></Td><Td>{s.pol} to {s.pod}</Td><Td>{s.stage.replace(/_/g, ' ')}</Td><Td>{fmtDay(s.etaRevised ?? s.etaPlanned)}</Td></tr>)}</Table>
    case 'cost':
      return (
        <div className="space-y-4">
          <Table head={['Assessment', 'Module', 'Vendor', 'Items', 'Quoted', 'Should-cost', 'Gap', 'Status']}>{db.costAssessments.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 14).map((a) => {
            const gap = a.quotedInr / a.shouldCostInr - 1
            return <tr key={a.id}><Td><span className="font-mono text-xs">{a.id}</span><div className="text-xs text-ink-3">{fmtDay(a.submittedAt)}</div></Td><Td>{a.module}</Td><Td><Link to={`/vendors/${a.vendorId}`} className="text-accent-ink hover:underline">{getVendor(db, a.vendorId).name}</Link></Td><Td num>{fmtNum(a.items)}</Td><Td num>{fmtInr(a.quotedInr)}</Td><Td num>{fmtInr(a.shouldCostInr)}</Td><Td num><span className={gap > 0.05 ? 'text-critical' : gap > 0 ? 'text-attention' : 'text-ink'}>{gap >= 0 ? '+' : '−'}{Math.abs(gap * 100).toFixed(1)}%</span></Td><Td>{a.status.replace('_', ' ').toLowerCase()}</Td></tr>
          })}</Table>
          <Table head={['Commodity index', 'Unit', 'Latest']}>{db.commodities.map((c) => <tr key={c.slug}><Td><Link to={`/commodities/${c.slug}`} className="text-accent-ink hover:underline">{c.name}</Link></Td><Td>{c.unit}</Td><Td num>{fmtNum(c.series[c.series.length - 1].v)}</Td></tr>)}</Table>
        </div>
      )
    case 'npd':
    case 'rnd':
      return <Table head={['Project', 'Type', 'Stage']}>{db.projects.filter((p) => (id === 'rnd' ? p.type === 'RND' : p.type !== 'RND')).map((p) => <tr key={p.id}><Td><Link to={`/projects/${p.id}`} className="text-accent-ink hover:underline">{p.title}</Link><div className="font-mono text-xs text-ink-3">{p.id}</div></Td><Td>{p.type}</Td><Td>{p.stage}</Td></tr>)}</Table>
    case 'tooling':
      return <Table head={['Tool', 'Vendor', 'Stage', 'Last trial']}>{db.tools.map((t) => <tr key={t.id}><Td>{t.title}<div className="font-mono text-xs text-ink-3">{t.id}</div></Td><Td>{getVendor(db, t.vendorId).name}</Td><Td>{t.stage}</Td><Td>T{t.trials[t.trials.length - 1]?.n} {t.trials[t.trials.length - 1]?.result}</Td></tr>)}</Table>
    case 'capex':
    case 'fiori-asset':
      return <Table head={['Request', 'Plant', 'Status', 'Budget', 'Delivery']}>{db.capex.map((c) => <tr key={c.no}><Td>{c.title}<div className="font-mono text-xs text-ink-3">{c.no}</div></Td><Td>{getPlant(db, c.plant).name}</Td><Td>{c.status}</Td><Td num>₹ {c.budgetCr.toFixed(2)} Cr</Td><Td>{fmtDay(c.deliveryRevised ?? c.deliveryPlanned)}</Td></tr>)}</Table>
    case 'vendor':
      return (
        <div className="space-y-4">
          <Table head={['Onboarding request', 'Category', 'Group', 'Raised by', 'Plant', 'Status']}>{db.supplierRequests.slice().sort((a, b) => b.createdOn.localeCompare(a.createdOn)).map((q) => <tr key={q.id}><Td><div className="text-ink">{q.company}</div><div className="font-mono text-xs text-ink-3">{q.id} · {fmtDay(q.createdOn)}</div></Td><Td>{q.category}</Td><Td><span className="font-mono text-xs">{q.group}</span></Td><Td>{db.users.find((u) => u.id === q.requestedBy)?.name ?? q.requestedBy}</Td><Td>{q.plant}</Td><Td>{q.status.replace('_', ' ').toLowerCase()}</Td></tr>)}</Table>
          <Table head={['Vendor', 'Document', 'Expiry', 'Status']}>{db.vendors.flatMap((v) => (v.docs ?? []).filter((d) => d.expiry && d.expiry <= '2027-01-31').map((d) => ({ v, d }))).sort((a, b) => a.d.expiry!.localeCompare(b.d.expiry!)).slice(0, 12).map(({ v, d }) => <tr key={v.id + d.type}><Td><Link to={`/vendors/${v.id}`} className="text-accent-ink hover:underline">{v.name}</Link></Td><Td>{d.type}</Td><Td><span className={d.expiry! < '2026-11-16' ? 'text-critical' : d.expiry! < '2026-12-16' ? 'text-attention' : 'text-ink-2'}>{fmtDay(d.expiry!)}</span></Td><Td>{d.expiry! < '2026-11-16' ? 'expired' : d.status.toLowerCase()}</Td></tr>)}</Table>
        </div>
      )
    case 'vendor-portal':
      return <Table head={['Vendor', 'SAP code', 'Category', 'Status']}>{db.vendors.map((v) => <tr key={v.id}><Td><Link to={`/vendors/${v.id}`} className="text-accent-ink hover:underline">{v.name}</Link></Td><Td><span className="font-mono">{v.sapVendor}</span></Td><Td>{v.category}</Td><Td>{v.status}</Td></tr>)}</Table>
    case 'fiori-po':
    case 'price-approval':
      return <Table head={['PO', 'Vendor', 'Date', 'Net price']}>{db.purchaseOrders.slice(0, 12).map((p) => <tr key={p.ebeln}><Td><span className="font-mono text-xs">{p.ebeln}</span></Td><Td>{getVendor(db, p.vendorId).name}</Td><Td>{fmtDay(p.docDate)}</Td><Td num>{p.currency === 'INR' ? fmtInr(p.lines[0].netPrice, { compact: false }) : `${p.currency} ${p.lines[0].netPrice}`}</Td></tr>)}</Table>
    case 'fiori-gr':
      return <Table head={['GR doc', 'Date', 'Movement', 'Material', 'Qty']}>{db.goodsReceipts.slice(-12).reverse().map((g) => <tr key={g.mblnr}><Td><span className="font-mono text-xs">{g.mblnr}</span></Td><Td>{fmtDay(g.postingDate)}</Td><Td>{g.movementType}</Td><Td>{g.material}</Td><Td num>{fmtNum(g.qty)}</Td></tr>)}</Table>
    case 'fiori-stock':
      return <Table head={['Plant', 'Material', 'Unrestricted', 'QI', 'Blocked']}>{db.stock.map((s) => <tr key={s.plant + s.material}><Td>{s.plant}</Td><Td><Link to={`/parts/${s.material}`} className="text-accent-ink hover:underline">{s.material}</Link></Td><Td num>{fmtNum(s.unrestricted)}</Td><Td num>{fmtNum(s.qualityInsp)}</Td><Td num>{fmtNum(s.blocked)}</Td></tr>)}</Table>
    case 'excel':
      return <Table head={['File', 'Rows', 'Mapped']}>{db.dataDrops.map((d) => <tr key={d.id}><Td><span className="font-mono">{d.fileName}</span></Td><Td num>{fmtNum(d.rows)}</Td><Td num>{fmtNum(d.rowsOk)}</Td></tr>)}</Table>
    case 'costing-spec':
      return <Table head={['Model', 'Customer', 'BOM lines']}>{db.productModels.map((m) => <tr key={m.id}><Td><Link to={`/models/${m.id}`} className="text-accent-ink hover:underline">{m.name}</Link></Td><Td>{m.customer}</Td><Td num>{m.bom.length}</Td></tr>)}</Table>
    default:
      return <p className="text-sm text-ink-2">This system's records open in the source application. <SimulatedTag what="deep link" /></p>
  }
}
