// App catalogue for the launcher and module pages: Genessence modules, SAP Fiori tiles and other tools.
import type { Db, ModuleStatus, Signal, SourceId } from '@/data/types'
import { DEMO_NOW } from '@/config/demoClock'
import { fmtDateTime, fmtInr, fmtNum, toInstant } from '@/engine/format'

export type AppGroup = 'Genessence modules' | 'SAP Fiori' | 'Other tools'
export interface AppEntry {
  id: string
  name: string
  group: AppGroup
  status: ModuleStatus
  desc: string
  sourceId?: SourceId
  syncMinsAgo: number
  dataDrop?: string // data-drop id that powers a Roadmap module today
  willRaise?: string[] // signals a Roadmap module will raise
  kpis: (db: Db, signals: Signal[]) => { label: string; value: string }[]
}

export const syncedAt = (mins: number) => fmtDateTime(new Date(toInstant(DEMO_NOW) - mins * 60000).toISOString())

const n = (x: number) => fmtNum(x)
const openOf = (signals: Signal[], src: string) => signals.filter((s) => s.sourceId === src && !['resolved', 'dismissed'].includes(s.status)).length

const BASE: Omit<AppEntry, 'status'>[] = [
  { id: 'cost', name: 'Cost Engine', group: 'Genessence modules', sourceId: 'cost', syncMinsAgo: 4, desc: 'Should-cost by commodity, vendor and part, with live index feeds.', kpis: (db, s) => [{ label: 'Commodities tracked', value: n(db.commodities.length) }, { label: 'Parts with a cost model', value: n(db.parts.filter((p) => p.costModel).length) }, { label: 'Open signals', value: n(openOf(s, 'cost')) }] },
  { id: 'exim', name: 'EXIM', group: 'Genessence modules', sourceId: 'exim', syncMinsAgo: 2, desc: 'Import shipments across 23 stages, duty and landed cost.', kpis: (db) => [{ label: 'Shipments', value: n(db.shipments.length) }, { label: 'Delayed', value: n(db.shipments.filter((x) => x.etaRevised).length) }, { label: 'Landed cost booked', value: fmtInr(db.shipments.reduce((a, x) => a + x.landedCost.reduce((b, c) => b + c.amountInr, 0), 0)) }] },
  { id: 'npd', name: 'NPD', group: 'Genessence modules', sourceId: 'npd', syncMinsAgo: 6, desc: 'New part and product development: NCD, ECN and Alternate Supplier.', kpis: (db, s) => [{ label: 'Active NCD / ECN / AS', value: n(db.projects.filter((p) => ['NCD', 'ECN', 'AS', 'NPD'].includes(p.type)).length) }, { label: 'Open signals', value: n(openOf(s, 'npd')) }] },
  { id: 'tooling', name: 'Tooling NTD', group: 'Genessence modules', sourceId: 'tooling', syncMinsAgo: 9, desc: 'New tool development, from RFQ to trials and commissioning.', kpis: (db) => [{ label: 'Tools in development', value: n(db.tools.length) }, { label: 'Last trial failed', value: n(db.tools.filter((t) => t.trials[t.trials.length - 1]?.result === 'fail').length) }] },
  { id: 'rnd', name: 'R&D Control Tower', group: 'Genessence modules', sourceId: 'rnd', syncMinsAgo: 7, desc: 'Stage gates CE, PROTO, DV, PP and MP, exceptions only.', kpis: (db) => [{ label: 'R&D projects', value: n(db.projects.filter((p) => p.type === 'RND').length) }, { label: 'Next gate', value: db.projects.find((p) => p.nextGate)?.nextGate?.name ?? 'None' }] },
  { id: 'capex', name: 'Capex', group: 'Genessence modules', sourceId: 'capex', syncMinsAgo: 12, desc: 'Budget, RFQ, reverse auction, PO and capitalisation.', kpis: (db) => [{ label: 'Requests', value: n(db.capex.length) }, { label: 'Budget', value: `₹ ${db.capex.reduce((a, c) => a + c.budgetCr, 0).toFixed(2)} Cr` }, { label: 'Machines late', value: n(db.capex.filter((c) => c.deliveryRevised).length) }] },
  { id: 'vendor', name: 'Vendor Management', group: 'Genessence modules', sourceId: 'vendor', syncMinsAgo: 15, desc: 'Vendor onboarding, compliance documents and ERP vendor codes.', kpis: (db, s) => [{ label: 'Vendors', value: n(db.vendors.length) }, { label: 'Compliance signals', value: n(s.filter((x) => x.type === 'vendor_compliance').length) }] },
  { id: 'vendor-portal', name: 'Vendor Portal', group: 'Genessence modules', syncMinsAgo: 5, desc: 'One supplier login across EXIM, Capex, NPD, Pricing and VMS.', kpis: (db) => [{ label: 'Suppliers with a login', value: n(db.vendors.length) }] },
  { id: 'price-approval', name: 'Price Approval Portal', group: 'Genessence modules', syncMinsAgo: 11, desc: 'Price approvals, approved price against PO price.', kpis: (db) => [{ label: 'POs checked', value: n(db.purchaseOrders.length) }] },
  { id: 'transport', name: 'Transport Portal', group: 'Genessence modules', syncMinsAgo: 20, desc: 'FTL and PTL freight should-cost.', kpis: () => [{ label: 'Freight model', value: 'FTL and PTL' }] },
  { id: 'coin', name: 'COIN', group: 'Genessence modules', syncMinsAgo: 45, desc: 'Cost optimisation and VAVE ideas pipeline.', kpis: () => [{ label: 'Feeds', value: 'Cost Engine, Value Ledger' }] },
  { id: 'costing-spec', name: 'Costing & Specification System', group: 'Genessence modules', syncMinsAgo: 60, desc: 'Chassis-based AC costing.', kpis: (db) => [{ label: 'Models costed', value: n(db.productModels.length) }] },
  { id: 'quality', name: 'Quality', group: 'Genessence modules', sourceId: 'quality', syncMinsAgo: 0, dataDrop: 'dd-inspection-oct', desc: 'Incoming inspection, supplier PPM, 8D and warranty.', willRaise: ['Supplier rejection rate above limit', 'Lot rejected at incoming inspection', '8D overdue'], kpis: () => [] },
  { id: 'mes', name: 'Production Planning & MES', group: 'Genessence modules', syncMinsAgo: 0, desc: 'Plan vs actual, OEE and line stops.', willRaise: ['Line stop longer than 30 minutes', 'Plan attainment below 90%'], kpis: () => [] },
  { id: 'inventory', name: 'Inventory & Warehouse', group: 'Genessence modules', syncMinsAgo: 0, desc: 'Stock cover, ageing and slow movers.', willRaise: ['Stock ageing past 180 days', 'Cover below safety stock'], kpis: () => [] },
  { id: 'maintenance', name: 'Maintenance', group: 'Genessence modules', syncMinsAgo: 0, desc: 'Breakdowns, MTBF and spares.', willRaise: ['Critical machine breakdown', 'MTBF falling'], kpis: () => [] },
  { id: 'sales', name: 'Sales & Demand', group: 'Genessence modules', syncMinsAgo: 0, dataDrop: 'dd-sales-fy27', desc: 'Forecast, orders and pre-booking.', willRaise: ['Demand uplift beyond supply', 'Order shortfall against plan'], kpis: () => [] },
  { id: 'finance', name: 'Finance', group: 'Genessence modules', syncMinsAgo: 0, desc: 'Working capital and landed-cost P&L.', willRaise: ['Landed-cost variance', 'Working capital above target'], kpis: () => [] },
  { id: 'esg', name: 'Sustainability / ESG', group: 'Genessence modules', syncMinsAgo: 0, desc: 'Energy, carbon per unit and EPR packaging.', willRaise: ['Carbon per unit above target', 'EPR packaging threshold crossed'], kpis: () => [] },
  { id: 'workforce', name: 'Workforce', group: 'Genessence modules', syncMinsAgo: 0, desc: 'Skills, attendance and contract labour.', willRaise: ['Skill gap on a critical line'], kpis: () => [] },
  { id: 'trolley', name: 'Trolley Management', group: 'Genessence modules', syncMinsAgo: 0, desc: 'RFID tracking of customer-assigned trolleys.', willRaise: ['Trolley overdue at customer'], kpis: () => [] },
  { id: 'fiori-po', name: 'Manage Purchase Orders', group: 'SAP Fiori', syncMinsAgo: 1, desc: 'SAP Fiori app, deep link.', kpis: (db) => [{ label: 'POs in Nexus', value: n(db.purchaseOrders.length) }] },
  { id: 'fiori-stock', name: 'Stock, Single Material', group: 'SAP Fiori', syncMinsAgo: 1, desc: 'SAP Fiori app, deep link.', kpis: (db) => [{ label: 'Stock positions', value: n(db.stock.length) }] },
  { id: 'fiori-gr', name: 'Post Goods Receipt', group: 'SAP Fiori', syncMinsAgo: 1, desc: 'SAP Fiori app, deep link.', kpis: (db) => [{ label: 'GRNs read', value: n(db.goodsReceipts.length) }] },
  { id: 'fiori-pr', name: 'Manage Purchase Requisitions', group: 'SAP Fiori', syncMinsAgo: 1, desc: 'SAP Fiori app, deep link.', kpis: () => [{ label: 'Write-back', value: 'With approval' }] },
  { id: 'fiori-asset', name: 'Display Fixed Asset', group: 'SAP Fiori', syncMinsAgo: 30, desc: 'SAP Fiori app, deep link.', kpis: (db) => [{ label: 'Capex assets', value: n(db.capex.length) }] },
  { id: 'teamcenter', name: 'Teamcenter PLM', group: 'Other tools', syncMinsAgo: 120, desc: 'Drawings and BOM revisions.', kpis: (db) => [{ label: 'Models linked', value: n(db.productModels.length) }] },
  { id: 'outlook', name: 'Outlook and Teams', group: 'Other tools', syncMinsAgo: 3, desc: 'Notifications by email and Teams.', kpis: () => [{ label: 'Channels', value: 'Email, Teams' }] },
  { id: 'plant-mes', name: 'Plant MES', group: 'Other tools', syncMinsAgo: 0, desc: 'Shop-floor execution system at the plants.', kpis: () => [] },
  { id: 'excel', name: 'Excel trackers', group: 'Other tools', syncMinsAgo: 25, desc: 'Spreadsheets brought in through Bring Your Data.', kpis: (db) => [{ label: 'Data drops available', value: n(db.dataDrops.length) }] },
]

const AMBER_STATUS: Record<string, ModuleStatus> = {
  'vendor-portal': 'Live', 'price-approval': 'Live', transport: 'Live', coin: 'Pilot', 'costing-spec': 'Pilot',
  'fiori-po': 'Live', 'fiori-stock': 'Live', 'fiori-gr': 'Live', 'fiori-pr': 'Pilot', 'fiori-asset': 'Live',
  teamcenter: 'Pilot', outlook: 'Live', 'plant-mes': 'Roadmap', excel: 'Live',
}

/** Catalogue resolved for a tenant: its own module statuses first, then the Amber-reference statuses for SAP and tools. */
export function catalogue(db: Db): AppEntry[] {
  return BASE.map((a) => {
    const own = db.tenant.modules.find((m) => m.id === a.id)?.status
    const status: ModuleStatus = own ?? (a.group === 'Genessence modules' ? (db.tenant.id === 'amber' ? AMBER_STATUS[a.id] ?? 'Roadmap' : 'Roadmap') : AMBER_STATUS[a.id] ?? 'Roadmap')
    return { ...a, status }
  })
}
