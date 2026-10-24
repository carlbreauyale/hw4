// The shopper's size, remembered in this browser so the Products filter and product pages
// can start from it ("In stock in my size").
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

const KEY = 'campus-customs:my-size'

export function getMySize(): string | null {
  try {
    const saved = localStorage.getItem(KEY)
    return saved && (SIZES as readonly string[]).includes(saved) ? saved : null
  } catch {
    return null
  }
}

export function setMySize(size: string | null) {
  try {
    if (size) localStorage.setItem(KEY, size)
    else localStorage.removeItem(KEY)
  } catch {
    // storage unavailable (private mode): the filter still works for this page view
  }
}
