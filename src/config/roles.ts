import type { RoleTemplate, Severity, SignalType } from '@/data/types'

// 22 role templates (spec 6.1). Subscriptions drive the computed audience (6.4).
// defaultKpis reference the KPI catalogue that lands in M2.

const sub = (min: Severity, ...types: SignalType[]) => types.map((signalType) => ({ signalType, minSeverity: min }))
const ALL: SignalType[] = ['shipment_delay', 'commodity_spike', 'tool_trial_fail', 'supplier_quality', 'demand_uplift', 'pass_through', 'ecn_obsolescence', 'vendor_compliance', 'capex_delay']

export const ROLES: RoleTemplate[] = [
  // Leadership: severity match only, scope all.
  { id: 'md', name: 'Managing Director', function: 'Leadership', subscribes: sub('critical', ...ALL), defaultKpis: ['value_fytd', 'roi', 'launches_at_risk', 'inr_at_risk', 'critical_open', 'decision_latency'], landing: '/', permissions: ['all'], approvals: [{ type: 'capex' }, { type: 'value_validation' }] },
  { id: 'cfo', name: 'CFO', function: 'Leadership', subscribes: sub('high', 'commodity_spike', 'pass_through', 'ecn_obsolescence', 'capex_delay'), defaultKpis: ['value_fytd', 'value_awaiting_validation', 'commodity_exposure', 'pass_through_recoverable', 'qi_blocked_value', 'capex_util'], landing: '/', permissions: ['all'], approvals: [{ type: 'value_validation' }, { type: 'capex' }] },
  { id: 'coo', name: 'COO', function: 'Leadership', subscribes: sub('high', 'shipment_delay', 'tool_trial_fail', 'supplier_quality', 'demand_uplift', 'capex_delay'), defaultKpis: ['launches_at_risk', 'shipments_delayed', 'critical_below_cover', 'decision_latency'], landing: '/', permissions: ['all'], approvals: [{ type: 'capex', limitInr: 5_00_00_000 }] },
  // Sourcing
  { id: 'head_sourcing', name: 'Head of Sourcing', function: 'Sourcing', subscribes: sub('medium', 'commodity_spike', 'pass_through', 'supplier_quality', 'vendor_compliance', 'shipment_delay', 'ecn_obsolescence'), defaultKpis: ['savings_vs_target', 'commodity_exposure', 'pass_through_recoverable', 'price_lock_savings'], landing: '/signals', permissions: ['sourcing', 'cost'], approvals: [{ type: 'price_lock' }, { type: 'sap_write_back' }] },
  { id: 'category_manager', name: 'Category Manager', function: 'Sourcing', subscribes: sub('medium', 'commodity_spike', 'pass_through', 'supplier_quality', 'vendor_compliance'), defaultKpis: ['savings_vs_target', 'pass_through_recoverable', 'commodity_exposure', 'supplier_ppm'], landing: '/signals', permissions: ['sourcing'], approvals: [{ type: 'price_lock', limitInr: 50_00_000 }] },
  { id: 'buyer', name: 'Buyer', function: 'Sourcing', subscribes: sub('medium', 'commodity_spike', 'pass_through', 'shipment_delay', 'ecn_obsolescence', 'vendor_compliance'), defaultKpis: ['price_lock_savings', 'commodity_exposure', 'shipments_delayed', 'inr_at_risk'], landing: '/signals', permissions: ['sourcing'], approvals: [] },
  // Cost
  { id: 'cost_engineer', name: 'Cost Engineer', function: 'Cost', subscribes: sub('medium', 'commodity_spike', 'pass_through'), defaultKpis: ['commodity_exposure', 'pass_through_recoverable', 'price_lock_savings', 'savings_vs_target'], landing: '/commodities/me', permissions: ['cost'], approvals: [] },
  // NPD / R&D
  { id: 'head_rnd', name: 'Head of R&D / NPD', function: 'NPD / R&D', subscribes: sub('high', 'shipment_delay', 'tool_trial_fail', 'commodity_spike', 'supplier_quality', 'ecn_obsolescence'), defaultKpis: ['launches_at_risk', 'gate_slip', 'blockers_open', 'obsolescence_avoided'], landing: '/signals', permissions: ['npd', 'rnd', 'tooling'], approvals: [{ type: 'ecn_change' }] },
  { id: 'npd_pm', name: 'NPD Project Manager', function: 'NPD / R&D', subscribes: sub('medium', 'shipment_delay', 'tool_trial_fail', 'commodity_spike', 'supplier_quality', 'ecn_obsolescence'), defaultKpis: ['gate_slip', 'blockers_open', 'launches_at_risk', 'inr_at_risk'], landing: '/signals', permissions: ['npd', 'rnd'], approvals: [] },
  { id: 'design_engineer', name: 'Design Engineer', function: 'NPD / R&D', subscribes: sub('high', 'tool_trial_fail', 'ecn_obsolescence'), defaultKpis: ['blockers_open', 'days_to_cutin', 'gate_slip', 'critical_open'], landing: '/signals', permissions: ['npd'], approvals: [] },
  // Tooling
  { id: 'tooling_engineer', name: 'Tooling Engineer', function: 'Tooling', subscribes: sub('medium', 'tool_trial_fail', 'capex_delay'), defaultKpis: ['gate_slip', 'blockers_open', 'penalty_avoided', 'critical_open'], landing: '/signals', permissions: ['tooling'], approvals: [] },
  // EXIM
  { id: 'exim_manager', name: 'EXIM Manager', function: 'EXIM', subscribes: sub('medium', 'shipment_delay'), defaultKpis: ['shipments_delayed', 'penalty_avoided', 'inr_at_risk', 'decision_latency'], landing: '/signals', permissions: ['exim'], approvals: [{ type: 'air_freight', limitInr: 10_00_000 }] },
  { id: 'exim_executive', name: 'EXIM Executive', function: 'EXIM', subscribes: sub('medium', 'shipment_delay'), defaultKpis: ['shipments_delayed', 'inr_at_risk', 'critical_open', 'decision_latency'], landing: '/signals', permissions: ['exim'], approvals: [] },
  // Quality
  { id: 'head_quality', name: 'Head of Quality', function: 'Quality', subscribes: sub('high', 'supplier_quality', 'tool_trial_fail'), defaultKpis: ['supplier_ppm', 'qi_blocked_value', 'value_fytd', 'critical_open'], landing: '/signals', permissions: ['quality'], approvals: [{ type: 'deviation' }] },
  { id: 'sqe', name: 'Supplier Quality Engineer', function: 'Quality', subscribes: sub('medium', 'supplier_quality', 'vendor_compliance'), defaultKpis: ['supplier_ppm', 'qi_blocked_value', 'critical_open', 'inr_at_risk'], landing: '/signals', permissions: ['quality'], approvals: [] },
  // Planning & plant
  { id: 'planner', name: 'Supply Chain Planner (PPC)', function: 'Planning & plant', subscribes: sub('medium', 'shipment_delay', 'demand_uplift', 'ecn_obsolescence', 'supplier_quality'), defaultKpis: ['stock_cover', 'critical_below_cover', 'shipments_delayed', 'days_to_cutin'], landing: '/signals', permissions: ['planning'], approvals: [] },
  { id: 'plant_head', name: 'Plant Head', function: 'Planning & plant', subscribes: sub('high', 'shipment_delay', 'supplier_quality', 'capex_delay', 'demand_uplift'), defaultKpis: ['critical_below_cover', 'supplier_ppm', 'capex_on_time', 'inr_at_risk'], landing: '/plants/me', permissions: ['plant'], approvals: [{ type: 'capex', limitInr: 10_00_000 }] },
  { id: 'stores', name: 'Stores In-charge', function: 'Planning & plant', subscribes: sub('medium', 'ecn_obsolescence', 'shipment_delay'), defaultKpis: ['stock_cover', 'qi_blocked_value', 'days_to_cutin', 'critical_open'], landing: '/signals', permissions: ['plant'], approvals: [] },
  // Finance
  { id: 'finance_controller', name: 'Finance Controller / AP', function: 'Finance', subscribes: sub('high', 'pass_through', 'ecn_obsolescence'), defaultKpis: ['value_awaiting_validation', 'value_validated', 'qi_blocked_value', 'roi'], landing: '/signals', permissions: ['finance'], approvals: [{ type: 'value_validation' }] },
  // Customer
  { id: 'kam', name: 'Key Account Manager', function: 'Customer', subscribes: sub('high', 'shipment_delay', 'tool_trial_fail', 'commodity_spike'), defaultKpis: ['revenue_protected', 'launches_at_risk', 'inr_at_risk', 'critical_open'], landing: '/signals', permissions: ['customer'], approvals: [] },
  // Admin
  { id: 'it_admin', name: 'SAP / IT Admin', function: 'Admin', subscribes: [], defaultKpis: ['decision_latency', 'critical_open', 'value_fytd', 'inr_at_risk'], landing: '/signals', permissions: ['admin'], approvals: [{ type: 'sap_write_back' }] },
  // External
  { id: 'vendor', name: 'Vendor', function: 'External', subscribes: [], defaultKpis: [], landing: '/signals', permissions: [], approvals: [], status: 'Roadmap' },
]

export const roleById = (id: string) => {
  const r = ROLES.find((x) => x.id === id)
  if (!r) throw new Error(`Unknown role ${id}`)
  return r
}
