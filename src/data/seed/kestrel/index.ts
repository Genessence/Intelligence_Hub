// Second tenant (spec 11): fictional auto-parts maker on SAP S/4HANA. Light seed, same role templates.
import type { Db, Scope } from '@/data/types'
import { ROLES } from '@/config/roles'
import { COMMODITIES } from '../amber/series'

const s = (o: Partial<Scope> = {}): Scope => ({ plants: [], purchasingGroups: [], mrpControllers: [], commodities: [], projects: [], vendors: [], customers: [], ...o })
const pp = (plant: string, o: { purchasingGroup: string; dailyUse: number; price: number; safety: number }) => ({ plant, purchasingGroup: o.purchasingGroup, mrpController: '201', plannedDelivDays: 30, safetyStock: o.safety, abc: 'A' as const, criticalPart: true, standardPrice: o.price, movingPrice: o.price, dailyUse: o.dailyUse })

export const KESTREL: Db = {
  tenant: {
    id: 'kestrel', name: 'Kestrel Auto Components', shortName: 'KA', industry: 'Automotive components (die-cast and machined parts)',
    erp: { system: 'SAP S/4HANA', methods: ['OData', 'IDoc', 'CDS views'] },
    modules: [
      { id: 'cost', name: 'Cost Engine', status: 'Live' },
      { id: 'exim', name: 'EXIM', status: 'Live' },
      { id: 'npd', name: 'NPD', status: 'Roadmap' },
      { id: 'tooling', name: 'Tooling NTD', status: 'Roadmap' },
      { id: 'rnd', name: 'R&D Control Tower', status: 'Roadmap' },
      { id: 'capex', name: 'Capex', status: 'Roadmap' },
      { id: 'vendor', name: 'Vendor Management', status: 'Roadmap' },
      { id: 'quality', name: 'Quality', status: 'Roadmap' },
      { id: 'sap', name: 'SAP S/4HANA connector', status: 'Live' },
      { id: 'datadrop', name: 'Bring your data', status: 'Live' },
    ],
    contributionPerUnitInr: 420,
  },
  plants: [
    { code: 'PUNE', sapPlant: 'K100', name: 'Pune (Chakan)', city: 'Pune', state: 'Maharashtra', productLines: ['Die-cast'] },
    { code: 'HOSUR', sapPlant: 'K200', name: 'Hosur', city: 'Hosur', state: 'Tamil Nadu', productLines: ['Machining'] },
    { code: 'MANESAR', sapPlant: 'K300', name: 'Manesar', city: 'Manesar', state: 'Haryana', productLines: ['Assembly'] },
  ],
  vendors: [
    { id: 'kv-alcast', name: 'Alcast Ingots Pvt. Ltd.', country: 'IN', category: 'Aluminium alloy', status: 'ACTIVE', sapVendor: '0000300112', aliases: [] },
    { id: 'kv-deccan', name: 'Deccan Alloys', country: 'IN', category: 'Aluminium alloy', status: 'ACTIVE', sapVendor: '0000300140', aliases: [] },
    { id: 'kv-orion', name: 'Orion Freight', country: 'IN', category: 'Freight forwarder', status: 'ACTIVE', sapVendor: '0000300201', aliases: [] },
  ],
  parts: [
    { code: 'K-410022', description: 'HOUSING ALU DIE-CAST GEARBOX REAR', materialType: 'HALB', materialGroup: 'DC01', commodityHierarchy: { l1: 'Bought out', l2: 'Non-ferrous', l3: 'Die-cast', l4: 'Aluminium' }, sourcingType: 'Domestic', baseUom: 'NOS', hsCode: '76169990', vendors: ['kv-alcast'], costModel: { commodity: 'aluminium', share: 0.62 }, plants: [pp('K100', { purchasingGroup: 'K01', dailyUse: 1800, price: 612, safety: 3000 })] },
    { code: 'K-410031', description: 'COVER ALU DIE-CAST CLUTCH', materialType: 'HALB', materialGroup: 'DC01', commodityHierarchy: { l1: 'Bought out', l2: 'Non-ferrous', l3: 'Die-cast', l4: 'Aluminium' }, sourcingType: 'Domestic', baseUom: 'NOS', hsCode: '76169990', vendors: ['kv-deccan'], costModel: { commodity: 'aluminium', share: 0.58 }, plants: [pp('K100', { purchasingGroup: 'K01', dailyUse: 1500, price: 388, safety: 2500 })] },
    { code: 'K-410044', description: 'BRACKET ALU DIE-CAST ENGINE MOUNT', materialType: 'HALB', materialGroup: 'DC02', commodityHierarchy: { l1: 'Bought out', l2: 'Non-ferrous', l3: 'Die-cast', l4: 'Aluminium' }, sourcingType: 'Domestic', baseUom: 'NOS', hsCode: '76169990', vendors: ['kv-alcast'], costModel: { commodity: 'aluminium', share: 0.55 }, plants: [pp('K100', { purchasingGroup: 'K01', dailyUse: 2200, price: 214, safety: 4000 })] },
  ],
  productModels: [{ id: 'KM-GB6', name: 'Six-speed gearbox kit', productLine: 'Gearbox', tonnage: 0, starRating: 0, customer: 'Arvelo Motors', decemberPlanUnits: 38000, bom: [{ partCode: 'K-410022', qtyPer: 1 }, { partCode: 'K-410031', qtyPer: 1 }, { partCode: 'K-410044', qtyPer: 2 }] }],
  purchaseOrders: [],
  goodsReceipts: [],
  stock: [],
  users: [
    { id: 'k-meenal', name: 'Meenal Desai', title: 'Managing Director', roleId: 'md', featured: true, scope: s({ all: true }), pitch: 'Group-wide risk and value at a glance.' },
    { id: 'k-arjun', name: 'Arjun Nambiar', title: 'CFO', roleId: 'cfo', featured: true, scope: s({ all: true }), pitch: 'Aluminium exposure and proven savings.' },
    { id: 'k-sana', name: 'Sana Mirza', title: 'Head of Sourcing', roleId: 'head_sourcing', featured: true, scope: s({ all: true }), pitch: 'Alloy price moves before they reach a PO.' },
    { id: 'k-vikas', name: 'Vikas Pawar', title: 'Cost Engineer, Die-cast', roleId: 'cost_engineer', featured: true, scope: s({ commodities: ['Aluminium'] }), pitch: 'Should-cost on every die-cast part, daily.' },
    { id: 'k-leela', name: 'Leela Thomas', title: 'Buyer, Alloys (K01)', roleId: 'buyer', scope: s({ purchasingGroups: ['K01'] }) },
    { id: 'k-hari', name: 'Hari Prasad', title: 'Plant Head, Pune', roleId: 'plant_head', scope: s({ plants: ['K100'] }) },
    { id: 'k-rina', name: 'Rina Chatterjee', title: 'EXIM Manager', roleId: 'exim_manager', scope: s({ shipmentsAll: true }) },
    { id: 'k-omar', name: 'Omar Sheikh', title: 'Finance Controller', roleId: 'finance_controller', scope: s({ all: true }) },
  ].map((u) => ({ ...u, tenantId: 'kestrel' })),
  roles: ROLES,
  shipments: [],
  projects: [],
  signals: [
    {
      id: 'KSIG-2026-0412', sourceId: 'cost', type: 'commodity_spike', severity: 'high', ownerId: 'k-sana',
      title: 'LME Aluminium rising, die-cast housings exposed',
      summary: 'Every die-cast part with L4 Commodity = Aluminium carries more should-cost. Production plan and quality data arrive as data drops; there is no MES yet.',
      raisedAt: '2026-11-16T07:45:00+05:30', firstKnownAt: '2026-11-15T09:00:00+05:30', firstKnownBy: 'Cost Engine (LME feed)',
      entityRefs: [{ kind: 'commodity', id: 'Aluminium' }, { kind: 'part', id: 'K-410022' }, { kind: 'part', id: 'K-410031' }, { kind: 'part', id: 'K-410044' }, { kind: 'plant', id: 'K100' }],
      status: 'new', ruleId: 'R-COST-INDEX-3PCT',
      recommendations: [
        { id: 'KREC-0412-LOCK', kind: 'price_lock', title: 'Request a 2-month price lock from alloy vendors', effect: 'Holds today’s alloy prices for two months of die-cast demand.', ownerRoleId: 'head_sourcing', target: { system: 'Vendor Portal', recordType: 'Price-lock request' }, steps: ['Pick vendors and quantities', 'Confirm the lock window', 'Send'], params: { months: 2, workingDaysPerMonth: 25 } },
        { id: 'KREC-0412-RERUN', kind: 'rerun_shouldcost', title: 'Re-run should-cost at the forecast high', effect: 'Gives sales a ceiling for the next customer price review.', ownerRoleId: 'cost_engineer', target: { system: 'Cost Engine', recordType: 'Should-cost run' }, steps: ['Confirm the scenario', 'Run'], params: {} },
      ],
    },
  ],
  commodities: COMMODITIES.filter((c) => c.slug === 'aluminium' || c.slug === 'usdinr'),
  tools: [],
  capex: [],
  dataDrops: [],
  valueHistory: [
    { id: 'VAL-FY27-0001', lever: 'Freight lane renegotiation', type: 'hard', baseline: { kind: 'Last rate paid', value: 'Q1 FY27 lane rate' }, calc: { qty: 64, rate: 18500 }, formula: '64 containers × ₹ 18,500 per container', ownerId: 'k-rina', plant: 'K100', status: 'validated', evidence: ['Invoice receipts on 64 import POs'], at: '2026-10-10T10:00:00+05:30', validatedBy: 'k-arjun' },
  ],
  costAssessments: [],
  supplierRequests: [],
  savingsTargetsInr: { Aluminium: 1_50_00_000 },
  subscriptionFeeInr: 6_00_000,
}
