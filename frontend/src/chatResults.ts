import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { Product } from './api'

// One set of chat search results shown on the page (from a ChatResponse).
export interface ChatResults {
  id: number // changes on every new result set, so the cards re-animate
  title: string
  category: string | null
  query: string // what the shopper typed
  products: Product[]
}

export interface ChatResultsState {
  results: ChatResults | null
  showResults: (r: Omit<ChatResults, 'id'>) => void
  clearResults: () => void
  searching: boolean
  setSearching: (searching: boolean) => void
  chatOpen: boolean
  setChatOpen: Dispatch<SetStateAction<boolean>>
}

export const ChatResultsContext = createContext<ChatResultsState | null>(null)

export function useChatResults(): ChatResultsState {
  const ctx = useContext(ChatResultsContext)
  if (!ctx) throw new Error('useChatResults must be used inside <ChatResultsProvider>')
  return ctx
}
