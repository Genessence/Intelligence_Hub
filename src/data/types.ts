// Canonical data model (spec section 9). SAP-shaped records keep the SAP meaning in comments
// and in src/data/sap/fieldMap.ts, so detail sheets can show "label · TABLE-FIELD · value".

export type ISODate = string // '2026-11-16'
export type ISODateTime = string // '2026-11-16T10:30:00+05:30'

export interface SapFieldDef {
  code: string
  report: string
  label: string
  tableField: string
  dataType: string
  valueKind: string
  description: string
  detail: string
  status: 'confirmed' | 'to_confirm' | 'calculated'
}

export type ModuleStatus = 'Live' | 'Pilot' | 'Roadmap'
export type SourceId = 'cost' | 'exim' | 'npd' | 'tooling' | 'rnd' | 'capex' | 'vendor' | 'quality' | 'sap' | 'datadrop'

export interface Tenant {
  id: string
  name: string
  shortName: string
  industry: string
  erp: { system: 'SAP S/4HANA' | 'SAP ECC'; methods: string[] }
  modules: { id: SourceId; name: string; status: ModuleStatus }[]
  contributionPerUnitInr: number // used for revenue protected / at risk
}

export interface Plant {
  code: string // Nexus plant code
  sapPlant: string // MARC-WERKS, 4 chars
  name: string
  city: string
  state: string
  productLines: string[]
}

export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type SignalType =
  | 'shipment_delay'
  | 'commodity_spike'
  | 'tool_trial_fail'
  | 'supplier_quality'
  | 'demand_uplift'
  | 'pass_through'
  | 'ecn_obsolescence'
  | 'vendor_compliance'
  | 'capex_delay'

export type RoleFunction =
  | 'Leadership'
  | 'Sourcing'
  | 'Cost'
  | 'NPD / R&D'
  | 'Tooling'
  | 'EXIM'
  | 'Quality'
  | 'Planning & plant'
  | 'Finance'
  | 'Customer'
  | 'Admin'
  | 'External'

export interface RoleTemplate {
  id: string
  name: string
  function: RoleFunction
  subscribes: { signalType: SignalType; minSeverity: Severity }[]
  defaultKpis: string[]
  landing: string
  permissions: string[]
  approvals: { type: string; limitInr?: number }[]
  status?: ModuleStatus // External vendor role is Roadmap
}

export interface Scope {
  all?: boolean
  plants: string[] // SAP plant (MARC-WERKS)
  purchasingGroups: string[] // EKKO-EKGRP
  mrpControllers: string[] // MARC-DISPO
  commodities: string[] // Amber Z-field L4 Commodity
  projects: string[]
  vendors: string[] // LFA1-LIFNR
  customers: string[] // OBU Customer
  shipmentsAll?: boolean // EXIM roles: every import shipment
}

export interface UserProfile {
  id: string
  name: string
  title: string
  roleId: string
  featured?: boolean
  pitch?: string // one line: what Nexus does for me
  scope: Scope
  delegate?: { userId: string; from: ISODate; to: ISODate }
  tenantId?: string
  addedInDemo?: boolean
  kpiLayout?: string[]
  channels?: { critical: string[]; high: string[]; medium: string[]; low: string[] }
  quietHours?: { from: string; to: string }
  onboarded?: boolean
}

export interface Vendor {
  id: string
  name: string
  country: string
  category: string
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  sapVendor: string // LFA1-LIFNR
  indexClause?: boolean // contract has an index-linked price clause
  msme?: 'MSME' | 'NON_MSME' | 'PENDING'
  group?: string // VMS supplier group, e.g. CR-RM, CR-IMP
  commodityCode?: string // VMS 2-letter commodity code
  city?: string
  onboardedOn?: ISODate
  docs?: { type: string; expiry?: ISODate; status: 'VERIFIED' | 'PENDING' | 'REJECTED' }[]
  aliases: { sourceId: SourceId | 'excel'; code: string }[]
}

export interface PartPlant {
  plant: string // MARC-WERKS
  purchasingGroup: string // MARC-EKGRP
  mrpController: string // MARC-DISPO
  plannedDelivDays: number // MARC-PLIFZ
  safetyStock: number // MARC-EISBE
  abc: 'A' | 'B' | 'C' // MARC-MAABC
  criticalPart: boolean // MARC-KZKRI
  standardPrice: number // MBEW-STPRS (INR per base unit)
  movingPrice: number // MBEW-VERPR
  dailyUse: number // derived from plan, units per working day
}

export interface Part {
  code: string // MARA-MATNR
  description: string // MAKT-MAKTX
  materialType: 'ROH' | 'HALB' | 'FERT' | 'VERP'
  materialGroup: string // MARA-MATKL
  commodityHierarchy: { l1: string; l2: string; l3: string; l4: string } // Amber Z-fields
  sourcingType: 'Domestic' | 'Import' // Amber Z-field
  obuCustomer?: string // Amber Z-field
  baseUom: string // MARA-MEINS
  hsCode: string // MARC-STEUC
  vendors: string[] // vendor ids
  plants: PartPlant[]
  costModel?: { commodity: string; share: number } // share of price driven by the commodity index (should-cost breakdown)
  kgPerUnit?: number
  supersededBy?: string
  sizeOd?: number
  sizeThickness?: number
  packingEpsG?: number
}

export interface ProductModel {
  id: string
  name: string
  productLine: string
  tonnage: number
  starRating: number
  customer: string
  decemberPlanUnits: number
  bom: { partCode: string; qtyPer: number }[]
}

export interface PurchaseOrder {
  ebeln: string // EKKO-EBELN
  docType: string // EKKO-BSART
  category: 'F' | 'L' | 'K' // EKKO-BSTYP
  purchasingGroup: string // EKKO-EKGRP
  purchOrg: string // EKKO-EKORG
  vendorId: string // EKKO-LIFNR via vendor
  docDate: ISODate // EKKO-BEDAT
  currency: string // EKKO-WAERS
  releaseState: string // EKKO-FRGZU
  lines: {
    item: string // EKPO-EBELP
    material: string // EKPO-MATNR
    plant: string // EKPO-WERKS
    qty: number // EKPO-MENGE
    netPrice: number // EKPO-NETPR
    priceUnit: number // EKPO-PEINH
    deliveryDate: ISODate // EKET-EINDT
  }[]
}

export interface StockPosition {
  plant: string // MARD-WERKS
  sloc: string // MARD-LGORT
  material: string // MARD-MATNR
  unrestricted: number // MARD-LABST
  qualityInsp: number // MARD-INSME
  blocked: number // MARD-SPEME
  inTransit: number // MARC-TRAME (stock transfer in transit, not imports)
}

export interface LandedCostCondition {
  type: string // condition type, e.g. ZFR2
  amountInr: number // PRCD_ELEMENTS-KWERT
}

export interface Shipment {
  ref: string
  poNumbers: string[]
  vendorId: string
  mode: 'SEA' | 'AIR'
  incoterm: string
  pol: string
  pod: string
  icd?: string
  plant: string // SAP plant
  stage: string // EXIM stage key
  containers: { no: string; type: '20GP' | '40HC' }[]
  lines: { partCode: string; qty: number }[]
  etdPlanned: ISODate
  etdActual?: ISODate
  etaPlanned: ISODate
  etaRevised?: ISODate
  etdRevised?: ISODate
  delayReason?: string
  portToPlantDays: number // clearance + ICD rail + road, planning norm
  landedCost: LandedCostCondition[]
  freeDaysAtPort: number
  demurragePerContainerDay: number // ZDCS rate
  detentionPerContainerDay: number // ZCDT rate
}

export type ProjectType = 'NCD' | 'NPD' | 'ECN' | 'AS' | 'RND' | 'NTD'
export interface Project {
  id: string
  type: ProjectType
  title: string
  productModelId?: string
  customer?: string
  stage: string
  ownerId: string
  plant: string
  needs: {
    partCode: string
    qty: number
    forStage: string
    plannedStart: ISODate
    inspectionDays: number // incoming inspection before build
  }[]
  labSlots?: ISODate[] // psychrometric lab slots booked or available for the build
  nextGate?: { name: string; planned: ISODate }
  buildDurationDays?: number // build + test duration before the next gate
  latePenaltyPerDayInr?: number // customer launch LD clause, launch tied to the next gate
  priority?: 'normal' | 'high' | 'critical'
  commodity?: string
  rag?: 'green' | 'amber' | 'red'
  team?: string
  startedOn?: ISODate
  tatDueOn?: ISODate
  gradeA?: boolean
  fpaDaysAfterTool?: number // FPA samples need this many days after tool commissioning
  feedsProject?: string // this part must be ready before that project's next gate
  feedsLeadDays?: number
  cutIn?: ISODate // ECN cut-in
  oldPart?: string
  newPart?: string
  cutInPlants?: string[]
}

export interface Commodity {
  slug: string
  name: string
  category: 'LME' | 'POLYMER' | 'STEEL' | 'FX' | 'FUEL'
  unit: string
  series: { d: ISODate; v: number }[]
  forecast: { d: ISODate; low: number; mid: number; high: number }[]
}

export interface GoodsReceipt {
  mblnr: string // MSEG-MBLNR
  item: string // MSEG-ZEILE
  movementType: '101' | '102' | '103' | '105' | '122' // MSEG-BWART
  postingDate: ISODate // MKPF-BUDAT
  ebeln: string // MSEG-EBELN
  ebelp: string // MSEG-EBELP
  material: string // MSEG-MATNR
  plant: string // MSEG-WERKS
  vendorId: string // MSEG-LIFNR
  qty: number // MSEG-MENGE
  deliveryNote: string // MKPF-XBLNR
}

export interface Tool {
  id: string
  title: string
  partCode: string
  commodity: string
  vendorId: string
  stage: string
  trials: { n: number; date: ISODate; result: 'pass' | 'fail'; failedParams: string[] }[]
  neededByProject: string
  commissioningPlanned: ISODate
  reworkDays: { mouldDesign: number; manufacturing: number; trial: number }
  fastTrackSavingDays: number
}

export interface CapexRequest {
  no: string
  title: string
  plant: string
  budgetCr: number
  committedCr: number
  status: string
  vendorId?: string
  deliveryPlanned: ISODate
  deliveryRevised?: ISODate
  enables?: { partCode: string; capacityPerDay: number }
}

export interface DataDrop {
  id: string
  fileName: string
  kind: 'sales_forecast' | 'incoming_inspection'
  columns: { source: string; target: string; confidence: number }[]
  rows: number
  rowsOk: number
  unknownParts: number
  duplicates: number
  demand?: { productModelId: string; month: string; baseline: number; forecast: number }[]
}

export interface ValueSeed {
  id: string
  signalId?: string
  lever: string
  type: ValueType
  baseline: { kind: string; value: string }
  calc: { qty: number; rate: number; less?: number } // amount = qty × rate − less
  formula: string
  ownerId: string
  plant?: string
  status: ValueStatus
  evidence: string[]
  at: ISODateTime
  validatedBy?: string
}

export interface Recommendation {
  id: string
  title: string
  effect: string
  ownerRoleId: string
  target: { system: string; recordType: string }
  steps: string[]
  kind:
    | 'air_freight_partial' | 'resequence' | 'alternate_supplier' | 'notify_customer'
    | 'price_lock' | 'forward_buy' | 'price_revision_notice' | 'rerun_shouldcost'
    | 'tool_fast_track' | 'bridge_supply' | 'deviation_waiver'
    | 'quality_notification' | 'hold_npd' | 'shift_share' | 'return_to_vendor'
    | 'planned_prs' | 'outsource_moulding' | 'expedite_capex'
    | 'debit_note' | 'inforecord_update' | 'index_clause'
    | 'reduce_po' | 'move_cutin' | 'service_spares'
    | 'generic'
  writeBack?: boolean
  params: Record<string, number | string>
}

export type EntityKind = 'shipment' | 'part' | 'po' | 'project' | 'plant' | 'vendor' | 'commodity' | 'customer' | 'tool' | 'capex' | 'model'
export type SignalStatus = 'new' | 'acknowledged' | 'in_action' | 'resolved' | 'dismissed'

export interface Signal {
  id: string
  sourceId: SourceId
  type: SignalType
  severity: Severity
  title: string
  summary: string
  raisedAt: ISODateTime
  firstKnownAt: ISODateTime // when the first system knew
  firstKnownBy: string // which system / team knew first
  entityRefs: { kind: EntityKind; id: string }[]
  recommendations: Recommendation[]
  status: SignalStatus
  ownerId?: string // user who owns the response and can resolve
  seedAcks?: Record<string, ISODateTime>
  requiresDataDrop?: string // hidden until this data drop is ingested
  ruleId: string
  audienceOverride?: string[]
  storedImpact?: { inrAtRisk: number; slipDays: number; unitsAtRisk: number } // verified by check:seed
}

export type ValueType = 'hard' | 'avoidance' | 'cash' | 'revenue_protected' | 'penalty_avoided'
export type ValueStatus = 'identified' | 'committed' | 'realised' | 'validated'

export interface ValueEntry {
  id: string
  signalId?: string
  recommendationId?: string
  lever: string
  type: ValueType
  baseline: { kind: string; value: string }
  formula: string
  amountInr: number
  units?: number
  ownerId: string
  plant?: string
  status: ValueStatus
  evidence: string[]
  sharedWith: string[]
  at: ISODateTime
  validatedBy?: string
}

export interface AuditEntry {
  id: string
  at: ISODateTime
  userId: string
  signalId?: string
  action: string
  detail: string
  writeBack?: boolean
}

export interface CreatedRecord {
  system: string
  recordType: string
  ref: string
}

export interface CostAssessment {
  id: string
  module: string // Cost Engine module label
  vendorId: string
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  items: number
  quotedInr: number // vendor quoted value for the assessed items
  shouldCostInr: number // engine should-cost for the same items
  submittedAt: ISODate
}

export interface SupplierRequest {
  id: string
  company: string
  category: string
  group: string
  status: 'DRAFT' | 'SUBMITTED' | 'L1_REVIEW' | 'L2_REVIEW' | 'APPROVED' | 'REJECTED'
  requestedBy: string
  plant: string
  createdOn: ISODate
}

export interface Db {
  tenant: Tenant
  plants: Plant[]
  vendors: Vendor[]
  parts: Part[]
  productModels: ProductModel[]
  purchaseOrders: PurchaseOrder[]
  goodsReceipts: GoodsReceipt[]
  stock: StockPosition[]
  users: UserProfile[]
  roles: RoleTemplate[]
  shipments: Shipment[]
  projects: Project[]
  signals: Signal[]
  commodities: Commodity[]
  tools: Tool[]
  capex: CapexRequest[]
  dataDrops: DataDrop[]
  valueHistory: ValueSeed[]
  costAssessments: CostAssessment[]
  supplierRequests: SupplierRequest[]
  savingsTargetsInr: Record<string, number> // per L4 commodity / category, FY
  subscriptionFeeInr: number // Nexus annual fee, for the ROI strip
}
