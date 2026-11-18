import type { Db, Recommendation, Signal, ValueEntry } from '@/data/types'

export interface Metric {
  label: string
  value: string
  source?: string // provenance shown on hover
  tone?: 'critical' | 'attention'
  sap?: string // SAP field code, must exist in sapFields.ts
}

export interface ScenarioImpact {
  inrAtRisk: number
  inrLabel: string
  inrFormula: string
  inrSource: string
  unitsAtRisk?: number
  slipDays?: number
  slipLabel?: string
  plants: string[]
  metrics: Metric[]
}

export type DraftEntry = Omit<ValueEntry, 'id' | 'ownerId' | 'at'>

export interface Booking {
  entries: DraftEntry[]
  costInr: number
  costLabel?: string
  tradeOff?: string
  note?: string
  before: ScenarioImpact
  after: ScenarioImpact
}

export interface RuntimeCtx {
  dataDrops: string[] // ingested data-drop ids
  doneBySignal?: Record<string, string[]> // actions taken on every signal, for cross-signal attribution
}

export interface Scenario {
  impact(db: Db, s: Signal, done: string[], ctx: RuntimeCtx): ScenarioImpact
  book(db: Db, s: Signal, rec: Recommendation, done: string[], ctx: RuntimeCtx): Booking
}

export const entryBase = (s: Signal, rec: Recommendation, plant: string | undefined) => ({
  signalId: s.id, recommendationId: rec.id, plant, status: 'committed' as const, evidence: [] as string[], sharedWith: [] as string[],
})
