import type { Db } from './types'
import { AMBER } from './seed/amber'
import { KESTREL } from './seed/kestrel'

export const DBS: Record<string, Db> = { amber: AMBER, kestrel: KESTREL }
export const TENANT_IDS = Object.keys(DBS)
export const ALL_SIGNALS = Object.values(DBS).flatMap((d) => d.signals)
export const tenantOfSignal = (id: string) => TENANT_IDS.find((t) => DBS[t].signals.some((s) => s.id === id))!
