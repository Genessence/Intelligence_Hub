// Amber tenant, master data. All names, codes and figures are fictional (invariant 10).
import type { Part, Plant, ProductModel, PurchaseOrder, StockPosition, Tenant, Vendor } from '@/data/types'

export const TENANT: Tenant = {
  id: 'amber',
  name: 'Amber Enterprises',
  shortName: 'AE',
  industry: 'HVAC and consumer durables contract manufacturing',
  erp: { system: 'SAP S/4HANA', methods: ['OData', 'BAPI / RFC', 'IDoc', 'SAP BTP Integration Suite', 'CDS views'] },
  modules: [
    { id: 'cost', name: 'Cost Engine', status: 'Live' },
    { id: 'exim', name: 'EXIM', status: 'Live' },
    { id: 'npd', name: 'NPD', status: 'Live' },
    { id: 'tooling', name: 'Tooling NTD', status: 'Live' },
    { id: 'rnd', name: 'R&D Control Tower', status: 'Live' },
    { id: 'capex', name: 'Capex', status: 'Live' },
    { id: 'vendor', name: 'Vendor Management', status: 'Live' },
    { id: 'quality', name: 'Quality', status: 'Roadmap' },
    { id: 'sap', name: 'SAP S/4HANA connector', status: 'Live' },
    { id: 'datadrop', name: 'Bring your data', status: 'Pilot' },
  ],
  contributionPerUnitInr: 3200,
}

export const PLANTS: Plant[] = [
  { code: 'RAJPURA', sapPlant: '1001', name: 'Rajpura', city: 'Rajpura', state: 'Punjab', productLines: ['RAC'] },
  { code: 'DDN-IV', sapPlant: '1002', name: 'Dehradun IV', city: 'Dehradun', state: 'Uttarakhand', productLines: ['RAC'] },
  { code: 'DDN-V', sapPlant: '1003', name: 'Dehradun V', city: 'Dehradun', state: 'Uttarakhand', productLines: ['RAC', 'Components'] },
  { code: 'DDN-VI', sapPlant: '1004', name: 'Dehradun VI', city: 'Dehradun', state: 'Uttarakhand', productLines: ['Components'] },
  { code: 'RUDRAPUR', sapPlant: '1005', name: 'Rudrapur', city: 'Rudrapur', state: 'Uttarakhand', productLines: ['Motors'] },
  { code: 'JHAJJAR-1', sapPlant: '1006', name: 'Jhajjar P1', city: 'Jhajjar', state: 'Haryana', productLines: ['Sheet metal', 'Moulding'] },
  { code: 'JHAJJAR-2', sapPlant: '1007', name: 'Jhajjar P2', city: 'Jhajjar', state: 'Haryana', productLines: ['Moulding'] },
  { code: 'NOIDA', sapPlant: '1008', name: 'Noida', city: 'Noida', state: 'Uttar Pradesh', productLines: ['PCBA'] },
  { code: 'SUPA', sapPlant: '1009', name: 'Supa', city: 'Supa', state: 'Maharashtra', productLines: ['RAC'] },
  { code: 'SRICITY', sapPlant: '1010', name: 'Sri City', city: 'Sri City', state: 'Andhra Pradesh', productLines: ['RAC', 'CAC'] },
]

export const VENDORS: Vendor[] = [
  { id: 'v-shenghai', name: 'Shenghai Compressor Co.', country: 'CN', category: 'Compressors', status: 'ACTIVE', sapVendor: '0000104321', aliases: [{ sourceId: 'exim', code: 'SHC-CN-07' }, { sourceId: 'npd', code: 'TEST-V0231' }] },
  { id: 'v-kaveri', name: 'Kaveri Compressors Pvt. Ltd.', country: 'IN', category: 'Compressors', status: 'ACTIVE', sapVendor: '0000105588', aliases: [{ sourceId: 'vendor', code: 'V-11873' }] },
  { id: 'v-hanbit', name: 'Hanbit Copper Tube', country: 'KR', category: 'Copper tube', status: 'ACTIVE', sapVendor: '0000104410', indexClause: true, aliases: [{ sourceId: 'exim', code: 'HCT-KR-02' }, { sourceId: 'cost', code: 'CB-HANBIT' }] },
  { id: 'v-sundara', name: 'Sundara Precision Components', country: 'IN', category: 'BLDC motors', status: 'ACTIVE', sapVendor: '0000106012', aliases: [{ sourceId: 'vendor', code: 'V-10432' }, { sourceId: 'excel', code: 'Sundara Precision' }] },
  { id: 'v-thermopack', name: 'ThermoPack EPS', country: 'IN', category: 'EPS packaging', status: 'ACTIVE', sapVendor: '0000106230', aliases: [{ sourceId: 'cost', code: 'EPS-TP-01' }] },
  { id: 'v-lumen', name: 'Lumen Circuits Ltd.', country: 'IN', category: 'PCB assemblies', status: 'ACTIVE', sapVendor: '0000106455', aliases: [] },
  { id: 'v-nordal', name: 'Nordal Aluminium Fin', country: 'TH', category: 'Aluminium fin stock', status: 'ACTIVE', sapVendor: '0000104590', aliases: [] },
  { id: 'v-zhenhai', name: 'Zhenhai Valve Works', country: 'CN', category: 'Service valves', status: 'ACTIVE', sapVendor: '0000104377', aliases: [] },
  { id: 'v-sutlej', name: 'Sutlej Wire Harness', country: 'IN', category: 'Wire harness', status: 'ACTIVE', sapVendor: '0000106701', aliases: [] },
  { id: 'v-meridian', name: 'Meridian Cargo Logistics', country: 'IN', category: 'Freight forwarder', status: 'ACTIVE', sapVendor: '0000107001', aliases: [{ sourceId: 'exim', code: 'FF-MCL' }] },
]

const pp = (plant: string, purchasingGroup: string, o: Partial<Part['plants'][number]> = {}): Part['plants'][number] => ({
  plant,
  purchasingGroup,
  mrpController: '101',
  plannedDelivDays: 30,
  safetyStock: 0,
  abc: 'B',
  criticalPart: false,
  standardPrice: 0,
  movingPrice: 0,
  dailyUse: 0,
  ...o,
})

export const PARTS: Part[] = [
  {
    code: '310000451', description: 'COMPRESSOR ASSY ROTARY R32 1.5T', materialType: 'ROH', materialGroup: 'CMP01',
    commodityHierarchy: { l1: 'Bought out', l2: 'Electro-mechanical', l3: 'Compressor', l4: 'Compressor' }, sourcingType: 'Import',
    baseUom: 'NOS', hsCode: '84143000', vendors: ['v-shenghai', 'v-kaveri'],
    plants: [
      pp('1001', 'P03', { plannedDelivDays: 75, safetyStock: 600, abc: 'A', criticalPart: true, standardPrice: 8450, movingPrice: 8520, dailyUse: 200 }),
      pp('1009', 'P03', { mrpController: '104', plannedDelivDays: 75, safetyStock: 400, abc: 'A', criticalPart: true, standardPrice: 8450, movingPrice: 8495, dailyUse: 140 }),
    ],
  },
  {
    code: '320001180', description: 'COPPER TUBE IGT 9.52 OD X 0.35', materialType: 'ROH', materialGroup: 'CU01',
    commodityHierarchy: { l1: 'Raw material', l2: 'Non-ferrous', l3: 'Copper tube', l4: 'Copper' }, sourcingType: 'Import',
    baseUom: 'KG', hsCode: '74111000', vendors: ['v-hanbit'], costModel: { commodity: 'copper', share: 0.82 }, sizeOd: 9.52, sizeThickness: 0.35,
    plants: [pp('1001', 'P01', { plannedDelivDays: 60, safetyStock: 8000, abc: 'A', criticalPart: true, standardPrice: 1012, movingPrice: 1046, dailyUse: 1900 })],
  },
  {
    code: '330000790', description: 'MOTOR BLDC FAN ODU 40W', materialType: 'ROH', materialGroup: 'MTR02',
    commodityHierarchy: { l1: 'Bought out', l2: 'Electro-mechanical', l3: 'Motor', l4: 'BLDC Motor' }, sourcingType: 'Domestic',
    baseUom: 'NOS', hsCode: '85013119', vendors: ['v-sundara'],
    plants: [pp('1001', 'P04', { plannedDelivDays: 21, safetyStock: 500, abc: 'A', criticalPart: true, standardPrice: 1385, movingPrice: 1392, dailyUse: 210 })],
  },
  {
    code: '340000455', description: 'PCB ASSY OUTDOOR INVERTER REV B', materialType: 'HALB', materialGroup: 'PCB03', supersededBy: '340000456',
    commodityHierarchy: { l1: 'Bought out', l2: 'Electronics', l3: 'PCBA', l4: 'PCB' }, sourcingType: 'Domestic',
    baseUom: 'NOS', hsCode: '85340000', vendors: ['v-lumen'],
    plants: [pp('1001', 'P06', { plannedDelivDays: 28, safetyStock: 100, abc: 'B', standardPrice: 2410, movingPrice: 2398, dailyUse: 13 }), pp('1009', 'P06', { mrpController: '104', plannedDelivDays: 28, safetyStock: 0, abc: 'C', standardPrice: 2410, movingPrice: 2405, dailyUse: 0 })],
  },
  {
    code: '340000456', description: 'PCB ASSY OUTDOOR INVERTER REV C', materialType: 'HALB', materialGroup: 'PCB03',
    commodityHierarchy: { l1: 'Bought out', l2: 'Electronics', l3: 'PCBA', l4: 'PCB' }, sourcingType: 'Domestic',
    baseUom: 'NOS', hsCode: '85340000', vendors: ['v-lumen'],
    plants: [pp('1001', 'P06', { plannedDelivDays: 28, safetyStock: 100, abc: 'B', standardPrice: 2365, movingPrice: 2365, dailyUse: 0 })],
  },
  {
    code: '350000301', description: 'EPS PACKING SET TOP AC 1.5T', materialType: 'VERP', materialGroup: 'PKG01',
    commodityHierarchy: { l1: 'Packing', l2: 'Polymer packing', l3: 'EPS', l4: 'EPS' }, sourcingType: 'Domestic', obuCustomer: 'Coolwave',
    baseUom: 'SET', hsCode: '39219099', vendors: ['v-thermopack'], costModel: { commodity: 'styrene', share: 0.55 }, packingEpsG: 610,
    plants: [pp('1001', 'P05', { plannedDelivDays: 10, safetyStock: 1000, abc: 'C', standardPrice: 78, movingPrice: 79, dailyUse: 200 })],
  },
  {
    code: '360000812', description: 'ALUMINIUM FIN STOCK 0.105 HYDROPHILIC', materialType: 'ROH', materialGroup: 'AL01',
    commodityHierarchy: { l1: 'Raw material', l2: 'Non-ferrous', l3: 'Aluminium', l4: 'Aluminium' }, sourcingType: 'Import',
    baseUom: 'KG', hsCode: '76071190', vendors: ['v-nordal'], costModel: { commodity: 'aluminium', share: 0.74 },
    plants: [pp('1001', 'P02', { plannedDelivDays: 55, safetyStock: 6000, abc: 'A', standardPrice: 342, movingPrice: 351, dailyUse: 1400 })],
  },
  {
    code: '370000210', description: 'SERVICE VALVE 3 WAY 1/2 R32', materialType: 'ROH', materialGroup: 'VLV01',
    commodityHierarchy: { l1: 'Bought out', l2: 'Brass parts', l3: 'Valve', l4: 'Copper' }, sourcingType: 'Import',
    baseUom: 'NOS', hsCode: '84818090', vendors: ['v-zhenhai'], costModel: { commodity: 'copper', share: 0.58 },
    plants: [pp('1001', 'P01', { plannedDelivDays: 60, safetyStock: 800, abc: 'B', standardPrice: 212, movingPrice: 219, dailyUse: 200 })],
  },
  {
    code: '380000075', description: 'WIRE HARNESS 0.75 SQMM IDU', materialType: 'HALB', materialGroup: 'WH01',
    commodityHierarchy: { l1: 'Bought out', l2: 'Electrical', l3: 'Wire harness', l4: 'Copper' }, sourcingType: 'Domestic',
    baseUom: 'NOS', hsCode: '85443000', vendors: ['v-sutlej'], costModel: { commodity: 'copper', share: 0.36 },
    plants: [pp('1001', 'P01', { plannedDelivDays: 14, safetyStock: 600, abc: 'B', standardPrice: 164, movingPrice: 171, dailyUse: 200 })],
  },
]

// More copper-bearing parts (S1 and S6). Prices are INR per base unit.
PARTS.push(
  {
    code: '320001240', description: 'CAPILLARY TUBE CU 1.6 OD X 0.6', materialType: 'ROH', materialGroup: 'CU02',
    commodityHierarchy: { l1: 'Raw material', l2: 'Non-ferrous', l3: 'Copper tube', l4: 'Copper' }, sourcingType: 'Domestic',
    baseUom: 'KG', hsCode: '74111000', vendors: ['v-kaveri-cap'], costModel: { commodity: 'copper', share: 0.78 },
    plants: [pp('1001', 'P01', { plannedDelivDays: 21, safetyStock: 400, abc: 'B', standardPrice: 1098, movingPrice: 1121, dailyUse: 60 })],
  },
  {
    code: '320001310', description: 'U-BEND CU 7 OD RETURN BEND', materialType: 'HALB', materialGroup: 'CU03',
    commodityHierarchy: { l1: 'Bought out', l2: 'Non-ferrous', l3: 'Copper fittings', l4: 'Copper' }, sourcingType: 'Domestic',
    baseUom: 'NOS', hsCode: '74122019', vendors: ['v-indus'], costModel: { commodity: 'copper', share: 0.7 },
    plants: [pp('1001', 'P01', { plannedDelivDays: 14, safetyStock: 20000, abc: 'B', standardPrice: 6.4, movingPrice: 6.6, dailyUse: 9600 })],
  },
  {
    code: '320001355', description: 'BRASS FLARE NUT 1/4 R32', materialType: 'ROH', materialGroup: 'BR01',
    commodityHierarchy: { l1: 'Bought out', l2: 'Brass parts', l3: 'Fittings', l4: 'Copper' }, sourcingType: 'Domestic',
    baseUom: 'NOS', hsCode: '74122090', vendors: ['v-vardhman'], costModel: { commodity: 'copper', share: 0.52 },
    plants: [pp('1001', 'P01', { plannedDelivDays: 14, safetyStock: 2000, abc: 'C', standardPrice: 18.5, movingPrice: 18.9, dailyUse: 400 })],
  },
  {
    code: '320001420', description: 'COPPER PIPE CONNECTOR SET 1.5T', materialType: 'HALB', materialGroup: 'CU04',
    commodityHierarchy: { l1: 'Bought out', l2: 'Non-ferrous', l3: 'Copper tube', l4: 'Copper' }, sourcingType: 'Domestic',
    baseUom: 'SET', hsCode: '74111000', vendors: ['v-saraswati'], costModel: { commodity: 'copper', share: 0.74 },
    plants: [pp('1001', 'P01', { plannedDelivDays: 14, safetyStock: 600, abc: 'B', standardPrice: 690, movingPrice: 702, dailyUse: 200 })],
  },
)

VENDORS.push(
  { id: 'v-kaveri-cap', name: 'Kaveri Capillary Tubes', country: 'IN', category: 'Copper tube', status: 'ACTIVE', sapVendor: '0000106811', aliases: [] },
  { id: 'v-indus', name: 'Indus U-Bend Works', country: 'IN', category: 'Copper fittings', status: 'ACTIVE', sapVendor: '0000106834', aliases: [] },
  { id: 'v-vardhman', name: 'Vardhman Brass Fittings', country: 'IN', category: 'Brass parts', status: 'ACTIVE', sapVendor: '0000106850', aliases: [{ sourceId: 'excel', code: 'Vardhman Brass' }] },
  { id: 'v-saraswati', name: 'Saraswati Copper Pipes', country: 'IN', category: 'Copper tube', status: 'ACTIVE', sapVendor: '0000106877', aliases: [] },
  { id: 'v-polymould', name: 'Polymould Industries', country: 'IN', category: 'Moulding', status: 'ACTIVE', sapVendor: '0000106912', aliases: [] },
  { id: 'v-kavya', name: 'Kavya Machine Tools', country: 'IN', category: 'Capital equipment', status: 'ACTIVE', sapVendor: '0000107120', aliases: [{ sourceId: 'capex', code: 'VND-004' }] },
)

export const PRODUCT_MODELS: ProductModel[] = [
  {
    id: 'PM-CW15-5S', name: 'Coolwave 1.5T 5-star Inverter Split', productLine: 'RAC', tonnage: 1.5, starRating: 5, customer: 'Coolwave', decemberPlanUnits: 4200,
    bom: [{ partCode: '310000451', qtyPer: 1 }, { partCode: '320001180', qtyPer: 6.2 }, { partCode: '330000790', qtyPer: 1 }, { partCode: '350000301', qtyPer: 1 }, { partCode: '360000812', qtyPer: 4.6 }, { partCode: '370000210', qtyPer: 2 }, { partCode: '380000075', qtyPer: 1 }, { partCode: '320001240', qtyPer: 0.05 }, { partCode: '320001310', qtyPer: 48 }, { partCode: '320001355', qtyPer: 2 }, { partCode: '320001420', qtyPer: 1 }],
  },
  {
    id: 'PM-NR15-3S', name: 'Nordis 1.5T 3-star Fixed Speed Split', productLine: 'RAC', tonnage: 1.5, starRating: 3, customer: 'Nordis', decemberPlanUnits: 3000,
    bom: [{ partCode: '320001180', qtyPer: 5.8 }, { partCode: '360000812', qtyPer: 4.2 }, { partCode: '370000210', qtyPer: 2 }, { partCode: '320001310', qtyPer: 44 }],
  },
  {
    id: 'PM-CW18-5S', name: 'Coolwave 1.8T 5-star Inverter Split', productLine: 'RAC', tonnage: 1.8, starRating: 5, customer: 'Coolwave', decemberPlanUnits: 330,
    bom: [{ partCode: '340000455', qtyPer: 1 }, { partCode: '320001180', qtyPer: 7.1 }],
  },
]

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    ebeln: '4500012345', docType: 'ZIMP', category: 'F', purchasingGroup: 'P03', purchOrg: '1000', vendorId: 'v-shenghai', docDate: '2026-08-28', currency: 'USD', releaseState: 'Released',
    lines: [{ item: '00010', material: '310000451', plant: '1001', qty: 4200, netPrice: 96.5, priceUnit: 1, deliveryDate: '2026-11-28' }],
  },
  {
    ebeln: '4500012388', docType: 'NB', category: 'F', purchasingGroup: 'P03', purchOrg: '1000', vendorId: 'v-kaveri', docDate: '2026-09-15', currency: 'INR', releaseState: 'Released',
    lines: [{ item: '00010', material: '310000451', plant: '1009', qty: 2000, netPrice: 8610, priceUnit: 1, deliveryDate: '2026-12-05' }],
  },
]

export const STOCK: StockPosition[] = [
  { plant: '1001', sloc: 'RM01', material: '310000451', unrestricted: 2400, qualityInsp: 0, blocked: 0, inTransit: 0 },
  { plant: '1001', sloc: 'RM01', material: '330000790', unrestricted: 3100, qualityInsp: 640, blocked: 74, inTransit: 0 },
  { plant: '1001', sloc: 'RM01', material: '340000455', unrestricted: 750, qualityInsp: 0, blocked: 0, inTransit: 0 },
]
