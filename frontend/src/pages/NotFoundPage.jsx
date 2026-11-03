import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { ROUTES } from '../utils/constants'

export default function NotFoundPage() {
  return (
    <div className="card">
      <div className="state-panel">
        <SearchX className="state-panel__icon" size={32} aria-hidden="true" />
        <h2>Page not found</h2>
        <p className="state-panel__text">The page you are looking for does not exist or has moved.</p>
        <Link className="btn btn--primary" to={ROUTES.DASHBOARD}>
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}