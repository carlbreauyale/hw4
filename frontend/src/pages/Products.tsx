import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts, type Product } from '../api'
import { CATEGORIES, categoryOf } from '../categories'
import ProductCard from '../components/ProductCard'
import { isGameDayProduct } from '../gameday'
import { SIZES, getMySize, setMySize } from '../mySize'

type Sort = 'name' | 'price-asc' | 'price-desc'

function matches(p: Product, query: string): boolean {
  if (!query) return true
  const haystack = [p.name, p.description, p.garment_type, ...p.colors, ...p.search_tags]
    .join(' ')
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word))
}

export default function Products() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('name')

  // Filters live in the URL (?category=Hoodies&size=M&instock=1), so links like the chat shelf's
  // "See all" can open a filtered view. Size falls back to the shopper's remembered size.
  const [params, setParams] = useSearchParams()
  const requested = params.get('category')
  const category = requested && (CATEGORIES as readonly string[]).includes(requested) ? requested : 'All'
  const urlSize = params.get('size')
  const size = urlSize && (SIZES as readonly string[]).includes(urlSize) ? urlSize : getMySize()
  const inStockOnly = params.get('instock') === '1'
  const gameDayOnly = params.get('collection') === 'gameday'

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const setCategory = (c: string) => updateParam('category', c === 'All' ? null : c)
  const setSize = (s: string | null) => {
    setMySize(s) // remember it for next time and for product pages
    updateParam('size', s)
  }

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => setError(true))
  }, [])

  const visible = useMemo(() => {
    if (!products) return []
    const list = products.filter(
      (p) =>
        (category === 'All' || categoryOf(p.garment_type) === category) &&
        (!size || p.available_sizes.includes(size)) &&
        (!inStockOnly || p.total_stock > 0) &&
        (!gameDayOnly || isGameDayProduct(p)) &&
        matches(p, query.trim()),
    )
    if (sort === 'price-asc') return [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') return [...list].sort((a, b) => b.price - a.price)
    return list
  }, [products, query, category, size, inStockOnly, gameDayOnly, sort])

  // How many items the size filter hides, so shoppers know why the list got shorter.
  const hiddenBySize = useMemo(() => {
    if (!products || !size) return 0
    return products.filter(
      (p) =>
        (category === 'All' || categoryOf(p.garment_type) === category) &&
        (!gameDayOnly || isGameDayProduct(p)) &&
        matches(p, query.trim()) &&
        !p.available_sizes.includes(size),
    ).length
  }, [products, size, category, query, gameDayOnly])

  return (
    <div className="container section">
      <div className="page-head">
        <h1>{gameDayOnly ? 'Game Day collection' : 'Shop all products'}</h1>
        <p className="muted">
          {gameDayOnly
            ? 'Football tees, The Game tee, the Gameday hood and Bulldog designs for Fenway.'
            : 'Sweatshirts, tees and layers for every corner of Yale.'}
        </p>
        {gameDayOnly && (
          <button className="filter-pill" onClick={() => updateParam('collection', null)}>
            Game Day collection <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      <div className="filters">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: navy hoodie, baseball, Branford…"
          aria-label="Search products"
        />
        <div className="chips" role="group" aria-label="Category">
          {['All', ...CATEGORIES].map((c) => (
            <button
              key={c}
              className={`chip ${category === c ? 'is-active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
          <option value="name">Name, A–Z</option>
          <option value="price-asc">Price, low to high</option>
          <option value="price-desc">Price, high to low</option>
        </select>
      </div>

      <div className="size-filter" role="group" aria-label="In stock in my size">
        <span className="size-filter-label">In stock in my size</span>
        <div className="size-filter-options">
          <button className={`size-chip ${!size ? 'is-active' : ''}`} onClick={() => setSize(null)}>
            Any
          </button>
          {SIZES.map((s) => (
            <button
              key={s}
              className={`size-chip ${size === s ? 'is-active' : ''}`}
              aria-pressed={size === s}
              onClick={() => setSize(size === s ? null : s)}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => updateParam('instock', e.target.checked ? '1' : null)}
          />
          <span className="toggle-track" aria-hidden="true" />
          Hide sold-out items
        </label>
      </div>

      {error && <p className="notice">We couldn't load the catalogue. Is the backend running?</p>}
      {!products && !error && <p className="muted">Loading products…</p>}
      {products && (
        <>
          <p className="muted result-count">
            {visible.length} {visible.length === 1 ? 'item' : 'items'}
            {size && (
              <>
                {' '}
                in stock in <strong>{size}</strong>
                {hiddenBySize > 0 && ` · ${hiddenBySize} sold out in ${size} hidden`}
                {' · '}
                <button className="link-button" onClick={() => setSize(null)}>
                  show all sizes
                </button>
              </>
            )}
          </p>
          <div className="product-grid">
            {visible.map((p) => (
              <ProductCard key={p.product_id} product={p} highlightSize={size} />
            ))}
          </div>
          {visible.length === 0 && (
            <p className="muted">No products match these filters. Try another size or search word.</p>
          )}
        </>
      )}
    </div>
  )
}
