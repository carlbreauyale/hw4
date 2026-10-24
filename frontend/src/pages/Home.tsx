import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, openChat, type Product } from '../api'
import { CATEGORIES, categoryOf } from '../categories'
import GameCountdown from '../components/GameCountdown'
import ProductCard from '../components/ProductCard'
import { THE_GAME, isGameDayProduct } from '../gameday'
import { STORE } from '../store'

// One in-stock pick from each category, so the home page shows the range.
function pickFeatured(products: Product[]): Product[] {
  return CATEGORIES.map((c) =>
    products.find((p) => categoryOf(p.garment_type) === c && p.total_stock > 0 && !isGameDayProduct(p)),
  ).filter((p): p is Product => p !== undefined)
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    getProducts().then(setProducts).catch(() => setProducts([]))
  }, [])

  const gameDay = products.filter((p) => isGameDayProduct(p) && p.total_stock > 0)
  const featured = pickFeatured(products)

  return (
    <>
      <section className="hero stadium">
        <div className="stadium-beams" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow jersey-stripes">Game week in New Haven</p>
            <h1>
              Gear up for
              <span className="hero-big">{THE_GAME.title}</span>
            </h1>
            <p className="lead">
              Yale meets Harvard for the {THE_GAME.edition} time, this year at {THE_GAME.venue}. Show up in
              Bulldog blue: officially licensed tees, hoodies and crews, printed to order just off Broadway.
            </p>
            <div className="hero-actions">
              <Link to="/products?collection=gameday" className="btn btn-light">
                Shop Game Day
              </Link>
              <button className="btn btn-outline-light" onClick={() => openChat('What should I wear to Fenway for The Game?')}>
                Ask the coach
              </button>
            </div>
          </div>
          <GameCountdown />
        </div>
      </section>

      {gameDay.length > 0 && (
        <section className="container section reveal">
          <div className="section-head">
            <h2 className="pennant">Gear up for Fenway</h2>
            <Link to="/products?collection=gameday">Shop all Game Day →</Link>
          </div>
          <p className="muted section-sub">
            The Game tee, football tees, our Gameday hood and vintage Bulldog designs, in stock now.
          </p>
          <div className="product-grid">
            {gameDay.slice(0, 8).map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="container stat-row reveal" aria-label="Why Campus Customs">
        <div className="stat">
          <span className="stat-number">100%</span>
          <h3>Officially licensed</h3>
          <p>Real Yale marks on every item, so your gear is the genuine article.</p>
        </div>
        <div className="stat">
          <span className="stat-number">5–8</span>
          <h3>Days to print</h3>
          <p>We print each order fresh; most are ready to ship in {STORE.productionDays}.</p>
        </div>
        <div className="stat">
          <span className="stat-number">{STORE.returnDays}</span>
          <h3>Day returns</h3>
          <p>Send unworn items back within {STORE.returnDays} days of shipping (custom pieces are final sale).</p>
        </div>
      </section>

      <section className="container section reveal">
        <div className="section-head">
          <h2 className="pennant">Bulldog favorites</h2>
          <Link to="/products">See everything →</Link>
        </div>
        {featured.length > 0 ? (
          <div className="product-grid">
            {featured.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        ) : (
          <p className="muted">Loading our latest gear…</p>
        )}
      </section>

      <section className="visit">
        <div className="container visit-inner">
          <div>
            <h2>Come say hi in person</h2>
            <p>
              Our shop sits at {STORE.street}, a short walk from campus. Try on a hoodie, pick up a
              gift for the family or just talk Yale sports with us.
            </p>
          </div>
          <Link to="/about" className="btn">
            Our story
          </Link>
        </div>
      </section>
    </>
  )
}
