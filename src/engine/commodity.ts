// Commodity index helpers shared by S1 (spike) and S6 (pass-through).
import type { Commodity, Db } from '@/data/types'
import { DEMO_TODAY } from '@/config/demoClock'
import { addDays } from './dates'

export const commodityByName = (db: Db, name: string): Commodity => {
  const c = db.commodities.find((x) => x.slug === name.toLowerCase() || x.name.toLowerCase().includes(name.toLowerCase()))
  if (!c) throw new Error(`Commodity ${name} not in seed`)
  return c
}

export const latest = (c: Commodity) => c.series[c.series.length - 1].v

/** Value on or before a date. */
export const valueAt = (c: Commodity, d: string) => [...c.series].reverse().find((p) => p.d <= d)?.v ?? c.series[0].v

export const changeOver = (c: Commodity, days: number) => latest(c) / valueAt(c, addDays(DEMO_TODAY, -days)) - 1

export const avgBetween = (c: Commodity, from: string, to: string) => {
  const pts = c.series.filter((p) => p.d >= from && p.d <= to)
  return pts.reduce((a, p) => a + p.v, 0) / Math.max(1, pts.length)
}

/** Forecast change to the 30-day point (mid, low, high). */
export const forecast30 = (c: Commodity) => {
  const f = c.forecast[c.forecast.length - 1]
  const l = latest(c)
  return { low: f.low / l - 1, mid: f.mid / l - 1, high: f.high / l - 1 }
}

export const pct = (x: number, dp = 1) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(dp)}%`
