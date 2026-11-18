// SAP-shaped procurement records for S4, S6 and S7: POs (EKKO/EKPO/EKET) and GRNs (MSEG/MKPF).
import type { CapexRequest, DataDrop, GoodsReceipt, PurchaseOrder, Tool } from '@/data/types'

const po = (ebeln: string, vendorId: string, docDate: string, group: string, material: string, qty: number, netPrice: number, deliveryDate: string, plant = '1001'): PurchaseOrder => ({
  ebeln, docType: 'NB', category: 'F', purchasingGroup: group, purchOrg: '1000', vendorId, docDate, currency: 'INR', releaseState: 'Released',
  lines: [{ item: '00010', material, plant, qty, netPrice, priceUnit: 1, deliveryDate }],
})

// S6: previous POs set the last agreed price (Q1 FY27); POs raised after the copper fall kept it, except Saraswati.
export const PREVIOUS_POS: PurchaseOrder[] = [
  po('4500011802', 'v-hanbit', '2026-05-12', 'P01', '320001180', 120000, 1046, '2026-07-15'),
  po('4500011815', 'v-zhenhai', '2026-05-18', 'P01', '370000210', 30000, 219, '2026-07-20'),
  po('4500011821', 'v-sutlej', '2026-05-20', 'P01', '380000075', 15000, 171, '2026-07-25'),
  po('4500011833', 'v-kaveri-cap', '2026-05-22', 'P01', '320001240', 4000, 1121, '2026-07-25'),
  po('4500011840', 'v-indus', '2026-05-25', 'P01', '320001310', 600000, 6.6, '2026-07-30'),
  po('4500011846', 'v-vardhman', '2026-05-28', 'P01', '320001355', 30000, 18.9, '2026-07-30'),
  po('4500011852', 'v-saraswati', '2026-06-02', 'P01', '320001420', 12000, 702, '2026-08-05'),
]

export const AFTER_FALL_POS: PurchaseOrder[] = [
  po('4500012610', 'v-hanbit', '2026-10-03', 'P01', '320001180', 110000, 1046, '2026-12-10'),
  po('4500012622', 'v-zhenhai', '2026-10-05', 'P01', '370000210', 30000, 219, '2026-12-10'),
  po('4500012640', 'v-sutlej', '2026-10-06', 'P01', '380000075', 15000, 171, '2026-12-05'),
  po('4500012655', 'v-kaveri-cap', '2026-10-07', 'P01', '320001240', 4000, 1121, '2026-12-05'),
  po('4500012668', 'v-indus', '2026-10-08', 'P01', '320001310', 600000, 6.6, '2026-12-15'),
  po('4500012671', 'v-vardhman', '2026-10-09', 'P01', '320001355', 30000, 18.9, '2026-10-18'),
  po('4500012689', 'v-saraswati', '2026-10-10', 'P01', '320001420', 12000, 670, '2026-12-15'),
]

// S4: BLDC motor POs and S7: PCB Rev B open POs.
export const OTHER_POS: PurchaseOrder[] = [
  po('4500012490', 'v-sundara', '2026-09-20', 'P04', '330000790', 8000, 1392, '2026-11-30'),
  po('4500012702', 'v-lumen', '2026-10-14', 'P06', '340000455', 600, 2398, '2026-12-05'),
  po('4500012733', 'v-lumen', '2026-10-28', 'P06', '340000455', 400, 2398, '2026-12-20'),
]

let n = 5000020000
const gr = (ebeln: string, material: string, vendorId: string, postingDate: string, qty: number, movementType: GoodsReceipt['movementType'] = '101'): GoodsReceipt => ({
  mblnr: String(n++), item: '0001', movementType, postingDate, ebeln, ebelp: '00010', material, plant: '1001', vendorId, qty, deliveryNote: `DN/${postingDate.slice(5).replace('-', '')}/${n % 1000}`,
})

export const GOODS_RECEIPTS: GoodsReceipt[] = [
  // S6 receipts since the fall
  gr('4500012610', '320001180', 'v-hanbit', '2026-10-24', 42000), gr('4500012610', '320001180', 'v-hanbit', '2026-11-08', 38000), gr('4500012610', '320001180', 'v-hanbit', '2026-11-10', 2000, '122'),
  gr('4500012622', '370000210', 'v-zhenhai', '2026-10-28', 10000), gr('4500012622', '370000210', 'v-zhenhai', '2026-11-11', 8000),
  gr('4500012640', '380000075', 'v-sutlej', '2026-10-21', 5000), gr('4500012640', '380000075', 'v-sutlej', '2026-11-06', 4000),
  gr('4500012655', '320001240', 'v-kaveri-cap', '2026-10-30', 2600),
  gr('4500012668', '320001310', 'v-indus', '2026-10-22', 210000), gr('4500012668', '320001310', 'v-indus', '2026-11-09', 200000),
  gr('4500012671', '320001355', 'v-vardhman', '2026-10-25', 21000),
  gr('4500012689', '320001420', 'v-saraswati', '2026-10-27', 8000),
  // S4: weekly BLDC motor receipts with rising blocked (103) and returns (122)
  ...[
    ['2026-10-06', 1300, 4, 4], ['2026-10-13', 1300, 6, 5], ['2026-10-20', 1300, 9, 5],
    ['2026-10-27', 1300, 13, 7], ['2026-11-03', 1300, 18, 7], ['2026-11-10', 1300, 24, 7],
  ].flatMap(([d, q, blocked, ret]) => [
    gr('4500012490', '330000790', 'v-sundara', d as string, q as number),
    gr('4500012490', '330000790', 'v-sundara', d as string, blocked as number, '103'),
    gr('4500012490', '330000790', 'v-sundara', d as string, ret as number, '122'),
  ]),
]

export const TOOLS: Tool[] = [
  {
    id: 'NTD-2026-0031', title: 'EPS packing mould, 1.5T indoor top (new design)', partCode: '350000301', commodity: 'EPS', vendorId: 'v-thermopack',
    stage: '8A Mould Design (rework)', neededByProject: 'NCD-FY-2026-0049', commissioningPlanned: '2026-11-25',
    trials: [
      { n: 1, date: '2026-10-29', result: 'fail', failedParams: ['Cycle time'] },
      { n: 2, date: '2026-11-14', result: 'fail', failedParams: ['Dimensional', 'Flash'] },
    ],
    reworkDays: { mouldDesign: 6, manufacturing: 7, trial: 3 },
    fastTrackSavingDays: 7,
  },
]

export const CAPEX: CapexRequest[] = [
  { no: 'CAP-2526-0014', title: 'Injection moulding machine 450T for ODU fan guard', plant: '1007', budgetCr: 2.92, committedCr: 2.92, status: 'PO released', vendorId: 'v-kavya', deliveryPlanned: '2027-01-10', deliveryRevised: '2027-02-21', enables: { partCode: 'ODU-FAN-GUARD', capacityPerDay: 900 } },
  { no: 'CAP-2526-0009', title: 'Auto brazing, induction (Copper shop)', plant: '1001', budgetCr: 0.36, committedCr: 0.34, status: 'Installed', deliveryPlanned: '2026-09-15' },
  { no: 'CAP-2526-0011', title: 'HEX black copper detection system', plant: '1001', budgetCr: 0.48, committedCr: 0.45, status: 'PO released', deliveryPlanned: '2026-12-20' },
  { no: 'CAP-2526-0017', title: 'DG set 1010 kVA', plant: '1009', budgetCr: 1.15, committedCr: 0, status: 'In sourcing', deliveryPlanned: '2027-03-01' },
  { no: 'CAP-2526-0021', title: 'Helium leak test station', plant: '1006', budgetCr: 0.82, committedCr: 0.79, status: 'Negotiation', deliveryPlanned: '2027-01-25' },
  { no: 'CAP-2526-0024', title: 'Vision inspection, PCB line', plant: '1008', budgetCr: 0.64, committedCr: 0, status: 'With Plant Head', deliveryPlanned: '2027-02-15' },
]

export const DATA_DROPS: DataDrop[] = [
  {
    id: 'dd-sales-fy27', fileName: 'Sales_Forecast_FY27.xlsx', kind: 'sales_forecast', rows: 412, rowsOk: 404, unknownParts: 5, duplicates: 3,
    columns: [
      { source: 'Model Code', target: 'Product model', confidence: 0.97 },
      { source: 'Customer', target: 'OBU Customer', confidence: 0.95 },
      { source: 'Month', target: 'Demand month', confidence: 0.99 },
      { source: 'Plan Qty', target: 'Baseline units', confidence: 0.92 },
      { source: 'Pre-booking Qty', target: 'Forecast units', confidence: 0.88 },
      { source: 'Plant', target: 'Plant (MARC-WERKS)', confidence: 0.9 },
    ],
    demand: [
      { productModelId: 'PM-CW15-5S', month: '2027-03', baseline: 9000, forecast: 10620 },
      { productModelId: 'PM-CW15-5S', month: '2027-04', baseline: 10500, forecast: 12390 },
      { productModelId: 'PM-CW15-5S', month: '2027-05', baseline: 9500, forecast: 11210 },
    ],
  },
  {
    id: 'dd-inspection-oct', fileName: 'Incoming_Inspection_Oct.csv', kind: 'incoming_inspection', rows: 1288, rowsOk: 1270, unknownParts: 12, duplicates: 6,
    columns: [
      { source: 'Item No', target: 'Part (MARA-MATNR)', confidence: 0.98 },
      { source: 'Supplier', target: 'Vendor (LFA1)', confidence: 0.94 },
      { source: 'Lot Qty', target: 'Inspected quantity', confidence: 0.96 },
      { source: 'Rej Qty', target: 'Rejected quantity', confidence: 0.95 },
      { source: 'Date', target: 'Inspection date', confidence: 0.99 },
    ],
  },
]
