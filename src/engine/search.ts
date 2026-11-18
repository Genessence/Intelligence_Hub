// Global search index for the command palette: records, people and pages in the current tenant.
import type { Db, Signal, UserProfile } from '@/data/types'

export interface SearchItem { kind: string; label: string; sub: string; href: string; key: string }

const PAGES: [string, string][] = [
  ['Command Center', '/command'], ['Signal Inbox', '/signals'], ['Nexus Assistant', '/assistant'], ['Value Ledger', '/value'],
  ['App Launcher', '/apps'], ['Source Hub', '/sources'], ['SAP Field Explorer', '/sources/sap/fields'], ['Bring Your Data', '/sources/new'],
  ['Data Fabric', '/fabric'], ['Rules', '/rules'], ['Audit Trail', '/audit'], ['People & Roles', '/admin/people'], ['My Profile', '/me'], ['Mobile App Preview', '/mobile'],
]

export function buildIndex(db: Db, users: UserProfile[], signals: Signal[]): SearchItem[] {
  const it = (kind: string, label: string, sub: string, href: string): SearchItem => ({ kind, label, sub, href, key: `${label} ${sub}`.toLowerCase() })
  return [
    ...signals.map((s) => it('Signal', s.title, s.id, `/signals/${s.id}`)),
    ...db.parts.map((p) => it('Part', p.description, `${p.code} · L4 ${p.commodityHierarchy.l4}`, `/parts/${p.code}`)),
    ...db.vendors.map((v) => it('Vendor', v.name, `${v.sapVendor} · ${v.category} ${v.aliases.map((a) => a.code).join(' ')}`, `/vendors/${v.id}`)),
    ...db.projects.map((p) => it('Project', p.title, `${p.id} · ${p.stage}`, `/projects/${p.id}`)),
    ...db.shipments.map((s) => it('Shipment', s.ref, `${s.pol} to ${s.pod}`, `/shipments/${s.ref}`)),
    ...db.purchaseOrders.map((p) => it('PO', `PO ${p.ebeln}`, `${p.lines[0].material} · ${p.purchasingGroup}`, `/parts/${p.lines[0].material}`)),
    ...db.plants.map((p) => it('Plant', p.name, `${p.sapPlant} · ${p.state}`, `/plants/${p.sapPlant}`)),
    ...db.commodities.map((c) => it('Commodity', c.name, c.unit, `/commodities/${c.slug}`)),
    ...db.productModels.map((m) => it('Model', m.name, `${m.id} · ${m.customer}`, `/models/${m.id}`)),
    ...users.map((u) => it('Person', u.name, u.title, '/admin/people')),
    ...PAGES.map(([l, h]) => it('Page', l, h, h)),
  ]
}

/** All query words must appear; earlier matches in the label rank higher. */
export function search(index: SearchItem[], q: string, limit = 12): SearchItem[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return index.filter((i) => i.kind === 'Page' || i.kind === 'Signal').slice(0, limit)
  return index
    .filter((i) => words.every((w) => i.key.includes(w)))
    .map((i) => ({ i, s: i.label.toLowerCase().indexOf(words[0]) }))
    .sort((a, b) => (a.s < 0 ? 999 : a.s) - (b.s < 0 ? 999 : b.s))
    .slice(0, limit)
    .map((x) => x.i)
}
