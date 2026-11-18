import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Recommendation, Signal, ValueEntry, CreatedRecord } from '@/data/types'
import { useNexus, useCurrentUser, useDb, useCtx } from '@/store/useNexus'
import { previewBooking, type Booking } from '@/engine/scenarios'
import { fmtDay, fmtInr, fmtNum } from '@/engine/format'
import { getPart, getPlant, getRole, getVendor } from '@/engine/lookup'
import { addDays } from '@/engine/dates'
import { DEMO_TODAY } from '@/config/demoClock'
import { Button, cx, Kv, SapRef, SimulatedTag, VALUE_TYPE_LABEL, ValueStatusBadge } from './ui/primitives'

export function WorkflowDialog({ signal, rec, open, onClose }: { signal: Signal; rec: Recommendation; open: boolean; onClose: () => void }) {
  const db = useDb()
  const ctx = useCtx()
  const user = useCurrentUser()!
  const { signals, completeRecommendation } = useNexus()
  const done = signals[signal.id].done
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<{ entries: ValueEntry[]; record?: CreatedRecord } | null>(null)
  const p = previewBooking(db, signal, rec, done, ctx)
  const last = rec.steps.length - 1
  const ownerRole = getRole(db, rec.ownerRoleId)

  const finish = () => {
    const r = completeRecommendation(signal.id, rec.id)
    setResult(r)
    toast.success(`${r.record?.recordType} ${r.record?.ref} created in ${r.record?.system}`)
  }
  const close = () => { onClose(); setTimeout(() => { setStep(0); setResult(null) }, 200) }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40" style={{ background: 'var(--overlay)' }} />
        <Dialog.Content className="page-enter fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-ink-3">{rec.target.system} · {rec.target.recordType}{rec.writeBack && <span className="rounded bg-info-bg px-1.5 font-medium text-info">SAP write-back</span>}</div>
              <Dialog.Title className="text-base font-semibold text-ink">{rec.title}</Dialog.Title>
              <Dialog.Description className="sr-only">Workflow steps for {rec.title}</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close"><X size={18} /></Dialog.Close>
          </div>

          {!result && (
            <ol className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3 text-xs" aria-label="Steps">
              {rec.steps.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={cx('inline-flex size-5 items-center justify-center rounded-full text-[12px] font-semibold', i < step ? 'bg-accent-strong text-on-accent' : i === step ? 'border border-accent text-accent-ink' : 'border border-line text-ink-3')}>{i < step ? <Check size={12} /> : i + 1}</span>
                  <span className={i === step ? 'font-medium text-ink' : 'text-ink-3'}>{s}</span>
                  {i < last && <ChevronRight size={14} className="text-ink-3" aria-hidden />}
                </li>
              ))}
            </ol>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {result ? <Done result={result} writeBack={!!rec.writeBack} /> : step === 0 ? <dl className="divide-y divide-line"><Params signal={signal} rec={rec} done={done} /></dl> : step < last ? <Approval rec={rec} ownerRole={ownerRole.name} userName={user.name} /> : <Preview p={p} rec={rec} />}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
            <div className="text-xs text-ink-3">{result ? 'Logged to the audit trail' : `Step ${step + 1} of ${rec.steps.length}`}</div>
            <div className="flex gap-2">
              {result ? <Button variant="primary" onClick={close}>Done</Button> : (
                <>
                  {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
                  {step < last ? <Button variant="primary" onClick={() => setStep(step + 1)}>Continue</Button> : <Button variant="primary" onClick={finish}>{finishLabel(rec)}</Button>}
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const finishLabel = (rec: Recommendation) =>
  rec.target.system === 'Email' ? 'Send' : rec.writeBack ? 'Approve and write to SAP' : `Create ${rec.target.recordType.toLowerCase()}`

function Params({ signal, rec, done }: { signal: Signal; rec: Recommendation; done: string[] }) {
  const db = useDb()
  const n = (k: string) => Number(rec.params[k])
  const partRef = signal.entityRefs.find((r) => r.kind === 'part')?.id
  const part = partRef ? getPart(db, partRef) : undefined
  const plantRef = signal.entityRefs.find((r) => r.kind === 'plant')?.id
  const plant = plantRef ? getPlant(db, plantRef) : undefined
  const plantName = plant ? `${plant.name} (${plant.sapPlant})` : ''
  const doneTitles = signal.recommendations.filter((r) => done.includes(r.id) && r.target.system !== 'Email').map((r) => r.title.toLowerCase())
  switch (rec.kind) {
    case 'air_freight_partial': {
      const role = getRole(db, rec.ownerRoleId)
      const limit = role.approvals.find((a) => a.type === 'air_freight')?.limitInr
      return (
        <>
          <Kv label={<span className="flex items-center gap-2">Material <SapRef code="MARA-MATNR" /></span>}>{part?.description}</Kv>
          <Kv label="Quantity">{fmtNum(n('qty'))} units</Kv>
          <Kv label="Route">{String(rec.params.origin)} to {String(rec.params.destination)}, then road to {plantName}</Kv>
          <Kv label="Lands at plant">{fmtDay(addDays(DEMO_TODAY, n('transitDays')))}</Kv>
          <Kv label={<span className="flex items-center gap-2">Freight condition <SapRef code="COND-ZFR1" /></span>}>{fmtInr(n('airCostPerUnitInr'), { compact: false })} per unit</Kv>
          {limit && <Kv label="Approver limit">{role.name}, up to {fmtInr(limit)}</Kv>}
        </>
      )
    }
    case 'alternate_supplier': {
      const v = getVendor(db, String(rec.params.vendorId))
      const at = getPlant(db, String(rec.params.approvedAt))
      return (
        <>
          <Kv label={<span className="flex items-center gap-2">Material <SapRef code="MARA-MATNR" /></span>}>{part?.description}</Kv>
          <Kv label={<span className="flex items-center gap-2">Alternate vendor <SapRef code="LFA1-LIFNR" /></span>}>{v.name} ({v.sapVendor})</Kv>
          <Kv label="Approved today at">{at.name} ({at.sapPlant}), approved manufacturer list</Kv>
          <Kv label="Extend approval to">{plantName}</Kv>
          <Kv label="Quantity">{fmtNum(n('qty'))} units</Kv>
          <Kv label="First delivery">{fmtDay(addDays(DEMO_TODAY, n('firstDeliveryDays')))}</Kv>
        </>
      )
    }
    case 'resequence':
      return (<><Kv label="Build">{signal.entityRefs.find((r) => r.kind === 'project')?.id}</Kv><Kv label="Draw from stock">{fmtNum(n('qty'))} units of {part?.description} at {plantName}</Kv><Kv label="Lab slot">Keep the booked psychrometric lab slot</Kv></>)
    case 'forward_buy': {
      const fp = getPart(db, String(rec.params.partCode))
      const pp = fp.plants[0]
      return (<><Kv label={<span className="flex items-center gap-2">Document type <SapRef code="EBAN-BSART" /></span>}>NB, standard PR</Kv><Kv label={<span className="flex items-center gap-2">Material <SapRef code="EBAN-MATNR" /></span>}>{fp.description}</Kv><Kv label={<span className="flex items-center gap-2">Quantity <SapRef code="EBAN-MENGE" /></span>}>{fmtNum(pp.dailyUse * n('workingDaysPerMonth') * n('months'))} {fp.baseUom}</Kv><Kv label={<span className="flex items-center gap-2">Purchasing group <SapRef code="EBAN-EKGRP" /></span>}>{pp.purchasingGroup}</Kv><Kv label={<span className="flex items-center gap-2">Valuation price <SapRef code="EBAN-PREIS" /></span>}>{fmtInr(pp.movingPrice, { compact: false })}</Kv></>)
    }
    case 'notify_customer':
    case 'price_revision_notice':
      return (
        <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
          <p className="mb-2 text-ink">Subject: {rec.kind === 'notify_customer' ? 'Compressor supply update for your 2027 line-up' : 'Commodity price revision, next quarter'}</p>
          <p>{rec.kind === 'notify_customer'
            ? `We have a compressor shipment delay from origin. ${doneTitles.length ? `We have already acted: ${doneTitles.join('; ')}.` : 'We are working on recovery options now.'} We will confirm the PP gate date this week.`
            : 'Under the commodity clause of our agreement, the copper index movement this month triggers a price review for next quarter. Details attached.'}</p>
          <div className="mt-2"><SimulatedTag what="email" /></div>
        </div>
      )
    default:
      return (<><Kv label="What it does">{rec.effect}</Kv>{Object.entries(rec.params).filter(([k]) => k !== 'recordRef').map(([k, v]) => <Kv key={k} label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}>{typeof v === 'number' ? (k.toLowerCase().includes('inr') ? fmtInr(v) : /share|rate|pct/i.test(k) ? `${(v * 100).toFixed(1)}%` : fmtNum(v)) : String(v)}</Kv>)}</>)
  }
}

function Approval({ rec, ownerRole, userName }: { rec: Recommendation; ownerRole: string; userName: string }) {
  return (
    <dl className="divide-y divide-line">
      <Kv label="Owner role">{ownerRole}</Kv>
      <Kv label="Raised by">{userName}</Kv>
      <Kv label="Effect">{rec.effect}</Kv>
      {rec.writeBack && <Kv label="SAP write-back">Needs your approval here. Nexus then posts to SAP and logs the document number. <SimulatedTag what="SAP write-back" /></Kv>}
    </dl>
  )
}

function Preview({ p, rec }: { p: Booking; rec: Recommendation }) {
  const metrics = p.before.metrics.map((m, i) => ({ label: m.label, a: m.value, b: p.after.metrics[i]?.value ?? m.value })).filter((m) => m.a !== m.b)
  return (
    <div className="space-y-4">
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Delta label={p.before.inrLabel} a={fmtInr(p.before.inrAtRisk)} b={fmtInr(p.after.inrAtRisk)} />
        {metrics.slice(0, 3).map((m) => <Delta key={m.label} label={m.label} a={m.a} b={m.b} />)}
        {p.costInr > 0 && <div className="rounded-lg border border-line p-3"><div className="text-xs text-ink-3">Cost of this action</div><div className="num mt-1 font-semibold text-ink">{fmtInr(p.costInr)}</div><div className="mt-0.5 text-xs text-ink-2">{p.costLabel}</div></div>}
      </div>
      {p.tradeOff && <p className="rounded-lg bg-attention-bg px-3 py-2 text-sm text-attention">{p.tradeOff}</p>}
      <div>
        <div className="mb-2 text-xs font-medium text-ink-3">Value Nexus will book as Committed</div>
        {p.entries.length === 0 && <p className="text-sm text-ink-2">{p.note ?? (rec.target.system === 'Email' ? 'No value booked. This is a communication action.' : 'No value booked: this action does not reduce the remaining risk after the actions already taken.')}</p>}
        {p.entries.map((e, i) => (
          <div key={i} className="mb-2 rounded-lg border border-line p-3">
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-ink">{VALUE_TYPE_LABEL[e.type]}</span><span className="num font-semibold text-ink">{fmtInr(e.amountInr)}</span></div>
            <div className="num mt-1 text-xs text-ink-2">{e.formula}</div>
            <div className="mt-0.5 text-xs text-ink-3">Baseline: {e.baseline.kind}, {e.baseline.value}</div>
          </div>
        ))}
        {p.entries.length > 0 && p.note && <p className="text-xs text-ink-3">{p.note}</p>}
      </div>
    </div>
  )
}

const Delta = ({ label, a, b }: { label: string; a: string; b: string }) => (
  <div className="rounded-lg border border-line p-3">
    <div className="text-xs text-ink-3">{label}</div>
    <div className="num mt-1 flex flex-wrap items-baseline gap-2">{a === b ? <><span className="font-semibold text-ink">{b}</span><span className="text-xs text-ink-3">no change</span></> : <><span className="text-ink-3 line-through">{a}</span><span className="font-semibold text-ink">{b}</span></>}</div>
  </div>
)

function Done({ result, writeBack }: { result: { entries: ValueEntry[]; record?: CreatedRecord }; writeBack: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-resolved-bg px-3 py-3 text-resolved">
        <Check size={18} />
        <div className="text-sm font-medium">{result.record?.recordType} <span className="font-mono">{result.record?.ref}</span> created in {result.record?.system}</div>
        <span className="ml-auto"><SimulatedTag what={writeBack ? 'SAP write-back' : `write to ${result.record?.system}`} /></span>
      </div>
      {result.entries.map((e) => (
        <div key={e.id} className="rounded-lg border border-line p-3">
          <div className="flex items-center justify-between"><span className="font-mono text-xs text-ink-3">{e.id}</span><ValueStatusBadge s={e.status} /></div>
          <div className="mt-1 flex items-baseline justify-between"><span className="text-sm text-ink">{VALUE_TYPE_LABEL[e.type]}</span><span className="num font-semibold text-ink">{fmtInr(e.amountInr)}</span></div>
          <div className="num mt-1 text-xs text-ink-2">{e.formula}</div>
        </div>
      ))}
      {result.entries.length > 0 && <p className="text-xs text-ink-3">It turns Realised when SAP evidence arrives (for example a GRN, movement 101, at the new terms), then Finance validates it.</p>}
    </div>
  )
}
