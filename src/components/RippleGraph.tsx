import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Boxes, Building2, FileText, Gauge, Package, Ship, Users, X, Zap, FolderKanban, Handshake, Factory, Wrench, Cog, Layers } from 'lucide-react'
import { COLUMNS, type NodeKind, type RippleEdge, type RippleNode } from '@/engine/ripple'
import { cx, SapRef } from './ui/primitives'

const NODE_W = 150
const NODE_H = 64
const PEOPLE_H = 44
const COL_GAP = 228 // leaves room for wrapped edge labels between columns
const ROW_GAP = 80
const PEOPLE_GAP = 54
const TOP = 40
const LABEL_W = COL_GAP - NODE_W - 6

const ICON: Record<NodeKind, typeof Ship> = { signal: Zap, shipment: Ship, po: FileText, vendor: Handshake, commodity: Gauge, part: Package, project: FolderKanban, plant: Factory, customer: Building2, people: Users, tool: Wrench, capex: Cog, model: Layers }
const TONE: Record<NonNullable<RippleNode['tone']>, { stroke: string; fill: string; ink: string }> = {
  critical: { stroke: 'var(--critical)', fill: 'var(--critical-bg)', ink: 'var(--critical)' },
  attention: { stroke: 'var(--attention)', fill: 'var(--attention-bg)', ink: 'var(--attention)' },
  info: { stroke: 'var(--info)', fill: 'var(--info-bg)', ink: 'var(--info)' },
  neutral: { stroke: 'var(--border-strong)', fill: 'var(--surface)', ink: 'var(--text-2)' },
}

export function RippleGraph({ nodes, edges }: { nodes: RippleNode[]; edges: RippleEdge[] }) {
  const [open, setOpen] = useState<RippleNode | null>(null)
  const layout = useMemo(() => {
    const byCol = new Map<number, RippleNode[]>()
    nodes.forEach((n) => byCol.set(n.col, [...(byCol.get(n.col) ?? []), n]))
    const span = (list: RippleNode[]) => (list[0]?.kind === 'people' ? list.length * PEOPLE_GAP : list.length * ROW_GAP)
    const inner = Math.max(...[...byCol.values()].map(span))
    const height = TOP + inner + 10
    const pos = new Map<string, { x: number; y: number; h: number }>()
    for (const [col, list] of byCol) {
      const people = list[0]?.kind === 'people'
      const gap = people ? PEOPLE_GAP : ROW_GAP
      const offset = (inner - span(list)) / 2
      list.forEach((n, i) => pos.set(n.id, { x: 12 + col * COL_GAP, y: TOP + offset + i * gap, h: people ? PEOPLE_H : NODE_H }))
    }
    return { pos, height, width: 12 + (COLUMNS.length - 1) * COL_GAP + NODE_W + 12 }
  }, [nodes])

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height} className="min-w-full" role="img" aria-label="Ripple graph from the signal to the people it affects">
        {COLUMNS.map((c, i) => (
          <text key={c} x={12 + i * COL_GAP} y={16} fontSize={12} fill="var(--text-3)" fontWeight={500}>{c}</text>
        ))}
        {edges.map((e, i) => {
          const a = layout.pos.get(e.from)
          const b = layout.pos.get(e.to)
          if (!a || !b) return null
          const x1 = a.x + NODE_W
          const y1 = a.y + a.h / 2
          const x2 = b.x
          const y2 = b.y + b.h / 2
          const mx = (x1 + x2) / 2
          const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="var(--border-strong)" strokeWidth={1.5} className="edge-draw" style={{ ['--len' as string]: 400, animationDelay: `${(layout.pos.get(e.from)!.x / COL_GAP) * 140}ms` }} />
              {e.label && (
                <foreignObject x={mx - LABEL_W / 2} y={(y1 + y2) / 2 - 26} width={LABEL_W} height={52}>
                  <div className="flex h-full items-center justify-center">
                    <span className="line-clamp-3 rounded bg-surface px-1 text-center text-[12px] leading-4 text-ink-2" title={e.label}>{e.label}</span>
                  </div>
                </foreignObject>
              )}
            </g>
          )
        })}
        {nodes.map((n) => {
          const p = layout.pos.get(n.id)!
          const t = TONE[n.tone ?? 'neutral']
          const Icon = ICON[n.kind]
          return (
            <g key={n.id} className="node-rise cursor-pointer" style={{ animationDelay: `${n.col * 140}ms` }} onClick={() => setOpen(n)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(n)} tabIndex={0} role="button" aria-label={`${n.label}. ${n.sub}`}>
              <rect x={p.x} y={p.y} width={NODE_W} height={p.h} rx={10} fill={t.fill} stroke={t.stroke} strokeWidth={n.tone && n.tone !== 'neutral' ? 1.5 : 1} />
              <foreignObject x={p.x} y={p.y} width={NODE_W} height={p.h}>
                <div className="flex h-full items-center gap-2 px-2.5">
                  <Icon size={16} style={{ color: t.ink }} className="shrink-0" aria-hidden />
                  <div className="min-w-0 leading-tight">
                    <div className={cx(n.kind === 'people' ? 'truncate' : 'line-clamp-2', 'text-xs font-semibold text-ink')} title={n.label}>{n.label}</div>
                    <div className="truncate text-[12px] text-ink-2" title={n.sub}>{n.sub}</div>
                  </div>
                </div>
              </foreignObject>
            </g>
          )
        })}
      </svg>
      <NodeSheet node={open} onClose={() => setOpen(null)} />
    </div>
  )
}

/** Route to the 360 view (or module page) for a ripple node; undefined when there is none. */
function hrefFor(n: RippleNode): string | undefined {
  const id = n.id.slice(n.id.indexOf(':') + 1)
  const map: Partial<Record<NodeKind, string>> = {
    part: `/parts/${id}`, shipment: `/shipments/${id}`, vendor: `/vendors/${id}`, commodity: `/commodities/${id.toLowerCase()}`,
    project: `/projects/${id}`, plant: `/plants/${id}`, model: `/models/${id}`, people: '/admin/people', tool: '/apps/tooling', capex: '/apps/capex',
  }
  return map[n.kind]
}

function NodeSheet({ node, onClose }: { node: RippleNode | null; onClose: () => void }) {
  const Icon = node ? ICON[node.kind] : Boxes
  return (
    <Dialog.Root open={!!node} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40" style={{ background: 'var(--overlay)' }} />
        <Dialog.Content className="page-enter fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-pop">
          {node && (
            <>
              <div className="flex items-start gap-3 border-b border-line p-5">
                <span className="mt-0.5 inline-flex size-8 items-center justify-center rounded-lg bg-surface-2"><Icon size={16} className="text-ink-2" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">{node.kind}</div>
                  <Dialog.Title className="text-base font-semibold text-ink">{node.label}</Dialog.Title>
                  <Dialog.Description className="text-sm text-ink-2">{node.sub}</Dialog.Description>
                </div>
                <Dialog.Close className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close"><X size={18} /></Dialog.Close>
              </div>
              <dl className="flex-1 divide-y divide-line overflow-y-auto px-5">
                {node.detail.length === 0 && <p className="py-4 text-sm text-ink-2">No extra fields for this node.</p>}
                {node.detail.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <dt className="flex items-center gap-2 text-ink-2">{d.label}{d.field && <SapRef code={d.field} />}</dt>
                    <dd className="num text-right text-ink">{d.value}</dd>
                  </div>
                ))}
              </dl>
              {hrefFor(node) && (
                <div className="border-t border-line p-4">
                  <Link to={hrefFor(node)!} onClick={onClose} className="inline-flex h-9 w-full items-center justify-center rounded-[var(--radius-ctl)] bg-accent-strong text-sm font-medium text-on-accent hover:bg-accent-strong-hover">Open 360 view</Link>
                </div>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
