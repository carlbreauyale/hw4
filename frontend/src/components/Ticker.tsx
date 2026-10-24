import { useEffect, useState } from 'react'
import { getProducts, type Product } from '../api'
import { THE_GAME, gamePhase, timeUntilGame } from '../gameday'
import { getMySize } from '../mySize'
import { STORE } from '../store'

// D2: stadium LED ticker. Mixes real store facts with live numbers from the database.
function tickerItems(products: Product[] | null, now: number): string[] {
  const phase = gamePhase(now)
  const { days } = timeUntilGame(now)
  const items = [
    phase === 'countdown'
      ? `${days} ${days === 1 ? 'day' : 'days'} to ${THE_GAME.title} · ${THE_GAME.venue}`
      : phase === 'gameday'
        ? `It's game day · Yale vs ${THE_GAME.opponent} at ${THE_GAME.venue}`
        : `${THE_GAME.title} 2026 is in the books · Thanks for cheering, Bulldogs`,
  ]
  if (products) {
    const size = getMySize() ?? 'M'
    const inSize = products.filter((p) => p.available_sizes.includes(size)).length
    const units = products.reduce((sum, p) => sum + p.total_stock, 0)
    items.push(`${inSize} styles in stock in size ${size}`)
    items.push(`${products.length} styles · ${units.toLocaleString('en-US')} pieces in stock`)
  }
  items.push('Officially licensed Yale gear')
  items.push(`Printed to order in New Haven · ${STORE.productionDays}`)
  items.push(`${STORE.returnDays}-day returns`)
  items.push(`Visit us · ${STORE.street}, New Haven`)
  return items
}

export default function Ticker() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {})
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const items = tickerItems(products, now)
  // Rendered twice so the strip can loop seamlessly (it slides by exactly one copy).
  const strip = (hidden: boolean) => (
    <ul className="ticker-strip" aria-hidden={hidden || undefined}>
      {items.map((text, i) => (
        <li key={i}>
          <span className="ticker-dot" aria-hidden="true">
            ◆
          </span>
          {text}
        </li>
      ))}
    </ul>
  )

  return (
    <div className="ticker" role="marquee" aria-label="Store news">
      <div className="ticker-track">
        {strip(false)}
        {strip(true)}
      </div>
    </div>
  )
}
