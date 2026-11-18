import type { Signal } from '@/data/types'
import { toInstant } from './format'

export interface Latency {
  firstKnownAt: string
  firstKnownBy: string
  raisedAt: string
  ackAt?: string
  ackBy?: string
  knownToNexusMs: number // how long the knowledge sat in one system before Nexus routed it
  nexusToAckMs?: number // decision latency once Nexus told people
  knownToAckMs?: number
}

export function decisionLatency(signal: Signal, acks: Record<string, string>): Latency {
  const first = Object.entries(acks).sort((a, b) => a[1].localeCompare(b[1]))[0]
  const known = toInstant(signal.firstKnownAt)
  const raised = toInstant(signal.raisedAt)
  return {
    firstKnownAt: signal.firstKnownAt,
    firstKnownBy: signal.firstKnownBy,
    raisedAt: signal.raisedAt,
    ackAt: first?.[1],
    ackBy: first?.[0],
    knownToNexusMs: raised - known,
    nexusToAckMs: first ? toInstant(first[1]) - raised : undefined,
    knownToAckMs: first ? toInstant(first[1]) - known : undefined,
  }
}
