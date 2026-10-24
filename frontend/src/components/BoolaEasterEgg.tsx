import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, getProduct, type ProductDetail } from '../api'
import Confetti from './Confetti'

const SECRET = 'boola'
const PRODUCT_ID = 'boola-boola-t-shirt' // a real catalogue item
const SHOW_MS = 7000

// E1: type "boola" anywhere (outside text fields) for a Boola Boola surprise.
export default function BoolaEasterEgg() {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [shownAt, setShownAt] = useState<number | null>(null)

  useEffect(() => {
    let typed = ''
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (e.key.length !== 1) return
      typed = (typed + e.key.toLowerCase()).slice(-SECRET.length)
      if (typed === SECRET) {
        typed = ''
        setShownAt(Date.now())
        getProduct(PRODUCT_ID).then(setProduct).catch(() => {})
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (shownAt === null) return
    const id = window.setTimeout(() => setShownAt(null), SHOW_MS)
    return () => window.clearTimeout(id)
  }, [shownAt])

  if (shownAt === null) return null

  return (
    <div className="boola" role="status" key={shownAt}>
      <Confetti />
      <div className="boola-card">
        <button className="boola-close" aria-label="Close" onClick={() => setShownAt(null)}>
          ×
        </button>
        <p className="boola-title">Boola Boola!</p>
        <p className="boola-sub">You found the secret cheer. Bulldogs, bulldogs, bow wow wow!</p>
        {product && (
          <Link to={`/products/${product.product_id}`} className="boola-product" onClick={() => setShownAt(null)}>
            <img src={product.image_url} alt="" />
            <span>
              <strong>{product.name}</strong>
              <span>{formatPrice(product.price)} · Wear the cheer to Fenway</span>
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}
