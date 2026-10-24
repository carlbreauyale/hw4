import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../useAuth'

const MIN_PASSWORD = 8

export default function CreateAccount() {
  const { user, signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (form.password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`)
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords don’t match.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await signup({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        password: form.password,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (user) {
    return (
      <div className="container section auth">
        <div className="auth-card">
          <h1>You already have an account</h1>
          <p className="muted">
            You're signed in as <strong>{user.email}</strong>.
          </p>
          <Link to="/products" className="btn btn-block">
            Keep shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container section auth">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Join Campus Customs</h1>
        <p className="muted">An account saves your chats with our assistant so you can come back to them.</p>

        <div className="field-row">
          <label>
            First name
            <input value={form.firstName} onChange={update('firstName')} required maxLength={60} autoComplete="given-name" />
          </label>
          <label>
            Last name
            <input value={form.lastName} onChange={update('lastName')} required maxLength={60} autoComplete="family-name" />
          </label>
        </div>
        <label>
          Email
          <input type="email" value={form.email} onChange={update('email')} required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={update('password')}
            required
            minLength={MIN_PASSWORD}
            maxLength={128}
            autoComplete="new-password"
          />
          <small className="hint">At least {MIN_PASSWORD} characters.</small>
        </label>
        <label>
          Confirm password
          <input type="password" value={form.confirm} onChange={update('confirm')} required autoComplete="new-password" />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-block" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="muted">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  )
}
