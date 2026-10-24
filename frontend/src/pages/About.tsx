import { Link } from 'react-router-dom'
import { STORE } from '../store'

export default function About() {
  return (
    <div className="container section narrow">
      <p className="eyebrow">About us</p>
      <h1>A New Haven shop with a lot of Bulldog in it</h1>
      <p className="lead">
        Campus Customs is the team behind Bulldog Blue, an officially licensed collection of Yale apparel
        and gifts. We design, print and pack your gear right here in New Haven.
      </p>

      <h2>What we make</h2>
      <p>
        Our shelves run from heavyweight hoodies and classic crewnecks to quarter-zips, fleece jackets and
        everyday tees. You'll find pieces for every residential college, a growing lineup for Yale's teams,
        and designs for The Game against Harvard. Whether you're a first-year, a proud parent or an alum
        coming back for reunion, there's something with your name on it, sometimes literally.
      </p>

      <h2>How we work</h2>
      <p>
        We don't keep warehouses full of shirts nobody asked for. Most items are printed once you order
        them, which keeps waste down and lets us offer custom pieces like alumni class-year gear. Expect
        most orders to be ready in {STORE.productionDays} before they head out, mostly by UPS. We ship
        internationally too.
      </p>

      <h2>Our promise</h2>
      <ul>
        <li>Every Yale mark we print is officially licensed.</li>
        <li>
          Prices and stock on this site come straight from our inventory, and our chat assistant uses the same
          numbers.
        </li>
        <li>
          Unworn items with tags can come back within {STORE.returnDays} days of shipping. Custom and final-sale
          pieces can't be returned.
        </li>
      </ul>

      <h2>Visit or reach us</h2>
      <div className="contact-card">
        <div>
          <strong>Shop</strong>
          <p>
            {STORE.street}
            <br />
            {STORE.city}
          </p>
        </div>
        <div>
          <strong>Order help</strong>
          <p>
            <a href={`tel:${STORE.phoneHref}`}>{STORE.phone}</a>
            <br />
            <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
          </p>
        </div>
      </div>

      <p>
        <Link to="/products" className="btn">
          Browse the collection
        </Link>
      </p>
    </div>
  )
}
