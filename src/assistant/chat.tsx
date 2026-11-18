// Shared chat logic and UI for the drawer and the full page.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowUp, Info, Languages } from 'lucide-react'
import { useNexus, useCurrentUser, useCtx, useDb, useTenantUsers, useValue, useVisibleSignals, type ChatMessage } from '@/store/useNexus'
import { DEMO_NOW } from '@/config/demoClock'
import { getRole } from '@/engine/lookup'
import { cx, SimulatedTag, SourceChip } from '@/components/ui/primitives'
import { resolveQuestion, suggestions, type Answer, type Env } from './intents'
import { BlockView } from './blocks'

export function useEnv(contextSignalId?: string): Env | null {
  const db = useDb()
  const rt = useNexus((s) => s.signals)
  const value = useValue()
  const users = useTenantUsers()
  const user = useCurrentUser()
  const ctx = useCtx()
  const signals = useVisibleSignals()
  return user ? { db, rt, value, users, user, ctx, signals, contextSignalId } : null
}

const EMPTY: ChatMessage[] = []

export function useChat(contextSignalId?: string) {
  const env = useEnv(contextSignalId)
  const user = useCurrentUser()
  const messages = useNexus((s) => (user ? s.chat[user.id] : undefined)) ?? EMPTY
  const push = useNexus((s) => s.pushChat)
  const clear = useNexus((s) => s.clearChat)
  const [animId, setAnimId] = useState<string | null>(null)
  const ask = (question: string, ctxId?: string) => {
    if (!env || !user || !question.trim()) return
    const n = messages.length
    const answer = resolveQuestion(question, { ...env, contextSignalId: ctxId ?? env.contextSignalId })
    push({ id: `${user.id}-${n + 1}`, role: 'user', text: question, at: DEMO_NOW, context: ctxId })
    const id = `${user.id}-${n + 2}`
    push({ id, role: 'assistant', text: (answer.blocks.find((b) => b.kind === 'text') as { text?: string } | undefined)?.text ?? '', blocks: [{ kind: 'answer', answer }], at: DEMO_NOW })
    setAnimId(id)
  }
  return { env, messages, ask, clear, animId }
}

const LANG_KEY = 'nexus-assistant-lang'
export function useLang() {
  const [hi, setHi] = useState(() => { try { return localStorage.getItem(LANG_KEY) === 'hi' } catch { return false } })
  const toggle = () => setHi((v) => { try { localStorage.setItem(LANG_KEY, v ? 'en' : 'hi') } catch { /* per-viewer convenience only */ } return !v })
  return { hi, toggle }
}

export function Thread({ messages, animId, hi, onAsk }: { messages: ChatMessage[]; animId: string | null; hi: boolean; onAsk: (q: string) => void }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [messages.length])
  return (
    <div className="space-y-4">
      {messages.map((m) => m.role === 'user'
        ? <div key={m.id} id={m.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent-soft px-3 py-2 text-sm text-ink">{m.text}</div>
        : <AnswerView key={m.id} answer={(m.blocks?.[0] as { answer: Answer } | undefined)?.answer} animate={m.id === animId} hi={hi} onAsk={onAsk} />)}
      <div ref={end} />
    </div>
  )
}

function AnswerView({ answer, animate, hi, onAsk }: { answer?: Answer; animate: boolean; hi: boolean; onAsk: (q: string) => void }) {
  const [phase, setPhase] = useState<'steps' | 'stream' | 'done'>(animate ? 'steps' : 'done')
  const [words, setWords] = useState(0)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const firstText = answer?.blocks.find((b) => b.kind === 'text') as { text: string } | undefined
  const shownText = hi && answer?.hi ? answer.hi : firstText?.text ?? ''
  const total = shownText.split(' ').length
  useEffect(() => {
    if (phase === 'steps') { const t = setTimeout(() => setPhase('stream'), reduced || !answer?.steps.length ? 0 : 650); return () => clearTimeout(t) }
    if (phase === 'stream') {
      if (reduced || words >= total) { setPhase('done'); return }
      const t = setTimeout(() => setWords((w) => w + 1), 15)
      return () => clearTimeout(t)
    }
  }, [phase, words, total, reduced, answer])
  if (!answer) return null
  return (
    <div className="max-w-full space-y-2.5">
      {answer.steps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
          <span>{phase === 'steps' ? 'Looking at' : 'Checked'}</span>
          {answer.steps.map((s) => <SourceChip key={s} id={s} />)}
          {phase === 'steps' && <span className="skeleton inline-block h-2 w-10" aria-hidden />}
        </div>
      )}
      {phase !== 'steps' && (
        <>
          {answer.blocks.map((b, i) => {
            if (b === firstText) return <p key={i} className={cx('text-sm leading-relaxed', answer.refused ? 'text-attention' : 'text-ink')}>{phase === 'stream' ? shownText.split(' ').slice(0, words).join(' ') : shownText}</p>
            return phase === 'done' ? <BlockView key={i} b={b} /> : null
          })}
          {phase === 'done' && hi && !answer.hi && firstText && <p className="text-xs text-ink-3">Hindi for this answer is on the roadmap.</p>}
          {phase === 'done' && answer.followUps.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {answer.followUps.map((f) => <button key={f} onClick={() => onAsk(f)} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-2 hover:border-accent hover:text-ink">{f}</button>)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function Suggestions({ onAsk, contextSignalId }: { onAsk: (q: string) => void; contextSignalId?: string }) {
  const db = useDb()
  const user = useCurrentUser()
  const loc = useLocation()
  if (!user) return null
  const list = suggestions(getRole(db, user.roleId).function, loc.pathname, contextSignalId)
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((q) => <button key={q} onClick={() => onAsk(q)} className="rounded-full border border-line bg-surface px-2.5 py-1 text-left text-xs text-ink-2 hover:border-accent hover:text-ink">{q}</button>)}
    </div>
  )
}

export function Composer({ onAsk, autoFocus }: { onAsk: (q: string) => void; autoFocus?: boolean }) {
  const [v, setV] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); if (v.trim()) { onAsk(v.trim()); setV('') } }
  return (
    <form onSubmit={submit} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5 focus-within:border-accent">
      <input value={v} onChange={(e) => setV(e.target.value)} autoFocus={autoFocus} placeholder="Ask about any part, vendor, shipment or project" aria-label="Ask Nexus" className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-ink-3" />
      <button type="submit" disabled={!v.trim()} aria-label="Send" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-strong text-on-accent disabled:opacity-40"><ArrowUp size={16} /></button>
    </form>
  )
}

export function AssistantHeaderTools({ hi, onToggleHi, onClear }: { hi: boolean; onToggleHi: () => void; onClear: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <SimulatedTag what="the Assistant's reasoning (scripted answers over the demo data)" />
      <button onClick={onToggleHi} aria-pressed={hi} title="Hindi answers (Roadmap)" className={cx('inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs', hi ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink-2 hover:text-ink')}><Languages size={13} /> {hi ? 'हिन्दी' : 'EN'}</button>
      <button onClick={onClear} className="h-7 rounded-md px-2 text-xs text-ink-2 hover:bg-surface-2 hover:text-ink">Clear chat</button>
    </div>
  )
}

export function ProductionNote() {
  return (
    <div className="flex gap-2.5 rounded-xl border border-line bg-surface-2 p-3 text-xs text-ink-2">
      <Info size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
      <div>
        <div className="mb-1 font-medium text-ink">How it works in production</div>
        In production the Assistant is a large language model that calls the data fabric through permissioned tools. It reads SAP and the other sources live, sees only what your role and scope allow, always cites what it used, and writes back only after you confirm. Here, answers are scripted over the demo data so the pitch is repeatable. Hindi answers are a Roadmap feature.
      </div>
    </div>
  )
}
