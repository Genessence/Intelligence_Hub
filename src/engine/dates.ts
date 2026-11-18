import { DEMO_TODAY } from '@/config/demoClock'
import { toInstant } from './format'

const DAY = 86_400_000

/** Add calendar days to a date-only ISO string (IST). */
export function addDays(iso: string, days: number): string {
  const d = new Date(toInstant(iso.slice(0, 10)) + days * DAY + 6 * 3600_000) // noon-ish IST guard against DST-free drift
  return d.toISOString().slice(0, 10)
}

/** Whole days from a to b (b - a), date-only. */
export function daysBetween(a: string, b: string): number {
  return Math.round((toInstant(b.slice(0, 10)) - toInstant(a.slice(0, 10))) / DAY)
}

export const daysFromToday = (iso: string) => daysBetween(DEMO_TODAY, iso)

export const maxDate = (a: string, b: string) => (a >= b ? a : b)
