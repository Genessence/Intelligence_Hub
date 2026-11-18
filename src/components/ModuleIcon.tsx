import { BarChart3, Box, Building2, Container, Database, Factory, FileSpreadsheet, FlaskConical, ShieldCheck, Wrench } from 'lucide-react'
import type { SourceId } from '@/data/types'
import { SOURCE_LABEL } from './ui/primitives'

// Identity family: a module is shown only as a rounded icon tile with a glyph (spec 3.4).
const MAP: Record<SourceId, { icon: typeof Box; color: string; ink?: string }> = {
  exim: { icon: Container, color: 'var(--id-exim)' },
  cost: { icon: BarChart3, color: 'var(--id-cost)' },
  npd: { icon: Box, color: 'var(--id-npd)' },
  tooling: { icon: Wrench, color: 'var(--id-tooling)' },
  vendor: { icon: Building2, color: 'var(--id-vendor)', ink: 'var(--id-vendor-ink)' },
  capex: { icon: Factory, color: 'var(--id-capex)', ink: 'var(--id-capex-ink)' },
  rnd: { icon: FlaskConical, color: 'var(--id-rnd)' },
  sap: { icon: Database, color: 'var(--id-sap)' },
  quality: { icon: ShieldCheck, color: 'var(--id-quality)' },
  datadrop: { icon: FileSpreadsheet, color: 'var(--id-datadrop)' },
}

export function ModuleIcon({ id, size = 20 }: { id: SourceId; size?: 20 | 26 }) {
  const m = MAP[id]
  return (
    <span className="inline-flex shrink-0 items-center justify-center" title={SOURCE_LABEL[id]} aria-label={SOURCE_LABEL[id]}
      style={{ width: size, height: size, borderRadius: size === 26 ? 8 : 6, background: m.color, color: m.ink ?? 'white' }}>
      <m.icon size={size === 26 ? 15 : 12} strokeWidth={2.2} aria-hidden />
    </span>
  )
}
