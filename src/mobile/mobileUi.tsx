// Mobile primitives: swipe rows, swipe-to-approve, bottom sheet, status bar.
import { useRef, useState, type ReactNode } from 'react'
import { BatteryFull, ChevronRight, SignalHigh, Wifi } from 'lucide-react'
import { cx } from '@/components/ui/primitives'

/** Horizontal swipe with two actions. Right reveals `right`, left reveals `left`. Threshold 80px. */
export function SwipeRow({ children, onSwipeRight, onSwipeLeft, rightLabel, leftLabel }: { children: ReactNode; onSwipeRight?: () => void; onSwipeLeft?: () => void; rightLabel?: string; leftLabel?: string }) {
  const [dx, setDx] = useState(0)
  const start = useRef<number | null>(null)
  const moved = useRef(false)
  const end = () => {
    if (dx > 80) onSwipeRight?.()
    if (dx < -80) onSwipeLeft?.()
    setDx(0)
    start.current = null
  }
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-semibold">
        <span className="text-accent-ink">{dx > 20 ? rightLabel : ''}</span>
        <span className="text-attention">{dx < -20 ? leftLabel : ''}</span>
      </div>
      <div
        className={cx('relative touch-pan-y bg-surface', start.current === null && 'transition-transform duration-200')}
        style={{ transform: `translateX(${dx}px)`, background: dx > 20 ? 'var(--accent-soft)' : dx < -20 ? 'var(--attention-bg)' : undefined }}
        onPointerDown={(e) => { start.current = e.clientX; moved.current = false }}
        onPointerMove={(e) => { if (start.current === null) return; const d = e.clientX - start.current; if (Math.abs(d) > 6) moved.current = true; setDx(Math.max(-120, Math.min(120, d))) }}
        onPointerUp={end}
        onPointerLeave={() => start.current !== null && end()}
        onClickCapture={(e) => { if (moved.current) { e.stopPropagation(); e.preventDefault() } }}
      >
        <div style={{ background: 'var(--surface)', opacity: dx ? 0.92 : 1 }}>{children}</div>
      </div>
    </div>
  )
}

/** Drag the knob to the end to confirm. Keyboard: Enter on the knob confirms. */
export function SwipeToApprove({ label = 'Swipe to approve', onApprove, disabled }: { label?: string; onApprove: () => void; disabled?: boolean }) {
  const track = useRef<HTMLDivElement>(null)
  const [x, setX] = useState(0)
  const start = useRef<number | null>(null)
  const max = () => (track.current?.clientWidth ?? 280) - 52
  const done = () => { if (x >= max() - 8) onApprove(); setX(0); start.current = null }
  return (
    <div ref={track} className={cx('relative h-13 select-none rounded-full border border-line bg-surface-2', disabled && 'opacity-50')} style={{ height: 52 }}>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-ink-2">{label}</span>
      <button
        type="button" disabled={disabled} aria-label={label}
        onKeyDown={(e) => { if (e.key === 'Enter') onApprove() }}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); start.current = e.clientX - x }}
        onPointerMove={(e) => { if (start.current === null) return; setX(Math.max(0, Math.min(max(), e.clientX - start.current))) }}
        onPointerUp={done}
        className={cx('absolute top-1 left-1 flex size-11 items-center justify-center rounded-full bg-accent-strong text-on-accent shadow-card', start.current === null && 'transition-transform duration-200')}
        style={{ transform: `translateX(${x}px)` }}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0" style={{ background: 'var(--overlay)' }} aria-label="Close" onClick={onClose} />
      <div className="page-enter relative max-h-[85%] overflow-y-auto rounded-t-3xl border-t border-line bg-surface px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))] shadow-pop">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong" aria-hidden />
        <div className="mb-3 text-base font-semibold text-ink">{title}</div>
        {children}
      </div>
    </div>
  )
}

export function StatusBar({ tone = 'ink' }: { tone?: 'ink' | 'light' }) {
  return (
    <div className={cx('flex h-11 shrink-0 items-center justify-between px-6 text-sm font-semibold', tone === 'light' ? 'text-on-accent' : 'text-ink')} aria-hidden>
      <span className="num">9:41</span>
      <span className="flex items-center gap-1.5"><SignalHigh size={15} /><Wifi size={15} /><BatteryFull size={18} /></span>
    </div>
  )
}

/** Scale pulse on tap (respects reduced motion via globals.css). */
export const tap = 'transition-transform active:scale-95'
