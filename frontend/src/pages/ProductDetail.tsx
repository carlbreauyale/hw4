import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, LOW_STOCK, formatPrice, getProduct, openChat, stockLabel, type ProductDetail as Detail } from '../api'
import { isGameDayProduct } from '../gameday'
import { getMySize, setMySize } from '../mySize'
import { STORE } from '../store'

// Keyed by productId so moving to another product starts with fresh state.
export default function ProductDetailRoute() {
  const { productId = '' } = useParams()
  return <ProductDetail key={productId} productId={productId} />
}

function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Detail | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  // Start from the shopper's remembered size (set on the Products page or here).
  const [size, setSize] = useState<string | null>(getMySize)

  useEffect(() => {
    getProduct(productId)
      .then((p) => {
        setProduct(p)
        setStatus('ready')
      })
      .catch((err) => setStatus(err instanceof ApiError && err.status === 404 ? 'missing' : 'error'))
  }, [productId])

  if (status === 'loading') return <p className="container section muted">Loading…</p>
  if (status !== 'ready' || !product) {
    return (
      <div className="container section">
        <h1>{status === 'missing' ? 'We couldn’t find that item' : 'Something went wrong'}</h1>
        <p>
          <Link to="/products">← Back to all products</Link>
        </p>
      </div>
    )
  }

  const selected = product.sizes.find((s) => s.size === size)

  return (
    <div className="container section">
      <p className="breadcrumb">
        <Link to="/products">Products</Link> / {product.name}
      </p>

      <div className="detail">
        <div className="detail-image">
          <img src={product.image_url} alt={product.name} />
        </div>

        <div className="detail-info">
          <p className="eyebrow jersey-stripes">{product.garment_type}</p>
          {isGameDayProduct(product) && <span className="badge-inline badge-gameday">Game Day pick</span>}
          <h1>{product.name}</h1>
          <p className="detail-price">
            <span className="price-tag">{formatPrice(product.price)}</span>
          </p>
          <p>{product.description}</p>

          {product.colors.length > 0 && (
            <p>
              <strong>Colors: </strong>
              {product.colors.join(', ')}
            </p>
          )}

          <div className="sizes">
            <div className="sizes-head">
              <strong>Size</strong>
              <span className="muted">
                {selected ? stockLabel(selected.quantity) : 'Pick a size to see stock'}
              </span>
            </div>
            {/* P1: sizes as jerseys. Sold-out sizes are "benched"; low stock gets a "2 LEFT" tag. */}
            <div className="size-grid jersey-grid">
              {product.sizes.map((s) => {
                const out = s.quantity <= 0
                const low = !out && s.quantity <= LOW_STOCK
                return (
                  <button
                    key={s.size}
                    className={`size jersey ${size === s.size ? 'is-active' : ''} ${out ? 'is-out' : ''}`}
                    onClick={() => {
                      setSize(s.size)
                      setMySize(s.size)
                    }}
                    aria-pressed={size === s.size}
                    aria-label={`${s.size}: ${stockLabel(s.quantity)}`}
                  >
                    <span className="jersey-number">{s.size}</span>
                    {out && <span className="jersey-tag tag-out">Benched</span>}
                    {low && <span className="jersey-tag tag-low">{s.quantity} left</span>}
                  </button>
                )
              })}
            </div>

            {/* P2: stock as an LED scoreboard, one panel per size. */}
            <div className="stock-board" role="table" aria-label="Stock by size">
              <div className="stock-board-head" role="row">
                <span role="columnheader">Size</span>
                <span role="columnheader">In stock</span>
              </div>
              <div className="stock-board-cells">
                {product.sizes.map((s) => {
                  const state = s.quantity <= 0 ? 'out' : s.quantity <= LOW_STOCK ? 'low' : 'ok'
                  return (
                    <div key={s.size} className={`led-cell led-${state} ${size === s.size ? 'is-active' : ''}`} role="row">
                      <span className="led-size" role="cell">
                        {s.size}
                      </span>
                      <span className="led-number" role="cell" aria-label={stockLabel(s.quantity)}>
                        {s.quantity <= 0 ? 'OUT' : String(s.quantity).padStart(2, '0')}
                      </span>
                      <span className="led-status">{state === 'out' ? 'Sold out' : state === 'low' ? 'Low' : 'In stock'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="detail-actions">
            <button
              className="btn"
              onClick={() =>
                openChat(`Tell me about the ${product.name}${size ? ` in size ${size}` : ''}.`)
              }
            >
              Ask about this item
            </button>
          </div>

          <ul className="detail-notes">
            <li>Printed to order: most orders are ready to ship in {STORE.productionDays}.</li>
            <li>Returns accepted within {STORE.returnDays} days of shipping on unworn items with tags.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
