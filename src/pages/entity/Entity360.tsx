import { Link, Navigate, useParams } from 'react-router-dom'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { useCurrentUser, useDb, useNexus, useTenantUsers, useVisibleSignals } from '@/store/useNexus'
import { Table, Td } from '@/components/WhatHappened'
import { Card, cx, Kv, SapRef, SimulatedTag, Tip } from '@/components/ui/primitives'
import { daysBetween } from '@/engine/dates'
import { fmtDay, fmtInr, fmtNum, plural } from '@/engine/format'
import { avgBetween, changeOver, forecast30, latest, pct } from '@/engine/commodity'
import { getPlant, getRole, getVendor } from '@/engine/lookup'
import { shipmentDetail } from '@/engine/scenarios/shipment'
import { EntityLayout, NotFound, ZField } from './Layout'
import { bomHeat, isOpen, openQty, partStock, projectContributions, relatedSignals, vendorScorecard } from './metrics'

const pctOr = (x: number | null, dp = 1) => (x === null ? 'No data' : `${(x * 100).toFixed(dp)}%`)

// ---------------------------------------------------------------- Part

export function Part360() {
  const { code } = useParams()
  const db = useDb()
  const signals = useVisibleSignals()
  const p = db.parts.find((x) => x.code === code)
  if (!p) return <NotFound what="Part" />
  const stock = partStock(db, p)
  const pos = db.purchaseOrders.filter((po) => po.lines.some((l) => l.material === p.code))
  const grs = db.goodsReceipts.filter((g) => g.material === p.code).slice(-8).reverse()
  const usedIn = db.productModels.filter((m) => m.bom.some((b) => b.partCode === p.code))
  const totalOpen = pos.reduce((a, po) => a + po.lines.filter((l) => l.material === p.code).reduce((x, l) => x + openQty(db, po.ebeln, p.code, l.qty).open, 0), 0)
  const main = stock[0]
  return (
    <EntityLayout
      kind="Part" title={p.description} sub={`${p.code} · ${p.materialType} · ${p.baseUom}`}
      chips={<><SapRef code="MARA-MATNR" /><SapRef code="MARA-MTART" /><SapRef code="MARA-MATKL" /><span className="text-xs text-ink-3">Material group {p.materialGroup}</span></>}
      kpis={[
        { label: `Unrestricted at ${getPlant(db, main.pp.plant).name}`, value: fmtNum(main.st.unrestricted), source: 'SAP MARD-LABST' },
        { label: 'Cover', value: main.coverDays === null ? 'No demand' : plural(main.coverDays, 'day'), source: 'MARD-LABST ÷ daily use from MRP', tone: main.coverDays !== null && main.coverDays < 14 ? 'critical' : undefined },
        { label: 'Open PO quantity', value: fmtNum(totalOpen), source: 'EKPO-MENGE less net GRN (101 − 102 − 122)' },
        { label: 'Moving price', value: fmtInr(main.pp.movingPrice, { compact: false }), source: 'SAP MBEW-VERPR' },
      ]}
      signals={relatedSignals(db, signals, 'part', p.code)}
    >
      <Card title="Material master">
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <div className="divide-y divide-line">
            <ZField code="Material Master:L1 Category" value={p.commodityHierarchy.l1} />
            <ZField code="Material Master:L2 Commodity Family" value={p.commodityHierarchy.l2} />
            <ZField code="Material Master:L3 Commodity Group" value={p.commodityHierarchy.l3} />
            <ZField code="Material Master:L4 Commodity" value={p.commodityHierarchy.l4} />
            <ZField code="Material Master:Sourcing Type" value={p.sourcingType} />
            {p.sizeOd !== undefined && <ZField code="Material Master:Size OD" value={`${p.sizeOd} mm`} />}
            {p.sizeThickness !== undefined && <ZField code="Material Master:Size Thickness" value={`${p.sizeThickness} mm`} />}
            {p.packingEpsG !== undefined && <ZField code="Material Master:Packing EPS in gms" value={`${fmtNum(p.packingEpsG)} g`} />}
            {p.obuCustomer && <ZField code="Material Master:OBU Customer" value={p.obuCustomer} />}
          </div>
          <div className="divide-y divide-line">
            <Kv label={<span className="flex items-center gap-1.5">HSN <SapRef code="MARC-STEUC" /></span>}>{p.hsCode}</Kv>
            <Kv label="Cost driver">{p.costModel ? `${p.costModel.commodity}, ${Math.round(p.costModel.share * 100)}% of price` : 'None modelled'}</Kv>
            <Kv label="Vendors">{p.vendors.map((v) => <Link key={v} to={`/vendors/${v}`} className="block text-accent-ink hover:underline">{getVendor(db, v).name}</Link>)}</Kv>
            {p.supersededBy && <Kv label="Superseded by">{p.supersededBy}</Kv>}
          </div>
        </dl>
      </Card>
      <Card title="By plant" pad={false}>
        <div className="p-4">
          <Table head={['Plant', 'Purch. group', 'Lead time', 'Safety stock', 'Critical / ABC', 'Std / moving price', 'Unrestricted', 'QI', 'Blocked']}>
            {stock.map(({ pp, st }) => (
              <tr key={pp.plant}>
                <Td><Link to={`/plants/${pp.plant}`} className="text-accent-ink hover:underline">{getPlant(db, pp.plant).name} ({pp.plant})</Link></Td>
                <Td>{pp.purchasingGroup}</Td>
                <Td num>{pp.plannedDelivDays} days</Td>
                <Td num>{fmtNum(pp.safetyStock)}</Td>
                <Td>{pp.criticalPart ? 'Critical' : 'No'} / {pp.abc}</Td>
                <Td num>{fmtInr(pp.standardPrice, { compact: false })} / {fmtInr(pp.movingPrice, { compact: false })}</Td>
                <Td num strong>{fmtNum(st.unrestricted)}</Td>
                <Td num>{fmtNum(st.qualityInsp)}</Td>
                <Td num>{fmtNum(st.blocked)}</Td>
              </tr>
            ))}
          </Table>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-3"><SapRef code="MARC-EKGRP" /><SapRef code="MARC-PLIFZ" /><SapRef code="MARC-EISBE" /><SapRef code="MARC-KZKRI" /><SapRef code="MARC-MAABC" /><SapRef code="MBEW-STPRS" /><SapRef code="MBEW-VERPR" /><SapRef code="MARD-LABST" /><SapRef code="MARD-INSME" /><SapRef code="MARD-SPEME" /></p>
        </div>
      </Card>
      <Card title={`Purchase orders (${pos.length})`}>
        {pos.length === 0 ? <p className="text-sm text-ink-2">No POs for this part in the seed.</p> : (
          <Table head={['PO', 'Vendor', 'Date', 'Net price', 'Ordered', 'Received', 'Open', 'Delivery']}>
            {pos.flatMap((po) => po.lines.filter((l) => l.material === p.code).map((l) => {
              const q = openQty(db, po.ebeln, p.code, l.qty)
              return <tr key={po.ebeln + l.item}><Td><span className="font-mono text-xs">{po.ebeln}/{l.item}</span></Td><Td>{getVendor(db, po.vendorId).name}</Td><Td>{fmtDay(po.docDate)}</Td><Td num>{po.currency === 'INR' ? fmtInr(l.netPrice, { compact: false }) : `${po.currency} ${l.netPrice}`}</Td><Td num>{fmtNum(l.qty)}</Td><Td num>{fmtNum(q.received)}</Td><Td num strong>{fmtNum(q.open)}</Td><Td>{fmtDay(l.deliveryDate)}</Td></tr>
            }))}
          </Table>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-3"><SapRef code="EKKO-EBELN" /><SapRef code="EKPO-NETPR" /><SapRef code="EKPO-MENGE" /><SapRef code="EKET-EINDT" /></p>
      </Card>
      {grs.length > 0 && (
        <Card title="Recent goods receipts">
          <Table head={['GR doc', 'Posting date', 'Movement', 'Quantity', 'PO']}>
            {grs.map((g) => <tr key={g.mblnr}><Td><span className="font-mono text-xs">{g.mblnr}</span></Td><Td>{fmtDay(g.postingDate)}</Td><Td>{g.movementType}</Td><Td num>{fmtNum(g.qty)}</Td><Td><span className="font-mono text-xs">{g.ebeln}</span></Td></tr>)}
          </Table>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-3"><SapRef code="MSEG-MBLNR" /><SapRef code="MKPF-BUDAT" /><SapRef code="MSEG-BWART" /><SapRef code="MSEG-MENGE" /></p>
        </Card>
      )}
      <Card title="Where used">
        {usedIn.length === 0 ? <p className="text-sm text-ink-2">Not in a seeded BOM.</p> : (
          <ul className="divide-y divide-line">{usedIn.map((m) => <li key={m.id} className="flex justify-between py-2 text-sm"><Link to={`/models/${m.id}`} className="text-accent-ink hover:underline">{m.name}</Link><span className="num text-ink-2">{m.bom.find((b) => b.partCode === p.code)!.qtyPer} per unit</span></li>)}</ul>
        )}
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">BOM usage <SapRef code="MAST-STLAN" /></p>
      </Card>
    </EntityLayout>
  )
}

// ---------------------------------------------------------------- Vendor

export function Vendor360() {
  const { id } = useParams()
  const db = useDb()
  const signals = useVisibleSignals()
  const v = db.vendors.find((x) => x.id === id)
  if (!v) return <NotFound what="Vendor" />
  const sc = vendorScorecard(db, v.id, signals)
  const pos = db.purchaseOrders.filter((p) => p.vendorId === v.id)
  const ships = db.shipments.filter((s) => s.vendorId === v.id)
  const parts = db.parts.filter((p) => p.vendors.includes(v.id))
  return (
    <EntityLayout
      kind="Vendor" title={v.name} sub={`${v.category} · ${v.country} · ${v.status}`}
      chips={<><SapRef code="LFA1-LIFNR" /><span className="font-mono text-xs text-ink-2">{v.sapVendor}</span><SapRef code="LFA1-NAME1" /><span className="text-xs text-ink-3">Vendor master fields: to confirm with client IT</span></>}
      kpis={[
        { label: 'On-time delivery', value: pctOr(sc.otd, 0), source: `GRN posting date vs EKET-EINDT, ${sc.receipts} receipts` },
        { label: 'Rejection rate', value: pctOr(sc.rejection), source: 'GRN movements 103 + 122 over 101', tone: sc.rejection !== null && sc.rejection > 0.01 ? 'critical' : undefined },
        { label: 'Cost index', value: sc.costIndex === null ? 'No data' : sc.costIndex.toFixed(0), source: 'EKPO-NETPR ÷ MBEW-STPRS × 100 on INR POs (100 = at standard)', tone: sc.costIndex !== null && sc.costIndex > 103 ? 'attention' : undefined },
        { label: 'Compliance', value: sc.compliance ? 'At risk' : 'Valid', source: sc.compliance ?? 'Vendor Management: all documents valid', tone: sc.compliance ? 'attention' : undefined },
      ]}
      signals={relatedSignals(db, signals, 'vendor', v.id)}
    >
      <Card title="One vendor, every system" action={<Link to="/fabric" className="text-xs text-accent-ink hover:underline">Data Fabric</Link>}>
        <p className="mb-2 text-sm text-ink-2">Nexus resolves the same supplier across sources into one golden record.</p>
        <Table head={['Source', 'Code']}>
          <tr><Td>SAP (LFA1)</Td><Td><span className="font-mono">{v.sapVendor}</span></Td></tr>
          {v.aliases.map((a) => <tr key={a.sourceId + a.code}><Td>{a.sourceId === 'excel' ? 'Excel data drop' : a.sourceId.toUpperCase()}</Td><Td><span className="font-mono">{a.code}</span></Td></tr>)}
        </Table>
        {v.indexClause && <p className="mt-2 text-xs text-attention">Contract has an index-linked price clause.</p>}
      </Card>
      <Card title={`Parts supplied (${parts.length})`}>
        <ul className="divide-y divide-line">{parts.map((p) => <li key={p.code} className="flex justify-between gap-3 py-2 text-sm"><Link to={`/parts/${p.code}`} className="text-accent-ink hover:underline">{p.description}</Link><span className="text-ink-3">L4 {p.commodityHierarchy.l4}</span></li>)}</ul>
      </Card>
      {pos.length > 0 && (
        <Card title={`Purchase orders (${pos.length})`}>
          <Table head={['PO', 'Date', 'Material', 'Net price', 'Qty']}>
            {pos.map((po) => <tr key={po.ebeln}><Td><span className="font-mono text-xs">{po.ebeln}</span></Td><Td>{fmtDay(po.docDate)}</Td><Td>{po.lines[0].material}</Td><Td num>{po.currency === 'INR' ? fmtInr(po.lines[0].netPrice, { compact: false }) : `${po.currency} ${po.lines[0].netPrice}`}</Td><Td num>{fmtNum(po.lines[0].qty)}</Td></tr>)}
          </Table>
        </Card>
      )}
      {ships.length > 0 && (
        <Card title="Shipments">
          <ul className="divide-y divide-line">{ships.map((s) => <li key={s.ref} className="flex justify-between py-2 text-sm"><Link to={`/shipments/${s.ref}`} className="font-mono text-accent-ink hover:underline">{s.ref}</Link><span className="text-ink-2">ETA {fmtDay(s.etaRevised ?? s.etaPlanned)}</span></li>)}</ul>
        </Card>
      )}
    </EntityLayout>
  )
}

// ---------------------------------------------------------------- Project

export function Project360() {
  const { id } = useParams()
  const db = useDb()
  const signals = useVisibleSignals()
  const rt = useNexus((s) => s.signals)
  const users = useTenantUsers()
  const p = db.projects.find((x) => x.id === id)
  if (!p) return <NotFound what="Project" />
  const contrib = projectContributions(db, signals, rt, p)
  const owner = users.find((u) => u.id === p.ownerId)
  const maxDays = Math.max(0, ...contrib.map((c) => c.days?.value ?? 0))
  const money = contrib.reduce((a, c) => a + (c.money?.value ?? 0), 0)
  return (
    <EntityLayout
      kind="Project" title={p.title} sub={`${p.id} · ${p.type} · stage ${p.stage}${owner ? ` · owner ${owner.name}` : ''}`}
      chips={<>{p.customer && <span className="rounded-md border border-line px-1.5 text-xs text-ink-2">Customer {p.customer}</span>}{p.productModelId && <Link to={`/models/${p.productModelId}`} className="rounded-md border border-line px-1.5 text-xs text-accent-ink">{p.productModelId}</Link>}</>}
      kpis={[
        { label: 'Signals touching it', value: fmtNum(contrib.length), source: 'Open signals in this tenant' },
        { label: 'Worst gate slip', value: plural(maxDays, 'day'), source: 'Engine: gate slip after float, per contributing signal', tone: maxDays ? 'critical' : undefined },
        { label: 'Should-cost per unit', value: money ? `+${fmtInr(money, { compact: false })}` : 'No change', source: 'Engine: commodity signals on this model BOM', tone: money ? 'attention' : undefined },
        { label: p.nextGate ? p.nextGate.name : 'Next gate', value: p.nextGate ? fmtDay(p.nextGate.planned) : (p.cutIn ? `Cut-in ${fmtDay(p.cutIn)}` : 'Not set'), source: 'R&D Control Tower / NPD plan' },
      ]}
      signals={relatedSignals(db, signals, 'project', p.id)}
    >
      <Card title="Why is this project at risk?">
        {contrib.length === 0 ? <p className="text-sm text-ink-2">Nothing open threatens this project.</p> : (
          <>
            <ul className="divide-y divide-line">
              {contrib.map((c) => (
                <li key={c.signal.id} className="flex flex-wrap items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/signals/${c.signal.id}`} className="text-sm font-medium text-ink hover:text-accent-ink">{c.signal.title}</Link>
                    <div className="text-xs text-ink-3">{c.days?.label ?? c.money?.label ?? c.note}</div>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div className="w-24"><div className="text-xs text-ink-3">Days</div><div className={cx('num font-semibold', c.days?.value ? 'text-critical' : 'text-ink-3')}>{c.days ? `+${c.days.value}` : 'n/a'}</div></div>
                    <div className="w-28"><div className="text-xs text-ink-3">₹ per unit</div><div className={cx('num font-semibold', c.money ? 'text-attention' : 'text-ink-3')}>{c.money ? `+${fmtInr(c.money.value, { compact: false })}` : 'n/a'}</div></div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-3">Days and money are different impacts and are not added together. No single source system could show this combined view.</p>
          </>
        )}
      </Card>
      {p.needs.length > 0 && (
        <Card title="Parts this project needs">
          <Table head={['Part', 'Qty', 'For', 'Planned start']}>
            {p.needs.map((n) => <tr key={n.partCode}><Td><Link to={`/parts/${n.partCode}`} className="text-accent-ink hover:underline">{db.parts.find((x) => x.code === n.partCode)?.description}</Link></Td><Td num>{fmtNum(n.qty)}</Td><Td>{n.forStage}</Td><Td>{fmtDay(n.plannedStart)}</Td></tr>)}
          </Table>
        </Card>
      )}
      <Card title="Plan">
        <dl className="divide-y divide-line">
          <Kv label="Stage">{p.stage}</Kv>
          {p.nextGate && <Kv label={p.nextGate.name}>{fmtDay(p.nextGate.planned)}</Kv>}
          {p.buildDurationDays !== undefined && <Kv label="Build and test duration">{plural(p.buildDurationDays, 'day')}</Kv>}
          {p.labSlots && <Kv label="Psychrometric lab slots">{p.labSlots.map(fmtDay).join(', ')}</Kv>}
          {p.latePenaltyPerDayInr && <Kv label="Customer LD clause">{fmtInr(p.latePenaltyPerDayInr)} per day</Kv>}
          {p.cutIn && <Kv label="ECN cut-in">{fmtDay(p.cutIn)} ({p.oldPart} to {p.newPart})</Kv>}
          {p.feedsProject && <Kv label="Feeds">{p.feedsProject}, {p.feedsLeadDays} days before its gate</Kv>}
        </dl>
      </Card>
    </EntityLayout>
  )
}

// ---------------------------------------------------------------- Shipment

const STAGES = ['request_raised', 'rfq_sent', 'so_confirmed', 'in_transit', 'about_to_reach', 'boe_filed', 'customs_cleared', 'delivered']

export function Shipment360() {
  const { ref } = useParams()
  const db = useDb()
  const signals = useVisibleSignals()
  const rt = useNexus((s) => s.signals)
  const sh = db.shipments.find((x) => x.ref === ref)
  if (!sh) return <NotFound what="Shipment" />
  const related = relatedSignals(db, signals, 'shipment', sh.ref)
  const quantified = related.find((s) => s.type === 'shipment_delay' && s.recommendations.length)
  const imp = quantified ? shipmentDetail(db, quantified, rt[quantified.id]?.done ?? []) : undefined
  const delay = sh.etaRevised ? daysBetween(sh.etaPlanned, sh.etaRevised) : 0
  const portDay = sh.containers.length * (sh.demurragePerContainerDay + sh.detentionPerContainerDay)
  const landed = sh.landedCost.reduce((a, c) => a + c.amountInr, 0)
  const at = STAGES.indexOf(sh.stage)
  let run = 0
  return (
    <EntityLayout
      kind="Shipment" title={sh.ref} sub={`${getVendor(db, sh.vendorId).name} · ${sh.pol} to ${sh.pod}${sh.icd ? ` via ${sh.icd}` : ''} · ${sh.incoterm} · ${sh.mode}`}
      chips={<>{sh.poNumbers.map((n) => <span key={n} className="rounded-md border border-line px-1.5 font-mono text-xs text-ink-2">PO {n}</span>)}<SapRef code="EKKO-EBELN" /></>}
      kpis={[
        { label: 'ETA', value: fmtDay(sh.etaRevised ?? sh.etaPlanned), source: 'EXIM: carrier and CARGOES feed (Simulated)', tone: delay ? 'critical' : undefined },
        { label: 'Delay', value: plural(delay, 'day'), source: 'EXIM: revised vs planned ETA', tone: delay ? 'critical' : undefined },
        { label: 'Landed cost booked', value: landed ? fmtInr(landed) : 'Not yet', source: 'SAP PRCD_ELEMENTS Z-conditions on the import PO' },
        { label: 'Port cost per day past free time', value: fmtInr(portDay), source: `Containers × (ZDCS + ZCDT), ${sh.freeDaysAtPort} free days` },
      ]}
      signals={related}
    >
      <Card title="Stage">
        <ol className="grid grid-cols-4 gap-2 sm:grid-cols-8" aria-label="EXIM stages">
          {STAGES.map((s, i) => (
            <li key={s}>
              <div className={cx('h-1.5 rounded-full', i < at ? 'bg-accent' : i === at ? (delay ? 'bg-critical' : 'bg-accent') : 'bg-line-strong')} />
              <div className={cx('mt-1.5 text-xs', i === at ? 'font-medium text-ink' : 'text-ink-3')}>{s.replace(/_/g, ' ')}</div>
            </li>
          ))}
        </ol>
        {sh.delayReason && <p className="mt-3 rounded-lg bg-critical-bg px-3 py-2 text-sm text-critical">{sh.delayReason}{sh.etdRevised ? ` Next sailing ${fmtDay(sh.etdRevised)}.` : ''}</p>}
        {imp && <p className="mt-3 text-sm text-ink-2">Arrives at {getPlant(db, imp.plant).name} {fmtDay(imp.revisedArrival)}. Stock runs out {fmtDay(imp.stockOutDate)}, {fmtNum(imp.unitsAtRisk)} units at risk. <Link to={`/signals/${quantified!.id}`} className="text-accent-ink hover:underline">Open the impact</Link></p>}
      </Card>
      <Card title="Landed-cost waterfall">
        {sh.landedCost.length === 0 ? <p className="text-sm text-ink-2">No import charges posted yet.</p> : (
          <div className="space-y-2">
            {sh.landedCost.map((c) => {
              const left = (run / landed) * 100
              run += c.amountInr
              return (
                <div key={c.type} className="grid grid-cols-[120px_1fr_90px] items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5"><SapRef code={`COND-${c.type}`} /></span>
                  <div className="h-3 rounded bg-surface-2"><div className="h-full rounded bg-info" style={{ marginLeft: `${left}%`, width: `${(c.amountInr / landed) * 100}%` }} /></div>
                  <span className="num text-right text-ink">{fmtInr(c.amountInr)}</span>
                </div>
              )
            })}
            <div className="grid grid-cols-[120px_1fr_90px] gap-3 border-t border-line pt-2 text-sm font-semibold"><span>Total</span><span /><span className="num text-right">{fmtInr(landed)}</span></div>
          </div>
        )}
      </Card>
      <Card title="Containers and lines">
        <Table head={['Container', 'Type']}>{sh.containers.map((c) => <tr key={c.no}><Td><span className="font-mono">{c.no}</span></Td><Td>{c.type}</Td></tr>)}</Table>
        <div className="mt-3"><Table head={['Part', 'Qty']}>{sh.lines.map((l) => <tr key={l.partCode}><Td><Link to={`/parts/${l.partCode}`} className="text-accent-ink hover:underline">{db.parts.find((p) => p.code === l.partCode)?.description}</Link></Td><Td num>{fmtNum(l.qty)}</Td></tr>)}</Table></div>
      </Card>
    </EntityLayout>
  )
}

// ---------------------------------------------------------------- Plant

export function Plant360() {
  const { code } = useParams()
  const db = useDb()
  const user = useCurrentUser()
  const signals = useVisibleSignals()
  const users = useTenantUsers()
  if (code === 'me') return <Navigate to={`/plants/${user?.scope.plants[0] ?? db.plants[0].sapPlant}`} replace />
  const pl = db.plants.find((x) => x.sapPlant === code)
  if (!pl) return <NotFound what="Plant" />
  const rows = db.parts.flatMap((p) => p.plants.filter((pp) => pp.plant === pl.sapPlant).map((pp) => {
    const st = db.stock.filter((s) => s.material === p.code && s.plant === pl.sapPlant).reduce((a, s) => ({ u: a.u + s.unrestricted, q: a.q + s.qualityInsp, b: a.b + s.blocked }), { u: 0, q: 0, b: 0 })
    return { p, pp, st, cover: pp.dailyUse && st.u ? Math.floor(st.u / pp.dailyUse) : null }
  }))
  const critical = rows.filter((r) => r.pp.criticalPart && r.cover !== null && (r.st.u - r.pp.safetyStock) / r.pp.dailyUse < 14)
  const capex = db.capex.filter((c) => c.plant === pl.sapPlant)
  const people = users.filter((u) => u.scope.plants.includes(pl.sapPlant))
  const inbound = db.shipments.filter((s) => s.plant === pl.sapPlant)
  return (
    <EntityLayout
      kind="Plant" title={`${pl.name} (${pl.sapPlant})`} sub={`${pl.city}, ${pl.state} · ${pl.productLines.join(', ')}`}
      chips={<SapRef code="MARC-WERKS" />}
      kpis={[
        { label: 'Critical parts below safety in 14 days', value: fmtNum(critical.length), source: 'MARC-KZKRI, MARD-LABST, MARC-EISBE, daily use', tone: critical.length ? 'critical' : undefined },
        { label: 'Inbound shipments', value: fmtNum(inbound.length), source: 'EXIM shipments to this plant' },
        { label: 'Delayed inbound', value: fmtNum(inbound.filter((s) => s.etaRevised).length), source: 'EXIM: revised ETA later than planned', tone: inbound.some((s) => s.etaRevised) ? 'attention' : undefined },
        { label: 'Capex requests', value: fmtNum(capex.length), source: 'Capex module' },
      ]}
      signals={relatedSignals(db, signals, 'plant', pl.sapPlant)}
    >
      <Card title="Material cover">
        {rows.length === 0 ? <p className="text-sm text-ink-2">No parts planned at this plant in the seed.</p> : (
          <Table head={['Part', 'Critical', 'Unrestricted', 'QI', 'Blocked', 'Safety', 'Cover']}>
            {rows.map((r) => <tr key={r.p.code}><Td><Link to={`/parts/${r.p.code}`} className="text-accent-ink hover:underline">{r.p.description}</Link></Td><Td>{r.pp.criticalPart ? 'Yes' : 'No'}</Td><Td num>{fmtNum(r.st.u)}</Td><Td num>{fmtNum(r.st.q)}</Td><Td num>{fmtNum(r.st.b)}</Td><Td num>{fmtNum(r.pp.safetyStock)}</Td><Td num strong>{r.cover === null ? 'n/a' : `${r.cover} days`}</Td></tr>)}
          </Table>
        )}
      </Card>
      {capex.length > 0 && (
        <Card title="Capex at this plant">
          <Table head={['Request', 'Status', 'Budget', 'Delivery']}>
            {capex.map((c) => <tr key={c.no}><Td><div className="text-ink">{c.title}</div><div className="font-mono text-xs text-ink-3">{c.no}</div></Td><Td>{c.status}</Td><Td num>₹ {c.budgetCr.toFixed(2)} Cr</Td><Td>{fmtDay(c.deliveryPlanned)}{c.deliveryRevised && <span className="ml-1 text-critical">to {fmtDay(c.deliveryRevised)}</span>}</Td></tr>)}
          </Table>
        </Card>
      )}
      <Card title={`People scoped to this plant (${people.length})`}>
        <ul className="divide-y divide-line">{people.map((u) => <li key={u.id} className="flex justify-between py-2 text-sm"><span className="text-ink">{u.name}</span><span className="text-ink-3">{getRole(db, u.roleId).name}</span></li>)}</ul>
      </Card>
    </EntityLayout>
  )
}

// ---------------------------------------------------------------- Commodity

export function Commodity360() {
  const { slug } = useParams()
  const db = useDb()
  const user = useCurrentUser()
  const signals = useVisibleSignals()
  if (slug === 'me') {
    const want = user?.scope.commodities.map((c) => c.toLowerCase()) ?? []
    const c = db.commodities.find((x) => want.includes(x.slug)) ?? db.commodities[0]
    return <Navigate to={`/commodities/${c.slug}`} replace />
  }
  const c = db.commodities.find((x) => x.slug === slug)
  if (!c) return <NotFound what="Commodity" />
  const f = forecast30(c)
  const q1 = avgBetween(c, '2026-04-01', '2026-06-30')
  const q2 = avgBetween(c, '2026-07-01', '2026-09-30')
  const parts = db.parts.filter((p) => p.costModel?.commodity === c.slug)
  const data = [
    ...c.series.map((p) => ({ d: fmtDay(p.d), v: p.v, band: undefined as [number, number] | undefined })),
    ...c.forecast.map((p) => ({ d: fmtDay(p.d), v: undefined as number | undefined, mid: p.mid, band: [p.low, p.high] as [number, number] })),
  ]
  const nameSignals = signals.filter((s) => s.entityRefs.some((r) => r.kind === 'commodity' && r.id.toLowerCase() === c.slug))
  return (
    <EntityLayout
      kind="Commodity" title={c.name} sub={`${c.category} · ${c.unit}`}
      chips={<><span className="text-xs text-ink-3">Cost Engine feed</span><SimulatedTag what="LME and market feeds" /></>}
      kpis={[
        { label: 'Today', value: `${fmtNum(latest(c))} ${c.unit}`, source: 'Cost Engine: latest print' },
        { label: '14 days', value: pct(changeOver(c, 14)), source: 'Latest vs 14 days ago', tone: changeOver(c, 14) > 0.05 ? 'critical' : undefined },
        { label: 'Forecast, 30 days', value: `${pct(f.low)} to ${pct(f.high)}`, source: 'Cost Engine forecast band', tone: f.mid > 0.03 ? 'attention' : undefined },
        { label: 'Q2 vs Q1 FY27', value: pct(q2 / q1 - 1), source: 'Quarterly averages of the series' },
      ]}
      signals={nameSignals}
    >
      <Card title="12 months and forecast">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="d" tick={{ fill: 'var(--text-3)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={8} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 12 }} tickLine={false} axisLine={false} width={56} domain={['auto', 'auto']} tickFormatter={(n) => fmtNum(n)} />
              <RTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }} formatter={(n: number | number[]) => (Array.isArray(n) ? n.map(fmtNum).join(' to ') : fmtNum(n))} />
              <Area dataKey="band" stroke="none" fill="var(--attention-bg)" fillOpacity={0.9} name="Forecast band" />
              <Line dataKey="v" stroke="var(--accent)" strokeWidth={2} dot={false} name="Price" connectNulls={false} />
              <Line dataKey="mid" stroke="var(--attention)" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Forecast mid" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title={`Parts driven by ${c.name} (${parts.length})`}>
        {parts.length === 0 ? <p className="text-sm text-ink-2">No parts carry this commodity in their should-cost model.</p> : (
          <Table head={['Part', 'L4', 'Share in price', 'Moving price', 'Daily use']}>
            {parts.map((p) => <tr key={p.code}><Td><Link to={`/parts/${p.code}`} className="text-accent-ink hover:underline">{p.description}</Link></Td><Td>{p.commodityHierarchy.l4}</Td><Td num>{Math.round(p.costModel!.share * 100)}%</Td><Td num>{fmtInr(p.plants[0].movingPrice, { compact: false })}</Td><Td num>{fmtNum(p.plants[0].dailyUse)}</Td></tr>)}
          </Table>
        )}
      </Card>
    </EntityLayout>
  )
}

// ---------------------------------------------------------------- Product model

export function Model360() {
  const { id } = useParams()
  const db = useDb()
  const signals = useVisibleSignals()
  const rt = useNexus((s) => s.signals)
  const m = db.productModels.find((x) => x.id === id)
  if (!m) return <NotFound what="Product model" />
  const lines = m.bom.map((b) => ({ b, part: db.parts.find((p) => p.code === b.partCode), heat: bomHeat(db, signals, rt, b.partCode) }))
  const atRisk = lines.filter((l) => l.heat.score > 0).length
  const projects = db.projects.filter((p) => p.productModelId === m.id)
  const modelSignals = [...new Set(lines.flatMap((l) => l.heat.signals).concat(signals.filter((s) => isOpen(rt, s) && s.entityRefs.some((r) => r.kind === 'model' && r.id === m.id))))]
  const cost = lines.reduce((a, l) => a + l.b.qtyPer * (l.part?.plants[0].movingPrice ?? 0), 0)
  return (
    <EntityLayout
      kind="Product model" title={m.name} sub={`${m.id} · ${m.productLine}${m.tonnage ? ` · ${m.tonnage} TR` : ''}${m.starRating ? ` · ${m.starRating} star` : ''} · ${m.customer}`}
      chips={<><SapRef code="MAST-STLAN" /><span className="text-xs text-ink-3">BOM usage 1 (production)</span></>}
      kpis={[
        { label: 'BOM lines', value: fmtNum(lines.length), source: 'BOM in the seed (STKO/STPO in production)' },
        { label: 'Lines at risk', value: fmtNum(atRisk), source: 'Open signals on the part or its cost driver', tone: atRisk ? 'attention' : undefined },
        { label: 'Seeded BOM cost', value: fmtInr(cost, { compact: false }), source: 'Σ qty × MBEW-VERPR over seeded lines' },
        { label: 'December plan', value: `${fmtNum(m.decemberPlanUnits)} units`, source: 'Production plan' },
      ]}
      signals={modelSignals}
    >
      <Card title="BOM with risk heat">
        <Table head={['Part', 'Qty per unit', 'L4', 'Risk', 'Signals']}>
          {lines.map(({ b, part, heat }) => (
            <tr key={b.partCode}>
              <Td><Link to={`/parts/${b.partCode}`} className="text-accent-ink hover:underline">{part?.description ?? b.partCode}</Link></Td>
              <Td num>{b.qtyPer}</Td>
              <Td>{part?.commodityHierarchy.l4}</Td>
              <Td><span className={cx('inline-flex h-5 min-w-12 items-center justify-center rounded px-1.5 text-xs font-medium', heat.score >= 3 ? 'bg-critical-bg text-critical' : heat.score >= 1 ? 'bg-attention-bg text-attention' : 'bg-surface-2 text-ink-3')}>{heat.score >= 3 ? 'High' : heat.score >= 1 ? 'Watch' : 'Clear'}</span></Td>
              <Td>{heat.signals.map((s) => <Tip key={s.id} text={s.title}><Link to={`/signals/${s.id}`} className="mr-1.5 font-mono text-xs text-accent-ink hover:underline">{s.id.slice(-4)}</Link></Tip>)}</Td>
            </tr>
          ))}
        </Table>
      </Card>
      {projects.length > 0 && (
        <Card title="Projects on this model">
          <ul className="divide-y divide-line">{projects.map((p) => <li key={p.id} className="flex justify-between gap-3 py-2 text-sm"><Link to={`/projects/${p.id}`} className="text-accent-ink hover:underline">{p.title}</Link><span className="text-ink-3">{p.stage}</span></li>)}</ul>
        </Card>
      )}
    </EntityLayout>
  )
}

