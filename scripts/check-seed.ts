// npm run check:seed. Fails (exit 1) on any broken invariant.
import fs from 'node:fs'
import path from 'node:path'
import { AMBER } from '../src/data/seed/amber'
import { DBS } from '../src/data'
import { hasSapField } from '../src/data/sap'
import { computeAudience } from '../src/engine/audience'
import { getModel, getPart, getPlant, getPo, getProject, getRole, getShipment, getUser, getVendor } from '../src/engine/lookup'
import { impactOf, previewBooking } from '../src/engine/scenarios'
import { shipmentDetail } from '../src/engine/scenarios/shipment'
import { seedAmount } from '../src/engine/valueLedger'
import { KPIS } from '../src/engine/kpis'
import type { Db, Signal } from '../src/data/types'

const ALL_CTX = { dataDrops: ['dd-sales-fy27'] }
const impactWith = (db: Db, s: Signal, done: string[]) => shipmentDetail(db, s, done)

const errors: string[] = []
const ok = (cond: unknown, msg: string) => { if (!cond) errors.push(msg) }
const tryRef = (fn: () => unknown, msg: string) => { try { fn() } catch (e) { errors.push(`${msg}: ${(e as Error).message}`) } }
const db = AMBER
for (const [tid, d] of Object.entries(DBS)) checkDb(tid, d)
function checkDb(tid: string, db: Db) {

// 1. Foreign keys
for (const u of db.users) {
  tryRef(() => getRole(db, u.roleId), `user ${u.id}`)
  if (u.delegate) tryRef(() => getUser(db.users, u.delegate!.userId), `delegate of ${u.id}`)
  u.scope.plants.forEach((p) => tryRef(() => getPlant(db, p), `scope plant of ${u.id}`))
  u.scope.projects.forEach((p) => tryRef(() => getProject(db, p), `scope project of ${u.id}`))
}
for (const p of db.parts) { p.vendors.forEach((v) => tryRef(() => getVendor(db, v), `part ${p.code}`)); p.plants.forEach((pp) => tryRef(() => getPlant(db, pp.plant), `part ${p.code} plant`)) }
for (const m of db.productModels) m.bom.forEach((b) => tryRef(() => getPart(db, b.partCode), `BOM of ${m.id}`))
for (const po of db.purchaseOrders) { tryRef(() => getVendor(db, po.vendorId), `PO ${po.ebeln}`); po.lines.forEach((l) => { tryRef(() => getPart(db, l.material), `PO ${po.ebeln} line`); tryRef(() => getPlant(db, l.plant), `PO ${po.ebeln} plant`) }) }
for (const st of db.stock) { tryRef(() => getPart(db, st.material), 'stock'); tryRef(() => getPlant(db, st.plant), 'stock plant') }
for (const sh of db.shipments) { tryRef(() => getVendor(db, sh.vendorId), `shipment ${sh.ref}`); sh.poNumbers.forEach((n) => tryRef(() => getPo(db, n), `shipment ${sh.ref}`)); sh.lines.forEach((l) => tryRef(() => getPart(db, l.partCode), `shipment ${sh.ref}`)); tryRef(() => getPlant(db, sh.plant), `shipment ${sh.ref}`) }
for (const pr of db.projects) { tryRef(() => getUser(db.users, pr.ownerId), `project ${pr.id}`); if (pr.productModelId) tryRef(() => getModel(db, pr.productModelId!), `project ${pr.id}`); pr.needs.forEach((n) => tryRef(() => getPart(db, n.partCode), `project ${pr.id} need`)) }
for (const s of db.signals) {
  for (const r of s.entityRefs) {
    const fn: Record<string, () => unknown> = { shipment: () => getShipment(db, r.id), po: () => getPo(db, r.id), part: () => getPart(db, r.id), project: () => getProject(db, r.id), plant: () => getPlant(db, r.id), vendor: () => getVendor(db, r.id), commodity: () => r.id, customer: () => r.id, tool: () => { if (!db.tools.some((t) => t.id === r.id)) throw new Error('tool') }, capex: () => { if (!db.capex.some((c) => c.no === r.id)) throw new Error('capex') }, model: () => getModel(db, r.id) }
    tryRef(fn[r.kind], `signal ${s.id} ref ${r.kind}:${r.id}`)
  }
  s.recommendations.forEach((rec) => tryRef(() => getRole(db, rec.ownerRoleId), `rec ${rec.id}`))
  ok(!/\d[\d,.]*\s*(L|Cr|lakh|crore)\b|₹/.test(s.title + s.summary), `signal ${s.id} text contains a typed money figure (invariant 6)`)
}

  for (const s of db.signals) for (const rec of s.recommendations) {
    try { previewBooking(db, s, rec, [], ALL_CTX) } catch (e) { errors.push(`${tid} ${s.id} ${rec.id} booking throws: ${(e as Error).message}`) }
    if (s.recommendations.length) try { impactOf(db, s, [], ALL_CTX) } catch (e) { errors.push(`${tid} ${s.id} impact throws: ${(e as Error).message}`) }
  }
  for (const v of db.valueHistory) ok(seedAmount(v) > 0, `${tid} ${v.id} has a non-positive amount`)
  for (const u of db.users) ok(u.tenantId === tid, `${tid} user ${u.id} has tenantId ${u.tenantId}`)
}

// 2. Stored impacts equal the engine
for (const s of db.signals.filter((x) => x.storedImpact)) {
  const imp = impactWith(db, s, [])
  ok(imp.inrAtRisk === s.storedImpact!.inrAtRisk, `${s.id} inrAtRisk ${imp.inrAtRisk} != stored ${s.storedImpact!.inrAtRisk}`)
  ok(imp.maxSlipDays === s.storedImpact!.slipDays, `${s.id} slipDays ${imp.maxSlipDays} != stored ${s.storedImpact!.slipDays}`)
  ok(imp.unitsAtRisk === s.storedImpact!.unitsAtRisk, `${s.id} unitsAtRisk ${imp.unitsAtRisk} != stored ${s.storedImpact!.unitsAtRisk}`)
}

// 3. Hero audience (S2)
const S2 = db.signals.find((s) => s.id === 'SIG-2026-1142')!
const expected = ['u-vikram', 'u-sanjay', 'u-rohit', 'u-priya', 'u-nitin', 'u-arvind', 'u-kavita', 'u-farhan', 'u-ravi', 'u-deepak', 'u-manoj', 'u-asha', 'u-kiran'].sort()
const got = computeAudience(db, db.users, S2).map((r) => r.userId).sort()
ok(JSON.stringify(got) === JSON.stringify(expected), `S2 audience mismatch.\n  expected ${expected.join(',')}\n  got      ${got.join(',')}`)
ok(computeAudience(db, db.users, S2).find((r) => r.userId === 'u-nitin')?.reasons.some((x) => x.startsWith('Delegate for')), 'S2: Nitin should receive via delegation')

// 4. Attribution: no unit counted twice, in any order of actions
const recIds = S2.recommendations.map((r) => r.id)
const perms = (xs: string[]): string[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])))
for (const order of perms(recIds)) {
  let done: string[] = []
  let units = 0
  for (const id of order) {
    const rec = S2.recommendations.find((r) => r.id === id)!
    units += previewBooking(db, S2, rec, done, ALL_CTX).entries.filter((e) => e.type === 'revenue_protected').reduce((a, e) => a + (e.units ?? 0), 0)
    done = [...done, id]
  }
  const final = impactWith(db, S2, done)
  ok(units <= final.unitsAtRiskGross, `attribution order ${order.join('>')} books ${units} units > ${final.unitsAtRiskGross} gross`)
}

// 4b. REESE M1 regression: re-sequencing adds exactly the stock drawn to units at risk
{
  const reseq = S2.recommendations.find((r) => r.kind === 'resequence')!
  const d = impactWith(db, S2, [reseq.id]).unitsAtRisk - impactWith(db, S2, []).unitsAtRisk
  ok(d === Number(reseq.params.qty), `re-sequencing should add ${reseq.params.qty} units at risk, adds ${d}`)
  ok(impactWith(db, S2, []).maxGateSlipDays === 4, `S2 PP gate slip after float should be 4 days, got ${impactWith(db, S2, []).maxGateSlipDays}`)
}
// 4c. Every scenario: no action order books more than the risk it started with
for (const s of db.signals.filter((x) => x.recommendations.length)) {
  const start = impactOf(db, s, [], ALL_CTX)!.inrAtRisk
  for (const order of perms(s.recommendations.map((r) => r.id)).slice(0, 24)) {
    let done: string[] = []
    let booked = 0
    for (const id of order) {
      const b = previewBooking(db, s, s.recommendations.find((r) => r.id === id)!, done, ALL_CTX)
      booked += b.entries.filter((e) => e.type !== 'penalty_avoided').reduce((a, e) => a + e.amountInr, 0)
      done = [...done, id]
    }
    if (s.type !== 'shipment_delay') ok(booked <= start + 1, `${s.id} order ${order.join('>')} books ${Math.round(booked)} > starting risk ${Math.round(start)}`)
  }
}
// 4d. Add-user-live (spec 6.6): a new SQE scoped to Rajpura + BLDC Motor + Sundara receives S4 with a reason
{
  const sqe = { id: 'u-test-sqe', name: 'Test SQE', title: 'SQE', roleId: 'sqe', tenantId: 'amber', scope: { plants: ['1001'], purchasingGroups: [], mrpControllers: [], commodities: ['BLDC Motor'], projects: [], vendors: ['0000106012'], customers: [] } }
  const S4 = db.signals.find((s) => s.id === 'SIG-2026-1136')!
  const r = computeAudience(db, [...db.users, sqe], S4).find((x) => x.userId === sqe.id)
  ok(r && r.reasons.some((x) => x.includes('Vendor 0000106012')), 'add-user-live: new SQE does not receive S4 with a vendor reason')
}
// 4e. KPIs compute for every featured user
for (const [, d] of Object.entries(DBS)) for (const u of d.users.filter((x) => x.featured)) for (const k of KPIS) {
  try { k.compute({ db: d, rt: Object.fromEntries(d.signals.map((s) => [s.id, { status: s.status, done: [], acks: {} }])), value: [], users: d.users, user: u, ctx: ALL_CTX, signals: d.signals }) } catch (e) { errors.push(`KPI ${k.id} for ${u.id}: ${(e as Error).message}`) }
}

// 4f. Cross-signal gate penalty (REESE final #2): S2 and S3 share the RND-CW-2027 PP gate; it moves by the worst cause.
{
  const S3 = db.signals.find((x) => x.id === 'SIG-2026-1145')!
  const air = S2.recommendations.find((r) => r.kind === 'air_freight_partial')!
  const fast = S3.recommendations.find((r) => r.kind === 'tool_fast_track')!
  const pen = (b: ReturnType<typeof previewBooking>) => b.entries.filter((e) => e.type === 'penalty_avoided').reduce((a, e) => a + e.amountInr, 0)
  const rate = getProject(db, 'RND-CW-2027').latePenaltyPerDayInr!
  // Order A: S2 acts first, then S3.
  const a1 = pen(previewBooking(db, S2, air, [], { ...ALL_CTX, doneBySignal: {} }))
  const a2 = pen(previewBooking(db, S3, fast, [], { ...ALL_CTX, doneBySignal: { [S2.id]: [air.id] } }))
  // Order B: S3 first, then S2.
  const b1 = pen(previewBooking(db, S3, fast, [], { ...ALL_CTX, doneBySignal: {} }))
  const b2 = pen(previewBooking(db, S2, air, [], { ...ALL_CTX, doneBySignal: { [S3.id]: [fast.id] } }))
  ok(a1 === 0, `S2 alone should book no gate penalty while S3 still holds the gate, booked ${a1}`)
  ok(a1 + a2 === 7 * rate && b1 + b2 === 7 * rate, `gate penalty across S2 and S3 must total 7 days × rate in any order (A ${a1 + a2}, B ${b1 + b2})`)
}
// 4g. Re-firing a signal mid-workflow never books value twice (REESE final #1).
{
  const { useNexus } = await import('../src/store/useNexus')
  const st = useNexus.getState()
  st.reset(); useNexus.getState().login('u-kavita')
  const asRec = S2.recommendations.find((r) => r.kind === 'alternate_supplier')!
  useNexus.getState().completeRecommendation(S2.id, asRec.id)
  const total1 = useNexus.getState().value.amber.reduce((a, e) => a + e.amountInr, 0)
  useNexus.getState().fireSignal(S2.id)
  useNexus.getState().completeRecommendation(S2.id, asRec.id)
  const total2 = useNexus.getState().value.amber.reduce((a, e) => a + e.amountInr, 0)
  ok(total1 === total2, `re-firing S2 let the same action book again (${total1} then ${total2})`)
  useNexus.getState().reset()
}

// 5. Source scans: SAP fields, em dashes, network, clock, raw hex
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
const src = walk(path.resolve(import.meta.dirname, '../src')).filter((f) => /\.(ts|tsx|css)$/.test(f) && !f.endsWith('sapFields.ts'))
for (const f of src) {
  const t = fs.readFileSync(f, 'utf8')
  const rel = path.relative(process.cwd(), f)
  for (const m of t.matchAll(/(?:sapField\(|field: |sap=)'([A-Z0-9_/]+-[A-Z0-9_]+)'/g)) ok(hasSapField(m[1]), `${rel}: SAP field ${m[1]} not in sapFields.ts`)
  for (const m of t.matchAll(/\bcode="([A-Z0-9_/]+-[A-Z0-9_]+)"/g)) ok(hasSapField(m[1]), `${rel}: SAP field ${m[1]} not in sapFields.ts`)
  ok(!t.includes('—'), `${rel}: contains an em dash`)
  ok(!/\bfetch\(|XMLHttpRequest|https?:\/\/(?!www\.w3\.org)/.test(t), `${rel}: network call or external URL`)
  ok(!/new Date\(\)|Date\.now\(\)/.test(t), `${rel}: uses the wall clock (invariant 9)`)
  if (f.endsWith('.tsx')) ok(!/#[0-9a-fA-F]{3,8}\b/.test(t), `${rel}: raw hex colour in a component (invariant 3)`)
}

if (errors.length) {
  console.error(`check:seed FAILED (${errors.length})`)
  errors.forEach((e) => console.error(' - ' + e))
  process.exit(1)
}
const imp = impactWith(db, S2, [])
console.log(`check:seed OK. S2: ${imp.unitsAtRisk} units at risk, slip ${imp.maxSlipDays} days, audience ${got.length}. ${src.length} source files scanned.`)
