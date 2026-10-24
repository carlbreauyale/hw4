import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ChatResultsContext, type ChatResults, type ChatResultsState } from './chatResults'

const STORAGE_KEY = 'campus-customs:chat-results'

// Keep the last results for this browser tab, so they survive a page reload too.
function loadSaved(): ChatResults | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ChatResults) : null
  } catch {
    return null
  }
}

export function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<ChatResults | null>(loadSaved)
  const [searching, setSearching] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const showResults = useCallback((r: Omit<ChatResults, 'id'>) => {
    const next = { ...r, id: Date.now() }
    setResults(next)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const clearResults = useCallback(() => {
    setResults(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo<ChatResultsState>(
    () => ({ results, showResults, clearResults, searching, setSearching, chatOpen, setChatOpen }),
    [results, showResults, clearResults, searching, chatOpen],
  )

  return <ChatResultsContext.Provider value={value}>{children}</ChatResultsContext.Provider>
}
