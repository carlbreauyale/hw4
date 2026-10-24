import { Link } from 'react-router-dom'
import { formatPrice, type Product } from '../api'
import { isGameDayProduct, positionOf } from '../gameday'
import { SIZES } from '../mySize'

// D6: product cards as football trading cards. The front is the shopping view (photo, name,
// price, sizes); on hover/focus the card flips in 3D to a "stats" back. The whole card is one
// link to the product page, so both sides open the single-item view.
export default function ProductCard({ product, highlightSize }: { product: Product; highlightSize?: string | null }) {
  const soldOut = product.total_stock <= 0
  const gameDay = isGameDayProduct(product)
  const position = positionOf(product.garment_type)

  const sizeRow = (
    <ul className="card-sizes" aria-label="Sizes in stock">
      {SIZES.map((s) => {
        const available = product.available_sizes.includes(s)
        return (
          <li
            key={s}
            className={`${available ? '' : 'is-out'} ${highlightSize === s ? 'is-mine' : ''}`}
            title={available ? `${s} in stock` : `${s} sold out`}
          >
            {s}
          </li>
        )
      })}
    </ul>
  )

  return (
    <Link to={`/products/${product.product_id}`} className="product-card player-card" aria-label={product.name}>
      <div className="player-inner">
        <div className="player-front">
          <div className="product-card-image">
            <img src={product.image_url} alt={product.name} loading="lazy" />
            <span className="player-position" aria-hidden="true">
              {position}
            </span>
            {gameDay && <span className="badge badge-gameday">Game Day</span>}
            {soldOut && <span className="badge badge-alert">Sold out</span>}
          </div>
          <div className="product-card-body">
            <h3>{product.name}</h3>
            <p className="product-card-price">{formatPrice(product.price)}</p>
            <p className="product-card-desc">{product.description}</p>
            {sizeRow}
          </div>
        </div>

        <div className="player-back" aria-hidden="true">
          <p className="player-back-title">Player stats</p>
          <h3>{product.name}</h3>
          <dl className="player-stats">
            <div>
              <dt>Price</dt>
              <dd className="stat-led">{formatPrice(product.price)}</dd>
            </div>
            <div>
              <dt>Position</dt>
              <dd>{product.garment_type}</dd>
            </div>
            <div>
              <dt>In stock</dt>
              <dd>{product.total_stock > 0 ? `${product.available_sizes.length} of 6 sizes` : 'Sold out'}</dd>
            </div>
            <div>
              <dt>Colors</dt>
              <dd className="swatches">
                {product.colors.length > 0
                  ? product.colors.map((c) => (
                      <span key={c} className="swatch" style={{ background: swatchColor(c) }} title={c} />
                    ))
                  : 'Not listed'}
              </dd>
            </div>
          </dl>
          {sizeRow}
          <span className="player-cta">View details →</span>
        </div>
      </div>
    </Link>
  )
}

// Catalogue color words -> a swatch color (falls back to the word itself, which CSS understands for basics).
const SWATCHES: Record<string, string> = {
  navy: '#1b2a4a',
  'navy blue': '#1b2a4a',
  'heather gray': '#a9adb3',
  gray: '#8d939a',
  charcoal: '#3d4249',
  'charcoal gray': '#3d4249',
  'dusty coral': '#e4877a',
  royal: '#2350b4',
  'royal blue': '#2350b4',
  'light blue': '#9cc3e8',
  khaki: '#c3b091',
  cream: '#f3ead6',
  natural: '#efe6d2',
  ivory: '#fffbea',
  blue: '#2c5aa0',
  gold: '#c9a227',
  yellow: '#f2c230',
  green: '#2e7d4f',
  'light gray': '#cfd3d8',
  'dark heather gray': '#6e7379',
  'dark heather charcoal': '#44484e',
  'heather charcoal gray': '#4f545a',
  multicolor: 'conic-gradient(#00366b, #f04f36, #f2c230, #2e7d4f, #00366b)',
}

function swatchColor(name: string): string {
  const key = name.toLowerCase()
  return SWATCHES[key] ?? key.split(' ').pop() ?? '#ccc'
}
