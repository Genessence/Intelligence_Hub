import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Maximize2, MessageSquareText, X } from 'lucide-react'
import { onAssistantOpen } from '@/components/assistantBus'
import { useCurrentUser } from '@/store/useNexus'
import { AssistantHeaderTools, Composer, ProductionNote, Suggestions, Thread, useChat, useLang } from './chat'

/** Floating launcher on every page plus a right-side drawer. Opens with context from assistantBus. */
export function AssistantDrawer() {
  const user = useCurrentUser()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const [ctxId, setCtxId] = useState<string | undefined>()
  const { messages, ask, clear, animId } = useChat(ctxId)
  const { hi, toggle } = useLang()
  const askRef = useRef(ask)
  askRef.current = ask
  const signalOnPage = loc.pathname.match(/^\/signals\/([^/]+)/)?.[1]

  useEffect(() => onAssistantOpen(({ question, context }) => {
    setOpen(true)
    setCtxId(context)
    if (question) setTimeout(() => askRef.current(question, context), 0)
  }), [])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [])

  if (!user || loc.pathname.startsWith('/assistant')) return null
  const context = ctxId ?? signalOnPage

  return (
    <>
      {!open && (
        <button onClick={() => { setCtxId(signalOnPage); setOpen(true) }} className="fixed right-4 bottom-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-accent-strong px-4 text-sm font-medium text-on-accent shadow-pop hover:bg-accent-strong-hover" aria-label="Ask Nexus">
          <MessageSquareText size={18} /> <span className="hidden sm:inline">Ask Nexus</span>
        </button>
      )}
      {open && (
        <aside className="page-enter fixed top-0 right-0 z-40 flex h-full w-full flex-col border-l border-line bg-surface shadow-pop sm:w-[440px]" aria-label="Nexus Assistant">
          <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <MessageSquareText size={17} className="text-accent-ink" aria-hidden />
            <div className="mr-auto">
              <div className="text-sm font-semibold text-ink">Nexus Assistant</div>
              {context && <div className="text-xs text-ink-3">Context: {context}</div>}
            </div>
            <AssistantHeaderTools hi={hi} onToggleHi={toggle} onClear={clear} />
            <Link to="/assistant" onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Open full page"><Maximize2 size={16} /></Link>
            <button onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close"><X size={18} /></button>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-ink-2">Good morning {user.name.split(' ')[0]}. Ask me anything across your systems. I only answer with what your role and scope allow.</p>
                <ProductionNote />
              </div>
            )}
            <Thread messages={messages} animId={animId} hi={hi} onAsk={(q) => ask(q, context)} />
          </div>
          <footer className="space-y-2 border-t border-line p-3">
            <Suggestions onAsk={(q) => ask(q, context)} contextSignalId={context} />
            <Composer onAsk={(q) => ask(q, context)} autoFocus />
          </footer>
        </aside>
      )}
    </>
  )
}
