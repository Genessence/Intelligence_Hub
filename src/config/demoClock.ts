// Invariant 9: the only source of "now". Everything relative is computed from this.
export const DEMO_NOW = '2026-11-16T10:30:00+05:30'
export const DEMO_TODAY = '2026-11-16'
export const nowMs = () => Date.parse(DEMO_NOW)
