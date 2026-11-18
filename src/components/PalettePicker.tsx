import { useEffect, useRef, useState } from 'react'
import { Check, Palette as PaletteIcon } from 'lucide-react'
import { PALETTES, useTheme } from '@/theme/ThemeProvider'
import { cx } from './ui/primitives'

/** Swatch shows the palette's own accent and brand panel, read from tokens scoped to that palette. */
const Swatch = ({ id, size = 22 }: { id: string; size?: number }) => (
  <span data-palette={id} className="inline-flex shrink-0 overflow-hidden rounded-full border border-line" style={{ width: size, height: size }} aria-hidden>
    <span className="h-full w-1/2" style={{ background: 'var(--brand-panel)' }} />
    <span className="h-full w-1/2" style={{ background: 'var(--accent)' }} />
  </span>
)

export function PalettePicker({ inline = false }: { inline?: boolean }) {
  const { palette, setPalette } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const on = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', on)
    return () => document.removeEventListener('mousedown', on)
  }, [])
  const list = (
    <div role="radiogroup" aria-label="Colour scheme" className={cx(inline ? 'flex flex-wrap gap-2' : 'space-y-0.5 p-1')}>
      {PALETTES.map((p) => inline ? (
        <button key={p.id} role="radio" aria-checked={palette === p.id} onClick={() => setPalette(p.id)} title={`${p.name}: ${p.hint}`}
          className={cx('inline-flex h-9 items-center gap-2 rounded-full border px-2.5 text-xs font-medium transition', palette === p.id ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink-2 hover:text-ink')}>
          <Swatch id={p.id} size={18} /> {p.name}
        </button>
      ) : (
        <button key={p.id} role="radio" aria-checked={palette === p.id} onClick={() => { setPalette(p.id); setOpen(false) }}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-surface-2">
          <Swatch id={p.id} />
          <span className="min-w-0 flex-1 leading-tight"><span className="block text-sm text-ink">{p.name}</span><span className="block text-xs text-ink-3">{p.hint}</span></span>
          {palette === p.id && <Check size={15} className="text-accent-ink" />}
        </button>
      ))}
    </div>
  )
  if (inline) return list
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open} aria-label="Colour scheme" title="Colour scheme"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:text-ink">
        <PaletteIcon size={15} />
      </button>
      {open && <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-pop"><div className="border-b border-line px-3 py-2 text-xs font-medium text-ink-3">Colour scheme</div>{list}</div>}
    </div>
  )
}
