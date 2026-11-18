// Commodity series. Generated deterministically from anchor points (fictional, shaped like real markets).
import type { Commodity } from '@/data/types'
import { addDays, daysBetween } from '@/engine/dates'

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Weekly points for a year, then daily for the last 14 days, interpolated between anchors with light noise. */
function build(anchors: [string, number][], seed: number, noise: number, dp = 0) {
  const r = rng(seed)
  const at = (d: string) => {
    let i = anchors.findIndex(([a]) => a > d)
    if (i <= 0) i = i === 0 ? 1 : anchors.length - 1
    const [d0, v0] = anchors[i - 1]
    const [d1, v1] = anchors[i]
    const t = Math.min(1, Math.max(0, daysBetween(d0, d) / Math.max(1, daysBetween(d0, d1))))
    return v0 + (v1 - v0) * t
  }
  const round = (v: number) => Number(v.toFixed(dp))
  const out: { d: string; v: number }[] = []
  for (let d = '2025-11-17'; d < '2026-11-02'; d = addDays(d, 7)) out.push({ d, v: round(at(d) * (1 + (r() - 0.5) * noise)) })
  for (let d = '2026-11-02'; d <= '2026-11-16'; d = addDays(d, 1)) out.push({ d, v: round(at(d) * (1 + (r() - 0.5) * noise * 0.3)) })
  out[out.length - 1].v = round(anchors[anchors.length - 1][1]) // today's print is exact
  return out
}

function forecast(last: number, lowPct: number, midPct: number, highPct: number, dp = 0) {
  return [7, 14, 21, 30].map((n) => ({
    d: addDays('2026-11-16', n),
    low: Number((last * (1 + (lowPct * n) / 3000)).toFixed(dp)),
    mid: Number((last * (1 + (midPct * n) / 3000)).toFixed(dp)),
    high: Number((last * (1 + (highPct * n) / 3000)).toFixed(dp)),
  }))
}

export const COMMODITIES: Commodity[] = [
  {
    slug: 'copper', name: 'LME Copper', category: 'LME', unit: 'USD/MT',
    series: build([['2025-11-17', 9780], ['2026-02-01', 10120], ['2026-04-01', 10640], ['2026-06-30', 10560], ['2026-07-10', 10010], ['2026-09-30', 9930], ['2026-10-20', 10180], ['2026-11-02', 10240], ['2026-11-16', 11100]], 11, 0.012),
    forecast: forecast(11100, 4, 5.5, 7),
  },
  {
    slug: 'aluminium', name: 'LME Aluminium', category: 'LME', unit: 'USD/MT',
    series: build([['2025-11-17', 2480], ['2026-03-01', 2560], ['2026-07-01', 2610], ['2026-10-01', 2590], ['2026-11-02', 2588], ['2026-11-16', 2672]], 23, 0.012),
    forecast: forecast(2672, 0.5, 1.5, 3),
  },
  {
    slug: 'hrcoil', name: 'HR Coil', category: 'STEEL', unit: 'INR/MT',
    series: build([['2025-11-17', 52800], ['2026-04-01', 54100], ['2026-08-01', 51900], ['2026-11-16', 50650]], 31, 0.01),
    forecast: forecast(50650, -2, -0.8, 0.5),
  },
  {
    slug: 'abs', name: 'ABS', category: 'POLYMER', unit: 'INR/kg',
    series: build([['2025-11-17', 151], ['2026-05-01', 158], ['2026-11-16', 155]], 41, 0.015),
    forecast: forecast(155, -1, 0.5, 2),
  },
  {
    slug: 'pp', name: 'PP', category: 'POLYMER', unit: 'INR/kg',
    series: build([['2025-11-17', 104], ['2026-06-01', 109], ['2026-11-16', 106]], 43, 0.015),
    forecast: forecast(106, -1, 0, 1.5),
  },
  {
    slug: 'styrene', name: 'Styrene Monomer', category: 'POLYMER', unit: 'USD/MT',
    series: build([['2025-11-17', 1010], ['2026-04-01', 1075], ['2026-09-01', 1040], ['2026-11-16', 1088]], 47, 0.018),
    forecast: forecast(1088, 0, 1.8, 3.5),
  },
  {
    slug: 'usdinr', name: 'USD/INR', category: 'FX', unit: 'INR',
    series: build([['2025-11-17', 87.1], ['2026-05-01', 88.2], ['2026-11-16', 89.07]], 53, 0.003, 2),
    forecast: forecast(89.07, -0.5, 0.3, 1, 2),
  },
]
