import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { formatPrice, type Product } from '../api'
import { useChatResults } from '../chatResults'
import Touchdown from './Touchdown'

function stockPill(p: Product) {
  if (p.total_stock <= 0) return <span className="pill pill-out">Sold out</span>
  return <span className="pill pill-in">In stock</span>
}

function ResultCard({ product, index, active }: { product: Product; index: number; active: boolean }) {
  return (
    <Link
      to={`/products/${product.product_id}`}
      className={`result-card ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="result-card-image">
        <img src={product.image_url} alt={product.name} loading="lazy" />
        {index === 0 && <span className="best-match">★ Best match</span>}
        {active && <span className="viewing">Viewing</span>}
        {stockPill(product)}
      </div>
      <div className="result-card-body">
        <p className="result-card-type">{product.garment_type}</p>
        <h3>{product.name}</h3>
        <p className="result-card-desc">{product.description}</p>
        <div className="result-card-foot">
          <span className="result-card-price">{formatPrice(product.price)}</span>
          <span className="result-card-cta">View details →</span>
        </div>
      </div>
    </Link>
  )
}

// The chat's search results, shown at the top of every page as a row of product cards.
export default function ChatResultsShelf() {
  const { results, clearResults, searching, chatOpen } = useChatResults()
  const { pathname } = useLocation()
  const trackRef = useRef<HTMLDivElement>(null)
  // Celebrate only results that arrive after the page loaded (not ones restored from storage).
  const [loadedAt] = useState(() => Date.now())

  // New results: bring the shelf into view and rewind the row.
  const resultsId = results?.id
  useEffect(() => {
    if (resultsId === undefined) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
    trackRef.current?.scrollTo({ left: 0 })
  }, [resultsId])

  if (!results) return null

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' })
  }

  const prices = results.products.map((p) => p.price)
  const low = Math.min(...prices)
  const high = Math.max(...prices)

  return (
    <section
      className={`results-shelf ${chatOpen ? 'chat-open' : ''} ${searching ? 'is-searching' : ''}`}
      aria-label="Products from your chat"
      key={results.id}
    >
      <div className="container results-inner">
        <header className="results-head">
          <div>
            <p className="results-eyebrow">
              <span className="spark" aria-hidden="true">✦</span> From your chat
              <span className="results-query">“{results.query}”</span>
            </p>
            <h2>
              {results.title}
              <span className="results-count">{results.products.length}</span>
            </h2>
            <p className="results-meta">
              {low === high ? formatPrice(low) : `${formatPrice(low)} – ${formatPrice(high)}`} · Click any card for
              full details and sizes
            </p>
          </div>
          <div className="results-actions">
            {results.category && (
              <Link to={`/products?category=${encodeURIComponent(results.category)}`} className="btn btn-light btn-small">
                See all {results.category}
              </Link>
            )}
            <button className="btn btn-outline-light btn-small" onClick={clearResults}>
              Clear
            </button>
          </div>
        </header>

        <div className="results-track-wrap">
          <button className="track-arrow track-prev" aria-label="Scroll left" onClick={() => scrollBy(-1)}>
            ‹
          </button>
          <div className="results-track" ref={trackRef}>
            {results.products.map((p, i) => (
              <ResultCard
                key={p.product_id}
                product={p}
                index={i}
                active={pathname === `/products/${p.product_id}`}
              />
            ))}
          </div>
          <button className="track-arrow track-next" aria-label="Scroll right" onClick={() => scrollBy(1)}>
            ›
          </button>
        </div>
      </div>
      {searching && <div className="results-searching">Searching the catalogue…</div>}
      {results.id > loadedAt && <Touchdown key={results.id} />}
    </section>
  )
}
