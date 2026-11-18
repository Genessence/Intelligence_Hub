// S6: commodity pass-through clawback. expected = last agreed × (1 + share × index change); recoverable = (actual − expected) × qty.
import type { Db, PurchaseOrder, Recommendation, Signal } from '@/data/types'
import { avgBetween, commodityByName, pct } from '../commodity'
import { fmtInr, fmtNum } from '../format'
import { getPart, getVendor } from '../lookup'
import { type Booking, type DraftEntry, entryBase, type Scenario, type ScenarioImpact } from './types'

const Q1 = ['2026-04-01', '2026-06-30'] as const
const Q2 = ['2026-07-01', '2026-09-30'] as const
const FALL_DATE = '2026-10-01'

export interface PassRow {
  vendorId: string
  vendor: string
  part: string
  partDesc: string
  ebeln: string
  lastAgreed: number
  actual: number
  expected: number
  share: number
  received: number
  open: number
  recReceived: number
  recOpen: number
  clause: boolean
  passedThrough: boolean
}

const netReceived = (db: Db, po: PurchaseOrder) =>
  db.goodsReceipts.filter((g) => g.ebeln === po.ebeln).reduce((a, g) => a + (g.movementType === '101' ? g.qty : g.movementType === '102' || g.movementType === '122' ? -g.qty : 0), 0)

export function passRows(db: Db, s: Signal) {
  const c = commodityByName(db, s.entityRefs.find((r) => r.kind === 'commodity')!.id)
  const change = avgBetween(c, ...Q2) / avgBetween(c, ...Q1) - 1
  const rows: PassRow[] = []
  for (const vr of s.entityRefs.filter((r) => r.kind === 'vendor')) {
    const v = getVendor(db, vr.id)
    const after = db.purchaseOrders.filter((p) => p.vendorId === v.id && p.docDate >= FALL_DATE)
    for (const po of after) {
      const line = po.lines[0]
      const part = getPart(db, line.material)
      if (part.costModel?.commodity !== c.slug) continue
      const prev = db.purchaseOrders.filter((p) => p.vendorId === v.id && p.docDate < Q2[0] && p.lines[0].material === line.material).sort((a, b) => b.docDate.localeCompare(a.docDate))[0]
      if (!prev) continue
      const lastAgreed = prev.lines[0].netPrice
      const share = part.costModel.share
      const expected = lastAgreed * (1 + share * change)
      const per = Math.max(0, line.netPrice - expected)
      const received = netReceived(db, po)
      const open = Math.max(0, line.qty - received)
      rows.push({ vendorId: v.id, vendor: v.name, part: part.code, partDesc: part.description, ebeln: po.ebeln, lastAgreed, actual: line.netPrice, expected, share, received, open, recReceived: per * received, recOpen: per * open, clause: !!v.indexClause, passedThrough: per === 0 })
    }
  }
  return { c, change, rows }
}

function toImpact(db: Db, s: Signal, done: string[]): ScenarioImpact {
  const { c, change, rows } = passRows(db, s)
  const doneKinds = s.recommendations.filter((r) => done.includes(r.id)).map((r) => r.kind)
  const recv = doneKinds.includes('debit_note') ? 0 : rows.reduce((a, r) => a + r.recReceived, 0)
  const open = doneKinds.includes('inforecord_update') ? 0 : rows.reduce((a, r) => a + r.recOpen, 0)
  const holding = rows.filter((r) => !r.passedThrough)
  return {
    inrAtRisk: recv + open,
    inrLabel: 'Recoverable from vendors',
    inrFormula: `Σ (PO price − index-adjusted price) × net received and open quantity`,
    inrSource: 'Engine: SAP EKPO-NETPR, GRN MSEG-BWART 101 net of 102 and 122, Cost Engine Q1 vs Q2 average',
    plants: ['1001'],
    metrics: [
      { label: `${c.name}, Q2 vs Q1 average`, value: pct(change), source: 'Cost Engine: quarterly average of the LME series' },
      { label: 'Vendors that kept the price', value: `${fmtNum(holding.length)} of ${fmtNum(rows.length)}` },
      { label: 'On quantity received', value: fmtInr(recv), sap: 'MSEG-BWART' },
      { label: 'On still-to-deliver quantity', value: fmtInr(open), sap: 'EKPO-MENGE' },
      { label: 'Contracts with an index clause', value: fmtNum(rows.filter((r) => r.clause).length) },
    ],
  }
}

export const passThroughScenario: Scenario = {
  impact: (db, s, done) => toImpact(db, s, done),
  book(db, s, rec: Recommendation, done): Booking {
    const before = toImpact(db, s, done)
    const after = toImpact(db, s, [...done, rec.id])
    const delta = before.inrAtRisk - after.inrAtRisk
    const entries: DraftEntry[] = []
    const base = entryBase(s, rec, '1001')
    if (delta > 0) {
      const onOpen = rec.kind === 'inforecord_update'
      entries.push({ ...base, lever: onOpen ? 'Info-record price update' : 'Pass-through claim', type: 'hard', baseline: { kind: 'Last price paid', value: 'Q1 FY27 PO price, index-adjusted' }, formula: `Σ (PO price − index-adjusted price) × ${onOpen ? 'still-to-deliver' : 'net received'} quantity`, amountInr: delta })
    }
    return { entries, costInr: 0, before, after, note: rec.kind === 'index_clause' ? 'No value booked now. Future falls pass through automatically.' : 'Turns Realised when the next GRN posts at the revised price.' }
  },
}
