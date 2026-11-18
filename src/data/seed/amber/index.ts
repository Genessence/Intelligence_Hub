import type { Db } from '@/data/types'
import { PARTS, PLANTS, PRODUCT_MODELS, PURCHASE_ORDERS, STOCK, TENANT, VENDORS } from './master'
import { USERS } from './people'
import { PROJECTS, SHIPMENTS, SIGNALS, VALUE_HISTORY } from './operations'
import { AFTER_FALL_POS, CAPEX, DATA_DROPS, GOODS_RECEIPTS, OTHER_POS, PREVIOUS_POS, TOOLS } from './procurement'
import { COMMODITIES } from './series'
import { BULK_CAPEX, BULK_GRS, BULK_MODELS, BULK_PARTS, BULK_POS, BULK_PROJECTS, BULK_SHIPMENTS, BULK_SIGNALS, BULK_STOCK, BULK_TOOLS, BULK_VALUE, BULK_VENDORS, COST_ASSESSMENTS, SUPPLIER_REQUESTS } from './bulk'
import { ROLES } from '@/config/roles'

export const AMBER: Db = {
  tenant: TENANT,
  plants: PLANTS,
  vendors: [...VENDORS, ...BULK_VENDORS],
  parts: [...PARTS, ...BULK_PARTS],
  productModels: [...PRODUCT_MODELS, ...BULK_MODELS],
  purchaseOrders: [...PURCHASE_ORDERS, ...PREVIOUS_POS, ...AFTER_FALL_POS, ...OTHER_POS, ...BULK_POS],
  goodsReceipts: [...GOODS_RECEIPTS, ...BULK_GRS],
  stock: [...STOCK, ...BULK_STOCK],
  users: USERS.map((u) => ({ ...u, tenantId: 'amber' })),
  roles: ROLES,
  shipments: [...SHIPMENTS, ...BULK_SHIPMENTS],
  projects: [...PROJECTS, ...BULK_PROJECTS],
  signals: [...SIGNALS, ...BULK_SIGNALS],
  commodities: COMMODITIES,
  tools: [...TOOLS, ...BULK_TOOLS],
  capex: [...CAPEX, ...BULK_CAPEX],
  dataDrops: DATA_DROPS,
  valueHistory: [...VALUE_HISTORY, ...BULK_VALUE.map((v, i) => ({ ...v, id: `VAL-FY27-${String(VALUE_HISTORY.length + i + 1).padStart(4, '0')}` }))],
  costAssessments: COST_ASSESSMENTS,
  supplierRequests: SUPPLIER_REQUESTS,
  savingsTargetsInr: { Copper: 2_50_00_000, Aluminium: 1_20_00_000, Compressor: 1_80_00_000, 'BLDC Motor': 60_00_000, EPS: 25_00_000, PCB: 70_00_000, Steel: 90_00_000 },
  subscriptionFeeInr: 12_00_000,
}
export type { Db }
