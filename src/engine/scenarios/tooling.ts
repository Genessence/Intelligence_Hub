// S3: tool trial failure. Rework pushes commissioning; FPA follows; the customer gate slips only beyond its lead time.
import type { Db, Recommendation, Signal } from '@/data/types'
import { DEMO_TODAY } from '@/config/demoClock'
import { addDays, daysBetween } from '../dates'
import { fmtDay, fmtInr, plural } from '../format'
import { getProject } from '../lookup'
import { type Booking, type DraftEntry, entryBase, type Scenario, type ScenarioImpact } from './types'

export function toolState(db: Db, s: Signal, done: string[]) {
  const tool = db.tools.find((t) => t.id === s.entityRefs.find((r) => r.kind === 'tool')!.id)!
  const ncd = getProject(db, tool.neededByProject)
  const feeds = getProject(db, ncd.feedsProject!)
  const fpaDays = ncd.fpaDaysAfterTool ?? 0
  const rework = tool.reworkDays.mouldDesign + tool.reworkDays.manufacturing + tool.reworkDays.trial
  let commissioning = addDays(tool.commissioningPlanned, rework)
  let fpaReady = addDays(commissioning, fpaDays)
  for (const r of s.recommendations.filter((x) => done.includes(x.id))) {
    if (r.kind === 'tool_fast_track') { commissioning = addDays(commissioning, -tool.fastTrackSavingDays); fpaReady = minD(fpaReady, addDays(commissioning, fpaDays)) }
    if (r.kind === 'bridge_supply') fpaReady = minD(fpaReady, addDays(DEMO_TODAY, Number(r.params.leadDays) + fpaDays))
    if (r.kind === 'deviation_waiver') fpaReady = minD(fpaReady, addDays(DEMO_TODAY, fpaDays))
  }
  const needBy = addDays(feeds.nextGate!.planned, -(ncd.feedsLeadDays ?? 0))
  const fpaPlanned = addDays(tool.commissioningPlanned, fpaDays)
  const gateSlip = Math.max(0, daysBetween(needBy, fpaReady)) - Math.max(0, daysBetween(needBy, fpaPlanned))
  const penalty = feeds.latePenaltyPerDayInr ?? 0
  return { tool, ncd, feeds, rework, commissioning, fpaPlanned, fpaReady, needBy, gateSlip: Math.max(0, gateSlip), penalty }
}
const minD = (a: string, b: string) => (a <= b ? a : b)

function toImpact(db: Db, s: Signal, done: string[]): ScenarioImpact {
  const k = toolState(db, s, done)
  return {
    inrAtRisk: k.gateSlip * k.penalty,
    inrLabel: `Launch penalty at risk (${k.feeds.nextGate!.name})`,
    inrFormula: `${plural(k.gateSlip, 'day')} gate slip × ${fmtInr(k.penalty)} per day (customer LD clause)`,
    inrSource: 'Engine: Tooling trial rework norms, NPD FPA lead time, R&D gate date',
    slipDays: k.gateSlip,
    slipLabel: `${k.feeds.nextGate!.name} slip`,
    plants: ['1001'],
    metrics: [
      { label: 'Trials', value: k.tool.trials.map((t) => `T${t.n} ${t.result === 'fail' ? `failed (${t.failedParams.join(', ')})` : 'passed'}`).join('; '), tone: 'critical' },
      { label: 'Commissioning', value: `${fmtDay(k.tool.commissioningPlanned)} to ${fmtDay(k.commissioning)}`, source: `Rework: mould design ${k.tool.reworkDays.mouldDesign} + manufacturing ${k.tool.reworkDays.manufacturing} + trial ${k.tool.reworkDays.trial} days` },
      { label: `FPA ready (${k.ncd.id})`, value: fmtDay(k.fpaReady), tone: k.fpaReady > k.needBy ? 'attention' : undefined, source: `${k.ncd.fpaDaysAfterTool} days after commissioning` },
      { label: `Needed by (${k.feeds.nextGate!.name} less lead time)`, value: fmtDay(k.needBy) },
      { label: `${k.feeds.nextGate!.name} slip`, value: plural(k.gateSlip, 'day'), tone: k.gateSlip ? 'critical' : undefined },
    ],
  }
}

export const toolingScenario: Scenario = {
  impact: (db, s, done) => toImpact(db, s, done),
  book(db, s, rec: Recommendation, done): Booking {
    const before = toImpact(db, s, done)
    const after = toImpact(db, s, [...done, rec.id])
    const k = toolState(db, s, done)
    const delta = (before.slipDays ?? 0) - (after.slipDays ?? 0)
    const entries: DraftEntry[] = []
    const costInr = Number(rec.params.feeInr ?? rec.params.costInr ?? 0)
    if (delta > 0 && k.penalty > 0) entries.push({ ...entryBase(s, rec, '1001'), lever: rec.title.split(' ').slice(0, 3).join(' '), type: 'penalty_avoided', baseline: { kind: 'Customer launch LD clause', value: `${fmtInr(k.penalty)} per day` }, formula: `${delta} days ${k.feeds.nextGate!.name} slip avoided × ${fmtInr(k.penalty)} per day${costInr ? ` (action cost ${fmtInr(costInr)} shown separately)` : ''}`, amountInr: delta * k.penalty })
    return { entries, costInr, costLabel: costInr ? `${rec.kind === 'tool_fast_track' ? 'Fast-track fee' : 'Bridge tool cost'}: ${fmtInr(costInr)}` : undefined, before, after, note: entries.length ? undefined : 'The gate is already protected by an earlier action.' }
  },
}
