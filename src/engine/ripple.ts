// Ripple graph: signal -> sources (shipment, PO, vendor, commodity) -> parts -> projects -> plants / customers -> people.
import type { Db, Signal, UserProfile } from '@/data/types'
import type { Recipient } from './audience'
import { fmtDay, fmtNum } from './format'
import { getPart, getPlant, getPo, getProject, getRole, getShipment, getVendor } from './lookup'
import type { ShipmentImpact } from './slipPropagation'

export type NodeKind = 'signal' | 'shipment' | 'po' | 'vendor' | 'commodity' | 'part' | 'project' | 'plant' | 'customer' | 'people' | 'tool' | 'capex' | 'model'
export interface RippleNode {
  id: string
  col: number
  kind: NodeKind
  label: string
  sub: string
  tone?: 'critical' | 'attention' | 'info' | 'neutral'
  detail: { label: string; value: string; field?: string }[]
}
export interface RippleEdge { from: string; to: string; label: string }

export const COLUMNS = ['Source records', 'Parts', 'Projects and plants', 'Customers', 'People']

export function buildRipple(db: Db, signal: Signal, audience: Recipient[], users: UserProfile[], impact?: ShipmentImpact) {
  const nodes: RippleNode[] = []
  const edges: RippleEdge[] = []
  const add = (n: RippleNode) => { if (!nodes.some((x) => x.id === n.id)) nodes.push(n) }
  const sigId = `sig:${signal.id}`
  add({ id: sigId, col: 0, kind: 'signal', label: signal.title, sub: signal.id, tone: signal.severity === 'critical' ? 'critical' : 'attention', detail: [] })

  const parts = new Set<string>()
  for (const r of signal.entityRefs) {
    if (r.kind === 'shipment') {
      const sh = getShipment(db, r.id)
      const id = `shipment:${sh.ref}`
      add({ id, col: 1, kind: 'shipment', label: sh.ref, sub: `${impact && impact.delayDays > 0 ? `ETA +${impact.delayDays} days · ` : ''}${sh.pol} to ${sh.pod}`, tone: impact && impact.delayDays > 0 ? 'critical' : 'neutral',
        detail: [{ label: 'Vendor', value: getVendor(db, sh.vendorId).name }, { label: 'Incoterm', value: sh.incoterm }, { label: 'ETA planned', value: fmtDay(sh.etaPlanned) }, { label: 'ETA revised', value: sh.etaRevised ? fmtDay(sh.etaRevised) : 'On plan' }] })
      edges.push({ from: sigId, to: id, label: impact ? `ETA +${impact.delayDays} days` : 'raised on' })
      sh.lines.forEach((l) => { parts.add(l.partCode); edges.push({ from: id, to: `part:${l.partCode}`, label: `${fmtNum(l.qty)} units on shipment` }) })
    }
    if (r.kind === 'po') {
      const po = getPo(db, r.id)
      const id = `po:${po.ebeln}`
      add({ id, col: 1, kind: 'po', label: `PO ${po.ebeln}`, sub: `Purchasing group ${po.purchasingGroup}, ${po.docType}`, tone: 'neutral',
        detail: [{ label: 'Purchasing Document', value: po.ebeln, field: 'EKKO-EBELN' }, { label: 'Purchasing Group', value: po.purchasingGroup, field: 'EKKO-EKGRP' }, { label: 'Delivery date', value: fmtDay(po.lines[0].deliveryDate), field: 'EKET-EINDT' }, { label: 'Release State', value: po.releaseState, field: 'EKKO-FRGZU' }] })
      edges.push({ from: sigId, to: id, label: 'SAP PO' })
      po.lines.forEach((l) => { parts.add(l.material); edges.push({ from: id, to: `part:${l.material}`, label: signal.entityRefs.some((x) => x.kind === 'shipment') ? '' : `item ${l.item}` }) })
    }
    if (r.kind === 'commodity') {
      const id = `commodity:${r.id}`
      add({ id, col: 1, kind: 'commodity', label: r.id, sub: 'L4 Commodity', tone: 'attention', detail: [] })
      edges.push({ from: sigId, to: id, label: 'index move' })
    }
    if (r.kind === 'vendor' && !signal.entityRefs.some((x) => x.kind === 'shipment')) {
      const v = getVendor(db, r.id)
      const id = `vendor:${v.id}`
      add({ id, col: 1, kind: 'vendor', label: v.name, sub: `SAP vendor ${v.sapVendor}`, tone: 'neutral', detail: [{ label: 'Vendor', value: v.sapVendor, field: 'LFA1-LIFNR' }] })
      edges.push({ from: sigId, to: id, label: 'supplier' })
      // Link the vendor to the parts it supplies that this signal is about (same L4 commodity when one is named).
      const commodity = signal.entityRefs.find((x) => x.kind === 'commodity')?.id
      const named = signal.entityRefs.filter((x) => x.kind === 'part').map((x) => x.id)
      for (const p of db.parts.filter((pt) => pt.vendors.includes(v.id) && (named.includes(pt.code) || (commodity ? pt.commodityHierarchy.l4 === commodity : named.length === 0)))) {
        parts.add(p.code)
        edges.push({ from: id, to: `part:${p.code}`, label: 'supplies' })
      }
    }
    if (r.kind === 'part') parts.add(r.id)
    if (r.kind === 'tool') {
      const t = db.tools.find((x) => x.id === r.id)
      if (t) {
        const id = `tool:${t.id}`
        const last = t.trials[t.trials.length - 1]
        add({ id, col: 1, kind: 'tool', label: t.title, sub: `${t.id} · T${last?.n} ${last?.result === 'fail' ? 'failed' : 'passed'}`, tone: last?.result === 'fail' ? 'critical' : 'neutral', detail: [{ label: 'Stage', value: t.stage }, { label: 'Vendor', value: getVendor(db, t.vendorId).name }, { label: 'Commissioning planned', value: fmtDay(t.commissioningPlanned) }] })
        edges.push({ from: id, to: `part:${t.partCode}`, label: 'makes' })
        parts.add(t.partCode)
      }
    }
    if (r.kind === 'model') {
      const m = db.productModels.find((x) => x.id === r.id)
      if (m) add({ id: `model:${m.id}`, col: 1, kind: 'model', label: m.name, sub: `Demand uplift · ${m.customer}`, tone: 'attention', detail: [{ label: 'Product line', value: m.productLine }, { label: 'Customer', value: m.customer }] })
    }
  }
  for (const r of signal.entityRefs.filter((x) => x.kind === 'model')) {
    const m = db.productModels.find((x) => x.id === r.id)
    m?.bom.filter((b) => parts.has(b.partCode)).forEach((b) => edges.push({ from: `model:${m.id}`, to: `part:${b.partCode}`, label: `${b.qtyPer} per unit` }))
  }

  for (const code of parts) {
    const p = getPart(db, code)
    const id = `part:${code}`
    const isImpact = impact?.partCode === code
    add({ id, col: 2, kind: 'part', label: p.description, sub: `${code} · L4 ${p.commodityHierarchy.l4}`, tone: isImpact ? 'attention' : 'neutral',
      detail: [{ label: 'Material', value: code, field: 'MARA-MATNR' }, { label: 'Material Group', value: p.materialGroup, field: 'MARA-MATKL' }, ...(isImpact && impact ? [{ label: 'Unrestricted', value: fmtNum(impact.unrestricted), field: 'MARD-LABST' }, { label: 'Safety Stock', value: fmtNum(impact.safetyStock), field: 'MARC-EISBE' }] : [])] })
    if (!edges.some((e) => e.to === id)) {
      const from = nodes.find((n) => n.kind === 'commodity') ? `commodity:${p.commodityHierarchy.l4}` : sigId
      edges.push({ from: nodes.some((n) => n.id === from) ? from : sigId, to: id, label: 'affects' })
    }
  }

  for (const r of signal.entityRefs.filter((x) => x.kind === 'project')) {
    const pr = getProject(db, r.id)
    const id = `project:${pr.id}`
    const slip = impact?.projectSlips.find((s) => s.projectId === pr.id)
    add({ id, col: 3, kind: 'project', label: pr.title, sub: `${pr.id} · ${pr.stage}`, tone: slip && slip.slipDays > 0 ? 'critical' : 'neutral',
      detail: [{ label: 'Stage', value: pr.stage }, ...(slip ? [{ label: `${slip.forStage} planned start`, value: fmtDay(slip.plannedStart) }, { label: 'New start', value: fmtDay(slip.newStart) }] : [])] })
    const need = pr.needs.find((n) => parts.has(n.partCode))
    const fromPart = need ? `part:${need.partCode}` : [...parts][0] ? `part:${[...parts][0]}` : sigId
    edges.push({ from: fromPart, to: id, label: need ? `needed for ${need.forStage} by ${fmtDay(need.plannedStart)}` : 'related project' })
    if (pr.customer) {
      const cid = `customer:${pr.customer}`
      add({ id: cid, col: 4, kind: 'customer', label: pr.customer, sub: 'Customer (OBU)', tone: slip && slip.slipDays > 0 ? 'attention' : 'neutral', detail: [] })
      edges.push({ from: id, to: cid, label: slip?.gate ? (slip.gate.slipDays > 0 ? `${slip.gate.name} +${slip.gate.slipDays} days` : `${slip.gate.name} holds (float ${slip.gate.floatDays} days)`) : 'customer' })
    }
  }

  for (const r of signal.entityRefs.filter((x) => x.kind === 'customer')) {
    const cid = `customer:${r.id}`
    if (!nodes.some((n) => n.id === cid)) {
      add({ id: cid, col: 4, kind: 'customer', label: r.id, sub: 'Customer (OBU)', tone: 'attention', detail: [] })
      const m = nodes.find((n) => n.kind === 'model')
      if (m) edges.push({ from: m.id, to: cid, label: 'ordered by' })
    }
  }
  for (const r of signal.entityRefs.filter((x) => x.kind === 'plant')) {
    const pl = getPlant(db, r.id)
    const id = `plant:${pl.sapPlant}`
    const isImpactPlant = impact?.plant === pl.sapPlant
    add({ id, col: 3, kind: 'plant', label: `${pl.name} (${pl.sapPlant})`, sub: pl.state, tone: isImpactPlant && impact && impact.lineStopDays > 0 ? 'critical' : 'neutral',
      detail: [{ label: 'Plant', value: pl.sapPlant, field: 'MARC-WERKS' }] })
    const fromPart = isImpactPlant && impact ? `part:${impact.partCode}` : [...parts][0] ? `part:${[...parts][0]}` : sigId
    edges.push({ from: fromPart, to: id, label: isImpactPlant && impact ? `stock-out ${fmtDay(impact.stockOutDate)}` : 'used at' })
  }

  for (const r of signal.entityRefs.filter((x) => x.kind === 'capex')) {
    const c = db.capex.find((x) => x.no === r.id)
    if (!c) continue
    const id = `capex:${c.no}`
    add({ id, col: 3, kind: 'capex', label: c.title, sub: `${c.no} · due ${fmtDay(c.deliveryRevised ?? c.deliveryPlanned)}`, tone: c.deliveryRevised ? 'critical' : 'neutral', detail: [{ label: 'Plant', value: getPlant(db, c.plant).name }, { label: 'Budget', value: `₹ ${c.budgetCr} Cr` }, { label: 'Delivery planned', value: fmtDay(c.deliveryPlanned) }] })
    const pl = nodes.find((n) => n.id === `plant:${c.plant}`)
    if (pl) edges.push({ from: id, to: pl.id, label: 'capacity for' })
  }

  // People, grouped by role function.
  const groups = new Map<string, string[]>()
  for (const rcp of audience) {
    const u = users.find((x) => x.id === rcp.userId)
    if (!u) continue
    const fn = getRole(db, u.roleId).function
    groups.set(fn, [...(groups.get(fn) ?? []), u.name])
  }
  // Wire each group from what put them in scope: customers to KAMs, plants to plant roles, otherwise the richest node.
  const customer = nodes.find((n) => n.kind === 'customer')
  const plant = nodes.find((n) => n.kind === 'plant')
  const project = nodes.find((n) => n.kind === 'project')
  const fallback = customer ?? plant ?? project ?? nodes.filter((n) => n.kind !== 'signal').slice(-1)[0]
  const fromFor = (fn: string) =>
    fn === 'Customer' ? customer ?? fallback :
    fn === 'Planning & plant' || fn === 'EXIM' || fn === 'Quality' ? plant ?? fallback :
    fn === 'NPD / R&D' || fn === 'Tooling' ? project ?? fallback :
    plant ?? fallback
  for (const [fn, names] of groups) {
    const id = `people:${fn}`
    add({ id, col: 5, kind: 'people', label: fn, sub: names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', '), tone: 'info', detail: names.map((n) => ({ label: n, value: '' })) })
    if (fallback) edges.push({ from: fromFor(fn).id, to: id, label: '' })
  }
  // The signal itself is the page header; the graph starts at the records it was raised on.
  const shown = nodes.filter((n) => n.kind !== 'signal').map((n) => ({ ...n, col: n.col - 1 }))
  return { nodes: shown, edges: edges.filter((e) => e.from !== sigId && e.to !== sigId) }
}
