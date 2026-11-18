// Tiny event bus so any page can open the Assistant drawer with a question and context.
type Open = { question?: string; context?: string }
const listeners = new Set<(o: Open) => void>()
export const onAssistantOpen = (fn: (o: Open) => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
export const openAssistant = (question?: string, context?: string) => listeners.forEach((fn) => fn({ question, context }))
