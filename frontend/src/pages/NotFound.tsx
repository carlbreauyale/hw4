import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container section narrow">
      <h1>Page not found</h1>
      <p>
        That page wandered off campus. <Link to="/">Head back home</Link> or{' '}
        <Link to="/products">browse our products</Link>.
      </p>
    </div>
  )
}
