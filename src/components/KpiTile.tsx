import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { KpiDef, KpiResult } from '@/engine/kpis'
import { fmtDateTime } from '@/engine/format'
import { DEMO_NOW } from '@/config/demoClock'
import { cx, Tip } from './ui/primitives'

const TONE: Record<NonNullable<KpiResult['tone']>, string> = { critical: 'text-critical', attention: 'text-attention', good: 'text-ink' }

/** Count-up on first render: animates the leading number inside the display string. Skipped for reduced motion. */
function useCountUp(display: string) {
  const [shown, setShown] = useState(display)
  useEffect(() => {
    const m = display.match(/^(\D*)([\d,.]+)(.*)$/)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!m || reduce) { setShown(display); return }
    const [, pre, numStr, post] = m
    const target = Number(numStr.replace(/,/g, ''))
    const dp = numStr.includes('.') ? numStr.split('.')[1].length : 0
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 600)
      const v = target * (1 - Math.pow(1 - p, 3))
      setShown(`${pre}${v.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })}${post}`)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [display])
  return shown
}

export function KpiTile({ def, result, compact }: { def: KpiDef; result: KpiResult; compact?: boolean }) {
  const nav = useNavigate()
  const shown = useCountUp(result.display)
  return (
    <button onClick={() => nav(def.drill)} className="card-lift group relative flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface p-4 text-left shadow-card">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 opacity-70" style={{ background: "linear-gradient(90deg, var(--accent), transparent)" }} aria-hidden />
      <span className="truncate text-xs font-medium text-ink-3">{def.label}</span>
      <Tip text={<><div className="font-medium">Source: {def.sourceFields}</div><div className="text-ink-3">As of {fmtDateTime(DEMO_NOW)}</div></>}>
        <span tabIndex={0} className={cx('num mt-1.5 cursor-help font-semibold tracking-tight', compact ? 'text-xl' : 'text-2xl', TONE[result.tone ?? 'good'])}>{shown}</span>
      </Tip>
      {result.sub && <span className="mt-1 truncate text-xs text-ink-2">{result.sub}</span>}
    </button>
  )
}
