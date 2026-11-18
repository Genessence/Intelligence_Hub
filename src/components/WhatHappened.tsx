// Scenario-specific "What happened" panels for the Impact Explorer. Every number comes from src/engine.
import type { ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import type { Db, Signal } from '@/data/types'
import type { RuntimeCtx } from '@/engine/scenarios'
import { shipmentDetail } from '@/engine/scenarios/shipment'
import { commodityRows } from '@/engine/scenarios/commodity'
import { passRows } from '@/engine/scenarios/passThrough'
import { obsolescenceState } from '@/engine/scenarios/obsolescence'
import { qualityState } from '@/engine/scenarios/quality'
import { toolState } from '@/engine/scenarios/tooling'
import { demandState } from '@/engine/scenarios/demand'
import { stockProjection } from '@/engine/slipPropagation'
import { changeOver, pct } from '@/engine/commodity'
import { daysBetween } from '@/engine/dates'
import { fmtDay, fmtInr, fmtNum } from '@/engine/format'
import { getPart, getPlant, getProject, getShipment, getVendor } from '@/engine/lookup'
import { cx, Kv, Num, SapRef } from './ui/primitives'

const axis = { tick: { fill: 'var(--text-3)', fontSize: 12 }, tickLine: false }
const tooltip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' } }
const Legend = ({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) => (
  <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: dashed ? 'transparent' : color, borderTop: dashed ? `2px dashed ${color}` : undefined }} />{label}</span>
)
const Chart = ({ children, h = 'h-52' }: { children: ReactNode; h?: string }) => <div className={h}><ResponsiveContainer width="100%" height="100%">{children as never}</ResponsiveContainer></div>

export function WhatHappened({ db, signal, done, ctx }: { db: Db; signal: Signal; done: string[]; ctx: RuntimeCtx }) {
  // Informational signals (no workflow, so no scenario model) get the record list, never a scenario panel.
  if (!signal.recommendations.length) return <Generic db={db} signal={signal} />
  switch (signal.type) {
    case 'shipment_delay': return <Shipment db={db} signal={signal} done={done} />
    case 'commodity_spike': return <Commodity db={db} signal={signal} done={done} />
    case 'pass_through': return <PassThrough db={db} signal={signal} />
    case 'ecn_obsolescence': return <Obsolescence db={db} signal={signal} done={done} />
    case 'supplier_quality': return <Quality db={db} signal={signal} done={done} />
    case 'tool_trial_fail': return <Tooling db={db} signal={signal} done={done} />
    case 'demand_uplift': return <Demand db={db} signal={signal} done={done} ctx={ctx} />
    default: return <Generic db={db} signal={signal} />
  }
}

function Shipment({ db, signal, done }: { db: Db; signal: Signal; done: string[] }) {
  const impact = shipmentDetail(db, signal, done)
  const sh = getShipment(db, impact.shipmentRef)
  const v = getVendor(db, sh.vendorId)
  const part = getPart(db, impact.partCode)
  const plant = getPlant(db, impact.plant)
  const poRef = signal.entityRefs.find((r) => r.kind === 'po')?.id
  const po = poRef ? db.purchaseOrders.find((p) => p.ebeln === poRef) : undefined
  const slip = impact.projectSlips[0]
  const rail = [
    { label: 'Sails', planned: sh.etdPlanned, revised: sh.etdRevised ?? sh.etdPlanned, note: sh.pol },
    { label: 'At port', planned: sh.etaPlanned, revised: sh.etaRevised ?? sh.etaPlanned, note: sh.pod },
    { label: 'At plant', planned: impact.plannedArrival, revised: impact.revisedArrival, note: `${plant.name} via ${sh.icd ?? 'road'}` },
    ...(slip ? [{ label: slip.forStage, planned: slip.plannedStart, revised: slip.newStart, note: getProject(db, slip.projectId).id }] : []),
  ]
  const data = stockProjection(impact).map((p) => ({ ...p, d: fmtDay(p.d) }))
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-ink-2">Shipment <span className="font-mono text-ink">{sh.ref}</span></span>
        {po && <span className="flex items-center gap-1.5 text-ink-2">SAP PO <span className="font-mono text-ink">{po.ebeln} / {po.lines[0].item}</span> <SapRef code="EKKO-EBELN" /></span>}
        <span className="text-ink-2">{v.name}, {sh.containers.length} × {sh.containers[0].type}, {sh.incoterm}</span>
      </div>
      <p className="rounded-lg bg-critical-bg px-3 py-2 text-sm text-critical">
        {sh.delayReason} {sh.etdRevised && <>Next sailing {fmtDay(sh.etdRevised)}. </>}ETA moves <Num source="EXIM: ETA planned vs revised">{impact.delayDays} days</Num>, from {fmtDay(sh.etaPlanned)} to {fmtDay(sh.etaRevised ?? sh.etaPlanned)}.
      </p>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Milestones, planned and revised">
        {rail.map((s) => {
          const d = daysBetween(s.planned, s.revised)
          return (
            <li key={s.label}>
              <div className={cx('h-1.5 rounded-full', d > 0 ? 'bg-critical' : 'bg-line-strong')} />
              <div className="mt-2 text-xs font-medium text-ink">{s.label}</div>
              <div className="truncate text-xs text-ink-3">{s.note}</div>
              <div className="num mt-1 text-xs"><span className={d > 0 ? 'text-ink-3 line-through' : 'text-ink-2'}>{fmtDay(s.planned)}</span>{d > 0 && <span className="ml-1.5 font-medium text-critical">{fmtDay(s.revised)}</span>}</div>
            </li>
          )
        })}
      </ol>
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
          <span className="flex flex-wrap items-center gap-1.5">Projected stock of {part.description} at {plant.name} <SapRef code="MARD-LABST" /> <SapRef code="MARC-EISBE" /></span>
          <span className="flex items-center gap-3"><Legend color="var(--accent)" label="If on time" /><Legend color="var(--critical)" label={impact.inflows.length ? 'Revised, with actions' : 'Revised'} /></span>
        </div>
        <Chart>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="d" {...axis} axisLine={{ stroke: 'var(--border)' }} interval={6} />
            <YAxis {...axis} axisLine={false} width={48} tickFormatter={(n) => fmtNum(n)} />
            <RTooltip {...tooltip} formatter={(n: number) => fmtNum(n)} />
            <ReferenceLine y={impact.safetyStock} stroke="var(--attention)" strokeDasharray="4 4" label={{ value: 'Safety stock', fill: 'var(--attention)', fontSize: 12, position: 'insideTopRight' }} />
            <Area type="stepAfter" dataKey="planned" stroke="var(--accent)" fill="var(--accent-soft)" strokeWidth={1.5} fillOpacity={0.5} name="If on time" />
            <Area type="stepAfter" dataKey="revised" stroke="var(--critical)" fill="var(--critical-bg)" strokeWidth={2} fillOpacity={0.6} name="Revised" />
          </AreaChart>
        </Chart>
        <p className="mt-1 text-xs text-ink-3">
          {fmtNum(impact.unrestricted)} units unrestricted, using {fmtNum(impact.dailyUse)} a day. Below safety stock from {fmtDay(impact.belowSafetyDate)}, out on {fmtDay(impact.stockOutDate)}. Marked critical part <SapRef code="MARC-KZKRI" />.
        </p>
      </div>
    </div>
  )
}

function Commodity({ db, signal, done }: { db: Db; signal: Signal; done: string[] }) {
  const k = commodityRows(db, signal, done)
  const hist = k.c.series.slice(-30).map((p) => ({ d: fmtDay(p.d), v: p.v }))
  const fc = k.c.forecast.map((f) => ({ d: fmtDay(f.d), low: f.low, mid: f.mid, high: f.high }))
  const data = [...hist, ...fc]
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="text-sm text-ink-2">{k.c.name} today <Num source={`Cost Engine: LME feed (${k.c.unit})`} className="font-semibold text-ink">{fmtNum(k.c.series[k.c.series.length - 1].v)} {k.c.unit}</Num></span>
        <span className="text-sm text-critical">{pct(changeOver(k.c, 14))} in 14 days</span>
        <span className="text-sm text-attention">Forecast {pct(k.f.low)} to {pct(k.f.high)} in 30 days</span>
      </div>
      <div>
        <div className="mb-1 flex justify-end gap-3 text-xs text-ink-3"><Legend color="var(--accent)" label="Price" /><Legend color="var(--attention)" label="Forecast mid" dashed /></div>
        <Chart>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="d" {...axis} axisLine={{ stroke: 'var(--border)' }} interval={6} />
            <YAxis {...axis} axisLine={false} width={56} domain={['auto', 'auto']} tickFormatter={(n) => fmtNum(n)} />
            <RTooltip {...tooltip} formatter={(n: number) => fmtNum(n)} />
            <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} dot={false} name="Price" />
            <Line type="monotone" dataKey="high" stroke="var(--attention)" strokeWidth={1} strokeDasharray="2 4" dot={false} name="Forecast high" />
            <Line type="monotone" dataKey="mid" stroke="var(--attention)" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Forecast mid" />
            <Line type="monotone" dataKey="low" stroke="var(--attention)" strokeWidth={1} strokeDasharray="2 4" dot={false} name="Forecast low" />
          </LineChart>
        </Chart>
      </div>
      <Table head={['Part', 'L4 Commodity', 'Share in price', 'Moving price', 'Covered days', 'Exposure']}>
        {k.rows.map((r) => (
          <tr key={r.p.code}>
            <Td><div className="text-ink">{r.p.description}</div><div className="font-mono text-xs text-ink-3">{r.p.code}</div></Td>
            <Td>{r.p.commodityHierarchy.l4}</Td>
            <Td num>{Math.round(r.share * 100)}%</Td>
            <Td num>{fmtInr(r.p.plants[0].movingPrice, { compact: false })}</Td>
            <Td num>{r.covered}</Td>
            <Td num strong>{fmtInr(r.exposure)}</Td>
          </tr>
        ))}
      </Table>
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">Parts found through the client Z-field L4 Commodity. Prices <SapRef code="MBEW-VERPR" /> and demand from MRP data.</p>
    </div>
  )
}

function PassThrough({ db, signal }: { db: Db; signal: Signal }) {
  const k = passRows(db, signal)
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2">{k.c.name} averaged <span className="num font-semibold text-ink">{pct(k.change)}</span> in Q2 FY27 against Q1. Expected price = last agreed price × (1 + copper share × index change).</p>
      <Table head={['Vendor and part', 'PO', 'Last agreed', 'Expected', 'PO price now', 'Received', 'Open', 'Recoverable']}>
        {k.rows.map((r) => (
          <tr key={r.ebeln}>
            <Td><div className="text-ink">{r.vendor}{r.clause && <span className="ml-1.5 rounded bg-attention-bg px-1 text-xs text-attention">index clause</span>}</div><div className="text-xs text-ink-3">{r.partDesc}</div></Td>
            <Td><span className="font-mono text-xs">{r.ebeln}</span></Td>
            <Td num>{fmtInr(r.lastAgreed, { compact: false })}</Td>
            <Td num>{fmtInr(r.expected, { compact: false })}</Td>
            <Td num><span className={r.passedThrough ? 'text-resolved' : 'text-critical'}>{fmtInr(r.actual, { compact: false })}</span></Td>
            <Td num>{fmtNum(r.received)}</Td>
            <Td num>{fmtNum(r.open)}</Td>
            <Td num strong>{r.passedThrough ? 'Passed through' : fmtInr(r.recReceived + r.recOpen)}</Td>
          </tr>
        ))}
      </Table>
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">PO price <SapRef code="EKPO-NETPR" /> · net received from GRN <SapRef code="MSEG-BWART" /> 101 less 102 and 122 · open <SapRef code="EKPO-MENGE" /> less received.</p>
    </div>
  )
}

function Obsolescence({ db, signal, done }: { db: Db; signal: Signal; done: string[] }) {
  const k = obsolescenceState(db, signal, done)
  const max = Math.max(k.stock + k.open0, k.demand, 1)
  const bar = (label: string, v: number, tone: string, sap?: string) => (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 text-ink-2">{label}{sap && <SapRef code={sap} />}</span><span className="num text-ink">{fmtNum(v)} units</span></div>
      <div className="h-2.5 rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: tone }} /></div>
    </div>
  )
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2"><span className="font-mono text-ink">{k.ecn.id}</span> replaces <span className="text-ink">{k.part.description}</span> ({k.part.code}) with {k.ecn.newPart} at cut-in <span className="text-ink">{fmtDay(k.cutIn)}</span>, plants {k.plants.join(' and ')}.</p>
      {bar('Stock of the old revision', k.stock, 'var(--info)', 'MARD-LABST')}
      {bar('Still to deliver on open POs', k.open, 'var(--info)', 'EKPO-MENGE')}
      {bar(`Demand until cut-in (${fmtNum(k.daily)} a day)`, k.demand, 'var(--accent)')}
      {bar('Excess', k.excess, 'var(--critical)')}
      {k.steps.length > 0 && <ul className="text-xs text-ink-2">{k.steps.map((s, i) => <li key={i}>{s.lever}: {fmtNum(s.unitsDelta)} units removed from the excess</li>)}</ul>}
    </div>
  )
}

function Quality({ db, signal, done }: { db: Db; signal: Signal; done: string[] }) {
  const k = qualityState(db, signal, done)
  const data = k.weeks.map((w) => ({ d: fmtDay(w.d), rate: Number((w.rate * 100).toFixed(2)), blocked: w.blocked, returned: w.returned }))
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2">{k.part.description} from <span className="text-ink">{k.vendor.name}</span> at {getPlant(db, k.plant).name}. Weekly GRs into blocked stock and returns against receipts.</p>
      <Chart>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="d" {...axis} axisLine={{ stroke: 'var(--border)' }} />
          <YAxis {...axis} axisLine={false} width={40} tickFormatter={(n) => `${n}%`} />
          <RTooltip {...tooltip} formatter={(n: number) => `${n}%`} />
          <Bar dataKey="rate" fill="var(--critical)" radius={[4, 4, 0, 0]} name="Rejection rate" />
        </BarChart>
      </Chart>
      <Table head={['Week', 'Received (101)', 'Blocked (103)', 'Returned (122)', 'Rate']}>
        {k.weeks.map((w) => <tr key={w.d}><Td>{fmtDay(w.d)}</Td><Td num>{fmtNum(w.received)}</Td><Td num>{fmtNum(w.blocked)}</Td><Td num>{fmtNum(w.returned)}</Td><Td num strong>{(w.rate * 100).toFixed(1)}%</Td></tr>)}
      </Table>
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">From GRN <SapRef code="MSEG-BWART" /> and stock <SapRef code="MARD-INSME" /> <SapRef code="MARD-SPEME" />. SAP QM inspection lots are a Roadmap upgrade; Amber's dictionary has no QM fields yet.</p>
    </div>
  )
}

function Tooling({ db, signal, done }: { db: Db; signal: Signal; done: string[] }) {
  const k = toolState(db, signal, done)
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2"><span className="font-mono text-ink">{k.tool.id}</span> {k.tool.title}, at {getVendor(db, k.tool.vendorId).name}. Stage: {k.tool.stage}.</p>
      <Table head={['Trial', 'Date', 'Result', 'Failed checks']}>
        {k.tool.trials.map((t) => <tr key={t.n}><Td>T{t.n}</Td><Td>{fmtDay(t.date)}</Td><Td><span className={t.result === 'fail' ? 'text-critical' : 'text-resolved'}>{t.result === 'fail' ? 'Failed' : 'Passed'}</span></Td><Td>{t.failedParams.join(', ') || 'None'}</Td></tr>)}
      </Table>
      <dl className="divide-y divide-line">
        <Kv label="Commissioning">{fmtDay(k.tool.commissioningPlanned)} → <span className="font-medium text-critical">{fmtDay(k.commissioning)}</span></Kv>
        <Kv label={`FPA ready (${k.ncd.id})`}>{fmtDay(k.fpaPlanned)} → <span className={cx('font-medium', k.fpaReady > k.needBy ? 'text-critical' : 'text-ink')}>{fmtDay(k.fpaReady)}</span></Kv>
        <Kv label={`Needed by, for the ${k.feeds.nextGate!.name} of ${k.feeds.id}`}>{fmtDay(k.needBy)}</Kv>
      </dl>
    </div>
  )
}

function Demand({ db, signal, done, ctx }: { db: Db; signal: Signal; done: string[]; ctx: RuntimeCtx }) {
  const k = demandState(db, signal, done, ctx)
  const data = k.rows.map((r) => ({ m: r.month, Plan: r.baseline, Forecast: r.forecast }))
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2">From the uploaded file <span className="font-mono text-ink">{k.drop.fileName}</span> ({fmtNum(k.drop.rowsOk)} of {fmtNum(k.drop.rows)} rows mapped). There is no sales system; this is a data drop.</p>
      <Chart>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="m" {...axis} axisLine={{ stroke: 'var(--border)' }} />
          <YAxis {...axis} axisLine={false} width={52} tickFormatter={(n) => fmtNum(n)} />
          <RTooltip {...tooltip} formatter={(n: number) => fmtNum(n)} />
          <Bar dataKey="Plan" fill="var(--border-strong)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Forecast" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </Chart>
      <dl className="divide-y divide-line">
        <Kv label={<span className="flex items-center gap-1.5">Compressor lead time <SapRef code="MARC-PLIFZ" /></span>}>{k.comp.plannedDelivDays} days, order by {fmtDay(k.orderBy)}</Kv>
        <Kv label={`${k.capex.no} (${getPlant(db, k.capex.plant).name})`}>{k.capex.title}: {fmtDay(k.capex.deliveryPlanned)} → <span className="text-critical">{fmtDay(k.capex.deliveryRevised ?? k.capex.deliveryPlanned)}</span></Kv>
      </dl>
    </div>
  )
}

function Generic({ db, signal }: { db: Db; signal: Signal }) {
  return (
    <dl className="divide-y divide-line">
      {signal.entityRefs.map((r, i) => {
        let v: string = r.id
        try {
          if (r.kind === 'part') v = `${getPart(db, r.id).description} (${r.id})`
          if (r.kind === 'vendor') v = getVendor(db, r.id).name
          if (r.kind === 'plant') v = `${getPlant(db, r.id).name} (${r.id})`
          if (r.kind === 'project') v = `${getProject(db, r.id).title} (${r.id})`
          if (r.kind === 'shipment') { const s = getShipment(db, r.id); v = `${s.ref}, ${s.pol} to ${s.pod}, ETA ${fmtDay(s.etaRevised ?? s.etaPlanned)}${s.etaRevised ? ` (was ${fmtDay(s.etaPlanned)})` : ''}` }
          if (r.kind === 'capex') { const c = db.capex.find((x) => x.no === r.id); if (c) v = `${c.title} (${c.no}), delivery ${fmtDay(c.deliveryPlanned)}${c.deliveryRevised ? ` → ${fmtDay(c.deliveryRevised)}` : ''}` }
          if (r.kind === 'tool') { const t = db.tools.find((x) => x.id === r.id); if (t) v = `${t.title} (${t.id}), ${t.stage}` }
          if (r.kind === 'commodity') { const c = db.commodities.find((x) => x.slug === r.id.toLowerCase() || x.name.toLowerCase().includes(r.id.toLowerCase())); v = c ? `${r.id}: ${c.name} at ${fmtNum(c.series[c.series.length - 1].v)} ${c.unit}, ${pct(changeOver(c, 30))} in 30 days` : `${r.id} (L4 Commodity)` }
        } catch { /* keep id */ }
        return <Kv key={i} label={<span className="capitalize">{r.kind}</span>}>{v}</Kv>
      })}
    </dl>
  )
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left text-xs text-ink-3">{head.map((h) => <th key={h} className="px-2 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  )
}
export const Td = ({ children, num, strong }: { children: ReactNode; num?: boolean; strong?: boolean }) => (
  <td className={cx('px-2 py-2 align-top', num && 'num text-right whitespace-nowrap', strong ? 'font-semibold text-ink' : 'text-ink-2')}>{children}</td>
)

