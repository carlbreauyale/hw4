import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../useAuth'

export default function Login() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Send the shopper back to where they came from (default: home).
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  if (user) {
    return (
      <div className="container section auth">
        <div className="auth-card">
          <h1>You're logged in</h1>
          <p className="muted">
            Signed in as <strong>{user.email}</strong>.
          </p>
          <Link to="/products" className="btn btn-block">
            Keep shopping
          </Link>
          <button className="btn btn-block btn-outline" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container section auth">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Welcome back</h1>
        <p className="muted">Log in to pick up your chat where you left off.</p>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-block" type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className="muted">
          New here? <Link to="/create-account">Create an account</Link>
        </p>
      </form>
    </div>
  )
}
