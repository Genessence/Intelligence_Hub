import { useTheme } from '@/theme/ThemeProvider'
import { cx } from './ui/primitives'

/** Nexus 3.0 (default) or Classic. Same data and screens, different design language. */
export function UiToggle({ large = false }: { large?: boolean }) {
  const { ui, setUi } = useTheme()
  const opts = [
    { v: 'apple' as const, label: 'Nexus 3.0' },
    { v: 'classic' as const, label: 'Classic' },
  ]
  return (
    <div role="radiogroup" aria-label="Interface style" className={cx('relative flex items-center rounded-[9px] bg-surface-2 p-0.5', large ? 'h-10' : 'h-8')}>
      {opts.map((o) => (
        <button key={o.v} role="radio" aria-checked={ui === o.v} onClick={() => setUi(o.v)}
          className={cx('inline-flex h-full items-center rounded-[7px] transition-all duration-200', large ? 'px-4 text-sm' : 'px-3 text-xs', ui === o.v ? 'bg-surface font-semibold text-ink shadow-card' : 'text-ink-2 hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
