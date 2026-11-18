// Shipments, projects, signals and value history. Raw facts only: every ₹ and day figure shown is computed by src/engine.
import type { Project, Recommendation, Shipment, Signal, ValueSeed } from '@/data/types'

export const SHIPMENTS: Shipment[] = [
  {
    ref: 'ATF-IMP-2026-066', poNumbers: ['4500012345'], vendorId: 'v-shenghai', mode: 'SEA', incoterm: 'FOB',
    pol: 'CNSHA', pod: 'INNSA1', icd: 'Patli ICD (INPTL6)', plant: '1001', stage: 'so_confirmed',
    containers: [{ no: 'MSCU4812906', type: '40HC' }, { no: 'TGHU7712403', type: '40HC' }],
    lines: [{ partCode: '310000451', qty: 4200 }],
    etdPlanned: '2026-11-08', etdRevised: '2026-11-17', etaPlanned: '2026-11-24', etaRevised: '2026-12-03',
    delayReason: 'Rolled at Shanghai: the vessel was overbooked.',
    portToPlantDays: 4,
    freeDaysAtPort: 4, demurragePerContainerDay: 12000, detentionPerContainerDay: 7000,
    landedCost: [
      { type: 'ZFR2', amountInr: 412000 }, { type: 'ZINS', amountInr: 36100 }, { type: 'ZCHA', amountInr: 18500 },
      { type: 'ZCFS', amountInr: 42000 }, { type: 'ZTHC', amountInr: 27600 }, { type: 'ZIHC', amountInr: 85000 },
    ],
  },
  {
    ref: 'ATF-IMP-2026-071', poNumbers: [], vendorId: 'v-hanbit', mode: 'SEA', incoterm: 'CIF',
    pol: 'KRPUS', pod: 'INMUN1', plant: '1001', stage: 'in_transit',
    containers: [{ no: 'HDMU2209817', type: '20GP' }], lines: [{ partCode: '320001180', qty: 18000 }],
    etdPlanned: '2026-11-05', etdActual: '2026-11-05', etaPlanned: '2026-11-21', portToPlantDays: 5,
    freeDaysAtPort: 4, demurragePerContainerDay: 9000, detentionPerContainerDay: 5000,
    landedCost: [{ type: 'ZFR2', amountInr: 168000 }, { type: 'ZINS', amountInr: 21400 }, { type: 'ZCHA', amountInr: 12500 }, { type: 'ZTHC', amountInr: 13800 }],
  },
  {
    ref: 'ATF-IMP-2026-074', poNumbers: [], vendorId: 'v-nordal', mode: 'SEA', incoterm: 'FOB',
    pol: 'THLCH', pod: 'INNSA1', icd: 'Garhi ICD (INGHR6)', plant: '1001', stage: 'in_transit',
    containers: [{ no: 'OOLU6610042', type: '40HC' }], lines: [{ partCode: '360000812', qty: 21000 }],
    etdPlanned: '2026-11-09', etdActual: '2026-11-09', etaPlanned: '2026-11-26', portToPlantDays: 4,
    freeDaysAtPort: 4, demurragePerContainerDay: 12000, detentionPerContainerDay: 7000, landedCost: [],
  },
]

export const PROJECTS: Project[] = [
  {
    id: 'RND-CW-2027', type: 'RND', title: 'Coolwave 1.5T 5-star Inverter 2027 line-up', productModelId: 'PM-CW15-5S', customer: 'Coolwave',
    stage: 'DV', ownerId: 'u-kavita', plant: '1001',
    needs: [{ partCode: '310000451', qty: 60, forStage: 'DV build', plannedStart: '2026-11-30', inspectionDays: 1 }],
    labSlots: ['2026-11-30', '2026-12-11', '2026-12-18'],
    nextGate: { name: 'PP gate', planned: '2026-12-21' },
    buildDurationDays: 14,
    latePenaltyPerDayInr: 50000,
  },
  {
    id: 'NCD-FY-2026-0041', type: 'NCD', title: 'EPS packing insert, 1.5T split indoor unit', productModelId: 'PM-CW15-5S', customer: 'Coolwave',
    stage: 'PP Pricing', ownerId: 'u-kavita', plant: '1001', needs: [],
  },
  {
    id: 'NCD-FY-2026-0049', type: 'NCD', title: 'EPS packing set, Coolwave 1.5T indoor (new design)', productModelId: 'PM-CW15-5S', customer: 'Coolwave',
    stage: 'FPA Document Collection', ownerId: 'u-kavita', plant: '1001', needs: [],
    fpaDaysAfterTool: 10, feedsProject: 'RND-CW-2027', feedsLeadDays: 7,
  },
  {
    id: 'NCD-FY-2026-0052', type: 'NCD', title: 'BLDC fan motor 48W for next-gen ODU', customer: 'Coolwave',
    stage: 'RND Approval', ownerId: 'u-rahul', plant: '1001', needs: [],
  },
  {
    id: 'ECN-FY-2026-0011', type: 'ECN', title: 'Outdoor inverter PCB Rev B to Rev C', productModelId: 'PM-CW18-5S', customer: 'Coolwave',
    stage: 'Cut-in planning', ownerId: 'u-rahul', plant: '1001', needs: [],
    cutIn: '2027-01-01', oldPart: '340000455', newPart: '340000456', cutInPlants: ['1001', '1009'],
  },
]

const rec = (r: Recommendation) => r

export const SIGNALS: Signal[] = [
  {
    id: 'SIG-2026-1142', sourceId: 'exim', type: 'shipment_delay', severity: 'critical', ownerId: 'u-farhan',
    title: 'Compressor shipment ATF-IMP-2026-066 rolled, ETA moves out',
    summary: 'Shenghai Compressor Co. booking was rolled at Shanghai. The compressors feed the Coolwave DV build and December production at Rajpura.',
    raisedAt: '2026-11-16T06:30:00+05:30',
    firstKnownAt: '2026-11-07T15:10:00+05:30', firstKnownBy: 'EXIM (forwarder roll-over notice)',
    entityRefs: [
      { kind: 'shipment', id: 'ATF-IMP-2026-066' }, { kind: 'po', id: '4500012345' }, { kind: 'part', id: '310000451' },
      { kind: 'project', id: 'RND-CW-2027' }, { kind: 'plant', id: '1001' }, { kind: 'vendor', id: 'v-shenghai' }, { kind: 'customer', id: 'Coolwave' },
    ],
    status: 'new', ruleId: 'R-EXIM-ETA-SLIP',
    recommendations: [
      rec({ id: 'REC-1142-AIR', kind: 'air_freight_partial', title: 'Air-freight 300 compressors as a partial', effect: 'Covers the DV build and keeps the line running for part of the gap.', ownerRoleId: 'exim_manager', target: { system: 'EXIM', recordType: 'Air partial shipment' }, steps: ['Confirm quantity and airport', 'Confirm cost and approver', 'Create the air partial'], params: { qty: 300, airCostPerUnitInr: 1450, transitDays: 5, origin: 'PVG', destination: 'DEL' } }),
      rec({ id: 'REC-1142-AS', kind: 'alternate_supplier', title: 'Raise an Alternate Supplier request for Kaveri Compressors', effect: 'Kaveri is already approved for this compressor at Supa. Extending the approval to Rajpura covers part of the line-stop window.', ownerRoleId: 'npd_pm', target: { system: 'NPD', recordType: 'Alternate Supplier request' }, steps: ['Confirm part, plant and quantity', 'Confirm the approval route', 'Raise the request in NPD'], params: { vendorId: 'v-kaveri', qty: 1200, firstDeliveryDays: 11, approvedAt: '1009', recordRef: 'AS-FY-2026-0012' } }),
      rec({ id: 'REC-1142-RESEQ', kind: 'resequence', title: 'Re-sequence the DV build onto Rajpura stock', effect: 'Use 60 compressors from stock for the DV build, so the gate holds. The line runs out a little earlier.', ownerRoleId: 'head_rnd', target: { system: 'R&D Control Tower', recordType: 'Plan change' }, steps: ['Confirm the build slot', 'Confirm the stock draw', 'Update the R&D plan'], params: { qty: 60 } }),
      rec({ id: 'REC-1142-CUST', kind: 'notify_customer', title: 'Notify the Coolwave programme manager', effect: 'Sets expectations on the PP gate before the customer hears it elsewhere.', ownerRoleId: 'kam', target: { system: 'Email', recordType: 'Customer notice' }, steps: ['Review the draft', 'Send'], params: {} }),
    ],
    storedImpact: { inrAtRisk: 5760000, slipDays: 11, unitsAtRisk: 1800 },
  },
  {
    id: 'SIG-2026-1139', sourceId: 'cost', type: 'commodity_spike', severity: 'high', ownerId: 'u-rohit',
    title: 'LME Copper up sharply in 14 days, forecast still rising',
    summary: 'Every part with L4 Commodity = Copper carries more should-cost. NCD-FY-2026-0041 is in PP Pricing with quote validity ending soon.',
    raisedAt: '2026-11-15T18:05:00+05:30', firstKnownAt: '2026-11-14T09:00:00+05:30', firstKnownBy: 'Cost Engine (LME feed)',
    entityRefs: [{ kind: 'commodity', id: 'Copper' }, { kind: 'part', id: '320001180' }, { kind: 'part', id: '370000210' }, { kind: 'part', id: '380000075' }, { kind: 'part', id: '320001310' }, { kind: 'project', id: 'NCD-FY-2026-0041' }, { kind: 'plant', id: '1001' }],
    status: 'new', ruleId: 'R-COST-INDEX-5PCT',
    recommendations: [
      rec({ id: 'REC-1139-LOCK', kind: 'price_lock', title: 'Request a price lock from copper vendors for 2 months', effect: 'Holds today’s prices against the forecast rise for the next two months of demand.', ownerRoleId: 'head_sourcing', target: { system: 'Vendor Portal', recordType: 'Price-lock request' }, steps: ['Pick vendors and quantities', 'Confirm the lock window', 'Send through the Vendor Portal'], params: { months: 2, workingDaysPerMonth: 25 } }),
      rec({ id: 'REC-1139-FWD', kind: 'forward_buy', writeBack: true, title: 'Forward-buy a third month of copper tube', effect: 'Raises an SAP purchase requisition at today’s price for the month after the lock.', ownerRoleId: 'buyer', target: { system: 'SAP', recordType: 'Purchase requisition' }, steps: ['Confirm quantity and delivery', 'Confirm the release strategy', 'Create the PR in SAP'], params: { partCode: '320001180', months: 1, workingDaysPerMonth: 25, recordRef: '1000045678' } }),
      rec({ id: 'REC-1139-NOTICE', kind: 'price_revision_notice', title: 'Send the customer a price-revision notice', effect: 'Invokes the commodity clause in the Coolwave contract for the next quarter.', ownerRoleId: 'kam', target: { system: 'Email', recordType: 'Price-revision notice' }, steps: ['Review the draft', 'Send'], params: {} }),
      rec({ id: 'REC-1139-RERUN', kind: 'rerun_shouldcost', title: 'Re-run should-cost at the forecast high', effect: 'Gives NPD a ceiling for the PP Pricing round on NCD-FY-2026-0041.', ownerRoleId: 'cost_engineer', target: { system: 'Cost Engine', recordType: 'Should-cost run' }, steps: ['Confirm the index scenario', 'Run'], params: {} }),
    ],
  },
  {
    id: 'SIG-2026-1147', sourceId: 'cost', type: 'pass_through', severity: 'high', ownerId: 'u-harish',
    title: 'Copper fell last quarter, but 6 vendors kept their prices',
    summary: 'LME Copper averaged lower in Q2 FY27 than in Q1. POs raised after the fall kept the Q1 price on parts with L4 Commodity = Copper. Before the new rise hits, claim back the fall.',
    raisedAt: '2026-11-16T07:10:00+05:30', firstKnownAt: '2026-10-01T09:00:00+05:30', firstKnownBy: 'Cost Engine (quarterly index close)',
    entityRefs: [{ kind: 'commodity', id: 'Copper' }, { kind: 'vendor', id: 'v-hanbit' }, { kind: 'vendor', id: 'v-zhenhai' }, { kind: 'vendor', id: 'v-sutlej' }, { kind: 'vendor', id: 'v-kaveri-cap' }, { kind: 'vendor', id: 'v-indus' }, { kind: 'vendor', id: 'v-vardhman' }, { kind: 'vendor', id: 'v-saraswati' }, { kind: 'plant', id: '1001' }],
    status: 'new', ruleId: 'R-COST-PASSTHROUGH',
    recommendations: [
      rec({ id: 'REC-1147-DEBIT', kind: 'debit_note', title: 'Raise price-revision claims and debit notes', effect: 'Claims the difference on quantities already received since the fall.', ownerRoleId: 'category_manager', target: { system: 'Vendor Portal', recordType: 'Price-revision claim' }, steps: ['Review vendors and amounts', 'Confirm the claim basis', 'Share with vendors'], params: {} }),
      rec({ id: 'REC-1147-INFO', kind: 'inforecord_update', writeBack: true, title: 'Update info-record prices for open quantities', effect: 'Brings the price on still-to-deliver quantities down to the index-adjusted price.', ownerRoleId: 'head_sourcing', target: { system: 'SAP', recordType: 'Info-record change' }, steps: ['Review new prices', 'Confirm approver', 'Write back to SAP'], params: {} }),
      rec({ id: 'REC-1147-CLAUSE', kind: 'index_clause', title: 'Add an index-linked price clause to the next contracts', effect: 'Future falls pass through automatically.', ownerRoleId: 'category_manager', target: { system: 'Vendor Portal', recordType: 'Contract amendment' }, steps: ['Review the clause', 'Send'], params: {} }),
    ],
  },
  {
    id: 'SIG-2026-1145', sourceId: 'tooling', type: 'tool_trial_fail', severity: 'high', ownerId: 'u-karan',
    title: 'EPS packing mould failed trial T2, back to mould design',
    summary: 'Tool NTD-2026-0031 at ThermoPack EPS failed T2 on dimensional and flash. Only the failed component returns to mould design. FPA for NCD-FY-2026-0049 waits on the tool.',
    raisedAt: '2026-11-15T09:40:00+05:30', firstKnownAt: '2026-11-14T17:30:00+05:30', firstKnownBy: 'Tooling (trial report)',
    entityRefs: [{ kind: 'tool', id: 'NTD-2026-0031' }, { kind: 'part', id: '350000301' }, { kind: 'project', id: 'NCD-FY-2026-0049' }, { kind: 'project', id: 'RND-CW-2027' }, { kind: 'vendor', id: 'v-thermopack' }, { kind: 'plant', id: '1001' }],
    status: 'new', ruleId: 'R-NTD-TRIAL-FAIL',
    recommendations: [
      rec({ id: 'REC-1145-FAST', kind: 'tool_fast_track', title: 'Approve a T3 fast-track with ThermoPack', effect: 'Overtime on rework and a priority trial slot.', ownerRoleId: 'tooling_engineer', target: { system: 'Tooling NTD', recordType: 'Fast-track approval' }, steps: ['Confirm scope and fee', 'Approve'], params: { feeInr: 120000 } }),
      rec({ id: 'REC-1145-BRIDGE', kind: 'bridge_supply', title: 'Bridge supply from a soft tool', effect: 'A soft tool supplies FPA samples while the hard tool is reworked.', ownerRoleId: 'head_rnd', target: { system: 'Tooling NTD', recordType: 'Bridge tool order' }, steps: ['Confirm quantity', 'Confirm cost', 'Order'], params: { costInr: 280000, leadDays: 6 } }),
      rec({ id: 'REC-1145-WAIVER', kind: 'deviation_waiver', title: 'Accept T2 parts for FPA under a DQA deviation', effect: 'Flash is cosmetic on the inner face. FPA proceeds while the tool is corrected.', ownerRoleId: 'head_quality', target: { system: 'NPD', recordType: 'Deviation approval' }, steps: ['Review the trial report', 'Approve the deviation'], params: {} }),
    ],
  },
  {
    id: 'SIG-2026-1136', sourceId: 'sap', type: 'supplier_quality', severity: 'high', ownerId: 'u-pooja',
    title: 'BLDC fan motor rejections from Sundara rising at Rajpura',
    summary: 'GRs into blocked stock (movement 103) and returns to vendor (122) are climbing week on week. Sundara’s GST certificate also expires soon, and NPD is about to approve them for a new motor.',
    raisedAt: '2026-11-15T11:20:00+05:30', firstKnownAt: '2026-11-03T10:00:00+05:30', firstKnownBy: 'Rajpura stores (SAP MM)',
    seedAcks: { 'u-pooja': '2026-11-15T12:05:00+05:30' },
    entityRefs: [{ kind: 'part', id: '330000790' }, { kind: 'vendor', id: 'v-sundara' }, { kind: 'project', id: 'NCD-FY-2026-0052' }, { kind: 'plant', id: '1001' }],
    status: 'acknowledged', ruleId: 'R-QM-REJECTION',
    recommendations: [
      rec({ id: 'REC-1136-RTV', kind: 'return_to_vendor', writeBack: true, title: 'Return blocked lots to vendor and raise a debit note', effect: 'Posts movement 122 for the blocked quantity and recovers its value.', ownerRoleId: 'sqe', target: { system: 'SAP', recordType: 'Return delivery' }, steps: ['Confirm lots', 'Confirm the debit note', 'Post in SAP'], params: {} }),
      rec({ id: 'REC-1136-SHIFT', kind: 'shift_share', title: 'Shift 50% of the share of business to the alternate motor vendor', effect: 'Cuts the expected rejection cost for the next 12 months.', ownerRoleId: 'head_sourcing', target: { system: 'SAP', recordType: 'Quota arrangement' }, steps: ['Confirm split', 'Confirm the alternate', 'Update the quota'], params: { share: 0.5, altRejectRate: 0.004, reworkCostInr: 650, months: 12, workingDaysPerMonth: 26 } }),
      rec({ id: 'REC-1136-HOLD', kind: 'hold_npd', title: 'Hold the NPD approval on NCD-FY-2026-0052', effect: 'Stops a new part being awarded to a vendor that is failing on the current one.', ownerRoleId: 'head_rnd', target: { system: 'NPD', recordType: 'Approval hold' }, steps: ['Confirm the hold', 'Notify sourcing'], params: {} }),
      rec({ id: 'REC-1136-8D', kind: 'quality_notification', writeBack: true, title: 'Raise a supplier 8D quality notification', effect: 'Formal root-cause request to Sundara.', ownerRoleId: 'sqe', target: { system: 'SAP', recordType: 'Quality notification' }, steps: ['Review defects', 'Raise'], params: {} }),
    ],
  },
  {
    id: 'SIG-2026-1131', sourceId: 'npd', type: 'ecn_obsolescence', severity: 'high', ownerId: 'u-rahul',
    title: 'ECN-FY-2026-0011 supersedes outdoor PCB Rev B from 01 Jan 2027',
    summary: 'Stock and open POs of the old revision exceed demand until cut-in. Stores and sourcing still hold both.',
    raisedAt: '2026-11-14T16:40:00+05:30', firstKnownAt: '2026-11-10T12:00:00+05:30', firstKnownBy: 'NPD (ECN released)',
    entityRefs: [{ kind: 'project', id: 'ECN-FY-2026-0011' }, { kind: 'part', id: '340000455' }, { kind: 'po', id: '4500012702' }, { kind: 'po', id: '4500012733' }, { kind: 'plant', id: '1001' }, { kind: 'plant', id: '1009' }],
    status: 'new', ruleId: 'R-ECN-EXCESS',
    recommendations: [
      rec({ id: 'REC-1131-REDUCE', kind: 'reduce_po', writeBack: true, title: 'Reduce open PO quantity on Rev B', effect: 'Cuts the still-to-deliver quantity down to what demand needs.', ownerRoleId: 'buyer', target: { system: 'SAP', recordType: 'PO change' }, steps: ['Review the PO lines', 'Confirm approver', 'Write back to SAP'], params: {} }),
      rec({ id: 'REC-1131-CUTIN', kind: 'move_cutin', title: 'Move the cut-in two weeks later to use stock', effect: 'Consumes more Rev B before Rev C starts. Needs R&D approval.', ownerRoleId: 'head_rnd', target: { system: 'NPD', recordType: 'ECN change' }, steps: ['Confirm the new date', 'Approve'], params: { days: 14 } }),
      rec({ id: 'REC-1131-RTV', kind: 'return_to_vendor', writeBack: true, title: 'Return surplus Rev B stock to Lumen', effect: 'Return delivery under the supply agreement buy-back clause.', ownerRoleId: 'stores', target: { system: 'SAP', recordType: 'Return delivery' }, steps: ['Confirm quantity', 'Post movement 122'], params: {} }),
      rec({ id: 'REC-1131-SPARES', kind: 'service_spares', title: 'Move the remainder to service spares', effect: 'Keeps Rev B for after-sales on existing units.', ownerRoleId: 'planner', target: { system: 'SAP', recordType: 'Transfer posting' }, steps: ['Confirm quantity', 'Post'], params: { servicePct: 0.6 } }),
    ],
  },
  {
    id: 'SIG-2026-1150', sourceId: 'datadrop', type: 'demand_uplift', severity: 'high', ownerId: 'u-deepak', requiresDataDrop: 'dd-sales-fy27',
    title: 'Summer pre-booking up for Coolwave 1.5T, supply short in March',
    summary: 'The uploaded sales forecast shows pre-booking above plan for March to May. Compressors need a 75-day import lead time, and the fan-guard machine at Jhajjar P2 is late.',
    raisedAt: '2026-11-16T10:30:00+05:30', firstKnownAt: '2026-11-16T10:30:00+05:30', firstKnownBy: 'Sales (Excel forecast)',
    entityRefs: [{ kind: 'model', id: 'PM-CW15-5S' }, { kind: 'part', id: '310000451' }, { kind: 'capex', id: 'CAP-2526-0014' }, { kind: 'plant', id: '1001' }, { kind: 'plant', id: '1007' }, { kind: 'customer', id: 'Coolwave' }],
    status: 'new', ruleId: 'R-DEMAND-UPLIFT',
    recommendations: [
      rec({ id: 'REC-1150-PRS', kind: 'planned_prs', writeBack: true, title: 'Raise planned purchase requisitions for compressors', effect: 'Orders the uplift in time for the 75-day lead time.', ownerRoleId: 'planner', target: { system: 'SAP', recordType: 'Purchase requisition' }, steps: ['Review quantities by month', 'Confirm', 'Create PRs in SAP'], params: { recordRef: '1000045702' } }),
      rec({ id: 'REC-1150-OUT', kind: 'outsource_moulding', title: 'Outsource ODU fan-guard moulding to Polymould', effect: 'Covers fan guards until the new machine runs.', ownerRoleId: 'head_sourcing', target: { system: 'SAP', recordType: 'Subcontract PO' }, steps: ['Confirm vendor and quantity', 'Confirm price delta', 'Create'], params: { deltaPerUnitInr: 14 } }),
      rec({ id: 'REC-1150-EXP', kind: 'expedite_capex', title: 'Expedite the 450T machine with a penalty clause', effect: 'Pulls delivery forward three weeks.', ownerRoleId: 'plant_head', target: { system: 'Capex', recordType: 'Expedite request' }, steps: ['Confirm terms', 'Send'], params: { pullInDays: 21, feeInr: 350000 } }),
    ],
  },
  {
    id: 'SIG-2026-1133', sourceId: 'vendor', type: 'vendor_compliance', severity: 'medium', ownerId: 'u-meera',
    title: 'Sundara Precision Components: GST certificate expires in 5 days',
    summary: 'The vendor will be auto-suspended for new POs at expiry unless the regularisation request is completed.',
    raisedAt: '2026-11-16T08:00:00+05:30', firstKnownAt: '2026-11-16T02:00:00+05:30', firstKnownBy: 'Vendor Management (nightly check)',
    entityRefs: [{ kind: 'vendor', id: 'v-sundara' }, { kind: 'part', id: '330000790' }, { kind: 'plant', id: '1001' }],
    status: 'new', ruleId: 'R-VMS-DOC-EXPIRY', recommendations: [],
  },
  {
    id: 'SIG-2026-1128', sourceId: 'exim', type: 'shipment_delay', severity: 'low', ownerId: 'u-farhan',
    title: 'Copper tube shipment ATF-IMP-2026-071 on schedule, BOE pre-filed',
    summary: 'Advance BOE filed for the Mundra arrival. No action needed.',
    raisedAt: '2026-11-13T09:15:00+05:30', firstKnownAt: '2026-11-13T09:00:00+05:30', firstKnownBy: 'EXIM',
    entityRefs: [{ kind: 'shipment', id: 'ATF-IMP-2026-071' }, { kind: 'part', id: '320001180' }, { kind: 'plant', id: '1001' }],
    status: 'resolved', ruleId: 'R-EXIM-ETA-SLIP', recommendations: [],
  },
  // Resolved history (value already booked; see VALUE_HISTORY)
  ...[
    ['SIG-2026-1088', 'commodity_spike', 'cost', 'Aluminium fin price rise absorbed by a 3-month lock', 'u-harish'],
    ['SIG-2026-1092', 'shipment_delay', 'exim', 'Fin stock shipment held at Nhava Sheva, BOE query cleared in a day', 'u-farhan'],
    ['SIG-2026-1101', 'supplier_quality', 'sap', 'Service valve leak rejections, vendor 8D closed', 'u-pooja'],
    ['SIG-2026-1107', 'ecn_obsolescence', 'npd', 'Louver panel ECN, old stock consumed before cut-in', 'u-rahul'],
    ['SIG-2026-1113', 'pass_through', 'cost', 'Steel coil fall passed through by two sheet-metal vendors', 'u-harish'],
    ['SIG-2026-1120', 'tool_trial_fail', 'tooling', 'Fan shroud mould T2 fix, FPA held the date', 'u-karan'],
  ].map(([id, type, sourceId, title, ownerId]) => ({
    id, type, sourceId, title, ownerId, severity: 'medium', summary: 'Resolved. Value booked to the ledger.',
    raisedAt: '2026-09-20T09:00:00+05:30', firstKnownAt: '2026-09-18T09:00:00+05:30', firstKnownBy: 'Source module',
    entityRefs: [{ kind: 'plant', id: '1001' }], status: 'resolved', ruleId: 'R-HISTORY', recommendations: [],
  }) as Signal),
]

// Booked value from resolved signals. amount = qty × rate − less, verified by check:seed.
export const VALUE_HISTORY: ValueSeed[] = [
  { id: 'VAL-FY27-0001', signalId: 'SIG-2026-1088', lever: 'Price lock', type: 'avoidance', baseline: { kind: 'Forecast price', value: 'LME Aluminium +4.2%' }, calc: { qty: 105000, rate: 10.6 }, formula: '105,000 kg × ₹ 10.6 per kg avoided', ownerId: 'u-harish', plant: '1001', status: 'validated', evidence: ['GRN 5000019412 (101) at locked price', 'GRN 5000019655 (101)'], at: '2026-09-30T11:00:00+05:30', validatedBy: 'u-anjali' },
  { id: 'VAL-FY27-0002', signalId: 'SIG-2026-1092', lever: 'BOE query fast clearance', type: 'penalty_avoided', baseline: { kind: 'Port dwell beyond free days', value: '3 days expected' }, calc: { qty: 3, rate: 19000 }, formula: '3 days × ₹ 19,000 (ZDCS + ZCDT, 1 container)', ownerId: 'u-farhan', plant: '1001', status: 'validated', evidence: ['ICEGATE OOC 22 Sep', 'GRN 5000019503 (101)'], at: '2026-09-26T16:00:00+05:30', validatedBy: 'u-ramesh' },
  { id: 'VAL-FY27-0003', signalId: 'SIG-2026-1101', lever: 'Return to vendor', type: 'cash', baseline: { kind: 'Blocked stock value', value: '2,400 units' }, calc: { qty: 2400, rate: 219 }, formula: '2,400 valves × ₹ 219 returned (122)', ownerId: 'u-pooja', plant: '1001', status: 'validated', evidence: ['Return delivery 5000019588 (122)', 'Debit note DN-2026-0412'], at: '2026-10-04T12:00:00+05:30', validatedBy: 'u-ramesh' },
  { id: 'VAL-FY27-0004', signalId: 'SIG-2026-1107', lever: 'Cut-in moved', type: 'avoidance', baseline: { kind: 'Write-off at cut-in', value: '1,900 panels' }, calc: { qty: 1900, rate: 146 }, formula: '1,900 panels × ₹ 146 standard price', ownerId: 'u-rahul', plant: '1001', status: 'realised', evidence: ['Stock at cut-in 0 (MARD-LABST)'], at: '2026-10-18T10:00:00+05:30' },
  { id: 'VAL-FY27-0005', signalId: 'SIG-2026-1113', lever: 'Pass-through claim', type: 'hard', baseline: { kind: 'Last price paid', value: 'Q1 PO price' }, calc: { qty: 410, rate: 2350 }, formula: '410 MT × ₹ 2,350 per MT recovered', ownerId: 'u-harish', plant: '1006', status: 'realised', evidence: ['GRN 5000019890 (101) at revised price'], at: '2026-10-25T15:00:00+05:30' },
  { id: 'VAL-FY27-0006', signalId: 'SIG-2026-1120', lever: 'Gate protected', type: 'penalty_avoided', baseline: { kind: 'Customer launch LD clause', value: '₹ 50,000 per day' }, calc: { qty: 4, rate: 50000 }, formula: '4 days gate slip avoided × ₹ 50,000', ownerId: 'u-karan', plant: '1001', status: 'committed', evidence: [], at: '2026-11-02T10:00:00+05:30' },
  { id: 'VAL-FY27-0007', signalId: 'SIG-2026-1088', lever: 'Forward buy', type: 'avoidance', baseline: { kind: 'Forecast price', value: 'LME Aluminium +4.2%' }, calc: { qty: 42000, rate: 10.6 }, formula: '42,000 kg × ₹ 10.6 per kg avoided', ownerId: 'u-nitin', plant: '1001', status: 'realised', evidence: ['GRN 5000019702 (101)'], at: '2026-10-08T10:00:00+05:30' },
  { id: 'VAL-FY27-0008', signalId: 'SIG-2026-1101', lever: 'Share shift', type: 'avoidance', baseline: { kind: 'Expected rejection cost', value: '12 months' }, calc: { qty: 1, rate: 780000 }, formula: '12-month rejection cost avoided', ownerId: 'u-rohit', plant: '1001', status: 'identified', evidence: [], at: '2026-10-05T10:00:00+05:30' },
]
