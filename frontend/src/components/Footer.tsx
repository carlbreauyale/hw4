import { Link } from 'react-router-dom'
import { STORE } from '../store'
import LabubuBuddy from './LabubuBuddy'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3>Stop by the shop</h3>
          <p>
            {STORE.street}
            <br />
            {STORE.city}
          </p>
        </div>
        <div>
          <h3>Questions about an order?</h3>
          <p>
            <a href={`tel:${STORE.phoneHref}`}>{STORE.phone}</a>
            <br />
            <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
          </p>
        </div>
        <div>
          <h3>Shop</h3>
          <p>
            <Link to="/products">All products</Link>
            <br />
            <Link to="/about">About us</Link>
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {YEAR} Campus Customs · Officially licensed merchandise</span>
        <a
          className="design-credit"
          href="https://www.linkedin.com/in/carl-breau/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="design-credit-text">Design by Labubu Carl</span>
          <LabubuBuddy />
        </a>
      </div>
    </footer>
  )
}
