import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import FieldTracker from './FieldTracker'
import ThemeToggle from './ThemeToggle'
import Ticker from './Ticker'

const MAIN_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products', end: false },
  { to: '/about', label: 'About us', end: false },
]

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    close()
    await logout()
    navigate('/')
  }

  return (
    <header className="site-header">
      <Ticker />
      <nav className="nav container" aria-label="Main">
        <Link to="/" className="brand" onClick={close}>
          <span className="brand-mark">CC</span>
          <span className="brand-text">
            Campus Customs
            <small>Bulldog Blue</small>
          </span>
        </Link>

        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen((o) => !o)}
        >
          Menu
        </button>

        <div id="nav-links" className={`nav-links ${open ? 'is-open' : ''}`}>
          <ul className="nav-main">
            {MAIN_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} onClick={close}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <ul className="nav-account">
            <li>
              <ThemeToggle />
            </li>
            {user ? (
              <>
                <li className="nav-greeting">Hi, {user.first_name}</li>
                <li>
                  <button className="btn btn-small btn-outline" onClick={handleLogout}>
                    Log out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <NavLink to="/login" onClick={close}>
                    Log in
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/create-account" className="btn btn-small" onClick={close}>
                    Create account
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
      </nav>
      <FieldTracker />
    </header>
  )
}
