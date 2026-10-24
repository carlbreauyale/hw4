import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import {
  OPEN_CHAT_EVENT,
  clearChatHistory,
  formatPrice,
  getChatHistory,
  getProduct,
  getProducts,
  sendChatMessage,
  type ChatMessage,
  type PageContext,
  type Product,
} from '../api'
import { useChatResults } from '../chatResults'
import { useAuth } from '../useAuth'
import BulldogAvatar from './BulldogAvatar'
import { FootballIcon } from './FieldTracker'

// Up to this many matches are also listed inside the chat bubble; more go only to the page shelf.
const MAX_INLINE_PRODUCTS = 3

// ---- Reply formatting: product names become links, **bold**, "- " bullet lists ----
// Everything is built as React elements from plain text (no HTML injection).

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// One regex matching any catalogue product name (longest first, so "Morse 1 4 Zip" wins over "Morse").
function buildNameMatcher(products: Product[]) {
  const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]))
  const names = [...byName.keys()].sort((a, b) => b.length - a.length)
  const pattern = names.length ? new RegExp(`(${names.map(escapeRegExp).join('|')})`, 'gi') : null
  return { byName, pattern }
}
type NameMatcher = ReturnType<typeof buildNameMatcher>

function linkNames(text: string, matcher: NameMatcher, key: string): ReactNode[] {
  if (!matcher.pattern) return [text]
  return text.split(matcher.pattern).map((part, i) => {
    const product = matcher.byName.get(part.toLowerCase())
    return product ? (
      <Link key={`${key}-${i}`} to={`/products/${product.product_id}`} className="chat-link">
        {part}
      </Link>
    ) : (
      part
    )
  })
}

function formatInline(text: string, matcher: NameMatcher, key: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).flatMap((part, i): ReactNode[] =>
    i % 2 === 1
      ? [<strong key={`${key}-b${i}`}>{linkNames(part, matcher, `${key}-b${i}`)}</strong>]
      : linkNames(part, matcher, `${key}-t${i}`),
  )
}

function formatMessage(text: string, matcher: NameMatcher): ReactNode {
  const blocks: ReactNode[] = []
  let bullets: string[] = []
  let paragraph: string[] = []
  const flushParagraph = () => {
    if (paragraph.length) {
      const k = `p${blocks.length}`
      blocks.push(<p key={k}>{formatInline(paragraph.join('\n'), matcher, k)}</p>)
      paragraph = []
    }
  }
  const flushBullets = () => {
    if (bullets.length) {
      const k = `ul${blocks.length}`
      blocks.push(
        <ul key={k} className="chat-list">
          {bullets.map((b, i) => (
            <li key={i}>{formatInline(b, matcher, `${k}-${i}`)}</li>
          ))}
        </ul>,
      )
      bullets = []
    }
  }
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      bullets.push(bullet[1])
    } else {
      flushBullets()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushBullets()
  return blocks
}

// What the agent is told about the page the shopper is on (sent with every message).
function usePageContext(): PageContext {
  const { pathname, search } = useLocation()
  const productMatch = matchPath('/products/:productId', pathname)
  return {
    path: pathname,
    product_id: productMatch?.params.productId ?? null,
    category: pathname === '/products' ? new URLSearchParams(search).get('category') : null,
  }
}

// Mounted with key={user id} in App, so logging in or out starts a fresh widget.
export default function ChatWidget() {
  // Open state lives in the shared context so the results shelf can make room for the panel.
  const { chatOpen: open, setChatOpen: setOpen, showResults, setSearching } = useChatResults()
  const { user } = useAuth()
  const page = usePageContext()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [restored, setRestored] = useState(0) // how many messages came from saved history
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [viewingName, setViewingName] = useState<{ id: string; name: string } | null>(null)
  const [catalogue, setCatalogue] = useState<Product[]>([])
  const nameMatcher = useMemo(() => buildNameMatcher(catalogue), [catalogue])
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Catalogue names, so product names in replies can become links to their pages.
  useEffect(() => {
    getProducts()
      .then(setCatalogue)
      .catch(() => {})
  }, [])

  // Logged-in shoppers: reload their saved conversation from the database.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    getChatHistory()
      .then((saved) => {
        if (cancelled) return
        setMessages(saved.map(({ role, content, products }) => ({ role, content, products })))
        setRestored(saved.length)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  // Name of the product being viewed, for the "Asking about" hint above the input.
  useEffect(() => {
    if (!page.product_id) return
    let cancelled = false
    getProduct(page.product_id)
      .then((p) => !cancelled && setViewingName({ id: p.product_id, name: p.name }))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [page.product_id])
  const viewing = page.product_id && viewingName?.id === page.product_id ? viewingName.name : null

  // Other pages can open the panel (and pre-fill a question) via openChat().
  useEffect(() => {
    const onOpen = (e: Event) => {
      const prefill = (e as CustomEvent<string | undefined>).detail
      setOpen(true)
      if (prefill) setDraft(prefill)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
  }, [setOpen])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setDraft('')
    setSending(true)
    setSearching(true)
    try {
      // Guests send their in-page history; for logged-in shoppers the server uses the saved one.
      const res = await sendChatMessage(text, user ? [] : messages, page)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, products: res.products }])
      // API contract: structured product matches -> product cards on the page.
      if (res.products.length > 0) {
        showResults({
          title: res.results_title ?? 'Matching items',
          category: res.category,
          query: text,
          products: res.products,
        })
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I can't reach the store right now. Please try again in a moment." },
      ])
    } finally {
      setSending(false)
      setSearching(false)
    }
  }

  async function startNewChat() {
    await clearChatHistory().catch(() => {})
    setMessages([])
    setRestored(0)
  }

  const greeting = user
    ? `Hi ${user.first_name}! Ask me about our Yale gear: what we carry, prices, or which sizes are in stock.`
    : "Hi! I'm the Campus Customs assistant. Ask me about our Yale gear: what we carry, prices, or which sizes are in stock."

  return (
    <div className="chat">
      {open && (
        <section className="chat-panel" aria-label="Campus Customs chat">
          {/* H1: the chat as a broadcast press box, hosted by Bulldog Bot. */}
          <header className="chat-header pressbox">
            <div className="pressbox-id">
              <BulldogAvatar size={38} />
              <div>
                <span className="pressbox-live">
                  <span className="live-dot" aria-hidden="true" /> Live from the press box
                </span>
                <strong>Bulldog Bot</strong>
                <span>
                  {user ? `Signed in as ${user.first_name} · chat saved to your account` : 'Guest chat · log in to save it'}
                </span>
              </div>
            </div>
            <div className="chat-header-actions">
              {user && messages.length > 0 && (
                <button className="chat-new" onClick={startNewChat} title="Delete saved messages and start over">
                  New chat
                </button>
              )}
              <button className="chat-close" aria-label="Close chat" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
          </header>

          <div className="chat-messages" ref={listRef}>
            <div className="chat-row">
              <BulldogAvatar size={26} />
              <div className="chat-msg chat-msg-assistant">
                <p>{greeting}</p>
              </div>
            </div>
            {restored > 0 && <p className="chat-divider">Your earlier conversation</p>}
            {messages.map((m, i) => (
              <div key={i}>
                {restored > 0 && i === restored && <p className="chat-divider">New messages</p>}
                <div className={`chat-row chat-row-${m.role}`}>
                {m.role === 'assistant' && <BulldogAvatar size={26} />}
                <div className={`chat-msg chat-msg-${m.role}`}>
                  {m.role === 'assistant' ? (
                    <div className="chat-text">{formatMessage(m.content, nameMatcher)}</div>
                  ) : (
                    <p>{m.content}</p>
                  )}
                  {m.products && m.products.length > MAX_INLINE_PRODUCTS && (
                    <button
                      className="chat-results-note"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                      ✦ {m.products.length} items shown on the page ↑
                    </button>
                  )}
                  {m.products && m.products.length > 0 && m.products.length <= MAX_INLINE_PRODUCTS && (
                    <ul className="chat-products">
                      {m.products.map((p) => (
                        <li key={p.product_id}>
                          <Link to={`/products/${p.product_id}`}>
                            <img src={p.image_url} alt="" />
                            <span>{p.name}</span>
                            <span>{formatPrice(p.price)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                </div>
              </div>
            ))}
            {/* H2: a spinning football while the bot "huddles" */}
            {sending && (
              <div className="chat-row">
                <BulldogAvatar size={26} />
                <div className="chat-msg chat-msg-assistant chat-typing huddle" role="status">
                  <span className="huddle-ball">
                    <FootballIcon size={22} />
                  </span>
                  <span className="huddle-text">
                    <span>Huddling…</span>
                    <span>Calling the play…</span>
                    <span>Running the play…</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {viewing && (
            <p className="chat-context">
              Viewing <strong>{viewing}</strong>. Ask about “this” item
            </p>
          )}
          <form className="chat-input" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={viewing ? 'e.g. Do you have this in medium?' : 'Ask about hoodies, sizes, prices…'}
              aria-label="Message"
              maxLength={2000}
            />
            <button className="btn" type="submit" disabled={sending || !draft.trim()}>
              Send
            </button>
          </form>
        </section>
      )}

      <button
        className={`chat-launcher coach-badge ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        aria-label={open ? 'Close chat' : 'Ask the coach: open chat'}
        onClick={() => setOpen((o) => !o)}
      >
        <BulldogAvatar size={34} />
        <span>{open ? 'Close' : 'Ask the coach'}</span>
      </button>
    </div>
  )
}
