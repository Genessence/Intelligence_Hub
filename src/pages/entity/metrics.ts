// Pure derivations for the 360 views. All figures come from the seed and the scenario engines.
import type { Db, Part, Project, Signal } from '@/data/types'
import type { SignalRuntime } from '@/store/useNexus'
import { shipmentDetail } from '@/engine/scenarios/shipment'
import { commodityRows } from '@/engine/scenarios/commodity'
import { toolState } from '@/engine/scenarios/tooling'
import { stockOf } from '@/engine/lookup'

export const isOpen = (rt: Record<string, SignalRuntime>, s: Signal) => !['resolved', 'dismissed'].includes(rt[s.id]?.status)

/** Signals that reference this entity directly (and, for parts, through a shipment or tool that carries it). */
export function relatedSignals(db: Db, signals: Signal[], kind: string, id: string) {
  return signals.filter((s) => s.entityRefs.some((r) => {
    if (r.kind === kind && (r.id === id || r.id.toLowerCase() === id.toLowerCase())) return true
    if (kind === 'part' && r.kind === 'shipment') return db.shipments.find((x) => x.ref === r.id)?.lines.some((l) => l.partCode === id)
    if (kind === 'part' && r.kind === 'tool') return db.tools.find((x) => x.id === r.id)?.partCode === id
    return false
  }))
}

export function partStock(db: Db, p: Part) {
  return p.plants.map((pp) => {
    const st = stockOf(db, p.code, pp.plant)
    return { pp, st, coverDays: pp.dailyUse ? Math.floor(st.unrestricted / pp.dailyUse) : null }
  })
}

export function openQty(db: Db, ebeln: string, material: string, qty: number) {
  const net = db.goodsReceipts.filter((g) => g.ebeln === ebeln && g.material === material)
    .reduce((a, g) => a + (g.movementType === '101' ? g.qty : g.movementType === '102' || g.movementType === '122' ? -g.qty : 0), 0)
  return { received: net, open: Math.max(0, qty - net) }
}

/** Vendor scorecard from SAP documents: OTD from GRN date vs EKET-EINDT, rejection from 103 + 122 over 101, cost index vs standard price. */
export function vendorScorecard(db: Db, vendorId: string, signals: Signal[]) {
  const grs = db.goodsReceipts.filter((g) => g.vendorId === vendorId)
  const receipts = grs.filter((g) => g.movementType === '101' && g.qty > 0)
  const onTime = receipts.filter((g) => {
    const d = db.purchaseOrders.find((p) => p.ebeln === g.ebeln)?.lines.find((l) => l.item === g.ebelp)?.deliveryDate
    return d ? g.postingDate <= d : true
  }).length
  const recv = receipts.reduce((a, g) => a + g.qty, 0)
  const rej = grs.filter((g) => g.movementType === '103' || g.movementType === '122').reduce((a, g) => a + g.qty, 0)
  const lines = db.purchaseOrders.filter((p) => p.vendorId === vendorId && p.currency === 'INR').flatMap((p) => p.lines.map((l) => {
    const std = db.parts.find((x) => x.code === l.material)?.plants.find((x) => x.plant === l.plant)?.standardPrice
    return std ? (l.netPrice / l.priceUnit) / std : null
  })).filter((x): x is number => x !== null)
  const compliance = signals.filter((s) => s.type === 'vendor_compliance' && s.entityRefs.some((r) => r.kind === 'vendor' && r.id === vendorId))
  return {
    otd: receipts.length ? onTime / receipts.length : null,
    rejection: recv ? rej / recv : null,
    costIndex: lines.length ? (lines.reduce((a, x) => a + x, 0) / lines.length) * 100 : null,
    compliance: compliance.length ? compliance[0].title : null,
    receipts: receipts.length,
  }
}

export interface Contribution { signal: Signal; days?: { value: number; label: string }; money?: { value: number; label: string }; note?: string }

/** "Why is this project at risk?": each open signal's own contribution. Days and money stay separate; never summed. */
export function projectContributions(db: Db, signals: Signal[], rt: Record<string, SignalRuntime>, p: Project): Contribution[] {
  const model = p.productModelId ? db.productModels.find((m) => m.id === p.productModelId) : undefined
  const out: Contribution[] = []
  for (const s of signals.filter((x) => isOpen(rt, x))) {
    const done = rt[s.id]?.done ?? []
    const direct = s.entityRefs.some((r) => r.kind === 'project' && r.id === p.id)
    if (s.type === 'shipment_delay' && s.recommendations.length && direct) {
      const slip = shipmentDetail(db, s, done).projectSlips.find((x) => x.projectId === p.id)
      if (slip) out.push({ signal: s, days: { value: slip.gate?.slipDays ?? slip.slipDays, label: slip.gate ? `${slip.gate.name} slip after ${slip.gate.floatDays} days float (${slip.forStage} slips ${slip.slipDays} days)` : `${slip.forStage} slip` } })
    } else if (s.type === 'tool_trial_fail' && s.recommendations.length) {
      const t = toolState(db, s, done)
      if (t.feeds.id === p.id || t.ncd.id === p.id) out.push({ signal: s, days: { value: t.gateSlip, label: `${t.feeds.nextGate?.name ?? 'Gate'} slip from FPA on ${t.ncd.id}` } })
    } else if (s.type === 'commodity_spike' && s.recommendations.length && model) {
      const k = commodityRows(db, s, done)
      const perUnit = model.bom.reduce((a, b) => {
        const r = k.rows.find((x) => x.p.code === b.partCode)
        return r ? a + b.qtyPer * r.p.plants[0].movingPrice * r.share * k.change : a
      }, 0)
      if (perUnit > 0) out.push({ signal: s, money: { value: perUnit, label: `should-cost per unit of ${model.name}` } })
    } else if (direct) {
      out.push({ signal: s, note: 'Touches this project; not quantified' })
    }
  }
  return out
}

/** BOM risk heat per line: open signals on the part plus open commodity signals on its cost driver. */
export function bomHeat(db: Db, signals: Signal[], rt: Record<string, SignalRuntime>, partCode: string) {
  const part = db.parts.find((p) => p.code === partCode)
  const open = signals.filter((s) => isOpen(rt, s))
  const direct = relatedSignals(db, open, 'part', partCode)
  const commodity = part?.costModel ? open.filter((s) => s.type === 'commodity_spike' && s.entityRefs.some((r) => r.kind === 'commodity' && r.id.toLowerCase() === part.costModel!.commodity)) : []
  const all = [...new Set([...direct, ...commodity])]
  const score = all.reduce((a, s) => a + ({ critical: 3, high: 2, medium: 1, low: 0 })[s.severity], 0)
  return { score, signals: all }
}
