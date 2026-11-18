// Computed audience (spec 6.4, invariant 8): role subscription x scope overlap x delegation.
import type { Db } from '@/data/types'
import type { RoleTemplate, Severity, Signal, UserProfile } from '@/data/types'
import { DEMO_TODAY } from '@/config/demoClock'
import { fmtDay } from './format'
import { getPart, getPo, getProject, getRole, getShipment, getVendor } from './lookup'

const RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 }

// Role-template edits made in People & Roles. The store pushes them here so routing follows the edits.
let OVERRIDES: Record<string, Partial<RoleTemplate>> = {}
export const setRoleOverrides = (o: Record<string, Partial<RoleTemplate>>) => { OVERRIDES = o }

export interface SignalAttributes {
  plants: Set<string>
  purchasingGroups: Set<string>
  mrpControllers: Set<string>
  commodities: Set<string>
  projects: Set<string>
  vendors: Set<string> // LFA1-LIFNR
  customers: Set<string>
  hasShipment: boolean
}

export function signalAttributes(db: Db, signal: Signal): SignalAttributes {
  const a: SignalAttributes = { plants: new Set(), purchasingGroups: new Set(), mrpControllers: new Set(), commodities: new Set(), projects: new Set(), vendors: new Set(), customers: new Set(), hasShipment: false }
  const partCodes = new Set<string>()
  for (const r of signal.entityRefs) {
    switch (r.kind) {
      case 'plant': a.plants.add(r.id); break
      case 'vendor': a.vendors.add(getVendor(db, r.id).sapVendor); break
      case 'customer': a.customers.add(r.id); break
      case 'commodity': a.commodities.add(r.id); break
      case 'part': partCodes.add(r.id); break
      case 'project': {
        const p = getProject(db, r.id)
        a.projects.add(p.id)
        if (p.customer) a.customers.add(p.customer)
        a.plants.add(p.plant)
        break
      }
      case 'po': {
        const po = getPo(db, r.id)
        a.purchasingGroups.add(po.purchasingGroup)
        a.vendors.add(getVendor(db, po.vendorId).sapVendor)
        po.lines.forEach((l) => { a.plants.add(l.plant); partCodes.add(l.material) })
        break
      }
      case 'shipment': {
        const sh = getShipment(db, r.id)
        a.hasShipment = true
        a.plants.add(sh.plant)
        a.vendors.add(getVendor(db, sh.vendorId).sapVendor)
        sh.lines.forEach((l) => partCodes.add(l.partCode))
        break
      }
    }
  }
  for (const code of partCodes) {
    const part = getPart(db, code)
    a.commodities.add(part.commodityHierarchy.l4)
    for (const pp of part.plants) {
      if (a.plants.size === 0 || a.plants.has(pp.plant)) {
        a.purchasingGroups.add(pp.purchasingGroup)
        a.mrpControllers.add(pp.mrpController)
      }
    }
  }
  return a
}

export interface Recipient {
  userId: string
  reasons: string[]
  viaDelegationFor?: string
  onLeave?: { delegateId: string; from: string; to: string }
}

const overlap = (mine: string[], theirs: Set<string>) => mine.filter((x) => theirs.has(x))

function scopeReasons(u: UserProfile, a: SignalAttributes): string[] {
  const s = u.scope
  if (s.all) return ['Scope: all']
  const out: string[] = []
  if (s.shipmentsAll && a.hasShipment) out.push('Scope: all import shipments')
  const add = (label: string, xs: string[]) => xs.length && out.push(`${label} ${xs.join(', ')}`)
  add('Plant', overlap(s.plants, a.plants))
  add('Purchasing group', overlap(s.purchasingGroups, a.purchasingGroups))
  add('MRP controller', overlap(s.mrpControllers, a.mrpControllers))
  add('Commodity', overlap(s.commodities, a.commodities))
  add('Project', overlap(s.projects, a.projects))
  add('Vendor', overlap(s.vendors, a.vendors))
  add('Customer', overlap(s.customers, a.customers))
  return out
}

const delegationActive = (u: UserProfile) => !!u.delegate && u.delegate.from <= DEMO_TODAY && DEMO_TODAY <= u.delegate.to

export function computeAudience(db: Db, users: UserProfile[], signal: Signal): Recipient[] {
  if (signal.audienceOverride) return signal.audienceOverride.map((userId) => ({ userId, reasons: ['Added by hand (audience override)'] }))
  const a = signalAttributes(db, signal)
  const byId = new Map<string, Recipient>()

  for (const u of users) {
    const role = { ...getRole(db, u.roleId), ...OVERRIDES[u.roleId] }
    const sub = role.subscribes.find((x) => x.signalType === signal.type)
    if (!sub || RANK[signal.severity] < RANK[sub.minSeverity]) continue
    const reasons = role.function === 'Leadership' ? [`Leadership: ${signal.severity} ${signal.type.replace(/_/g, ' ')}`] : scopeReasons(u, a)
    if (!reasons.length) continue
    byId.set(u.id, { userId: u.id, reasons: reasons.map((r) => (r.startsWith('Scope') || r.startsWith('Leadership') ? r : `Scope match: ${r}`)) })
  }

  // Delegation: while a recipient is on leave, their signals also route to the delegate.
  for (const r of [...byId.values()]) {
    const u = users.find((x) => x.id === r.userId)
    if (!u || !delegationActive(u) || !u.delegate) continue
    r.onLeave = { delegateId: u.delegate.userId, from: u.delegate.from, to: u.delegate.to }
    const reason = `Delegate for ${u.name} (on leave ${fmtDay(u.delegate.from)} to ${fmtDay(u.delegate.to)})`
    const existing = byId.get(u.delegate.userId)
    if (existing) existing.reasons.push(reason)
    else byId.set(u.delegate.userId, { userId: u.delegate.userId, reasons: [reason], viaDelegationFor: u.id })
  }
  return [...byId.values()]
}

export const isInAudience = (db: Db, users: UserProfile[], signal: Signal, userId: string) =>
  computeAudience(db, users, signal).some((r) => r.userId === userId)
