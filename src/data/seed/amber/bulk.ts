// Bulk demo data, generated deterministically from the shapes the Genessence modules actually use
// (EXIM stage keys and lanes, NPD/ECN/AS stages, NTD stages, Capex statuses and heads, Cost Engine modules,
// VMS groups and onboarding). All names and figures are fictional. Hero scenarios S1 to S7 are untouched:
// no bulk record uses their parts at their plants, their vendors' after-fall POs, or their projects.
import type { CapexRequest, CostAssessment, GoodsReceipt, Part, Project, PurchaseOrder, Shipment, Signal, StockPosition, SupplierRequest, Tool, ValueSeed, Vendor } from '@/data/types'
import { addDays } from '@/engine/dates'

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const r = rng(20261116)
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]
const between = (a: number, b: number) => a + r() * (b - a)
const int = (a: number, b: number) => Math.round(between(a, b))
const round = (v: number, step: number) => Math.round(v / step) * step

// ---------------------------------------------------------------------------------- vendors
type Cat = { cat: string; code: string; group: string; country: string; city: string; l1: string; l2: string; l3: string; l4: string; uom: string; price: [number, number]; daily: [number, number]; hs: string; commodity?: { slug: string; share: number }; items: string[] }
const CATS: Cat[] = [
  { cat: 'Sheet metal', code: 'FJ', group: 'CR-RM', country: 'IN', city: 'Chakan', l1: 'Bought out', l2: 'Ferrous', l3: 'Sheet metal', l4: 'Steel', uom: 'NOS', price: [38, 420], daily: [150, 900], hs: '73269099', commodity: { slug: 'hrcoil', share: 0.55 }, items: ['ODU BASE PAN 1.5T', 'SIDE PANEL RH ODU', 'TOP COVER ODU', 'COMPRESSOR MOUNTING PLATE', 'CONTROL BOX COVER', 'MOTOR BRACKET GI', 'PARTITION PLATE ODU'] },
  { cat: 'Plastics moulding', code: 'FI', group: 'CR-RM', country: 'IN', city: 'Manesar', l1: 'Bought out', l2: 'Polymer', l3: 'Injection moulded', l4: 'Plastics', uom: 'NOS', price: [22, 380], daily: [180, 1200], hs: '39269099', commodity: { slug: 'abs', share: 0.48 }, items: ['IDU FRONT GRILL 1.5T', 'IDU FRONT PANEL WHITE', 'CROSS FLOW FAN HOUSING', 'DRAIN PAN IDU', 'SWING LOUVER ASSY', 'ODU FAN GUARD', 'REMOTE HOLDER'] },
  { cat: 'EPS packaging', code: 'AV', group: 'CR-PK', country: 'IN', city: 'Baddi', l1: 'Packing', l2: 'Polymer packing', l3: 'EPS', l4: 'EPS', uom: 'SET', price: [26, 95], daily: [200, 900], hs: '39219099', commodity: { slug: 'styrene', share: 0.55 }, items: ['EPS PACKING LEFT 1.0T', 'EPS PACKING RIGHT 1.0T', 'EPS BOTTOM TRAY ODU', 'EPS ANGLE BOARD KIT'] },
  { cat: 'Carton packaging', code: 'BP', group: 'CR-PK', country: 'IN', city: 'Rudrapur', l1: 'Packing', l2: 'Paper packing', l3: 'Carton', l4: 'Carton', uom: 'NOS', price: [48, 210], daily: [200, 900], hs: '48191010', items: ['CARTON IDU 1.5T 5 PLY', 'CARTON ODU 1.5T 7 PLY', 'CARTON WINDOW AC 1.0T'] },
  { cat: 'Insulation and rubber', code: 'FB', group: 'CR-RM', country: 'IN', city: 'Vapi', l1: 'Bought out', l2: 'Polymer', l3: 'Foam and rubber', l4: 'Insulation', uom: 'NOS', price: [3, 46], daily: [400, 3000], hs: '40169390', items: ['XLPE INSULATION TUBE 9.52', 'EPDM GROMMET COMPRESSOR', 'NBR DRAIN HOSE 1M', 'PE FOAM SHEET DRAIN PAN'] },
  { cat: 'Wire harness', code: 'BL', group: 'CR-RM', country: 'IN', city: 'Noida', l1: 'Bought out', l2: 'Electrical', l3: 'Wire harness', l4: 'Wire', uom: 'NOS', price: [60, 240], daily: [150, 700], hs: '85443000', items: ['POWER CORD 3 CORE 1.5M', 'INTERCONNECT CABLE 4 CORE', 'SENSOR HARNESS IDU'] },
  { cat: 'Fasteners and hardware', code: 'BD', group: 'CR-RM', country: 'IN', city: 'Ludhiana', l1: 'Bought out', l2: 'Hardware', l3: 'Fasteners', l4: 'Hardware', uom: 'NOS', price: [0.6, 9], daily: [2000, 12000], hs: '73181500', items: ['SCREW PAN HEAD M4X10', 'SELF TAPPING SCREW 4.2X13', 'HEX NUT M8 ZINC'] },
  { cat: 'Capacitors and electricals', code: 'AY', group: 'CR-RM', country: 'IN', city: 'Gurugram', l1: 'Bought out', l2: 'Electrical', l3: 'Capacitor', l4: 'Capacitor', uom: 'NOS', price: [38, 190], daily: [150, 800], hs: '85322990', items: ['RUN CAPACITOR 35MFD', 'FAN CAPACITOR 2.5MFD', 'TERMINAL BLOCK 5 WAY'] },
  { cat: 'Compressors (import)', code: 'AO', group: 'CR-IMP', country: 'CN', city: 'Ningbo', l1: 'Bought out', l2: 'Electro-mechanical', l3: 'Compressor', l4: 'Compressor', uom: 'NOS', price: [6900, 11800], daily: [80, 260], hs: '84143000', items: ['COMPRESSOR ROTARY R32 1.0T', 'COMPRESSOR ROTARY R32 2.0T', 'COMPRESSOR INVERTER R32 1.2T'] },
  { cat: 'Motors (import)', code: 'AP', group: 'CR-IMP', country: 'CN', city: 'Foshan', l1: 'Bought out', l2: 'Electro-mechanical', l3: 'Motor', l4: 'Motor', uom: 'NOS', price: [690, 1650], daily: [120, 500], hs: '85013119', items: ['IDU FAN MOTOR BLDC 30W', 'STEPPING MOTOR LOUVER 12V', 'ODU FAN MOTOR PSC 60W'] },
  { cat: 'PCB and controllers (import)', code: 'DX', group: 'CR-IMP', country: 'CN', city: 'Shenzhen', l1: 'Bought out', l2: 'Electronics', l3: 'PCBA', l4: 'PCB', uom: 'NOS', price: [420, 2600], daily: [80, 400], hs: '85340000', items: ['DISPLAY PCB IDU', 'MAIN PCB IDU INVERTER', 'WIFI MODULE PCB'] },
  { cat: 'Aluminium fin (import)', code: 'AA', group: 'CR-IMP', country: 'TH', city: 'Rayong', l1: 'Raw material', l2: 'Non-ferrous', l3: 'Aluminium', l4: 'Aluminium', uom: 'KG', price: [330, 372], daily: [500, 2200], hs: '76071990', commodity: { slug: 'aluminium', share: 0.74 }, items: ['ALUMINIUM FIN STOCK 0.095 BLUE', 'ALUMINIUM FIN STOCK 0.11 PLAIN'] },
  { cat: 'Valves (import)', code: 'BJ', group: 'CR-IMP', country: 'VN', city: 'Hai Phong', l1: 'Bought out', l2: 'Brass parts', l3: 'Valve', l4: 'Brass', uom: 'NOS', price: [140, 320], daily: [150, 600], hs: '84818090', items: ['SERVICE VALVE 2 WAY 1/4', 'EXPANSION VALVE ELECTRONIC'] },
]
const PREFIX = ['Shrikant', 'Vasudha', 'Aravali', 'Nilgiri', 'Sahyadri', 'Narmada', 'Godavari', 'Mahanadi', 'Vindhya', 'Satpura', 'Konkan', 'Malwa', 'Deccan', 'Tapti', 'Chambal', 'Shivalik', 'Ranthambore', 'Coromandel']
const SUFFIX: Record<string, string[]> = { IN: ['Industries', 'Engineering Works', 'Polymers', 'Components Pvt. Ltd.', 'Precision Works', 'Auto Parts LLP'], CN: ['Electric Co.', 'Precision Mfg Co.', 'Cooling Technology Co.', 'Electronics Co.'], TH: ['Aluminium Products Co.'], VN: ['Brass Industry Co.'] }
const CN_PREFIX = ['Jinyuan', 'Huaxin', 'Mingtai', 'Ruifeng', 'Xinda', 'Baolong', 'Siam Alu', 'Saigon Brass']

export const BULK_VENDORS: Vendor[] = []
const vendorsByCat = new Map<string, Vendor[]>()
let vn = 0
for (const c of CATS) {
  const n = c.country === 'IN' ? 3 : 2
  for (let i = 0; i < n; i++) {
    vn++
    const name = c.country === 'IN' ? `${PREFIX[(vn * 7) % PREFIX.length]} ${pick(SUFFIX.IN)}` : `${CN_PREFIX[(vn * 3) % CN_PREFIX.length]} ${pick(SUFFIX[c.country] ?? SUFFIX.CN)}`
    const status: Vendor['status'] = vn % 17 === 0 ? 'SUSPENDED' : vn % 9 === 0 ? 'PENDING' : 'ACTIVE'
    const gstExpiry = addDays('2026-11-16', int(-20, 330))
    const v: Vendor = {
      id: `vb-${String(vn).padStart(3, '0')}`, name, country: c.country, category: c.cat, status, sapVendor: `00001${String(8000 + vn * 37).padStart(5, '0')}`,
      msme: c.country !== 'IN' ? 'NON_MSME' : r() < 0.45 ? 'MSME' : r() < 0.75 ? 'NON_MSME' : 'PENDING',
      group: c.group, commodityCode: c.code, city: c.city, onboardedOn: addDays('2026-11-16', -int(60, 1400)),
      docs: c.country === 'IN'
        ? [{ type: 'GST certificate', expiry: gstExpiry, status: gstExpiry < '2026-11-16' ? 'PENDING' : 'VERIFIED' }, { type: 'MSME / Udyam', expiry: addDays('2026-11-16', int(10, 500)), status: 'VERIFIED' }, { type: 'ISO 9001', expiry: addDays('2026-11-16', int(-5, 700)), status: 'VERIFIED' }, { type: 'Signed supply agreement', expiry: addDays('2026-11-16', int(20, 900)), status: 'VERIFIED' }]
        : [{ type: 'Overseas supply agreement', expiry: addDays('2026-11-16', int(30, 700)), status: 'VERIFIED' }, { type: 'Tax registration', status: 'VERIFIED' }],
      aliases: vn % 3 === 0 ? [{ sourceId: 'vendor', code: `V-1${String(1000 + vn * 13)}` }] : vn % 4 === 0 ? [{ sourceId: 'exim', code: `${c.code}-${c.country}-${String(vn).padStart(2, '0')}` }] : [],
    }
    BULK_VENDORS.push(v)
    vendorsByCat.set(c.cat, [...(vendorsByCat.get(c.cat) ?? []), v])
  }
}

// ---------------------------------------------------------------------------------- parts, stock
const PLANTS_ALL = ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010']
const PG: Record<string, string> = { Steel: 'P07', Plastics: 'P05', EPS: 'P05', Carton: 'P08', Insulation: 'P09', Wire: 'P06', Hardware: 'P09', Capacitor: 'P06', Compressor: 'P03', Motor: 'P04', PCB: 'P06', Aluminium: 'P02', Brass: 'P01' }
export const BULK_PARTS: Part[] = []
export const BULK_STOCK: StockPosition[] = []
let pn = 0
for (const c of CATS) {
  for (const item of c.items) {
    pn++
    const code = `${(c.l4 === 'Compressor' ? 31 : c.l4 === 'Motor' ? 33 : c.l4 === 'PCB' ? 34 : c.l4 === 'Aluminium' ? 36 : c.l4 === 'Brass' ? 37 : 39)}${String(1000 + pn * 11).padStart(7, '0')}`
    // Spread over plants; avoid 1001 for import compressors so the S2 compressor picture stays clean.
    const homes = [pick(PLANTS_ALL.filter((p) => !(c.l4 === 'Compressor' && p === '1001'))), ...(r() < 0.45 ? [pick(PLANTS_ALL.slice(1))] : [])]
    const uniqueHomes = [...new Set(homes)]
    const price = round(between(...c.price), c.price[1] < 10 ? 0.05 : 1)
    const vendors = (vendorsByCat.get(c.cat) ?? []).map((v) => v.id)
    const part: Part = {
      code, description: item, materialType: c.l1 === 'Packing' ? 'VERP' : c.l1 === 'Raw material' ? 'ROH' : r() < 0.3 ? 'HALB' : 'ROH',
      materialGroup: `${c.code}0${int(1, 4)}`, commodityHierarchy: { l1: c.l1, l2: c.l2, l3: c.l3, l4: c.l4 },
      sourcingType: c.country === 'IN' ? 'Domestic' : 'Import', baseUom: c.uom, hsCode: c.hs, vendors: vendors.slice(0, r() < 0.35 ? 1 : 2),
      costModel: c.commodity ? { commodity: c.commodity.slug, share: c.commodity.share } : undefined, packingEpsG: c.l4 === 'EPS' ? int(110, 640) : undefined,
      plants: uniqueHomes.map((plant) => {
        const daily = round(between(...c.daily), 10)
        return { plant, purchasingGroup: PG[c.l4] ?? 'P09', mrpController: plant === '1009' ? '104' : `1${plant.slice(2)}`, plannedDelivDays: c.country === 'IN' ? int(7, 30) : int(55, 85), safetyStock: round(daily * between(2, 6), 10), abc: price * daily > 150000 ? 'A' : price * daily > 20000 ? 'B' : 'C', criticalPart: c.country !== 'IN' || r() < 0.2, standardPrice: price, movingPrice: round(price * between(0.97, 1.05), price < 10 ? 0.05 : 1), dailyUse: daily }
      }),
    }
    BULK_PARTS.push(part)
    for (const pp of part.plants) {
      const cover = between(4, 38)
      BULK_STOCK.push({ plant: pp.plant, sloc: c.l1 === 'Packing' ? 'PK01' : 'RM01', material: code, unrestricted: round(pp.dailyUse * cover, 10), qualityInsp: r() < 0.3 ? round(pp.dailyUse * between(0.2, 1.2), 10) : 0, blocked: r() < 0.15 ? round(pp.dailyUse * between(0.05, 0.4), 5) : 0, inTransit: r() < 0.1 ? round(pp.dailyUse * 2, 10) : 0 })
    }
  }
}

// ---------------------------------------------------------------------------------- POs and GRNs
export const BULK_POS: PurchaseOrder[] = []
export const BULK_GRS: GoodsReceipt[] = []
let po = 4500013000
let grn = 5000021000
for (const part of BULK_PARTS) {
  for (const pp of part.plants) {
    const vendorId = part.vendors[0]
    const nPo = r() < 0.5 ? 2 : 1
    for (let k = 0; k < nPo; k++) {
      po += int(3, 17)
      const docDate = addDays('2026-11-16', -int(15, 110))
      const lead = part.sourcingType === 'Import' ? int(50, 80) : int(7, 25)
      const deliveryDate = addDays(docDate, lead)
      const qty = round(pp.dailyUse * between(15, 45), 10)
      const ebeln = String(po)
      BULK_POS.push({ ebeln, docType: part.sourcingType === 'Import' ? 'ZIMP' : 'NB', category: r() < 0.15 ? 'L' : 'F', purchasingGroup: pp.purchasingGroup, purchOrg: '1000', vendorId, docDate, currency: part.sourcingType === 'Import' ? 'USD' : 'INR', releaseState: r() < 0.1 ? 'Awaiting release' : 'Released', lines: [{ item: '00010', material: part.code, plant: pp.plant, qty, netPrice: part.sourcingType === 'Import' ? Number((pp.standardPrice / 89).toFixed(2)) : pp.standardPrice, priceUnit: 1, deliveryDate }] })
      if (deliveryDate <= '2026-11-16') {
        // Receipts: mostly on time, some late (vendor OTD), occasional returns.
        const parts = r() < 0.5 ? 2 : 1
        for (let g = 0; g < parts; g++) {
          const late = r() < 0.28 ? int(1, 9) : -int(0, 3)
          const posting = addDays(deliveryDate, late + g * 6)
          if (posting > '2026-11-16') continue
          const q = round(qty / parts, 10)
          BULK_GRS.push({ mblnr: String(grn++), item: '0001', movementType: '101', postingDate: posting, ebeln, ebelp: '00010', material: part.code, plant: pp.plant, vendorId, qty: q, deliveryNote: `DN/${posting.slice(5).replace('-', '')}/${grn % 1000}` })
          if (r() < 0.12) BULK_GRS.push({ mblnr: String(grn++), item: '0001', movementType: '122', postingDate: addDays(posting, 2) > '2026-11-16' ? posting : addDays(posting, 2), ebeln, ebelp: '00010', material: part.code, plant: pp.plant, vendorId, qty: Math.max(1, round(q * between(0.003, 0.02), 1)), deliveryNote: `RTV/${grn % 1000}` })
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------------- EXIM shipments
// Stage spread for a live import desk (from the EXIM dashboard buckets).
const STAGES = ['request_raised', 'rfq_sent', 'ff_confirmed', 'supplier_confirmed', 'supplier_confirmed', 'so_confirmed', 'draft_bl_verified', 'in_transit', 'in_transit', 'in_transit', 'in_transit', 'about_to_reach', 'docs_sent_to_cha', 'boe_filed', 'under_assessment', 'duty_paid', 'do_released', 'in_plant_transit', 'under_query', 'empty_returned']
const LANES: { pol: string; pod: string; days: number; icd?: string }[] = [
  { pol: 'CNSHA', pod: 'INNSA1', days: 17, icd: 'Patli ICD (INPTL6)' }, { pol: 'CNNGB', pod: 'INMUN1', days: 16, icd: 'Garhi ICD (INGHR6)' }, { pol: 'CNSZX', pod: 'INNSA1', days: 15, icd: 'Dadri ICD (INDER6)' },
  { pol: 'CNTAO', pod: 'INMUN1', days: 19, icd: 'Tughlakabad ICD (INTKD6)' }, { pol: 'KRPUS', pod: 'INNSA1', days: 20 }, { pol: 'THLCH', pod: 'INMAA1', days: 12 }, { pol: 'VNHPH', pod: 'INMAA1', days: 14 }, { pol: 'CNSHA', pod: 'INMAA1', days: 14 },
]
const REASONS = ['Vessel rolled at origin.', 'Port congestion at discharge.', 'Rail congestion to the ICD.', 'Document mismatch on the commercial invoice.', 'BOE under assessment query.', 'Supplier cargo not ready on time.', 'DO release delayed at CFS.']
const PAST = new Set(['so_confirmed', 'draft_bl_verified', 'in_transit', 'about_to_reach', 'docs_sent_to_cha', 'boe_filed', 'under_assessment', 'duty_paid', 'do_released', 'in_plant_transit', 'under_query', 'empty_returned'])
export const BULK_SHIPMENTS: Shipment[] = []
const imports = BULK_PARTS.filter((p) => p.sourcingType === 'Import')
STAGES.forEach((stage, i) => {
  const part = imports[i % imports.length]
  const pp = part.plants[0]
  const lane = LANES[i % LANES.length]
  // Dates follow the stage: before sailing ETD is ahead; at sea ETA is ahead; after arrival ETA is behind.
  const ARRIVED = ['boe_filed', 'under_assessment', 'duty_paid', 'under_query', 'do_released', 'in_plant_transit', 'empty_returned']
  const order = ARRIVED.indexOf(stage)
  let eta: string
  if (['request_raised', 'rfq_sent', 'ff_confirmed', 'supplier_confirmed', 'so_confirmed', 'draft_bl_verified'].includes(stage)) eta = addDays('2026-11-16', lane.days + int(stage === 'draft_bl_verified' || stage === 'so_confirmed' ? 1 : 6, stage === 'request_raised' ? 30 : 14))
  else if (stage === 'in_transit') eta = addDays('2026-11-16', int(4, lane.days - 2))
  else if (stage === 'about_to_reach') eta = addDays('2026-11-16', int(1, 3))
  else if (stage === 'docs_sent_to_cha') eta = addDays('2026-11-16', int(2, 4))
  else eta = addDays('2026-11-16', -(2 + order * 2 + int(0, 2)))
  const etd = addDays(eta, -lane.days)
  const sailed = etd <= '2026-11-16'
  const delayed = PAST.has(stage) && stage !== 'so_confirmed' && i % 3 === 1
  const slip = int(2, 7)
  const nCont = part.baseUom === 'KG' ? 1 : int(1, 3)
  const qty = round(pp.dailyUse * between(20, 40), 10)
  const freight = int(80, 200) * 1000 * nCont
  const value = qty * pp.standardPrice
  const sh: Shipment = {
    ref: `ATF-IMP-2026-${String(80 + i).padStart(3, '0')}`, poNumbers: [], vendorId: part.vendors[0], mode: 'SEA', incoterm: r() < 0.6 ? 'FOB' : r() < 0.85 ? 'CIF' : 'FCA',
    pol: lane.pol, pod: lane.pod, icd: lane.icd, plant: pp.plant, stage,
    containers: Array.from({ length: nCont }, (_, k) => ({ no: `${pick(['MSCU', 'TGHU', 'OOLU', 'CMAU', 'HDMU', 'MRKU'])}${int(100000, 999999)}${k}`, type: part.baseUom === 'KG' ? '20GP' : '40HC' })),
    lines: [{ partCode: part.code, qty }],
    etdPlanned: etd, etdActual: sailed ? etd : undefined, etaPlanned: delayed && order >= 0 ? addDays(eta, -slip) : eta, etaRevised: delayed ? (order >= 0 ? eta : addDays(eta, slip)) : undefined, delayReason: delayed ? REASONS[i % REASONS.length] : undefined,
    portToPlantDays: lane.icd ? int(4, 7) : int(6, 10), freeDaysAtPort: int(4, 7), demurragePerContainerDay: int(9, 14) * 1000, detentionPerContainerDay: int(4, 8) * 1000,
    landedCost: [
      { type: 'ZFR2', amountInr: freight }, { type: 'ZINS', amountInr: round(value * 0.0012, 100) }, { type: 'ZCHA', amountInr: 1800 + 1000 * (nCont - 1) },
      { type: 'ZCFS', amountInr: int(6, 14) * 1000 * nCont }, { type: 'ZTHC', amountInr: int(6, 12) * 1000 * nCont }, { type: 'ZIHC', amountInr: lane.icd ? int(28, 50) * 1000 : int(100, 175) * 1000 },
    ],
  }
  BULK_SHIPMENTS.push(sh)
})

// ---------------------------------------------------------------------------------- projects (NPD, ECN, AS, R&D)
const NCD_STAGES = ['Supplier Sourcing and Confirm', 'Supplier Dispatch', 'Design and Feasibility', 'RND Testing & TQR', 'DQA Testing', 'RND Approval', 'FPA Document Collection', 'PP Pricing', 'PP Order & Delivery', 'NCD Summary & Closure']
const RD_STAGES: [string, number][] = [['CE', 75], ['PROTO', 105], ['DV', 66], ['PP', 34]]
const CUSTOMERS = ['Coolwave', 'Nordis', 'Himalaya Cooling', 'Brand A (Japanese OEM)', 'Arctica', 'Polarline']
const OWNERS_NPD = ['u-kavita', 'u-rahul', 'u-divya']
const NPD_ITEMS: [string, string][] = [['Copper header tube, 1.8T IDU', 'Copper'], ['BLDC motor controller', 'PCB'], ['Transit packaging, 2T RAC', 'EPS'], ['Fan blade assembly, ODU', 'Plastics'], ['Compressor heat shield', 'Insulation'], ['LED display panel', 'PCB'], ['Sheet metal bracket, ODU', 'Steel'], ['Hermetic terminal, 3 pin', 'Compressor'], ['Refrigerant charging valve, R32', 'Brass'], ['Drain pan, cassette', 'Plastics'], ['Wi-Fi module fitment', 'PCB']]
export const BULK_PROJECTS: Project[] = []
NPD_ITEMS.forEach(([title, commodity], i) => {
  const type = i % 5 === 3 ? 'ECN' : i % 5 === 4 ? 'AS' : 'NCD'
  const stageIdx = int(0, 8)
  const started = addDays('2026-11-16', -int(12, 70))
  BULK_PROJECTS.push({
    id: `${type}-FY-2026-${String(60 + i * 3).padStart(4, '0')}`, type, title, customer: pick(CUSTOMERS), stage: NCD_STAGES[stageIdx], ownerId: pick(OWNERS_NPD), plant: pick(['1001', '1002', '1003', '1009', '1010']), needs: [],
    priority: i % 6 === 0 ? 'critical' : i % 3 === 0 ? 'high' : 'normal', commodity, gradeA: r() < 0.25, startedOn: started, tatDueOn: addDays(started, int(40, 60)),
  })
})
const RD_NAMES = ['Nordis 2027 BEE line-up (4 models)', 'Arctica 4TR 3S inverter tower', 'Himalaya Cooling 1.0T window refresh', 'Polarline 21TR fixed-speed ductable', 'Brand A 3.7TR 1S cassette', 'Coolwave 1.2T 3-star inverter', 'Air purifier 360 HEPA platform', 'Water dispenser hot and cold, 3 tap']
RD_NAMES.forEach((name, i) => {
  const [stage, dur] = RD_STAGES[i % RD_STAGES.length]
  const gate = addDays('2026-11-16', int(10, Math.min(90, dur)))
  BULK_PROJECTS.push({
    id: `RND-${String(30 + i).padStart(3, '0')}`, type: 'RND', title: name, customer: name.split(' ')[0], stage, ownerId: 'u-arvind', plant: pick(['1001', '1009', '1010']), needs: [],
    nextGate: { name: stage === 'PP' ? 'MP gate' : stage === 'DV' ? 'PP gate' : stage === 'PROTO' ? 'DV gate' : 'PROTO gate', planned: gate },
    rag: i % 4 === 1 ? 'red' : i % 2 === 0 ? 'amber' : 'green', team: name.includes('purifier') || name.includes('dispenser') ? 'Air Purifier & Water Dispenser' : name.includes('duct') ? 'Ductables' : name.includes('tower') || name.includes('cassette') ? 'CAC Tower & Cassette' : 'RAC',
  })
})

// ---------------------------------------------------------------------------------- tooling (NTD)
const TOOL_STAGES = ['RFQ Spec Sheet', 'Quotation & Negotiations', 'Supplier Selection', 'DFM Loop', '8A Mould Design', 'Manufacturing', 'Trials', 'Commissioning & Dispatch']
const TOOLS_DEF: [string, string, string][] = [['Press tool, ODU base pan 1.5T', 'Sheet Metal', 'Sheet metal'], ['Injection mould, IDU front grill', 'Plastics', 'Plastics moulding'], ['Injection mould, cross flow fan housing', 'Plastics', 'Plastics moulding'], ['EPS mould, bottom tray ODU', 'EPS', 'EPS packaging'], ['Progressive tool, motor bracket GI', 'Sheet Metal', 'Sheet metal'], ['Injection mould, drain pan cassette', 'Plastics', 'Plastics moulding']]
export const BULK_TOOLS: Tool[] = TOOLS_DEF.map(([title, commodity, cat], i) => {
  const stage = TOOL_STAGES[(i * 3 + 1) % TOOL_STAGES.length]
  const trials: Tool['trials'] = stage === 'Trials' || stage === 'Commissioning & Dispatch' ? [{ n: 1, date: addDays('2026-11-16', -int(10, 30)), result: r() < 0.5 ? 'fail' : 'pass', failedParams: [] }] : []
  if (trials[0]?.result === 'fail') trials[0].failedParams = [pick(['Cycle time', 'Dimensional', 'Flash', 'Ejection', 'Surface finish'])]
  const part = BULK_PARTS.find((p) => p.commodityHierarchy.l4 === (commodity === 'Sheet Metal' ? 'Steel' : commodity))!
  return { id: `NTD-2026-00${40 + i}`, title, partCode: part.code, commodity, vendorId: (vendorsByCat.get(cat) ?? [])[0].id, stage, trials, neededByProject: BULK_PROJECTS[i % BULK_PROJECTS.length].id, commissioningPlanned: addDays('2026-11-16', int(15, 75)), reworkDays: { mouldDesign: 5, manufacturing: 7, trial: 3 }, fastTrackSavingDays: 5 }
})

// ---------------------------------------------------------------------------------- capex
const CAPEX_DEF: [string, string, number, string][] = [
  ['Robot welding cell, copper shop', '1001', 1.3, 'Negotiation'], ['Mezzanine floor, FG store', '1006', 2.4, 'In sourcing'], ['Vision inspection camera, HEX line', '1003', 0.5, 'PO released'],
  ['Jib crane 2T, press shop', '1007', 0.15, 'Approved'], ['Leak test station, helium, line 3', '1009', 0.82, 'With Plant Head'], ['Air compressor 75 kW screw', '1002', 0.38, 'Installed'],
  ['Forklift electric 3T (2 nos)', '1010', 0.42, 'Approved'], ['Solar rooftop 500 kWp', '1005', 2.1, 'In sourcing'], ['PCB test jig set', '1008', 0.06, 'Installed'], ['Conveyor upgrade, assembly line 2', '1001', 0.65, 'Negotiation'],
]
export const BULK_CAPEX: CapexRequest[] = CAPEX_DEF.map(([title, plant, budgetCr, status], i) => {
  const committed = ['PO released', 'Approved', 'Installed'].includes(status) ? Number((budgetCr * between(0.9, 0.97)).toFixed(2)) : 0
  const planned = status === 'Installed' ? addDays('2026-11-16', -int(10, 60)) : addDays('2026-11-16', int(30, 150))
  return { no: `CAP-2526-00${30 + i}`, title, plant, budgetCr, committedCr: committed, status, deliveryPlanned: planned, deliveryRevised: status === 'PO released' && i % 2 === 0 ? addDays(planned, int(10, 30)) : undefined }
})

// ---------------------------------------------------------------------------------- Cost Engine assessments
const MODULES = ['Wire Harness', 'EPS Parts', 'Copper Bought Out', 'Sheet Metal', 'Injection Moulding', 'Polybags', 'Motors & Compressor', 'Terminal Block & Electric Parts', 'Packing Box', 'Insulation, Filter & Rubber']
const MOD_CAT: Record<string, string> = { 'Wire Harness': 'Wire harness', 'EPS Parts': 'EPS packaging', 'Copper Bought Out': 'Valves (import)', 'Sheet Metal': 'Sheet metal', 'Injection Moulding': 'Plastics moulding', Polybags: 'Carton packaging', 'Motors & Compressor': 'Motors (import)', 'Terminal Block & Electric Parts': 'Capacitors and electricals', 'Packing Box': 'Carton packaging', 'Insulation, Filter & Rubber': 'Insulation and rubber' }
export const COST_ASSESSMENTS: CostAssessment[] = []
let ca = 0
for (const m of MODULES) {
  const vs = vendorsByCat.get(MOD_CAT[m]) ?? []
  const n = int(3, 6)
  for (let i = 0; i < n; i++) {
    ca++
    const should = round(between(4, 90) * 1_00_000, 1000)
    const gap = between(-0.02, 0.14)
    COST_ASSESSMENTS.push({ id: `CA-2026-${String(400 + ca).padStart(4, '0')}`, module: m, vendorId: vs[i % Math.max(1, vs.length)]?.id ?? BULK_VENDORS[0].id, status: i === 0 && ca % 3 === 0 ? 'PENDING_APPROVAL' : i === n - 1 && ca % 4 === 0 ? 'DRAFT' : ca % 11 === 0 ? 'REJECTED' : 'APPROVED', items: int(10, 80), quotedInr: round(should * (1 + gap), 1000), shouldCostInr: should, submittedAt: addDays('2026-11-16', -int(2, 120)) })
  }
}

// ---------------------------------------------------------------------------------- VMS onboarding pipeline
const REQ_STATUS: SupplierRequest['status'][] = ['SUBMITTED', 'SUBMITTED', 'SUBMITTED', 'L1_REVIEW', 'L1_REVIEW', 'L2_REVIEW', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'DRAFT', 'DRAFT', 'REJECTED', 'SUBMITTED', 'L1_REVIEW', 'APPROVED', 'L2_REVIEW', 'APPROVED']
export const SUPPLIER_REQUESTS: SupplierRequest[] = REQ_STATUS.map((status, i) => {
  const c = CATS[i % CATS.length]
  return { id: `SR-2026-${String(120 + i).padStart(4, '0')}`, company: `${PREFIX[(i * 5 + 3) % PREFIX.length]} ${c.country === 'IN' ? pick(SUFFIX.IN) : 'Trading Co.'}`, category: c.cat, group: c.group, status, requestedBy: pick(['u-gaurav', 'u-nitin', 'u-priya', 'u-meera', 'u-harish']), plant: pick(PLANTS_ALL), createdOn: addDays('2026-11-16', -int(1, 45)) }
})

// ---------------------------------------------------------------------------------- informational signals and history
const sig = (o: Partial<Signal> & Pick<Signal, 'id' | 'sourceId' | 'type' | 'severity' | 'title' | 'summary' | 'entityRefs'>): Signal => ({
  raisedAt: '2026-11-15T09:00:00+05:30', firstKnownAt: '2026-11-14T09:00:00+05:30', firstKnownBy: 'Source module', status: 'new', ruleId: 'R-INFO', recommendations: [], ...o,
})
const delayedShips = BULK_SHIPMENTS.filter((s) => s.etaRevised)
const expiring = BULK_VENDORS.filter((v) => v.docs?.some((d) => d.expiry && d.expiry >= '2026-11-16' && d.expiry <= '2026-12-16'))
const lateCapex = BULK_CAPEX.filter((c) => c.deliveryRevised)
const failedTools = BULK_TOOLS.filter((t) => t.trials[0]?.result === 'fail')
export const BULK_SIGNALS: Signal[] = [
  ...delayedShips.slice(0, 5).map((s, i) => sig({ id: `SIG-2026-12${String(i).padStart(2, '0')}`, sourceId: 'exim', type: 'shipment_delay', severity: i === 0 ? 'high' : 'medium', ownerId: 'u-farhan', title: `${s.ref} ETA slips: ${s.delayReason?.replace(/\.$/, '').toLowerCase()}`, summary: `${s.pol} to ${s.pod}. Revised ETA is later than planned; no production gap is forecast yet.`, entityRefs: [{ kind: 'shipment', id: s.ref }, { kind: 'part', id: s.lines[0].partCode }, { kind: 'plant', id: s.plant }], raisedAt: `2026-11-${String(10 + i).padStart(2, '0')}T08:${String(10 + i * 7).padStart(2, '0')}:00+05:30`, firstKnownBy: 'EXIM (CARGOES tracking)', ruleId: 'R-EXIM-ETA-SLIP' })),
  ...expiring.slice(0, 4).map((v, i) => sig({ id: `SIG-2026-121${i}`, sourceId: 'vendor', type: 'vendor_compliance', severity: 'medium', ownerId: 'u-meera', title: `${v.name}: ${v.docs!.find((d) => d.expiry && d.expiry <= '2026-12-16')!.type} expires soon`, summary: 'Regularisation request not yet completed. The vendor is auto-blocked for new POs at expiry.', entityRefs: [{ kind: 'vendor', id: v.id }, { kind: 'plant', id: BULK_PARTS.find((p) => p.vendors.includes(v.id))?.plants[0].plant ?? '1002' }], firstKnownBy: 'Vendor Management (nightly check)', ruleId: 'R-VMS-DOC-EXPIRY' })),
  ...lateCapex.map((c, i) => sig({ id: `SIG-2026-122${i}`, sourceId: 'capex', type: 'capex_delay', severity: 'medium', ownerId: 'u-neha', title: `${c.no} ${c.title}: supplier delivery moved`, summary: 'The vendor revised the delivery date. Commissioning and capitalisation move with it.', entityRefs: [{ kind: 'capex', id: c.no }, { kind: 'plant', id: c.plant }], firstKnownBy: 'Capex (vendor update)', ruleId: 'R-CAPEX-DELIVERY' })),
  ...failedTools.map((t, i) => sig({ id: `SIG-2026-123${i}`, sourceId: 'tooling', type: 'tool_trial_fail', severity: 'medium', ownerId: 'u-karan', title: `${t.id} ${t.title}: T1 failed on ${t.trials[0].failedParams.join(', ').toLowerCase()}`, summary: 'Failed component returns to mould design. Commissioning date still inside the project buffer.', entityRefs: [{ kind: 'part', id: t.partCode }, { kind: 'vendor', id: t.vendorId }, { kind: 'plant', id: '1006' }], firstKnownBy: 'Tooling (trial report)', ruleId: 'R-NTD-TRIAL-FAIL' })),
  sig({ id: 'SIG-2026-1240', sourceId: 'cost', type: 'commodity_spike', severity: 'low', ownerId: 'u-tanvi', title: 'Styrene Monomer edging up, EPS should-cost watch', summary: 'Index up over 30 days, still inside the alert band. EPS vendors flagged for the next bi-annual review.', entityRefs: [{ kind: 'commodity', id: 'EPS' }, { kind: 'plant', id: '1001' }], firstKnownBy: 'Cost Engine (index feed)', ruleId: 'R-COST-INDEX-WATCH' }),
  sig({ id: 'SIG-2026-1241', sourceId: 'cost', type: 'commodity_spike', severity: 'low', ownerId: 'u-harish', title: 'HR coil softening, sheet-metal pass-through due next quarter', summary: 'Steel index down over the quarter. Sheet-metal vendors on index-linked pricing should pass it through.', entityRefs: [{ kind: 'commodity', id: 'Steel' }, { kind: 'plant', id: '1006' }], firstKnownBy: 'Cost Engine (index feed)', ruleId: 'R-COST-INDEX-WATCH', status: 'acknowledged' }),
  // Resolved history behind the value ledger
  ...['SIG-2026-1040', 'SIG-2026-1046', 'SIG-2026-1052', 'SIG-2026-1058', 'SIG-2026-1063', 'SIG-2026-1069', 'SIG-2026-1074', 'SIG-2026-1080'].map((id, i) => sig({ id, sourceId: (['exim', 'cost', 'sap', 'npd', 'capex', 'vendor', 'tooling', 'cost'] as const)[i], type: (['shipment_delay', 'pass_through', 'supplier_quality', 'ecn_obsolescence', 'capex_delay', 'vendor_compliance', 'tool_trial_fail', 'commodity_spike'] as const)[i], severity: 'medium', title: ['Fin stock BOE query cleared before demurrage', 'Capillary tube price passed through after index fall', 'Capacitor lot returned and debited', 'Window AC louver ECN, stock consumed before cut-in', 'IMM purchase brought in under budget by auction', 'Vendor regularisation closed before PO block', 'Press tool T2 passed after fast-track', 'Polymer lock held through the summer rise'][i], summary: 'Resolved. Value booked to the ledger.', entityRefs: [{ kind: 'plant', id: PLANTS_ALL[i] }], status: 'resolved', raisedAt: addDays('2026-11-16', -int(20, 90)) + 'T09:00:00+05:30', firstKnownAt: addDays('2026-11-16', -int(91, 100)) + 'T09:00:00+05:30', ruleId: 'R-HISTORY' })),
]

const owners = ['u-farhan', 'u-harish', 'u-pooja', 'u-rahul', 'u-neha', 'u-meera', 'u-karan', 'u-nitin']
const validators = ['u-anjali', 'u-ramesh']
export const BULK_VALUE: ValueSeed[] = BULK_SIGNALS.filter((s) => s.status === 'resolved').flatMap((s, i) => {
  const defs: [ValueSeed['type'], string, number, number, string][] = [
    ['penalty_avoided', 'BOE cleared inside free days', 3, 21000, 'days × (ZDCS + ZCDT) for 1 container'],
    ['hard', 'Pass-through claim', 4200, 46, 'kg × ₹ per kg recovered'],
    ['cash', 'Return to vendor with debit note', 1800, 112, 'units × moving price'],
    ['avoidance', 'Stock consumed before cut-in', 2600, 88, 'units × standard price, no write-off'],
    ['hard', 'Reverse auction below budget', 1, 1840000, 'auction close below approved budget'],
    ['avoidance', 'PO block avoided', 6, 64000, 'days of supply kept running × daily value at risk'],
    ['penalty_avoided', 'Gate protected', 3, 50000, 'days gate slip avoided × customer LD rate'],
    ['avoidance', 'Price lock', 96000, 4.2, 'kg × ₹ per kg increase avoided'],
  ]
  const [type, lever, qty, rate, unit] = defs[i]
  const status: ValueSeed['status'] = i % 4 === 0 ? 'validated' : i % 4 === 1 ? 'realised' : i % 4 === 2 ? 'validated' : 'committed'
  return [{ id: '', signalId: s.id, lever, type, baseline: { kind: lever, value: 'Before action' }, calc: { qty, rate }, formula: `${qty.toLocaleString('en-IN')} ${unit} (${rate.toLocaleString('en-IN')} each)`, ownerId: owners[i], plant: PLANTS_ALL[i], status, evidence: status === 'committed' ? [] : [`GRN ${5000019000 + i * 37} (101)`, ...(status === 'validated' ? [`Finance check FC-2026-${110 + i}`] : [])], at: s.raisedAt, validatedBy: status === 'validated' ? validators[i % 2] : undefined }]
})

// ---------------------------------------------------------------------------------- more product models (BOM views)
import type { ProductModel } from '@/data/types'
const byL4 = (l4: string) => BULK_PARTS.filter((p) => p.commodityHierarchy.l4 === l4)
const MODEL_DEF: [string, string, string, number, number, string, number][] = [
  ['PM-NR10-3S', 'Nordis 1.0T 3-star Fixed Speed Split', 'RAC', 1.0, 3, 'Nordis', 2600],
  ['PM-HC10-WIN', 'Himalaya Cooling 1.0T Window AC', 'RAC', 1.0, 3, 'Himalaya Cooling', 1800],
  ['PM-AR40-TWR', 'Arctica 4TR 3-star Inverter Tower', 'LCAC', 4.0, 3, 'Arctica', 420],
  ['PM-BA37-CAS', 'Brand A 3.7TR Cassette', 'LCAC', 3.7, 0, 'Brand A (Japanese OEM)', 380],
  ['PM-PL21-DCT', 'Polarline 21TR Ductable', 'CAC(DUCT)', 21, 0, 'Polarline', 60],
]
export const BULK_MODELS: ProductModel[] = MODEL_DEF.map(([id, name, productLine, tonnage, starRating, customer, units], i) => ({
  id, name, productLine, tonnage, starRating, customer, decemberPlanUnits: units,
  bom: [byL4('Compressor')[i % 3], byL4('Motor')[i % 3], byL4('PCB')[i % 3], byL4('Steel')[i % 7], byL4('Steel')[(i + 2) % 7], byL4('Plastics')[i % 7], byL4('Plastics')[(i + 3) % 7], byL4('EPS')[i % 4], byL4('Carton')[i % 3], byL4('Aluminium')[i % 2], byL4('Insulation')[i % 4], byL4('Capacitor')[i % 3], byL4('Wire')[i % 3], byL4('Hardware')[i % 3]]
    .filter(Boolean).map((p, k) => ({ partCode: p.code, qtyPer: p.baseUom === 'KG' ? Number((tonnage * 2.6).toFixed(1)) : p.commodityHierarchy.l4 === 'Hardware' ? 24 + k : 1 })),
}))
