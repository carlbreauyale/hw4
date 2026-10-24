// Typed client for the FastAPI backend (backend/main.py).
// Types mirror backend/models.py.

export interface SizeStock {
  size: string
  quantity: number
}

export interface Product {
  product_id: string
  name: string
  garment_type: string
  description: string
  colors: string[]
  search_tags: string[]
  price: number
  image_url: string
  total_stock: number
  available_sizes: string[] // sizes with stock right now, XS..XXL
}

export interface ProductDetail extends Product {
  sizes: SizeStock[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  products?: Product[]
}

// Where the shopper is when they send a message (mirrors PageContext in backend/models.py).
export interface PageContext {
  path: string
  product_id: string | null // set on a product page
  category: string | null // Products-page category filter
}

// A message from a logged-in shopper's saved history.
export interface SavedChatMessage {
  role: 'user' | 'assistant'
  content: string
  products: Product[]
  created_at: string
}

// API contract for chat search results (mirrors ChatResponse in backend/models.py).
export interface ChatResponse {
  reply: string
  products: Product[] // full product cards from the DB, best match first
  results_title: string | null // heading for the results shelf on the page
  category: string | null // set when the shopper browsed one category ("See all" link)
}

export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  created_at: string
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// FastAPI errors are {detail: "message"} or, for validation, {detail: [{msg: ...}]}.
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg
  } catch {
    // not JSON
  }
  return `${res.status} ${res.statusText}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res))
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

function postJson<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

// Accounts. The session lives in an HttpOnly cookie set by the backend.
export interface SignupInput {
  first_name: string
  last_name: string
  email: string
  password: string
}

export function signup(input: SignupInput): Promise<User> {
  return postJson<User>('/api/auth/signup', input)
}

export function login(email: string, password: string): Promise<User> {
  return postJson<User>('/api/auth/login', { email, password })
}

export function logout(): Promise<void> {
  return postJson<void>('/api/auth/logout')
}

// null when nobody is logged in.
export function getCurrentUser(): Promise<User | null> {
  return request<User | null>('/api/auth/me')
}

// Several components need the catalogue (ticker, home, chat links, Products page): share one
// request for a short time instead of downloading it once per component. Stock stays fresh.
const PRODUCTS_TTL_MS = 30_000
let productsCache: { at: number; promise: Promise<Product[]> } | null = null

export function getProducts(): Promise<Product[]> {
  if (productsCache && Date.now() - productsCache.at < PRODUCTS_TTL_MS) return productsCache.promise
  const promise = request<Product[]>('/api/products')
  productsCache = { at: Date.now(), promise }
  promise.catch(() => {
    productsCache = null
  })
  return promise
}

export function getProduct(productId: string): Promise<ProductDetail> {
  return request<ProductDetail>(`/api/products/${encodeURIComponent(productId)}`)
}

// `history` is only used for guests; for logged-in shoppers the backend reloads saved history.
export function sendChatMessage(message: string, history: ChatMessage[], page: PageContext): Promise<ChatResponse> {
  return postJson<ChatResponse>('/api/chat', {
    message,
    history: history.map(({ role, content }) => ({ role, content })),
    page,
  })
}

// Saved conversation for the logged-in shopper (empty for guests).
export function getChatHistory(): Promise<SavedChatMessage[]> {
  return request<SavedChatMessage[]>('/api/chat/history')
}

export function clearChatHistory(): Promise<void> {
  return request<void>('/api/chat/history', { method: 'DELETE' })
}

export function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export const LOW_STOCK = 3

export function stockLabel(quantity: number): string {
  if (quantity <= 0) return 'Sold out'
  if (quantity <= LOW_STOCK) return `Only ${quantity} left`
  return 'In stock'
}

// Lets any page open the chat panel, optionally with a pre-filled question.
export const OPEN_CHAT_EVENT = 'campus-customs:open-chat'

export function openChat(prefill?: string) {
  window.dispatchEvent(new CustomEvent<string | undefined>(OPEN_CHAT_EVENT, { detail: prefill }))
}
