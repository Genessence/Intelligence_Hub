import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { ALL_SIGNALS, DBS, tenantOfSignal } from '@/data'
import type { AuditEntry, CreatedRecord, Db, RoleTemplate, SignalStatus, UserProfile, ValueEntry } from '@/data/types'
import { DEMO_NOW } from '@/config/demoClock'
import { previewBooking, type RuntimeCtx } from '@/engine/scenarios'
import { seedEntries, stampEntries } from '@/engine/valueLedger'
import { getRole, getSignal } from '@/engine/lookup'
import { setRoleOverrides } from '@/engine/audience'

export interface SignalRuntime {
  status: SignalStatus
  done: string[]
  acks: Record<string, string> // userId -> at
  dismissReason?: string
  snoozed?: boolean
  assignee?: string
  liveAt?: string // fired live by the presenter
}

export interface ChatBlock { kind: string; [k: string]: unknown }
export interface ChatMessage { id: string; role: 'user' | 'assistant'; text: string; blocks?: ChatBlock[]; at: string; context?: string }

interface State {
  tenantId: string
  currentUserId: string | null
  users: UserProfile[]
  signals: Record<string, SignalRuntime>
  value: Record<string, ValueEntry[]> // per tenant
  audit: AuditEntry[]
  records: (CreatedRecord & { signalId: string; at: string })[]
  dataDrops: string[] // ingested data-drop ids
  popupsSeen: Record<string, string[]> // userId -> signal ids already shown
  chat: Record<string, ChatMessage[]> // userId -> messages
  badgesHidden: boolean
  presenterOpen: boolean
  pendingPush: { signalId: string; at: number } | null
  roleOverrides: Record<string, Partial<RoleTemplate>> // editable role templates (People & Roles)
  ruleToggles: Record<string, boolean> // ruleId -> enabled (default true)
  customRules: { id: string; when: string; then: string; severity: string }[]
  fabricDecisions: Record<string, 'merged' | 'separate'>
  setRoleOverride: (roleId: string, patch: Partial<RoleTemplate>) => void
  toggleRule: (ruleId: string) => void
  addRule: (r: { when: string; then: string; severity: string }) => void
  decideFabric: (key: string, d: 'merged' | 'separate') => void
  login: (userId: string) => void
  logout: () => void
  setTenant: (tenantId: string) => void
  acknowledge: (signalId: string) => void
  dismiss: (signalId: string, reason: string) => void
  resolve: (signalId: string) => void
  snooze: (signalId: string) => void
  assign: (signalId: string, userId: string) => void
  completeRecommendation: (signalId: string, recId: string) => { entries: ValueEntry[]; record?: CreatedRecord }
  fireSignal: (signalId: string) => void
  markPopupSeen: (signalIds: string[]) => void
  ingestDataDrop: (id: string) => void
  addUser: (u: UserProfile) => void
  updateUser: (id: string, patch: Partial<UserProfile>) => void
  setValueStatus: (entryId: string, status: ValueEntry['status']) => void
  pushChat: (m: ChatMessage) => void
  clearChat: () => void
  setBadgesHidden: (v: boolean) => void
  setPresenterOpen: (v: boolean) => void
  clearPush: () => void
  reset: () => void
}

const initialSignals = () =>
  Object.fromEntries(ALL_SIGNALS.map((s) => [s.id, { status: s.status, done: [], acks: { ...(s.seedAcks ?? {}) } } as SignalRuntime]))

const initial = () => ({
  tenantId: 'amber',
  currentUserId: null as string | null,
  users: Object.values(DBS).flatMap((d) => d.users),
  signals: initialSignals(),
  value: Object.fromEntries(Object.entries(DBS).map(([k, d]) => [k, seedEntries(d)])) as Record<string, ValueEntry[]>,
  audit: [] as AuditEntry[],
  records: [] as State['records'],
  dataDrops: [] as string[],
  popupsSeen: {} as Record<string, string[]>,
  chat: {} as Record<string, ChatMessage[]>,
  badgesHidden: false,
  presenterOpen: false,
  pendingPush: null as State['pendingPush'],
  roleOverrides: {} as State['roleOverrides'],
  ruleToggles: {} as Record<string, boolean>,
  customRules: [] as State['customRules'],
  fabricDecisions: {} as State['fabricDecisions'],
})

const item = (userId: string, action: string, detail: string, signalId?: string, writeBack?: boolean): Omit<AuditEntry, 'id'> => ({ at: DEMO_NOW, userId, signalId, action, detail, writeBack })
/** Append-only audit log; ids follow the log length so they survive reloads. */
const append = (log: AuditEntry[], ...items: Omit<AuditEntry, 'id'>[]): AuditEntry[] => [...log, ...items.map((it, i) => ({ ...it, id: `AUD-${String(log.length + i + 1).padStart(5, '0')}` }))]

// localStorage can throw in private windows or previews; fall back to memory.
const mem = new Map<string, string>()
const safeStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k) } catch { return mem.get(k) ?? null } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { mem.set(k, v) } },
  removeItem: (k: string) => { try { localStorage.removeItem(k) } catch { mem.delete(k) } },
}

export const useNexus = create<State>()(
  persist(
    (set, get) => {
      const rt = (id: string) => get().signals[id]
      const patch = (id: string, p: Partial<SignalRuntime>) => ({ ...get().signals, [id]: { ...rt(id), ...p } })
      const uid = () => get().currentUserId
      return {
        ...initial(),
        login: (userId) => set((s) => ({ currentUserId: userId, audit: append(s.audit, item(userId, 'Signed in', 'Persona sign-in (Simulated SSO)')) })),
        logout: () => set({ currentUserId: null }),
        setTenant: (tenantId) => set({ tenantId, currentUserId: null }),
        acknowledge: (id) => {
          const u = uid()
          if (!u || rt(id).acks[u]) return
          set((s) => ({ signals: patch(id, { status: rt(id).status === 'new' ? 'acknowledged' : rt(id).status, acks: { ...rt(id).acks, [u]: DEMO_NOW } }), audit: append(s.audit, item(u, 'Acknowledged', 'Signal acknowledged', id)) }))
        },
        dismiss: (id, reason) => {
          const u = uid()
          if (!u || rt(id).done.length > 0) return // value already booked: resolve instead
          set((s) => ({ signals: patch(id, { status: 'dismissed', dismissReason: reason }), audit: append(s.audit, item(u, 'Dismissed', reason, id)) }))
        },
        resolve: (id) => {
          const u = uid()
          if (!u) return
          set((s) => ({ signals: patch(id, { status: 'resolved' }), audit: append(s.audit, item(u, 'Resolved', 'Marked resolved', id)) }))
        },
        snooze: (id) => {
          const u = uid()
          if (!u) return
          set((s) => ({ signals: patch(id, { snoozed: !rt(id).snoozed }), audit: append(s.audit, item(u, rt(id).snoozed ? 'Unsnoozed' : 'Snoozed', rt(id).snoozed ? 'Back in the inbox' : 'Snoozed until tomorrow 09:00 IST', id)) }))
        },
        assign: (id, to) => {
          const u = uid()
          if (!u) return
          const name = get().users.find((x) => x.id === to)?.name ?? to
          set((s) => ({ signals: patch(id, { assignee: to }), audit: append(s.audit, item(u, 'Assigned', `Assigned to ${name}`, id)) }))
        },
        completeRecommendation: (id, recId) => {
          const u = uid()
          if (!u) return { entries: [] }
          const tenant = tenantOfSignal(id)
          const db = DBS[tenant]
          const signal = getSignal(db, id)
          const rec = signal.recommendations.find((r) => r.id === recId)
          const r0 = rt(id)
          if (!rec || r0.done.includes(recId) || get().value[tenant].some((e) => e.recommendationId === recId)) return { entries: [] }
          const ctx: RuntimeCtx = { dataDrops: get().dataDrops, doneBySignal: Object.fromEntries(Object.entries(get().signals).map(([k, v]) => [k, v.done])) }
          const preview = previewBooking(db, signal, rec, r0.done, ctx)
          const entries = stampEntries(preview, u, get().value[tenant].length)
          const ref = rec.params.recordRef ? String(rec.params.recordRef) : `${rec.target.recordType.split(/\s|-/).map((w) => w[0]).join('').toUpperCase()}-${id.slice(-4)}-${r0.done.length + 1}`
          const record: CreatedRecord = { system: rec.target.system, recordType: rec.target.recordType, ref }
          const done = [...r0.done, recId]
          const allDone = signal.recommendations.every((r) => done.includes(r.id))
          set((s) => ({
            signals: patch(id, { done, status: allDone ? 'resolved' : 'in_action', acks: r0.acks[u] ? r0.acks : { ...r0.acks, [u]: DEMO_NOW } }),
            value: { ...s.value, [tenant]: [...s.value[tenant], ...entries] },
            records: [...s.records, { ...record, signalId: id, at: DEMO_NOW }],
            audit: append(
              s.audit,
              item(u, `Workflow: ${rec.title}`, `${record.recordType} ${record.ref} created in ${record.system}${rec.writeBack ? ' (SAP write-back, approved)' : ''}`, id, rec.writeBack),
              ...entries.map((e) => item(u, 'Value booked', `${e.id} ${e.type.replace(/_/g, ' ')} (committed)`, id)),
            ),
          }))
          return { entries, record }
        },
        fireSignal: (id) => {
          const u = uid() ?? 'system'
          set((s) => ({
            signals: { ...s.signals, [id]: { ...s.signals[id], status: s.signals[id].done.length ? s.signals[id].status : 'new', liveAt: DEMO_NOW } }, // keep actions and acks: value is never booked twice
            popupsSeen: Object.fromEntries(Object.entries(s.popupsSeen).map(([k, v]) => [k, v.filter((x) => x !== id)])),
            pendingPush: { signalId: id, at: s.audit.length + 1 },
            audit: append(s.audit, item(u, 'Signal fired live', 'Raised by the presenter', id)),
          }))
        },
        markPopupSeen: (ids) => {
          const u = uid()
          if (!u) return
          set((s) => ({ popupsSeen: { ...s.popupsSeen, [u]: [...new Set([...(s.popupsSeen[u] ?? []), ...ids])] } }))
        },
        ingestDataDrop: (ddId) => {
          const u = uid() ?? 'system'
          if (get().dataDrops.includes(ddId)) return
          const sig = ALL_SIGNALS.find((s) => s.requiresDataDrop === ddId)
          set((s) => ({
            dataDrops: [...s.dataDrops, ddId],
            signals: sig ? { ...s.signals, [sig.id]: { status: 'new', done: [], acks: {}, liveAt: DEMO_NOW } } : s.signals,
            pendingPush: sig ? { signalId: sig.id, at: s.audit.length + 1 } : s.pendingPush,
            audit: append(s.audit, item(u, 'Data drop ingested', ddId)),
          }))
        },
        addUser: (nu) => {
          const u = uid() ?? 'system'
          set((s) => ({ users: [...s.users, { ...nu, addedInDemo: true }], audit: append(s.audit, item(u, 'User added', `${nu.name}, ${nu.title}`)) }))
        },
        updateUser: (id, p) => set((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
        setValueStatus: (entryId, status) => {
          const u = uid()
          if (!u) return
          const t = get().tenantId
          set((s) => ({
            value: { ...s.value, [t]: s.value[t].map((e) => (e.id === entryId ? { ...e, status, validatedBy: status === 'validated' ? u : e.validatedBy } : e)) },
            audit: append(s.audit, item(u, status === 'validated' ? 'Value validated' : 'Value status changed', `${entryId} to ${status}`)),
          }))
        },
        pushChat: (m) => {
          const u = uid()
          if (!u) return
          set((s) => ({ chat: { ...s.chat, [u]: [...(s.chat[u] ?? []), m] } }))
        },
        clearChat: () => {
          const u = uid()
          if (!u) return
          set((s) => ({ chat: { ...s.chat, [u]: [] } }))
        },
        setRoleOverride: (roleId, p) => {
          const u = uid() ?? 'system'
          set((s) => ({ roleOverrides: { ...s.roleOverrides, [roleId]: { ...s.roleOverrides[roleId], ...p } }, audit: append(s.audit, item(u, 'Role template changed', roleId)) }))
        },
        toggleRule: (ruleId) => {
          const u = uid() ?? 'system'
          const on = get().ruleToggles[ruleId] ?? true
          set((s) => ({ ruleToggles: { ...s.ruleToggles, [ruleId]: !on }, audit: append(s.audit, item(u, on ? 'Rule disabled' : 'Rule enabled', ruleId)) }))
        },
        addRule: (r) => {
          const u = uid() ?? 'system'
          const id = `R-CUSTOM-${String(get().customRules.length + 1).padStart(2, '0')}`
          set((s) => ({ customRules: [...s.customRules, { id, ...r }], audit: append(s.audit, item(u, 'Rule created', id)) }))
        },
        decideFabric: (key, d) => {
          const u = uid() ?? 'system'
          set((s) => ({ fabricDecisions: { ...s.fabricDecisions, [key]: d }, audit: append(s.audit, item(u, d === 'merged' ? 'Golden record merged' : 'Kept as separate records', key)) }))
        },
        setBadgesHidden: (v) => set({ badgesHidden: v }),
        setPresenterOpen: (v) => set({ presenterOpen: v }),
        clearPush: () => set({ pendingPush: null }),
        reset: () => set({ ...initial() }),
      }
    },
    {
      name: 'nexus-demo-v2',
      version: 2,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        return { ...current, ...p, signals: { ...current.signals, ...(p.signals ?? {}) }, value: { ...current.value, ...(p.value ?? {}) } }
      },
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ tenantId: s.tenantId, currentUserId: s.currentUserId, users: s.users, signals: s.signals, value: s.value, audit: s.audit, records: s.records, dataDrops: s.dataDrops, popupsSeen: s.popupsSeen, chat: s.chat, badgesHidden: s.badgesHidden, roleOverrides: s.roleOverrides, ruleToggles: s.ruleToggles, customRules: s.customRules, fabricDecisions: s.fabricDecisions }),
    },
  ),
)


// Keep the audience engine in step with role-template edits.
setRoleOverrides(useNexus.getState().roleOverrides)
useNexus.subscribe((s) => setRoleOverrides(s.roleOverrides))

// Hooks ------------------------------------------------------------------

export const useDb = (): Db => DBS[useNexus((s) => s.tenantId)]

export const useTenantUsers = () => {
  const t = useNexus((s) => s.tenantId)
  const users = useNexus((s) => s.users)
  return users.filter((u) => u.tenantId === t)
}

export const useCurrentUser = () => {
  const id = useNexus((s) => s.currentUserId)
  const users = useNexus((s) => s.users)
  return users.find((u) => u.id === id) ?? null
}

export const useCtx = (): RuntimeCtx => {
  const dataDrops = useNexus((s) => s.dataDrops)
  const signals = useNexus((s) => s.signals)
  return { dataDrops, doneBySignal: Object.fromEntries(Object.entries(signals).map(([k, v]) => [k, v.done])) }
}

export const useValue = () => {
  const t = useNexus((s) => s.tenantId)
  return useNexus((s) => s.value[t] ?? [])
}

/** Signals visible in the current tenant: data-drop signals stay hidden until their file is ingested. */
export const useVisibleSignals = () => {
  const db = useDb()
  const drops = useNexus((s) => s.dataDrops)
  return db.signals.filter((s) => !s.requiresDataDrop || drops.includes(s.requiresDataDrop))
}

/** Owner, leadership, or the assignee may resolve a signal. */
export const canResolve = (db: Db, user: UserProfile, signal: { ownerId?: string }, assignee?: string) =>
  signal.ownerId === user.id || assignee === user.id || getRole(db, user.roleId).function === 'Leadership'
