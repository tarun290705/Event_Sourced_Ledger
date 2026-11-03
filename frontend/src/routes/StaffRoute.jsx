import { Link, Outlet } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../utils/constants'

export default function StaffRoute() {
  const { isStaff } = useAuth()

  if (isStaff) return <Outlet />

  return (
    <div className="card">
      <div className="state-panel">
        <ShieldAlert className="state-panel__icon" size={32} aria-hidden="true" />
        <h2>Staff access required</h2>
        <p className="state-panel__text">
          Your account does not have permission to view this page. Ask an administrator if you need access.
        </p>
        <Link className="btn btn--secondary" to={ROUTES.DASHBOARD}>
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}