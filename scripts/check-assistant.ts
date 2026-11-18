// npm run check:assistant. Every intent resolves on its samples; demo questions never fall back; SAP chips exist.
import { DBS } from '../src/data'
import { hasSapField } from '../src/data/sap'
import { resolveQuestion, SAMPLES, type Env } from '../src/assistant/intents'
import { seedEntries } from '../src/engine/valueLedger'
import type { Db, UserProfile } from '../src/data/types'

const errors: string[] = []
const envFor = (db: Db, userId: string, drops: string[] = ['dd-sales-fy27']): Env => {
  const user = db.users.find((u) => u.id === userId) as UserProfile
  return { db, user, users: db.users, value: seedEntries(db), ctx: { dataDrops: drops }, signals: db.signals.filter((s) => !s.requiresDataDrop || drops.includes(s.requiresDataDrop)), rt: Object.fromEntries(db.signals.map((s) => [s.id, { status: s.status, done: [], acks: { ...(s.seedAcks ?? {}) } }])) }
}
const amber = DBS.amber
const md = envFor(amber, 'u-vikram')

const check = (env: Env, q: string, expect?: string) => {
  try {
    const a = resolveQuestion(q, env)
    if (a.fallback) errors.push(`fallback for "${q}"`)
    if (expect && a.intent !== expect) errors.push(`"${q}" resolved to ${a.intent}, expected ${expect}`)
    if (!a.blocks.length) errors.push(`no blocks for "${q}"`)
    for (const b of a.blocks) if (b.kind === 'sources') for (const s of b.items) if (s.code && !hasSapField(s.code)) errors.push(`"${q}": SAP chip ${s.code} not in sapFields.ts`)
    for (const b of a.blocks) if (b.kind === 'text' && b.text.includes('—')) errors.push(`"${q}": em dash in answer`)
    return a
  } catch (e) { errors.push(`"${q}" threw: ${(e as Error).message}`) }
}

for (const [id, samples] of Object.entries(SAMPLES)) for (const q of samples) check({ ...md, contextSignalId: 'SIG-2026-1142' }, q, id === 'fallback' ? undefined : id)

const demo: [string, string][] = [
  ['Which launches are at risk because of imports?', 'launches_imports'],
  ['What if copper goes up another 5%?', 'whatif_commodity'],
  ['Raise a PR for 2 months of copper tube', 'raise_pr'],
  ['How much have we saved this quarter?', 'savings_quarter'],
  ['Is the Coolwave launch safe?', 'launch_safe'],
  ['Who would be told if Hanbit Copper Tube is late?', 'who_told'],
  ['Where can we recover money?', 'recover_money'],
  ['What should I focus on today?', 'daily_brief'],
  ['Status of ATF-IMP-2026-066', 'entity_status'],
  ['What does movement type 122 mean?', 'explain_movement'],
  ['Which suppliers in the inspection file are also in active NPD projects?', 'uploaded_data'],
]
for (const [q, id] of demo) check(md, q, id)

// Specific content checks
const pr = resolveQuestion('Raise a PR for 2 months of copper tube', envFor(amber, 'u-rohit'))
if (!pr.blocks.some((b) => b.kind === 'action' && b.recId === 'REC-1139-FWD')) errors.push('PR answer has no action card for REC-1139-FWD')
const mv = resolveQuestion('What does movement type 122 mean?', md)
if (!JSON.stringify(mv.blocks).toLowerCase().includes('return to vendor')) errors.push('movement 122 should explain return to vendor')
const safe = resolveQuestion('Is the Coolwave launch safe?', md)
if (!JSON.stringify(safe.blocks).includes('SIG-2026-1142') || !JSON.stringify(safe.blocks).includes('SIG-2026-1139')) errors.push('compound launch answer should cite S1 and S2')
const told = resolveQuestion('Who would be told if Hanbit Copper Tube is late?', md)
if (!told.blocks.some((b) => b.kind === 'table' && b.rows.length >= 3)) errors.push('who-told should list at least 3 people')
// Permissions: Plant Head asking for capex across all plants is refused
const cap = resolveQuestion('What is the capex budget across all plants?', envFor(amber, 'u-manoj'))
if (!cap.refused) errors.push('Plant Head capex-across-all-plants should be refused')
if (resolveQuestion('What is the capex budget across all plants?', envFor(amber, 'u-anjali')).refused) errors.push('CFO should see capex across plants')
// Fallback works and offers three suggestions
const fb = resolveQuestion('Tell me a joke about elephants', md)
if (!fb.fallback || fb.followUps.length !== 3) errors.push('unknown question should fall back with 3 suggestions')
// Hindi on at least 4 answers
const hiCount = demo.map(([q]) => resolveQuestion(q, md)).filter((a) => a.hi).length
if (hiCount < 4) errors.push(`only ${hiCount} demo answers have Hindi`)
// Second tenant works
check(envFor(DBS.kestrel, 'k-meenal', []), 'What should I focus on today?', 'daily_brief')
check(envFor(DBS.kestrel, 'k-sana', []), 'What if aluminium goes up another 3%?', 'whatif_commodity')

if (errors.length) { console.error(`check:assistant FAILED (${errors.length})`); errors.forEach((e) => console.error(' - ' + e)); process.exit(1) }
console.log(`check:assistant OK. ${Object.values(SAMPLES).flat().length} samples and ${demo.length} demo questions resolved.`)
