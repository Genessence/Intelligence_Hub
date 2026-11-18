// Nexus Assistant intents. Scripted and deterministic: every answer is computed from the seed, the runtime
// state and src/engine. React-free so scripts/check-assistant.ts can run every resolver.
import type { Signal, SourceId, ValueType } from '@/data/types'
import type { KpiCtx } from '@/engine/kpis'
import { KPIS, KPI_BY_ID } from '@/engine/kpis'
import { computeAudience } from '@/engine/audience'
import { impactOf } from '@/engine/scenarios'
import { shipmentDetail } from '@/engine/scenarios/shipment'
import { commodityRows } from '@/engine/scenarios/commodity'
import { obsolescenceState } from '@/engine/scenarios/obsolescence'
import { qualityState } from '@/engine/scenarios/quality'
import { toolState } from '@/engine/scenarios/tooling'
import { demandState } from '@/engine/scenarios/demand'
import { changeOver, forecast30, latest, pct } from '@/engine/commodity'
import { addDays } from '@/engine/dates'
import { fmtDay, fmtInr, fmtNum } from '@/engine/format'
import { getPart, getPlant, getProject, getRole, getShipment, getVendor, stockOf } from '@/engine/lookup'
import { totals } from '@/engine/valueLedger'
import { SAP_FIELDS, hasSapField, sapField } from '@/data/sap'
import { DEMO_TODAY } from '@/config/demoClock'
import { type Ent, firstOf, matchEntities } from './entityMatcher'

// ---- Types ---------------------------------------------------------------

export type Tone = 'accent' | 'critical' | 'attention' | 'info'
export type Block =
  | { kind: 'text'; text: string }
  | { kind: 'table'; head: string[]; rows: string[][]; links?: (string | null)[] }
  | { kind: 'chart'; chart: 'line' | 'bar'; data: Record<string, number | string>[]; x: string; series: { key: string; label: string; tone: Tone }[]; unit?: string }
  | { kind: 'kpi'; items: { label: string; value: string; sub?: string; tone?: 'critical' | 'attention' | 'good' }[] }
  | { kind: 'links'; items: { label: string; to: string }[] }
  | { kind: 'action'; signalId: string; recId: string; title: string; fields: [string, string][]; writeBack?: boolean; note?: string }
  | { kind: 'sources'; items: { label: string; code?: string }[] }

export interface Answer {
  intent: string
  steps: SourceId[]
  blocks: Block[]
  followUps: string[]
  hi?: string // Hindi summary (Roadmap feature, 5 answers)
  fallback?: boolean
  refused?: boolean
}

export interface Env extends KpiCtx { contextSignalId?: string }

interface Intent {
  id: string
  samples: string[]
  keywords: string[]
  score: (q: string, ents: Ent[], env: Env) => number
  run: (q: string, ents: Ent[], env: Env) => Answer
}

// ---- Helpers -------------------------------------------------------------

const has = (q: string, ...re: RegExp[]) => re.some((r) => r.test(q))
const isOpen = (env: Env, s: Signal) => !['resolved', 'dismissed'].includes(env.rt[s.id]?.status ?? s.status)
const done = (env: Env, s: Signal) => env.rt[s.id]?.done ?? []
const imp = (env: Env, s: Signal) => impactOf(env.db, s, done(env, s), env.ctx)
const leader = (env: Env) => getRole(env.db, env.user.roleId).function === 'Leadership'
const canSee = (env: Env, s: Signal) => env.user.scope.all || leader(env) || computeAudience(env.db, env.users, s).some((r) => r.userId === env.user.id)
const openMine = (env: Env) => env.signals.filter((s) => isOpen(env, s) && canSee(env, s))
const sig = (env: Env, id: string) => env.signals.find((s) => s.id === id)
const sigLink = (s: Signal) => ({ label: `${s.id}: ${s.title}`, to: `/signals/${s.id}` })
const SEV = { critical: 3, high: 2, medium: 1, low: 0 } as const
const text = (t: string): Block => ({ kind: 'text', text: t })
const src = (...items: (string | [string, string])[]): Block => ({ kind: 'sources', items: items.map((i) => (Array.isArray(i) ? { label: i[0], code: i[1] } : { label: i })) })
const refuse = (id: string, why: string, offer: string[]): Answer => ({ intent: id, steps: [], blocks: [text(why)], followUps: offer, refused: true })
const VT: Record<ValueType, string> = { hard: 'Hard saving', avoidance: 'Cost avoidance', cash: 'Cash released', revenue_protected: 'Revenue protected', penalty_avoided: 'Penalty avoided' }
const QUARTER_START = '2026-10-01'
const usdInr = (env: Env) => { const c = env.db.commodities.find((x) => x.slug === 'usdinr'); return c ? latest(c) : 89 }
const kpi = (env: Env, id: string) => { const k = KPI_BY_ID.get(id)!; const r = k.compute(env); return { label: k.label, value: r.display, sub: r.sub, tone: r.tone } }
const ofType = (env: Env, t: Signal['type']) => env.signals.find((s) => s.type === t && s.recommendations.length)

// ---- Intents -------------------------------------------------------------

const INTENTS: Intent[] = [
  {
    id: 'launches_imports',
    samples: ['Which launches are at risk because of imports?', 'Are any projects hit by late shipments?'],
    keywords: ['launch', 'import', 'shipment', 'risk', 'project'],
    score: (q) => (has(q, /launch|project|gate/) && has(q, /import|shipment|exim|late/) ? 0.95 : 0),
    run: (_q, _e, env) => {
      const rows: string[][] = []
      const links: string[] = []
      let n = 0
      for (const s of env.signals.filter((x) => x.type === 'shipment_delay' && x.recommendations.length && isOpen(env, x))) {
        const d = shipmentDetail(env.db, s, done(env, s))
        for (const p of d.projectSlips) {
          if ((p.gate?.slipDays ?? p.slipDays) > 0) n++
          rows.push([getProject(env.db, p.projectId).title, `${d.shipmentRef}, ETA +${d.delayDays} days`, `${p.slipDays} days`, p.gate ? `${p.gate.slipDays} days (float ${p.gate.floatDays})` : 'n/a', fmtInr(d.inrAtRisk)])
          links.push(`/projects/${p.projectId}`)
        }
      }
      return {
        intent: 'launches_imports', steps: ['exim', 'rnd', 'sap'],
        blocks: [
          text(rows.length ? `${n} launch${n === 1 ? '' : 'es'} at risk from import delays. The build slips first; the customer gate slips only after its float is used.` : 'No launch is at risk from imports right now.'),
          ...(rows.length ? [{ kind: 'table', head: ['Project', 'Cause', 'Build slip', 'Gate slip', 'Revenue at risk'], rows, links } as Block] : []),
          src('EXIM shipment ETA', ['Delivery date', 'EKET-EINDT'], ['Unrestricted stock', 'MARD-LABST'], 'R&D Control Tower gates'),
        ],
        followUps: ['Is the Coolwave launch safe?', 'Status of ATF-IMP-2026-066', 'What should I focus on today?'],
        hi: rows.length ? `आयात में देरी से ${n} लॉन्च जोखिम में हैं। सबसे बड़ा असर: ${rows[0][0]}, गेट ${rows[0][3]} पीछे।` : undefined,
      }
    },
  },
  {
    id: 'whatif_commodity',
    samples: ['What if copper goes up another 5%?', 'What if aluminium rises 3%?'],
    keywords: ['what if', 'copper', 'aluminium', 'goes up', 'rise', '%'],
    score: (q, ents) => (has(q, /what if|what happens if|suppose/) && (firstOf(ents, 'commodity') || has(q, /%/)) ? 0.97 : 0),
    run: (q, ents, env) => {
      const slug = firstOf(ents, 'commodity')?.id ?? env.db.commodities[0].slug
      const p = Number(q.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] ?? 5) / 100
      const s = env.signals.find((x) => x.type === 'commodity_spike' && x.recommendations.length && env.db.commodities.find((c) => c.slug === slug && x.entityRefs.some((r) => r.kind === 'commodity' && c.name.toLowerCase().includes(r.id.toLowerCase()))))
      if (!s) return { intent: 'whatif_commodity', steps: ['cost'], blocks: [text(`There is no open exposure model for ${slug} in this tenant.`)], followUps: ['Where can we recover money?'] }
      const k = commodityRows(env.db, s, done(env, s))
      const base = k.rows.reduce((a, r) => a + r.exposure, 0)
      const scale = p / k.f.mid
      const delta = base * scale
      const qDelta = k.change ? k.quarter * (p / k.change) : 0
      return {
        intent: 'whatif_commodity', steps: ['cost', 'sap'],
        blocks: [
          text(`If ${k.c.name} rises another ${pct(p)}, on top of the ${pct(k.f.mid)} already forecast, the uncovered 3-month exposure grows from ${fmtInr(base)} to ${fmtInr(base + delta)}.`),
          { kind: 'kpi', items: [{ label: 'Exposure now', value: fmtInr(base) }, { label: `With ${pct(p)} more`, value: fmtInr(base + delta), tone: 'critical' }, { label: 'Extra should-cost this quarter', value: fmtInr(qDelta), tone: 'attention' }] },
          { kind: 'chart', chart: 'bar', x: 'part', data: k.rows.map((r) => ({ part: r.p.description.split(' ').slice(0, 3).join(' '), extra: Math.round(r.exposure * scale) })), series: [{ key: 'extra', label: 'Extra exposure', tone: 'critical' }], unit: 'inr' },
          src('Cost Engine forecast', ['Moving price', 'MBEW-VERPR'], 'the client Z-field L4 Commodity'),
        ],
        followUps: ['Raise a PR for 2 months of copper tube', 'Where can we recover money?', 'Show the copper trend'],
      }
    },
  },
  {
    id: 'raise_pr',
    samples: ['Raise a PR for 2 months of copper tube', 'Create a purchase requisition for copper tube'],
    keywords: ['raise', 'pr', 'requisition', 'forward buy', 'copper tube'],
    score: (q) => (has(q, /\b(pr|requisition|forward[- ]buy)\b/) ? 0.96 : 0),
    run: (q, ents, env) => {
      const partEnt = firstOf(ents, 'part')
      const s = env.signals.find((x) => isOpen(env, x) && x.recommendations.some((r) => r.kind === 'forward_buy' && (!partEnt || r.params.partCode === partEnt.id)))
      const rec = s?.recommendations.find((r) => r.kind === 'forward_buy')
      if (!s || !rec) return { intent: 'raise_pr', steps: ['cost', 'sap'], blocks: [text('There is no forward-buy recommendation open for that part.')], followUps: ['What if copper goes up another 5%?'] }
      if (!canSee(env, s)) return refuse('raise_pr', 'That requisition belongs to the copper desk. It is outside your role and scope, so I cannot raise it for you.', ['What should I focus on today?'])
      const part = getPart(env.db, String(rec.params.partCode))
      const pp = part.plants[0]
      const qty = pp.dailyUse * Number(rec.params.workingDaysPerMonth) * Number(rec.params.months)
      const asked = Number(q.match(/(\d+)\s*month/)?.[1] ?? 0)
      return {
        intent: 'raise_pr', steps: ['cost', 'sap'],
        blocks: [
          text((() => { const lock = s.recommendations.find((r) => r.kind === 'price_lock'); const locked = lock && env.rt[s.id]?.done.includes(lock.id); const lm = Number(lock?.params.months ?? 0); return asked && asked !== Number(rec.params.months) ? (locked ? `The price lock you already requested covers the next ${lm} months. Nexus recommends forward-buying ${rec.params.months} more month at today's price. Confirm to raise it in SAP.` : `Nexus recommends a ${lm}-month price lock first (on the copper signal), then forward-buying ${rec.params.months} more month at today's price. Here is that requisition; confirm to raise it in SAP.`) : 'Here is the requisition, pre-filled from SAP. Confirm to raise it.' })()),
          { kind: 'action', signalId: s.id, recId: rec.id, title: rec.title, writeBack: rec.writeBack, fields: [['Document type (EBAN-BSART)', 'NB, standard PR'], ['Material (EBAN-MATNR)', `${part.description} (${part.code})`], ['Quantity (EBAN-MENGE)', `${fmtNum(qty)} ${part.baseUom}`], ['Purchasing group (EBAN-EKGRP)', pp.purchasingGroup], ['Valuation price (EBAN-PREIS)', fmtInr(pp.movingPrice, { compact: false })], ['Plant (EBAN-WERKS)', pp.plant]] },
          src(['Purchase Requisition', 'EBAN-BANFN'], ['Planned delivery time', 'MARC-PLIFZ'], 'Cost Engine forecast'),
        ],
        followUps: ['What if copper goes up another 5%?', 'How much have we saved this quarter?'],
      }
    },
  },
  {
    id: 'action_generic',
    samples: ['Raise an alternate supplier request for the compressor', 'Air-freight the compressors', 'Return the blocked motors to the vendor'],
    keywords: ['raise', 'air', 'alternate', 'return', 'lock', 'approve', 'reduce'],
    score: (q) => (has(q, /^(raise|create|approve|air[- ]?freight|return|reduce|request|send|hold|shift|expedite|outsource|lock)\b/) ? 0.8 : 0),
    run: (q, _e, env) => {
      const qt = q.split(/\W+/).filter((w) => w.length > 3)
      let best: { s: Signal; r: Signal['recommendations'][number]; n: number } | null = null
      for (const s of env.signals.filter((x) => isOpen(env, x) && canSee(env, x))) for (const r of s.recommendations.filter((x) => !done(env, s).includes(x.id))) {
        const t = `${r.title} ${r.kind.replace(/_/g, ' ')}`.toLowerCase()
        const n = qt.filter((w) => t.includes(w)).length
        if (n > (best?.n ?? 0)) best = { s, r, n }
      }
      if (!best || best.n < 2) return { intent: 'action_generic', steps: [], blocks: [text('I could not find an open recommended action that matches. Open a signal to see its workflows.')], followUps: ['What should I focus on today?'] }
      const b = best
      return {
        intent: 'action_generic', steps: [b.s.sourceId, 'sap'],
        blocks: [
          text(`This runs the recommended workflow on ${b.s.id}. ${b.r.effect}`),
          { kind: 'action', signalId: b.s.id, recId: b.r.id, title: b.r.title, writeBack: b.r.writeBack, fields: [['Signal', b.s.title], ['Creates', `${b.r.target.recordType} in ${b.r.target.system}`], ['Owner role', getRole(env.db, b.r.ownerRoleId).name]] },
          src(`${b.r.target.system}`, 'Nexus workflow'),
        ],
        followUps: [`Why is ${b.s.id} ${b.s.severity}?`, 'How much have we saved this quarter?'],
      }
    },
  },
  {
    id: 'savings_quarter',
    samples: ['How much have we saved this quarter?', 'What value has Nexus delivered?'],
    keywords: ['saved', 'savings', 'value', 'quarter', 'delivered'],
    score: (q) => (has(q, /sav(ed|ing)|value.*(deliver|booked)|how much.*(save|value)/) && !has(q, /target/) ? 0.9 : 0),
    run: (_q, _e, env) => {
      const qtr = env.value.filter((e) => e.at >= QUARTER_START)
      const t = totals(qtr)
      const delivered = qtr.filter((e) => e.status !== 'identified').reduce((a, e) => a + e.amountInr, 0)
      const all = totals(env.value)
      return {
        intent: 'savings_quarter', steps: ['sap', 'cost', 'exim'],
        blocks: [
          text(`This quarter (Q3 FY27, from ${fmtDay(QUARTER_START)}) Nexus helped deliver ${fmtInr(delivered)} committed or better. ${fmtInr(t.byStatus.validated)} is finance-validated. Value types are kept separate.`),
          { kind: 'kpi', items: [{ label: 'Delivered this quarter', value: fmtInr(delivered), tone: 'good' }, { label: 'Finance-validated', value: fmtInr(t.byStatus.validated) }, { label: 'Awaiting validation', value: fmtInr(t.byStatus.realised), tone: 'attention' }, { label: 'FYTD, all statuses', value: fmtInr(all.total) }] },
          { kind: 'chart', chart: 'bar', x: 'type', data: (Object.keys(VT) as ValueType[]).map((k) => ({ type: VT[k], amount: Math.round(t.byType[k]) })), series: [{ key: 'amount', label: 'This quarter', tone: 'accent' }], unit: 'inr' },
          { kind: 'links', items: [{ label: 'Open the Value Ledger', to: '/value' }] },
          src('Value Ledger', ['GRN evidence', 'MSEG-BWART']),
        ],
        followUps: ["What's my savings vs target?", 'Where can we recover money?'],
        hi: `इस तिमाही Nexus ने ${fmtInr(delivered)} का मूल्य दिया, जिसमें से ${fmtInr(t.byStatus.validated)} वित्त द्वारा सत्यापित है।`,
      }
    },
  },
  {
    id: 'savings_target',
    samples: ["What's my savings vs target?", 'Are we on track for savings targets?'],
    keywords: ['target', 'savings', 'track'],
    score: (q) => (has(q, /target/) && has(q, /sav/) ? 0.92 : 0),
    run: (_q, _e, env) => ({
      intent: 'savings_target', steps: ['sap', 'cost'],
      blocks: [text('Hard saving and cost avoidance booked this financial year, against the targets set for your tenant.'), { kind: 'kpi', items: [kpi(env, 'savings_vs_target'), kpi(env, 'price_lock_savings'), kpi(env, 'pass_through_recoverable')] }, src('Value Ledger', 'Tenant savings targets')],
      followUps: ['Where can we recover money?', 'How much have we saved this quarter?'],
    }),
  },
  {
    id: 'launch_safe',
    samples: ['Is the Coolwave launch safe?', 'Is RND-CW-2027 on track?'],
    keywords: ['launch', 'safe', 'on track', 'coolwave'],
    score: (q, ents) => (has(q, /safe|on track|at risk|ok\b/) && (firstOf(ents, 'customer') || firstOf(ents, 'project') || firstOf(ents, 'model')) ? 0.93 : 0),
    run: (_q, ents, env) => {
      const proj = firstOf(ents, 'project')?.id ? getProject(env.db, firstOf(ents, 'project')!.id) : env.db.projects.find((p) => p.nextGate && (p.customer === firstOf(ents, 'customer')?.id || p.productModelId === firstOf(ents, 'model')?.id))
      if (!proj) return { intent: 'launch_safe', steps: ['rnd'], blocks: [text('I could not find a launch project for that.')], followUps: ['Which launches are at risk because of imports?'] }
      const rows: string[][] = []
      const links: string[] = []
      let gate = 0
      for (const s of env.signals.filter((x) => isOpen(env, x) && x.recommendations.length)) {
        if (s.type === 'shipment_delay') {
          const p = shipmentDetail(env.db, s, done(env, s)).projectSlips.find((x) => x.projectId === proj.id)
          if (p) { gate = Math.max(gate, p.gate?.slipDays ?? 0); rows.push(['Import delay', s.id, `${p.gate?.slipDays ?? p.slipDays} days gate slip`, `${p.slipDays} days build slip`]); links.push(`/signals/${s.id}`) }
        }
        if (s.type === 'tool_trial_fail') {
          const t = toolState(env.db, s, done(env, s))
          if (t.feeds.id === proj.id) { gate = Math.max(gate, t.gateSlip); rows.push(['Tool trial failure', s.id, `${t.gateSlip} days gate slip`, `FPA ready ${fmtDay(t.fpaReady)}`]); links.push(`/signals/${s.id}`) }
        }
        if (s.type === 'commodity_spike' && s.entityRefs.some((r) => r.kind === 'project' && getProject(env.db, r.id).productModelId === proj.productModelId)) {
          const k = commodityRows(env.db, s, done(env, s))
          if (k.perUnit) { rows.push(['Commodity spike', s.id, 'No gate impact', `+${fmtInr(k.perUnit, { compact: false })} should-cost per unit`]); links.push(`/signals/${s.id}`) }
        }
      }
      const verdict = gate > 0 ? `Not safe yet. The ${proj.nextGate?.name ?? 'next gate'} (${fmtDay(proj.nextGate!.planned)}) is ${gate} days at risk; causes below run in parallel, so the gate moves by the worst one, not the sum. Cost and days are separate impacts.` : `On track for the ${proj.nextGate?.name ?? 'next gate'} on ${fmtDay(proj.nextGate!.planned)}. ${rows.length ? 'Remaining risks are cost, not dates.' : ''}`
      return {
        intent: 'launch_safe', steps: ['exim', 'tooling', 'cost', 'rnd'],
        blocks: [text(`${proj.title}: ${verdict}`), ...(rows.length ? [{ kind: 'table', head: ['Cause', 'Signal', 'Date impact', 'Other impact'], rows, links } as Block] : []), { kind: 'links', items: [{ label: `Open ${proj.id}`, to: `/projects/${proj.id}` }] }, src('EXIM', 'Tooling NTD', 'Cost Engine', 'R&D Control Tower')],
        followUps: ['Which launches are at risk because of imports?', 'What if copper goes up another 5%?'],
        hi: gate > 0 ? `${proj.title}: लॉन्च अभी सुरक्षित नहीं है। गेट ${gate} दिन पीछे जा सकता है।` : `${proj.title}: लॉन्च समय पर है।`,
      }
    },
  },
  {
    id: 'who_told',
    samples: ['Who would be told if Hanbit Copper Tube is late?', 'Who gets this if Shenghai Compressor is delayed?'],
    keywords: ['who', 'told', 'notified', 'late', 'gets'],
    score: (q, ents) => (has(q, /who (would|will|gets|is)|who.*(told|notified|know)/) && firstOf(ents, 'vendor') ? 0.95 : 0),
    run: (_q, ents, env) => {
      const v = getVendor(env.db, firstOf(ents, 'vendor')!.id)
      const parts = env.db.parts.filter((p) => p.vendors.includes(v.id))
      const ships = env.db.shipments.filter((s) => s.vendorId === v.id)
      const plants = [...new Set(parts.flatMap((p) => p.plants.map((x) => x.plant)))]
      const projects = env.db.projects.filter((p) => p.needs.some((n) => parts.some((x) => x.code === n.partCode)))
      const hyp: Signal = {
        id: 'HYPOTHETICAL', sourceId: 'exim', type: 'shipment_delay', severity: 'critical', title: `${v.name} late`, summary: '', raisedAt: `${DEMO_TODAY}T10:30:00+05:30`, firstKnownAt: `${DEMO_TODAY}T10:30:00+05:30`, firstKnownBy: 'EXIM', status: 'new', ruleId: 'R-EXIM-ETA-SLIP', recommendations: [],
        entityRefs: [{ kind: 'vendor', id: v.id }, ...ships.slice(0, 1).map((s) => ({ kind: 'shipment' as const, id: s.ref })), ...parts.map((p) => ({ kind: 'part' as const, id: p.code })), ...plants.map((p) => ({ kind: 'plant' as const, id: p })), ...projects.map((p) => ({ kind: 'project' as const, id: p.id }))],
      }
      const aud = computeAudience(env.db, env.users, hyp)
      return {
        intent: 'who_told', steps: ['vendor', 'exim', 'sap'],
        blocks: [
          text(`If ${v.name} (${v.sapVendor}) were late, Nexus would tell ${aud.length} people, worked out from role and scope. Nobody is listed by hand.`),
          { kind: 'table', head: ['Person', 'Role', 'Why'], rows: aud.map((r) => { const u = env.users.find((x) => x.id === r.userId)!; return [u.name, getRole(env.db, u.roleId).name, r.reasons.join('; ')] }) },
          src(['Vendor', 'LFA1-LIFNR'], ['Purchasing group', 'EKKO-EKGRP'], ['Plant', 'MARC-WERKS'], 'Role templates'),
        ],
        followUps: [`What's our exposure to ${v.name}?`, 'What should I focus on today?'],
      }
    },
  },
  {
    id: 'recover_money',
    samples: ['Where can we recover money?', 'Find money for me'],
    keywords: ['recover', 'money', 'claw', 'find money', 'opportunit'],
    score: (q) => (has(q, /recover|claw ?back|find (me )?money|opportunit|money on the table/) ? 0.94 : 0),
    run: (_q, _e, env) => {
      const rows: string[][] = []
      const links: string[] = []
      for (const s of env.signals.filter((x) => isOpen(env, x) && (x.type === 'pass_through' || x.type === 'ecn_obsolescence' || x.type === 'supplier_quality') && x.recommendations.length)) {
        const i = imp(env, s)!
        const next = s.recommendations.find((r) => !done(env, s).includes(r.id))
        rows.push([s.title, i.inrLabel, fmtInr(i.inrAtRisk), next?.title ?? 'All actions done'])
        links.push(`/signals/${s.id}`)
      }
      const total = rows.length ? env.signals.filter((x) => isOpen(env, x) && (x.type === 'pass_through' || x.type === 'ecn_obsolescence' || x.type === 'supplier_quality') && x.recommendations.length).reduce((a, s) => a + imp(env, s)!.inrAtRisk, 0) : 0
      return {
        intent: 'recover_money', steps: ['cost', 'sap', 'npd'],
        blocks: [text(rows.length ? `${fmtInr(total)} can be recovered or protected across ${rows.length} open opportunities. The biggest is the copper pass-through: before the new rise hits, claim back the fall.` : 'No open recovery opportunities right now.'), ...(rows.length ? [{ kind: 'table', head: ['Opportunity', 'Measure', 'Amount', 'Next step'], rows, links } as Block] : []), src(['PO price', 'EKPO-NETPR'], ['GRN', 'MSEG-BWART'], ['Stock', 'MARD-LABST'], 'Cost Engine')],
        followUps: ['How much have we saved this quarter?', "What's my savings vs target?"],
        hi: rows.length ? `${rows.length} अवसरों में ${fmtInr(total)} वसूल या सुरक्षित किए जा सकते हैं।` : undefined,
      }
    },
  },
  {
    id: 'daily_brief',
    samples: ['What should I focus on today?', 'Give me my brief'],
    keywords: ['focus', 'today', 'brief', 'priorit'],
    score: (q) => (has(q, /focus|today|brief|priorit|morning|what needs me/) ? 0.9 : 0),
    run: (_q, _e, env) => {
      const top = openMine(env).sort((a, b) => SEV[b.severity] - SEV[a.severity] || (imp(env, b)?.inrAtRisk ?? 0) - (imp(env, a)?.inrAtRisk ?? 0)).slice(0, 3)
      const first = env.user.name.split(' ')[0]
      return {
        intent: 'daily_brief', steps: ['exim', 'cost', 'sap', 'npd'],
        blocks: [
          text(top.length ? `Good morning ${first}. ${top.length} thing${top.length === 1 ? '' : 's'} need${top.length === 1 ? 's' : ''} you today, ranked by severity and money at risk.` : `Good morning ${first}. Nothing in your scope needs you today.`),
          ...(top.length ? [{ kind: 'table', head: ['Signal', 'Severity', 'At risk', 'Why you'], rows: top.map((s) => { const r = computeAudience(env.db, env.users, s).find((x) => x.userId === env.user.id); return [s.title, s.severity, imp(env, s) ? fmtInr(imp(env, s)!.inrAtRisk) : 'Not quantified', r?.reasons[0] ?? 'Leadership view'] }), links: top.map((s) => `/signals/${s.id}`) } as Block] : []),
          src('Signal Inbox', 'Role and scope'),
        ],
        followUps: top.length ? [`Why is ${top[0].id} ${top[0].severity}?`, 'How much have we saved this quarter?'] : ['How much have we saved this quarter?'],
        hi: top.length ? `सुप्रभात ${first}। आज ${top.length} चीज़ें आपका इंतज़ार कर रही हैं। सबसे ज़रूरी: ${top[0].title}।` : `सुप्रभात ${first}। आज कुछ ज़रूरी नहीं है।`,
      }
    },
  },
  {
    id: 'explain_movement',
    samples: ['What does movement type 122 mean?', 'What is movement 103?'],
    keywords: ['movement type', 'bwart', '101', '122'],
    score: (q) => (has(q, /movement( type)?\s*\d{3}|bwart/) ? 0.97 : 0),
    run: (q) => {
      const f = sapField('MSEG-BWART')
      const code = q.match(/\b(\d{3})\b/)?.[1]
      const map = Object.fromEntries([...f.detail.matchAll(/(\d{3}) = ([^,.]+)/g)].map((m) => [m[1], m[2].trim()]))
      return {
        intent: 'explain_movement', steps: ['sap'],
        blocks: [text(code && map[code] ? `Movement type ${code} means: ${map[code]}. ${f.description}` : f.detail), { kind: 'table', head: ['Code', 'Meaning'], rows: Object.entries(map).map(([k, v]) => [k, v]) }, src(['Movement Type', 'MSEG-BWART'])],
        followUps: ['What is ZDCS?', 'Why is this PO not released?'],
      }
    },
  },
  {
    id: 'explain_sap',
    samples: ['What is ZDCS?', 'What does EKKO-FRGZU mean?', 'What is the safety stock field?'],
    keywords: ['what is', 'mean', 'field', 'sap', 'condition'],
    score: (q) => {
      const cond = q.match(/\b(z[a-z0-9]{3}|drg1|drv1)\b/)?.[1]
      const tf = q.match(/\b([a-z0-9]{3,6}-[a-z0-9_]{3,12})\b/)?.[1]
      if ((cond && hasSapField(`COND-${cond.toUpperCase()}`)) || (tf && hasSapField(tf.toUpperCase()) && has(q, /what|mean|explain/))) return 0.9
      return has(q, /\bfield\b/) && has(q, /what|mean/) ? 0.85 : 0
    },
    run: (q) => {
      const cond = q.match(/\b(z[a-z0-9]{3}|drg1|drv1)\b/)?.[1]?.toUpperCase()
      const tf = q.match(/\b([a-z0-9]{3,6}-[a-z0-9_]{3,12})\b/)?.[1]?.toUpperCase()
      const code = cond && hasSapField(`COND-${cond}`) ? `COND-${cond}` : tf && hasSapField(tf) ? tf : undefined
      const f = code ? sapField(code) : SAP_FIELDS.find((x) => q.replace(/what is|what does|the|field|mean|\?/g, ' ').trim().split(/\s+/).filter((w) => w.length > 3).every((w) => x.label.toLowerCase().includes(w)))
      if (!f) return { intent: 'explain_sap', steps: ['sap'], blocks: [text("That code is not in the client's SAP field dictionary. Try the SAP Field Explorer.")], followUps: ['What does movement type 122 mean?'] }
      return {
        intent: 'explain_sap', steps: ['sap'],
        blocks: [text(`${f.label} (${f.tableField}): ${f.detail}`), { kind: 'kpi', items: [{ label: 'Report', value: f.report }, { label: 'Data type', value: f.dataType || 'n/a' }, { label: 'Status', value: f.status === 'to_confirm' ? 'To confirm with client IT' : f.status === 'calculated' ? 'Calculated in report' : 'Confirmed' }] }, src([f.label, f.code])],
        followUps: ['What does movement type 122 mean?', 'Why is this PO not released?'],
      }
    },
  },
  {
    id: 'po_release',
    samples: ['Why is this PO not released?', 'Which POs are waiting for release?'],
    keywords: ['release', 'released', 'po', 'approval'],
    score: (q) => (has(q, /releas/) && has(q, /\bpos?\b|purchase order|order/) ? 0.93 : 0),
    run: (_q, ents, env) => {
      const f = sapField('EKKO-FRGZU')
      const pos = firstOf(ents, 'po') ? env.db.purchaseOrders.filter((p) => p.ebeln === firstOf(ents, 'po')!.id) : env.db.purchaseOrders
      const waiting = pos.filter((p) => p.releaseState !== 'Released')
      return {
        intent: 'po_release', steps: ['sap'],
        blocks: [text(`${f.label} (${f.tableField}) holds how far a PO has gone through its release strategy. ${waiting.length ? `${waiting.length} PO${waiting.length === 1 ? ' is' : 's are'} waiting for release.` : `All ${pos.length} POs in view are released, so none are blocked by approval.`}`), ...(waiting.length ? [{ kind: 'table', head: ['PO', 'Release state', 'Purchasing group'], rows: waiting.map((p) => [p.ebeln, p.releaseState, p.purchasingGroup]) } as Block] : []), src(['Release State', 'EKKO-FRGZU'], ['Release Strategy', 'EKKO-FRGSX'])],
        followUps: ['What does movement type 122 mean?'],
      }
    },
  },
  {
    id: 'explain_signal',
    samples: ['Why is SIG-2026-1142 critical?', 'Why is this critical?', 'Explain this signal'],
    keywords: ['why', 'critical', 'explain', 'signal'],
    score: (q, ents, env) => (has(q, /why|explain/) && firstOf(ents, 'signal') ? 0.96 : has(q, /why|explain/) && env.contextSignalId && has(q, /this|critical|high|signal/) ? 0.85 : 0),
    run: (_q, ents, env) => {
      const s = sig(env, firstOf(ents, 'signal')?.id ?? env.contextSignalId ?? '')
      if (!s) return { intent: 'explain_signal', steps: [], blocks: [text('Which signal? Open one, or name its id.')], followUps: ['What should I focus on today?'] }
      if (!canSee(env, s)) return refuse('explain_signal', `${s.id} is outside your role and scope, so I cannot show its detail. Its owner has been told.`, ['What should I focus on today?'])
      const i = imp(env, s)
      const aud = computeAudience(env.db, env.users, s)
      return {
        intent: 'explain_signal', steps: [s.sourceId, 'sap'],
        blocks: [
          text(`${s.title}. It is ${s.severity} because ${i ? `${i.inrLabel.toLowerCase()} is ${fmtInr(i.inrAtRisk)} (${i.inrFormula})` : 'it touches parts, plants and people in scope'}. First known by ${s.firstKnownBy}; ${aud.length} people are told.`),
          ...(i ? [{ kind: 'table', head: ['Measure', 'Value'], rows: i.metrics.map((m) => [m.label, m.value]) } as Block] : []),
          ...(s.recommendations.length ? [{ kind: 'table', head: ['Recommended action', 'Owner'], rows: s.recommendations.map((r) => [`${done(env, s).includes(r.id) ? 'Done: ' : ''}${r.title}`, getRole(env.db, r.ownerRoleId).name]) } as Block] : []),
          { kind: 'links', items: [sigLink(s)] },
          src(i?.inrSource ?? 'Signal rule', `Rule ${s.ruleId}`),
        ],
        followUps: ['Who knows about this?', 'What should I focus on today?'],
      }
    },
  },
  {
    id: 'who_knows_signal',
    samples: ['Who knows about this?', 'Who was told about SIG-2026-1139?'],
    keywords: ['who knows', 'who was told'],
    score: (q, ents, env) => (has(q, /who (knows|was told|has seen)/) && (firstOf(ents, 'signal') || env.contextSignalId) ? 0.95 : 0),
    run: (_q, ents, env) => {
      const s = sig(env, firstOf(ents, 'signal')?.id ?? env.contextSignalId ?? '')!
      const aud = computeAudience(env.db, env.users, s)
      const acks = env.rt[s.id]?.acks ?? {}
      return { intent: 'who_knows_signal', steps: [s.sourceId], blocks: [text(`${aud.length} people have ${s.id}; ${Object.keys(acks).length} acknowledged.`), { kind: 'table', head: ['Person', 'Why', 'Seen'], rows: aud.map((r) => [env.users.find((u) => u.id === r.userId)!.name, r.reasons.join('; '), acks[r.userId] ? 'Acknowledged' : 'Not yet']) }, src('Computed audience')], followUps: [`Why is ${s.id} ${s.severity}?`] }
    },
  },
  {
    id: 'entity_status',
    samples: ['Status of ATF-IMP-2026-066', 'Show part 320001180', 'Tell me about NCD-FY-2026-0041'],
    keywords: ['status', 'show', 'tell me about', 'where is'],
    score: (q, ents) => (ents.some((e) => ['shipment', 'part', 'project', 'po', 'tool', 'capex'].includes(e.kind) && e.score >= 0.9) && has(q, /status|show|tell|where|about|details?/) ? 0.85 : ents.some((e) => ['shipment', 'po'].includes(e.kind)) ? 0.6 : 0),
    run: (_q, ents, env) => {
      const e = ents.find((x) => ['shipment', 'part', 'project', 'po', 'tool', 'capex'].includes(x.kind))!
      const related = env.signals.filter((s) => s.entityRefs.some((r) => r.id === e.id))
      const tail: Block[] = [...(related.length ? [{ kind: 'links', items: related.map(sigLink) } as Block] : [])]
      if (e.kind === 'shipment') {
        const s = getShipment(env.db, e.id)
        const late = s.etaRevised && s.etaRevised > s.etaPlanned
        return { intent: 'entity_status', steps: ['exim', 'sap'], blocks: [text(`${s.ref}: ${getVendor(env.db, s.vendorId).name}, ${s.pol} to ${s.pod}, stage ${s.stage.replace(/_/g, ' ')}. ${late ? `ETA moved from ${fmtDay(s.etaPlanned)} to ${fmtDay(s.etaRevised!)}. ${s.delayReason ?? ''}` : `ETA ${fmtDay(s.etaPlanned)}, on plan.`}`), { kind: 'table', head: ['Part', 'Qty', 'Containers'], rows: s.lines.map((l) => [getPart(env.db, l.partCode).description, fmtNum(l.qty), s.containers.map((c) => `${c.no} (${c.type})`).join(', ')]) }, { kind: 'links', items: [{ label: `Open ${s.ref}`, to: `/shipments/${s.ref}` }] }, ...tail, src('EXIM shipment', ['Delivery date', 'EKET-EINDT'])], followUps: ['Which launches are at risk because of imports?'] }
      }
      if (e.kind === 'part') {
        const p = getPart(env.db, e.id)
        return { intent: 'entity_status', steps: ['sap'], blocks: [text(`${p.description} (${p.code}), L4 Commodity ${p.commodityHierarchy.l4}, ${p.sourcingType}.`), { kind: 'table', head: ['Plant', 'Unrestricted', 'Safety stock', 'Lead time', 'Moving price'], rows: p.plants.map((pp) => [getPlant(env.db, pp.plant).name, fmtNum(stockOf(env.db, p.code, pp.plant).unrestricted), fmtNum(pp.safetyStock), `${pp.plannedDelivDays} days`, fmtInr(pp.movingPrice, { compact: false })]) }, { kind: 'links', items: [{ label: `Open part ${p.code}`, to: `/parts/${p.code}` }, ...related.map(sigLink)] }, src(['Material', 'MARA-MATNR'], ['Unrestricted', 'MARD-LABST'], ['Safety Stock', 'MARC-EISBE'], ['Planned Deliv. Time', 'MARC-PLIFZ'], ['Moving price', 'MBEW-VERPR'])], followUps: [`Who would be told if ${getVendor(env.db, p.vendors[0]).name} is late?`] }
      }
      if (e.kind === 'project') {
        const p = getProject(env.db, e.id)
        return { intent: 'entity_status', steps: ['npd', 'rnd'], blocks: [text(`${p.id}: ${p.title}. Stage ${p.stage}. Owner ${env.users.find((u) => u.id === p.ownerId)?.name ?? 'unassigned'}.${p.nextGate ? ` Next gate: ${p.nextGate.name} on ${fmtDay(p.nextGate.planned)}.` : ''}${p.cutIn ? ` Cut-in ${fmtDay(p.cutIn)}.` : ''}`), { kind: 'links', items: [{ label: `Open ${p.id}`, to: `/projects/${p.id}` }, ...related.map(sigLink)] }, src('NPD', 'R&D Control Tower')], followUps: p.customer ? [`Is the ${p.customer} launch safe?`] : ['What should I focus on today?'] }
      }
      if (e.kind === 'po') {
        const po = env.db.purchaseOrders.find((x) => x.ebeln === e.id)!
        return { intent: 'entity_status', steps: ['sap'], blocks: [text(`PO ${po.ebeln} (${po.docType}) with ${getVendor(env.db, po.vendorId).name}, dated ${fmtDay(po.docDate)}, release state ${po.releaseState}.`), { kind: 'table', head: ['Item', 'Material', 'Qty', 'Net price', 'Delivery'], rows: po.lines.map((l) => [l.item, getPart(env.db, l.material).description, fmtNum(l.qty), `${po.currency} ${l.netPrice}`, fmtDay(l.deliveryDate)]) }, ...tail, src(['Purchasing Document', 'EKKO-EBELN'], ['Net Price', 'EKPO-NETPR'], ['Delivery date', 'EKET-EINDT'])], followUps: ['Why is this PO not released?'] }
      }
      return { intent: 'entity_status', steps: [], blocks: [text(`${e.label} (${e.id}).`), ...tail], followUps: ['What should I focus on today?'] }
    },
  },
  {
    id: 'vendor_exposure',
    samples: ["What's our exposure to Hanbit Copper Tube?", 'How exposed are we to Sundara Precision Components?'],
    keywords: ['exposure', 'exposed', 'vendor', 'supplier'],
    score: (q, ents) => (has(q, /expos|depend|how much.*(with|from)/) && firstOf(ents, 'vendor') ? 0.93 : 0),
    run: (_q, ents, env) => {
      const v = getVendor(env.db, firstOf(ents, 'vendor')!.id)
      const fx = usdInr(env)
      const pos = env.db.purchaseOrders.filter((p) => p.vendorId === v.id && p.docDate >= '2026-09-01')
      const value = pos.reduce((a, p) => a + p.lines.reduce((x, l) => x + l.qty * l.netPrice * (p.currency === 'USD' ? fx : 1), 0), 0)
      const sigs = env.signals.filter((s) => isOpen(env, s) && s.entityRefs.some((r) => r.kind === 'vendor' && r.id === v.id))
      const atRisk = sigs.reduce((a, s) => a + (imp(env, s)?.inrAtRisk ?? 0), 0)
      return {
        intent: 'vendor_exposure', steps: ['vendor', 'sap', 'exim'],
        blocks: [text(`${v.name} (${v.sapVendor}), ${v.category}, ${v.country}. ${pos.length} recent POs worth ${fmtInr(value)}; ${sigs.length} open signal${sigs.length === 1 ? '' : 's'} with ${fmtInr(atRisk)} at risk.${v.indexClause ? ' The contract has an index-linked price clause.' : ''}`), { kind: 'kpi', items: [{ label: 'Recent PO value', value: fmtInr(value) }, { label: 'Open signals', value: fmtNum(sigs.length) }, { label: 'At risk', value: fmtInr(atRisk), tone: atRisk ? 'critical' : undefined }] }, { kind: 'links', items: [{ label: `Open ${v.name}`, to: `/vendors/${v.id}` }, ...sigs.map(sigLink)] }, src(['Vendor', 'LFA1-LIFNR'], ['Net Order Value', 'EKPO-NETWR'], 'USD/INR from the Cost Engine feed')],
        followUps: [`Who would be told if ${v.name} is late?`],
      }
    },
  },
  {
    id: 'commodity_trend',
    samples: ['Show the copper trend', 'How has aluminium moved over 90 days?'],
    keywords: ['trend', 'chart', 'price', 'moved'],
    score: (q, ents) => (firstOf(ents, 'commodity') && has(q, /trend|chart|moved|price|history|90/) && !has(q, /what if/) ? 0.88 : 0),
    run: (_q, ents, env) => {
      const c = env.db.commodities.find((x) => x.slug === firstOf(ents, 'commodity')!.id)!
      const from = addDays(DEMO_TODAY, -90)
      const f = forecast30(c)
      const data = [...c.series.filter((p) => p.d >= from).map((p) => ({ d: fmtDay(p.d), price: p.v })), ...c.forecast.map((p) => ({ d: fmtDay(p.d), forecast: p.mid }))]
      return {
        intent: 'commodity_trend', steps: ['cost'],
        blocks: [text(`${c.name} is ${fmtNum(latest(c))} ${c.unit} today: ${pct(changeOver(c, 14))} in 14 days and ${pct(changeOver(c, 90))} in 90 days. The 30-day forecast is ${pct(f.low)} to ${pct(f.high)}.`), { kind: 'chart', chart: 'line', x: 'd', data, series: [{ key: 'price', label: 'Price', tone: 'accent' }, { key: 'forecast', label: 'Forecast mid', tone: 'attention' }], unit: c.unit }, { kind: 'links', items: [{ label: `Open ${c.name}`, to: `/commodities/${c.slug}` }] }, src(`Cost Engine, ${c.name} feed (${c.unit})`)],
        followUps: [`What if ${c.slug} goes up another 5%?`],
      }
    },
  },
  {
    id: 'commodity_exposure',
    samples: ['What is my copper exposure this quarter?', 'How exposed are we to copper?'],
    keywords: ['exposure', 'copper', 'quarter'],
    score: (q, ents) => (has(q, /expos/) && firstOf(ents, 'commodity') && !firstOf(ents, 'vendor') ? 0.9 : 0),
    run: (_q, ents, env) => {
      const slug = firstOf(ents, 'commodity')!.id
      const s = env.signals.find((x) => x.type === 'commodity_spike' && x.recommendations.length && x.entityRefs.some((r) => r.kind === 'commodity' && r.id.toLowerCase() === slug))
      if (!s) return { intent: 'commodity_exposure', steps: ['cost'], blocks: [text(`No open exposure model for ${slug}.`)], followUps: [`Show the ${slug} trend`] }
      const i = imp(env, s)!
      return { intent: 'commodity_exposure', steps: ['cost', 'sap'], blocks: [text(`${i.inrLabel}: ${fmtInr(i.inrAtRisk)} (${i.inrFormula}).`), { kind: 'table', head: ['Measure', 'Value'], rows: i.metrics.map((m) => [m.label, m.value]) }, { kind: 'links', items: [sigLink(s)] }, src(i.inrSource)], followUps: [`What if ${slug} goes up another 5%?`, 'Raise a PR for 2 months of copper tube'] }
    },
  },
  {
    id: 'exposure_by_plant',
    samples: ['Show ₹ exposure by plant', 'Which plant has the most at risk?'],
    keywords: ['plant', 'by plant', 'exposure'],
    score: (q) => (has(q, /by plant|which plant|per plant|plants?.*(risk|expos)/) ? 0.9 : 0),
    run: (_q, _e, env) => {
      const by = new Map<string, number>()
      for (const s of openMine(env)) { const i = imp(env, s); if (i) by.set(i.plants[0], (by.get(i.plants[0]) ?? 0) + i.inrAtRisk) }
      const data = [...by.entries()].sort((a, b) => b[1] - a[1]).map(([p, v]) => ({ plant: getPlant(env.db, p).name, amount: Math.round(v) }))
      return { intent: 'exposure_by_plant', steps: ['sap', 'exim', 'cost'], blocks: [text(data.length ? `${data[0].plant} carries the most open risk in your scope.` : 'Nothing quantified is open in your scope.'), ...(data.length ? [{ kind: 'chart', chart: 'bar', x: 'plant', data, series: [{ key: 'amount', label: 'At risk', tone: 'critical' }], unit: 'inr' } as Block] : []), src('Engine impact of open signals', ['Plant', 'MARC-WERKS'])], followUps: ['What should I focus on today?'] }
    },
  },
  {
    id: 'supplier_quality',
    samples: ['Which supplier has quality problems?', 'Show the Sundara rejection trend'],
    keywords: ['quality', 'rejection', 'ppm', 'defect'],
    score: (q) => (has(q, /quality|reject|ppm|defect|8d/) && !has(q, /inspection file/) ? 0.88 : 0),
    run: (_q, _e, env) => {
      const s = ofType(env, 'supplier_quality')
      if (!s) return { intent: 'supplier_quality', steps: ['sap'], blocks: [text('No supplier quality signal is open.')], followUps: [] }
      const k = qualityState(env.db, s, done(env, s))
      return { intent: 'supplier_quality', steps: ['sap', 'vendor', 'npd'], blocks: [text(`${k.vendor.name}: rejection rate on ${k.part.description} rose to ${(k.rate * 100).toFixed(1)}% last week. ${fmtNum(k.st.qualityInsp)} units in QI and ${fmtNum(k.st.blocked)} blocked.`), { kind: 'chart', chart: 'bar', x: 'week', data: k.weeks.map((w) => ({ week: fmtDay(w.d), rate: Number((w.rate * 100).toFixed(2)) })), series: [{ key: 'rate', label: 'Rejection rate %', tone: 'critical' }], unit: '%' }, { kind: 'links', items: [sigLink(s)] }, src(['Movement Type', 'MSEG-BWART'], ['Quality Inspection', 'MARD-INSME'], ['Blocked Stock', 'MARD-SPEME'])], followUps: ['Which suppliers in the inspection file are also in active NPD projects?'] }
    },
  },
  {
    id: 'shipments_delayed',
    samples: ['Which shipments are delayed?', 'Show late shipments'],
    keywords: ['shipments', 'delayed', 'late'],
    score: (q) => (has(q, /shipments?/) && has(q, /delay|late|behind/) && !has(q, /launch|project/) ? 0.9 : 0),
    run: (_q, _e, env) => {
      const late = env.db.shipments.filter((s) => s.etaRevised && s.etaRevised > s.etaPlanned)
      return { intent: 'shipments_delayed', steps: ['exim'], blocks: [text(`${late.length} of ${env.db.shipments.length} shipments are late.`), ...(late.length ? [{ kind: 'table', head: ['Shipment', 'Vendor', 'Route', 'ETA planned', 'ETA revised'], rows: late.map((s) => [s.ref, getVendor(env.db, s.vendorId).name, `${s.pol} to ${s.pod}`, fmtDay(s.etaPlanned), fmtDay(s.etaRevised!)]), links: late.map((s) => `/shipments/${s.ref}`) } as Block] : []), src('EXIM shipment tracking')], followUps: ['Which launches are at risk because of imports?'] }
    },
  },
  {
    id: 'uploaded_data',
    samples: ['Which suppliers in the inspection file are also in active NPD projects?'],
    keywords: ['inspection file', 'uploaded', 'file', 'data drop'],
    score: (q) => (has(q, /inspection file|uploaded|the file|data drop|excel|csv/) ? 0.95 : 0),
    run: (_q, _e, env) => {
      const drop = env.db.dataDrops.find((d) => d.kind === 'incoming_inspection')
      if (!drop) return { intent: 'uploaded_data', steps: ['datadrop'], blocks: [text('No inspection file has been shared in this tenant yet.')], followUps: [] }
      const inFile = env.db.vendors.filter((v) => v.aliases.some((a) => a.sourceId === 'excel'))
      const rows = inFile.map((v) => {
        const npd = env.signals.flatMap((s) => (s.entityRefs.some((r) => r.kind === 'vendor' && r.id === v.id) ? s.entityRefs.filter((r) => r.kind === 'project').map((r) => getProject(env.db, r.id)) : [])).filter((p) => ['NCD', 'NPD', 'ECN', 'AS'].includes(p.type))
        return [v.name, v.aliases.find((a) => a.sourceId === 'excel')!.code, npd.length ? npd.map((p) => `${p.id} (${p.stage})`).join(', ') : 'None']
      })
      const both = rows.filter((r) => r[2] !== 'None')
      return { intent: 'uploaded_data', steps: ['datadrop', 'npd', 'sap'], blocks: [text(`${drop.fileName} names ${inFile.length} suppliers Nexus resolved to SAP vendors. ${both.length} ${both.length === 1 ? 'is' : 'are'} also in an active NPD project${both.length ? `: ${both.map((r) => r[0]).join(', ')}` : ''}.`), { kind: 'table', head: ['Supplier (golden record)', 'Name in the file', 'Active NPD work'], rows }, src(drop.fileName, ['Vendor', 'LFA1-LIFNR'], 'NPD')], followUps: ['Which supplier has quality problems?'] }
    },
  },
  {
    id: 'capex',
    samples: ['What is the capex budget across all plants?', 'How is capex utilisation?'],
    keywords: ['capex', 'budget', 'machine'],
    score: (q) => (has(q, /capex|capital|budget|machine/) ? 0.88 : 0),
    run: (q, _e, env) => {
      const all = env.user.scope.all || leader(env)
      if (!all && has(q, /all plants|across|group|company|every plant/)) {
        return refuse('capex', `Capex across all plants is visible to Finance and leadership. I can show capex for your plants (${env.user.scope.plants.map((p) => getPlant(env.db, p).name).join(', ') || 'none in scope'}).`, ['Show capex for my plant'])
      }
      const rows = env.db.capex.filter((c) => all || env.user.scope.plants.includes(c.plant))
      return { intent: 'capex', steps: ['capex', 'sap'], blocks: [text(all ? `Capex utilisation is ${kpi(env, 'capex_util').value} (${kpi(env, 'capex_util').sub ?? ''}).` : `Capex for your plants: ${rows.length} request${rows.length === 1 ? '' : 's'}.`), { kind: 'table', head: ['Request', 'Plant', 'Budget', 'Status', 'Delivery'], rows: rows.map((c) => [`${c.no} ${c.title}`, getPlant(env.db, c.plant).name, `₹ ${c.budgetCr.toFixed(2)} Cr`, c.status, c.deliveryRevised ? `${fmtDay(c.deliveryPlanned)} → ${fmtDay(c.deliveryRevised)}` : fmtDay(c.deliveryPlanned)]) }, src('Capex module', ['Asset code', 'ANLA-ANLN1'])], followUps: ['What should I focus on today?'] }
    },
  },
  {
    id: 'kpi_lookup',
    samples: ['What is our decision latency?', 'What is the ROI on Nexus?', 'How many launches are at risk?'],
    keywords: ['latency', 'roi', 'kpi', 'how many'],
    score: (q) => (KPIS.some((k) => k.label.toLowerCase().split(/\W+/).filter((w) => w.length > 3).filter((w) => q.includes(w)).length >= 2) || has(q, /\broi\b|latency/) ? 0.75 : 0),
    run: (q, _e, env) => {
      const k = KPIS.map((x) => ({ x, n: x.label.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && q.includes(w)).length + (q.includes('roi') && x.id === 'roi' ? 3 : 0) + (q.includes('latency') && x.id === 'decision_latency' ? 3 : 0) })).sort((a, b) => b.n - a.n)[0].x
      const r = k.compute(env)
      return { intent: 'kpi_lookup', steps: ['sap'], blocks: [{ kind: 'kpi', items: [{ label: k.label, value: r.display, sub: r.sub, tone: r.tone }] }, text(`Source: ${k.sourceFields}.`), { kind: 'links', items: [{ label: 'Drill down', to: k.drill }] }], followUps: ['How much have we saved this quarter?'] }
    },
  },
  {
    id: 'obsolescence',
    samples: ['Do we have obsolete stock from the ECN?', 'What happens to the old PCB revision?'],
    keywords: ['ecn', 'obsolete', 'cut-in', 'revision', 'excess'],
    score: (q) => (has(q, /ecn|obsolet|cut-?in|revision|excess stock/) ? 0.9 : 0),
    run: (_q, _e, env) => {
      const s = ofType(env, 'ecn_obsolescence')
      if (!s) return { intent: 'obsolescence', steps: ['npd'], blocks: [text('No ECN obsolescence signal is open.')], followUps: [] }
      const k = obsolescenceState(env.db, s, done(env, s))
      return { intent: 'obsolescence', steps: ['npd', 'sap'], blocks: [text(`${k.ecn.id} supersedes ${k.part.description} on ${fmtDay(k.cutIn)}. Stock ${fmtNum(k.stock)} plus open POs ${fmtNum(k.open)} against demand ${fmtNum(k.demand)} leaves ${fmtNum(k.excess)} units excess, ${fmtInr(k.excess * k.price)} at risk.`), { kind: 'links', items: [sigLink(s)] }, src(['Unrestricted', 'MARD-LABST'], ['Order Quantity', 'EKPO-MENGE'], ['Moving price', 'MBEW-VERPR'])], followUps: ['Where can we recover money?'] }
    },
  },
  {
    id: 'tooling',
    samples: ['How is the EPS mould trial going?', 'Which tools failed trials?'],
    keywords: ['tool', 'mould', 'mold', 'trial'],
    score: (q) => (has(q, /tool|mou?ld|trial/) ? 0.88 : 0),
    run: (_q, _e, env) => {
      const s = ofType(env, 'tool_trial_fail')
      if (!s) return { intent: 'tooling', steps: ['tooling'], blocks: [text('No tool trial signal is open.')], followUps: [] }
      const k = toolState(env.db, s, done(env, s))
      return { intent: 'tooling', steps: ['tooling', 'npd', 'rnd'], blocks: [text(`${k.tool.id} ${k.tool.title}: ${k.tool.trials.map((t) => `T${t.n} ${t.result === 'fail' ? `failed (${t.failedParams.join(', ')})` : 'passed'}`).join('; ')}. Commissioning moves to ${fmtDay(k.commissioning)}; FPA ready ${fmtDay(k.fpaReady)}; the ${k.feeds.nextGate!.name} slips ${k.gateSlip} days.`), { kind: 'links', items: [sigLink(s)] }, src('Tooling NTD trial report', 'NPD FPA lead time')], followUps: ['Is the Coolwave launch safe?'] }
    },
  },
  {
    id: 'demand',
    samples: ['What does the sales forecast say?', 'Is summer demand going up?'],
    keywords: ['forecast', 'demand', 'pre-booking', 'sales'],
    score: (q) => (has(q, /forecast|demand|pre-?booking|sales/) && !has(q, /commodity|copper|alumin/) ? 0.88 : 0),
    run: (_q, _e, env) => {
      const s = env.db.signals.find((x) => x.type === 'demand_uplift')
      if (!s || !env.ctx.dataDrops.includes(s.requiresDataDrop ?? '')) return { intent: 'demand', steps: ['datadrop'], blocks: [text('There is no sales system connected, and no sales forecast has been shared yet. Upload it in Bring Your Data and I will answer from it.'), { kind: 'links', items: [{ label: 'Bring your data', to: '/sources/new' }] }], followUps: [] }
      const k = demandState(env.db, s, done(env, s), env.ctx)
      return { intent: 'demand', steps: ['datadrop', 'sap', 'capex'], blocks: [text(`${k.drop.fileName} shows +${fmtNum(k.uplift)} units above plan for March to May. Compressors must be ordered by ${fmtDay(k.orderBy)}; the late fan-guard machine costs ${fmtNum(k.capacityLost)} parts of capacity.`), { kind: 'chart', chart: 'bar', x: 'month', data: k.rows.map((r) => ({ month: r.month, plan: r.baseline, forecast: r.forecast })), series: [{ key: 'plan', label: 'Plan', tone: 'info' }, { key: 'forecast', label: 'Forecast', tone: 'accent' }] }, { kind: 'links', items: [sigLink(s)] }, src(k.drop.fileName, ['Planned Deliv. Time', 'MARC-PLIFZ'])], followUps: ['Where can we recover money?'] }
    },
  },
  {
    id: 'landed_cost',
    samples: ['What is the landed cost of ATF-IMP-2026-066?', 'Break down the import charges'],
    keywords: ['landed', 'charges', 'freight', 'duty'],
    score: (q) => (has(q, /landed|charges|demurrage|detention/) ? 0.88 : 0),
    run: (_q, ents, env) => {
      const s = getShipment(env.db, firstOf(ents, 'shipment')?.id ?? env.db.shipments.find((x) => x.landedCost.length)!.ref)
      const total = s.landedCost.reduce((a, c) => a + c.amountInr, 0)
      return { intent: 'landed_cost', steps: ['exim', 'sap'], blocks: [text(`${s.ref} import charges booked so far: ${fmtInr(total)}. Each day past ${s.freeDaysAtPort} free days at port would add ${fmtInr(s.containers.length * (s.demurragePerContainerDay + s.detentionPerContainerDay))}.`), { kind: 'table', head: ['Condition', 'Name', 'Amount'], rows: s.landedCost.map((c) => [c.type, hasSapField(`COND-${c.type}`) ? sapField(`COND-${c.type}`).label : c.type, fmtInr(c.amountInr)]) }, src(['Ocean freight', 'COND-ZFR2'], ['Demurrage', 'COND-ZDCS'], ['Detention', 'COND-ZCDT'])], followUps: ['What is ZDCS?'] }
    },
  },
  {
    id: 'open_signals',
    samples: ['What is open?', 'How many signals do I have?'],
    keywords: ['open', 'signals', 'inbox'],
    score: (q) => (has(q, /signals|inbox|what('s| is) open/) ? 0.7 : 0),
    run: (_q, _e, env) => {
      const m = openMine(env)
      return { intent: 'open_signals', steps: ['sap'], blocks: [text(`${m.length} open signals in your scope, ${m.filter((s) => s.severity === 'critical').length} critical.`), { kind: 'links', items: m.slice(0, 6).map(sigLink) }], followUps: ['What should I focus on today?'] }
    },
  },
  {
    id: 'help',
    samples: ['What can you do?', 'Help'],
    keywords: ['help', 'can you'],
    score: (q) => (has(q, /^help$|what can you|how do i use/) ? 0.9 : 0),
    run: () => ({ intent: 'help', steps: [], blocks: [text('I answer across EXIM, SAP, NPD, Tooling, R&D, Capex, Vendor Management and any data you upload. I can look up any part, vendor, shipment or project, explain a signal and its numbers, run what-ifs, explain SAP fields, and start a workflow after you confirm. I only show what your role and scope allow.')], followUps: ['What should I focus on today?', 'What if copper goes up another 5%?', 'What does movement type 122 mean?'] }),
  },
]

// ---- Resolver ------------------------------------------------------------

export function resolveQuestion(question: string, env: Env): Answer {
  const q = question.toLowerCase().trim()
  const ents = matchEntities(env.db, question)
  const scored = INTENTS.map((i) => ({ i, s: i.score(q, ents, env) })).sort((a, b) => b.s - a.s)
  if (scored[0].s > 0) return scored[0].i.run(q, ents, env)
  // Fallback: the three closest intents by keyword overlap.
  const near = INTENTS.map((i) => ({ i, n: i.keywords.filter((k) => q.includes(k.split(' ')[0])).length })).sort((a, b) => b.n - a.n).slice(0, 3)
  return {
    intent: 'fallback', fallback: true, steps: [],
    blocks: [text("In the full product I'd query this live across your systems. Here's what I can show now:")],
    followUps: near.map((x) => x.i.samples[0]),
  }
}

export const INTENT_IDS = INTENTS.map((i) => i.id)
export const SAMPLES = Object.fromEntries(INTENTS.map((i) => [i.id, i.samples]))

/** Suggested prompts by role function and page. */
export function suggestions(fn: string, path: string, contextSignalId?: string): string[] {
  if (contextSignalId) return [`Why is ${contextSignalId} critical?`, 'Who knows about this?', 'What should I focus on today?']
  if (path.startsWith('/value')) return ['How much have we saved this quarter?', "What's my savings vs target?", 'Where can we recover money?']
  if (path.startsWith('/sources')) return ['What does movement type 122 mean?', 'What is ZDCS?', 'Which suppliers in the inspection file are also in active NPD projects?']
  const byFn: Record<string, string[]> = {
    Leadership: ['What should I focus on today?', 'Which launches are at risk because of imports?', 'How much have we saved this quarter?', 'Is the Coolwave launch safe?'],
    Sourcing: ['Where can we recover money?', 'What if copper goes up another 5%?', 'Raise a PR for 2 months of copper tube', "What's our exposure to Hanbit Copper Tube?"],
    Cost: ['What if copper goes up another 5%?', 'Show the copper trend', 'Where can we recover money?'],
    'NPD / R&D': ['Is the Coolwave launch safe?', 'Which launches are at risk because of imports?', 'How is the EPS mould trial going?'],
    EXIM: ['Which shipments are delayed?', 'Status of ATF-IMP-2026-066', 'What is the landed cost of ATF-IMP-2026-066?'],
    Quality: ['Which supplier has quality problems?', 'Which suppliers in the inspection file are also in active NPD projects?', 'What does movement type 122 mean?'],
    'Planning & plant': ['What should I focus on today?', 'Show ₹ exposure by plant', 'What is the capex budget across all plants?'],
    Finance: ['How much have we saved this quarter?', 'Where can we recover money?', 'What is the ROI on Nexus?'],
  }
  return byFn[fn] ?? ['What should I focus on today?', 'Who would be told if Hanbit Copper Tube is late?', 'What can you do?']
}
