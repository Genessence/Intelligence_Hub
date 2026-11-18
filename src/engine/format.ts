// Indian formats (invariant 5). IST dates, lakh / crore money. No em dashes anywhere in output.

const IST = 'Asia/Kolkata'

/** ₹ in lakh / crore. 230_00_000 -> "₹ 2.3 Cr", 68_00_000 -> "₹ 68 L", 38_000 -> "₹ 38,000". */
export function fmtInr(v: number, opts: { compact?: boolean } = {}): string {
  const sign = v < 0 ? '−' : ''
  const a = Math.abs(v)
  const compact = opts.compact ?? true
  if (compact && a >= 1_00_00_000) return `${sign}₹ ${trim(a / 1_00_00_000, a >= 10_00_00_000 ? 1 : 2)} Cr`
  if (compact && a >= 1_00_000) return `${sign}₹ ${trim(a / 1_00_000, a >= 10_00_000 ? 1 : 2)} L`
  return `${sign}₹ ${a.toLocaleString('en-IN', { maximumFractionDigits: a < 100 && !Number.isInteger(a) ? 2 : 0 })}`
}

function trim(n: number, dp: number) {
  return Number(n.toFixed(dp)).toLocaleString('en-IN', { maximumFractionDigits: dp })
}

export const fmtNum = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 })

/** "16 Nov 2026" */
export function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST }).format(new Date(toInstant(iso)))
}

/** "16 Nov" */
export function fmtDay(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: IST }).format(new Date(toInstant(iso)))
}

/** "16 Nov 2026, 10:30 IST" */
export function fmtDateTime(iso: string): string {
  const d = new Date(toInstant(iso))
  const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST }).format(d)
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: IST }).format(d)
  return `${date}, ${time} IST`
}

/** Date-only ISO strings are treated as midnight IST. */
export function toInstant(iso: string): number {
  return Date.parse(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso)
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${fmtNum(n)} ${n === 1 ? one : many}`
}

/** "9 days", "4 h", "35 min" */
export function fmtDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 48) return `${h} h`
  return plural(Math.round(h / 24), 'day')
}
