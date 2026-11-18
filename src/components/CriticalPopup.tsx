// Critical-signal pop-up (spec 6.5): on login, and whenever a signal is fired live, for users in its computed audience.
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useNexus, useCurrentUser, useDb, useTenantUsers, useVisibleSignals, useCtx } from '@/store/useNexus'
import { computeAudience } from '@/engine/audience'
import { impactOf } from '@/engine/scenarios'
import { fmtInr } from '@/engine/format'
import { Button, SeverityBadge, SourceChip } from './ui/primitives'

export function CriticalPopup() {
  const user = useCurrentUser()
  const db = useDb()
  const ctx = useCtx()
  const users = useTenantUsers()
  const signals = useVisibleSignals()
  const { signals: rt, popupsSeen, pendingPush, markPopupSeen, clearPush } = useNexus()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const seen = user ? popupsSeen[user.id] ?? [] : []
  const inAudience = (id: string) => !!user && computeAudience(db, users, db.signals.find((s) => s.id === id)!).some((r) => r.userId === user.id)
  const list = user
    ? signals.filter((s) => {
        const r = rt[s.id]
        if (['resolved', 'dismissed'].includes(r.status) || r.acks[user.id] || seen.includes(s.id)) return false
        // Critical or live signals pop for everyone in the audience; a newly added user also sees open high ones (spec 6.6).
        const pops = s.severity === 'critical' || !!r.liveAt || (!!user.addedInDemo && s.severity === 'high')
        return pops && inAudience(s.id)
      }).slice(0, 3)
    : []

  // On login: open if anything new and critical is waiting.
  const onboarding = useLocation().pathname === '/onboarding'
  useEffect(() => { if (user && list.length && !onboarding) setOpen(true) }, [user?.id, onboarding]) // eslint-disable-line react-hooks/exhaustive-deps

  // On a live-fired signal: toast for the audience, open the pop-up, then clear the push.
  useEffect(() => {
    if (!pendingPush || !user) return
    const s = db.signals.find((x) => x.id === pendingPush.signalId)
    if (s && inAudience(s.id)) {
      toast.error(`New ${s.severity} signal: ${s.title}`, { action: { label: 'Open', onClick: () => navigate(`/signals/${s.id}`) } })
      setOpen(true)
    }
    clearPush()
  }, [pendingPush]) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { markPopupSeen(list.map((s) => s.id)); setOpen(false) }
  if (!user || !list.length) return null

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40" style={{ background: 'var(--overlay)' }} />
        <Dialog.Content className="page-enter fixed top-1/2 left-1/2 z-50 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-5 shadow-pop">
          <div className="flex items-center gap-2 text-critical"><AlertTriangle size={18} /><Dialog.Title className="text-base font-semibold text-ink">{list.length === 1 ? '1 signal needs you now' : `${list.length} signals need you now`}</Dialog.Title></div>
          <Dialog.Description className="mt-1 text-sm text-ink-2">Routed to you by your role and scope, {user.name.split(' ')[0]}.</Dialog.Description>
          <ul className="mt-4 space-y-2">
            {list.map((s) => {
              const imp = impactOf(db, s, rt[s.id].done, ctx)
              return (
                <li key={s.id}>
                  <button onClick={() => { close(); navigate(`/signals/${s.id}`) }} className="flex w-full items-start gap-3 rounded-xl border border-line p-3 text-left hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5"><SeverityBadge s={s.severity} /><SourceChip id={s.sourceId} />{rt[s.id].liveAt && <span className="inline-flex h-5 items-center rounded-full bg-critical-bg px-2 text-xs font-medium text-critical">Live</span>}</div>
                      <div className="mt-1.5 text-sm font-semibold text-ink">{s.title}</div>
                      {imp && <div className="num mt-0.5 text-xs text-ink-2">{imp.inrLabel}: <span className="font-semibold text-critical">{fmtInr(imp.inrAtRisk)}</span></div>}
                    </div>
                    <ChevronRight size={16} className="mt-1 shrink-0 text-ink-3" />
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>Later</Button>
            <Button variant="primary" onClick={() => { const first = list[0]; close(); navigate(`/signals/${first.id}`) }}>Review now</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
