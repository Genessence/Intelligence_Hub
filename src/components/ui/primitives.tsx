import * as Tooltip from '@radix-ui/react-tooltip'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { ModuleStatus, Severity, SignalStatus, SourceId, ValueStatus, ValueType } from '@/data/types'
import { sapField } from '@/data/sap'
import { fmtDateTime } from '@/engine/format'
import { DEMO_NOW } from '@/config/demoClock'
import { useNexus } from '@/store/useNexus'

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ')

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }>(
  ({ variant = 'secondary', size = 'md', className, ...p }, ref) => (
    <button
      ref={ref}
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-ctl)] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        variant === 'primary' && 'bg-accent-strong text-on-accent hover:bg-accent-strong-hover',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-surface-2',
        variant === 'ghost' && 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        variant === 'danger' && 'border border-line bg-surface text-critical hover:bg-critical-bg',
        className,
      )}
    />
  ),
)
Button.displayName = 'Button'

export function Card({ children, className, title, action, pad = true }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; pad?: boolean }) {
  return (
    <section className={cx('rounded-[var(--radius-card)] border border-line bg-surface shadow-card', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  )
}

const SEV: Record<Severity, string> = {
  critical: 'bg-critical-bg text-critical',
  high: 'bg-attention-bg text-attention',
  medium: 'bg-info-bg text-info',
  low: 'bg-surface-2 text-ink-2',
}
export const SeverityBadge = ({ s }: { s: Severity }) => (
  <span className={cx('inline-flex h-5 items-center rounded-full px-2 text-xs font-medium capitalize', SEV[s])}>{s}</span>
)

const STATUS: Record<SignalStatus, [string, string]> = {
  new: ['New', 'bg-info-bg text-info'],
  acknowledged: ['Acknowledged', 'bg-surface-2 text-ink'],
  in_action: ['In action', 'bg-attention-bg text-attention'],
  resolved: ['Resolved', 'bg-resolved-bg text-resolved'],
  dismissed: ['Dismissed', 'bg-surface-2 text-ink-3'],
}
export const StatusBadge = ({ s }: { s: SignalStatus }) => (
  <span className={cx('inline-flex h-5 items-center rounded-full px-2 text-xs font-medium', STATUS[s][1])}>{STATUS[s][0]}</span>
)

export const VALUE_TYPE_LABEL: Record<ValueType, string> = {
  hard: 'Hard saving', avoidance: 'Cost avoidance', cash: 'Cash released', revenue_protected: 'Revenue protected', penalty_avoided: 'Penalty avoided',
}
const VSTATUS: Record<ValueStatus, [string, string]> = {
  identified: ['Identified', 'bg-surface-2 text-ink-2'],
  committed: ['Committed', 'bg-info-bg text-info'],
  realised: ['Realised', 'bg-accent-soft text-accent-ink'],
  validated: ['Finance-validated', 'bg-resolved-bg text-resolved'],
}
export const ValueStatusBadge = ({ s }: { s: ValueStatus }) => (
  <span className={cx('inline-flex h-5 items-center rounded-full px-2 text-xs font-medium', VSTATUS[s][1])}>{VSTATUS[s][0]}</span>
)

export const SOURCE_LABEL: Record<SourceId, string> = {
  cost: 'Cost Engine', exim: 'EXIM', npd: 'NPD', tooling: 'Tooling', rnd: 'R&D', capex: 'Capex', vendor: 'Vendor Mgmt', quality: 'Quality', sap: 'SAP', datadrop: 'Data drop',
}
export const SourceChip = ({ id, label }: { id: SourceId; label?: string }) => (
  <span className="inline-flex h-5 items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 text-xs font-medium text-ink-2">
    <span className="size-2 rounded-full" style={{ background: `var(--src-${id})` }} aria-hidden />
    {label ?? SOURCE_LABEL[id]}
  </span>
)

export const ModuleBadge = ({ s }: { s: ModuleStatus }) => useNexus((x) => x.badgesHidden) ? null : (
  <span className={cx('inline-flex h-5 items-center rounded-md px-1.5 text-xs font-medium', s === 'Live' ? 'bg-accent-soft text-accent-ink' : s === 'Pilot' ? 'bg-info-bg text-info' : 'bg-surface-2 text-ink-2')}>{s}</span>
)

export const SimulatedTag = ({ what }: { what?: string }) => useNexus((s) => s.badgesHidden) ? null : (
  <Tip text={`Simulated in this concept${what ? `: ${what}` : ''}. In production this is a live integration.`}>
    <span tabIndex={0} className="inline-flex h-5 cursor-help items-center rounded-md border border-dashed border-line-strong px-1.5 text-xs font-medium text-ink-3">Simulated</span>
  </Tip>
)

export function Tip({ text, children }: { text: ReactNode; children: ReactNode }) {
  return (
    <Tooltip.Root delayDuration={150}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content sideOffset={6} className="z-50 max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink shadow-pop">
          {text}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

/** A number with hover provenance (section 12 rule: source + as-of on every number). */
export function Num({ children, source, className }: { children: ReactNode; source: string; className?: string }) {
  return (
    <Tip text={<><div className="font-medium">Source: {source}</div><div className="text-ink-3">As of {fmtDateTime(DEMO_NOW)}</div></>}>
      <span tabIndex={0} className={cx('num cursor-help underline decoration-line-strong decoration-dotted underline-offset-4', className)}>{children}</span>
    </Tip>
  )
}

/** SAP field chip: "Label · TABLE-FIELD". Invariant 7: the field must exist in Amber's dictionary. */
export function SapRef({ code, showLabel = false }: { code: string; showLabel?: boolean }) {
  const f = sapField(code)
  return (
    <Tip text={<><div className="font-medium">{f.label} <span className="font-mono text-ink-3">{f.tableField}</span></div><div className="mt-1 text-ink-2">{f.description}</div><div className="mt-1 text-ink-3">{f.report} · {f.dataType}{f.status === 'to_confirm' ? ' · To confirm with Amber IT' : ''}</div></>}>
      <span tabIndex={0} className="inline-flex cursor-help items-center gap-1 rounded border border-line bg-surface-2 px-1 font-mono text-xs text-ink-2">
        {showLabel && <span className="font-sans text-ink">{f.label}</span>}
        {code.startsWith('COND-') ? code.slice(5) : code}
      </span>
    </Tip>
  )
}

export function Kv({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="text-ink-2">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  )
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-ink" style={{ width: size, height: size, fontSize: Math.max(12, size * 0.38) }} aria-hidden>
      {initials}
    </span>
  )
}

export function Empty({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="text-ink-3">{icon}</div>
      <div className="text-sm font-medium text-ink">{title}</div>
      <div className="max-w-sm text-xs text-ink-2">{body}</div>
    </div>
  )
}
