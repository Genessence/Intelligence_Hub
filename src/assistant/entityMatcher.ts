// Finds seeded entities mentioned in free text: ids and codes by substring, names by token overlap (with prefix fuzz).
import type { Db } from '@/data/types'

export type EntKind = 'signal' | 'shipment' | 'po' | 'part' | 'vendor' | 'project' | 'plant' | 'commodity' | 'customer' | 'model' | 'capex' | 'tool'
export interface Ent { kind: EntKind; id: string; label: string; score: number }

const STOP = new Set(['assy', 'pvt', 'ltd', 'ltd.', 'pvt.', 'co.', 'the', 'and', 'for', 'with', 'works', 'components', 'industries', 'split', 'unit', 'inverter', 'star', 'new', 'design', 'part', 'parts'])
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.\-/ ]/g, ' ')
const tokens = (s: string) => norm(s).split(/\s+/).filter((t) => t.length > 3 && !STOP.has(t))

interface Cand { kind: EntKind; id: string; label: string; codes: string[]; names: string[] }

function candidates(db: Db): Cand[] {
  const c: Cand[] = []
  db.signals.forEach((s) => c.push({ kind: 'signal', id: s.id, label: s.title, codes: [s.id], names: [] }))
  db.shipments.forEach((s) => c.push({ kind: 'shipment', id: s.ref, label: s.ref, codes: [s.ref], names: [] }))
  db.purchaseOrders.forEach((p) => c.push({ kind: 'po', id: p.ebeln, label: `PO ${p.ebeln}`, codes: [p.ebeln], names: [] }))
  db.parts.forEach((p) => c.push({ kind: 'part', id: p.code, label: p.description, codes: [p.code], names: [p.description] }))
  db.vendors.forEach((v) => c.push({ kind: 'vendor', id: v.id, label: v.name, codes: [v.sapVendor, ...v.aliases.filter((a) => /\d/.test(a.code)).map((a) => a.code)], names: [v.name, ...v.aliases.filter((a) => !/\d/.test(a.code)).map((a) => a.code)] }))
  db.projects.forEach((p) => c.push({ kind: 'project', id: p.id, label: p.title, codes: [p.id], names: [p.title] }))
  db.plants.forEach((p) => c.push({ kind: 'plant', id: p.sapPlant, label: `${p.name} (${p.sapPlant})`, codes: [], names: [p.name, p.city] }))
  db.commodities.forEach((m) => c.push({ kind: 'commodity', id: m.slug, label: m.name, codes: [], names: [m.slug, m.name.replace(/^LME /, '')] }))
  db.productModels.forEach((m) => c.push({ kind: 'model', id: m.id, label: m.name, codes: [m.id], names: [m.name] }))
  db.capex.forEach((x) => c.push({ kind: 'capex', id: x.no, label: x.title, codes: [x.no], names: [] }))
  db.tools.forEach((t) => c.push({ kind: 'tool', id: t.id, label: t.title, codes: [t.id], names: [] }))
  const customers = new Set([...db.projects.map((p) => p.customer), ...db.productModels.map((m) => m.customer)].filter(Boolean) as string[])
  customers.forEach((n) => c.push({ kind: 'customer', id: n, label: n, codes: [], names: [n] }))
  return c
}

const cache = new WeakMap<Db, Cand[]>()

export function matchEntities(db: Db, text: string): Ent[] {
  if (!cache.has(db)) cache.set(db, candidates(db))
  const q = norm(text)
  const qt = tokens(text)
  const out: Ent[] = []
  for (const c of cache.get(db)!) {
    let score = 0
    for (const code of c.codes) if (code && q.includes(code.toLowerCase())) score = Math.max(score, 1)
    for (const name of c.names) {
      const nt = tokens(name)
      if (!nt.length) {
        if (name.length > 2 && new RegExp(`\\b${name.toLowerCase()}\\b`).test(q)) score = Math.max(score, 0.9)
        continue
      }
      const hit = nt.filter((t) => qt.some((w) => w === t || (w.length >= 5 && t.length >= 5 && (w.startsWith(t.slice(0, 5)) || t.startsWith(w.slice(0, 5))))))
      if (hit.length) score = Math.max(score, hit.length / nt.length)
    }
    if (score >= 0.5) out.push({ kind: c.kind, id: c.id, label: c.label, score })
  }
  return out.sort((a, b) => b.score - a.score)
}

export const firstOf = (ents: Ent[], kind: EntKind) => ents.find((e) => e.kind === kind)
