import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GitMerge, Split } from 'lucide-react'
import { useDb, useNexus } from '@/store/useNexus'
import type { Vendor } from '@/data/types'
import { KPIS } from '@/engine/kpis'
import { PageHeader } from '@/components/Shell'
import { Button, Card, cx, SapRef, SimulatedTag, SOURCE_LABEL } from '@/components/ui/primitives'

/** Token-overlap similarity between two names, 0 to 1. Good enough to rank candidates for a human. */
function similarity(a: string, b: string) {
  const t = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['pvt', 'ltd', 'the'].includes(w)))
  const x = t(a), y = t(b)
  const inter = [...x].filter((w) => y.has(w)).length
  return inter / Math.max(1, Math.min(x.size, y.size))
}

const aliasConfidence = (v: Vendor, alias: { sourceId: string; code: string }) => (alias.sourceId === 'excel' ? similarity(v.name, alias.code) : 1)

export function DataFabric() {
  const db = useDb()
  const { fabricDecisions, decideFabric } = useNexus()
  const [kpiId, setKpiId] = useState(KPIS[0].id)
  const kpi = KPIS.find((k) => k.id === kpiId)!
  const resolved = db.vendors.filter((v) => v.aliases.length > 0)
  // Conflicts: two different SAP vendors whose names look alike. A human decides; Nexus never merges these on its own.
  const conflicts: { a: Vendor; b: Vendor; score: number; key: string }[] = []
  for (let i = 0; i < db.vendors.length; i++) for (let j = i + 1; j < db.vendors.length; j++) {
    const s = similarity(db.vendors[i].name, db.vendors[j].name)
    if (s >= 0.5) conflicts.push({ a: db.vendors[i], b: db.vendors[j], score: s, key: `${db.vendors[i].id}|${db.vendors[j].id}` })
  }
  const label = (id: string) => (id === 'excel' ? 'Excel data drop' : SOURCE_LABEL[id as keyof typeof SOURCE_LABEL] ?? id)
  return (
    <>
      <PageHeader title="Data Fabric" sub="How Nexus turns every system into one model: three doors in, canonical entities, a signal engine, and people with actions." />
      <Card title="Architecture" pad={false}><div className="overflow-x-auto p-4"><Diagram modules={db.tenant.modules.filter((m) => m.status !== 'Roadmap').length} /></div></Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Entity resolution: vendors" action={<span className="text-xs text-ink-3">{resolved.length} golden records with aliases</span>}>
          <ul className="space-y-3">
            {resolved.map((v) => (
              <li key={v.id} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-ink">{v.name}</span><span className="font-mono text-xs text-ink-2">{v.sapVendor}</span><SapRef code="LFA1-LIFNR" /></div>
                <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                  {v.aliases.map((a) => {
                    const c = aliasConfidence(v, a)
                    return <li key={a.code} className="rounded-md border border-line bg-surface-2 px-2 py-1"><span className="text-ink-3">{label(a.sourceId)}:</span> <span className="font-mono text-ink">{a.code}</span> <span className={cx('num ml-1', c >= 0.9 ? 'text-ink-2' : 'text-attention')}>{Math.round(c * 100)}%</span></li>
                  })}
                </ul>
              </li>
            ))}
          </ul>
          {conflicts.map((c) => (
            <div key={c.key} className="mt-4 rounded-lg border border-attention bg-attention-bg p-3">
              <div className="text-sm font-medium text-attention">Needs a human: possible duplicate ({Math.round(c.score * 100)}% name match)</div>
              <div className="mt-1 text-sm text-ink">{c.a.name} <span className="font-mono text-xs text-ink-2">{c.a.sapVendor}</span> and {c.b.name} <span className="font-mono text-xs text-ink-2">{c.b.sapVendor}</span></div>
              <div className="mt-0.5 text-xs text-ink-2">Categories: {c.a.category} and {c.b.category}. Different SAP vendor numbers.</div>
              {fabricDecisions[c.key] ? <div className="mt-2 text-sm text-ink">{fabricDecisions[c.key] === 'merged' ? 'Merged into one golden record.' : 'Kept as separate vendors.'}</div> : (
                <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => decideFabric(c.key, 'merged')}><GitMerge size={14} /> Merge</Button><Button size="sm" variant="primary" onClick={() => decideFabric(c.key, 'separate')}><Split size={14} /> Keep separate</Button></div>
              )}
            </div>
          ))}
          <p className="mt-3 text-xs text-ink-3">Module codes match on the shared key. Names from Excel files are fuzzy-matched and shown with their confidence. <SimulatedTag what="matching service" /></p>
        </Card>
        <Card className="lg:col-span-2" title="Lineage">
          <label className="text-xs text-ink-3" htmlFor="kpi">Pick a KPI</label>
          <select id="kpi" value={kpiId} onChange={(e) => setKpiId(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink">{KPIS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
          <ol className="mt-4 space-y-3 border-l border-line pl-4 text-sm">
            <li><div className="text-xs text-ink-3">Sources and fields</div><div className="text-ink">{kpi.sourceFields}</div></li>
            <li><div className="text-xs text-ink-3">Computed by</div><div className="font-mono text-xs text-ink">src/engine/kpis.ts · {kpi.id}</div></li>
            <li><div className="text-xs text-ink-3">Good direction</div><div className="text-ink">{kpi.goodDirection === 'up' ? 'Higher is better' : 'Lower is better'}</div></li>
            <li><div className="text-xs text-ink-3">Drills into</div><Link to={kpi.drill} className="text-accent-ink hover:underline">{kpi.drill}</Link></li>
          </ol>
        </Card>
      </div>
    </>
  )
}

function Diagram({ modules }: { modules: number }) {
  const col = (x: number, title: string, items: string[], tone: string) => (
    <g>
      <text x={x} y={18} fontSize={12} fontWeight={600} fill="var(--text-2)">{title}</text>
      {items.map((t, i) => (
        <g key={t}>
          <rect x={x} y={32 + i * 46} width={170} height={36} rx={8} fill="var(--surface-2)" stroke={tone} />
          <text x={x + 12} y={55 + i * 46} fontSize={12} fill="var(--text)">{t}</text>
        </g>
      ))}
    </g>
  )
  const arrows = [200, 430, 660].map((x) => <path key={x} d={`M${x},140 L${x + 24},140`} stroke="var(--border-strong)" strokeWidth={2} markerEnd="url(#arr)" />)
  return (
    <svg viewBox="0 0 900 290" width={900} height={290} role="img" aria-label="Sources feed canonical entities, which feed the signal engine, which routes to people and actions">
      <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--border-strong)" /></marker></defs>
      {col(20, 'Three doors in', [`Genessence modules (${modules})`, 'SAP S/4HANA', 'Other connectors', 'Data drops (Excel, CSV)'], 'var(--src-sap)')}
      {col(240, 'Canonical entities', ['Part, Vendor, Plant', 'PO, GRN, Stock', 'Shipment, Project, Tool', 'Commodity, Demand'], 'var(--border-strong)')}
      {col(470, 'Signal engine', ['Rules and thresholds', 'Ripple through join keys', 'Impact in ₹ and days', 'Computed audience'], 'var(--accent)')}
      {col(700, 'People and actions', ['Pop-ups and inbox', 'Workflows and write-back', 'Value Ledger', 'Nexus Assistant'], 'var(--info)')}
      {arrows}
    </svg>
  )
}
