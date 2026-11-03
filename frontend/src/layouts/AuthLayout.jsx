import { Outlet } from 'react-router-dom'
import { Landmark } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-layout__panel">
        <div className="auth-layout__brand">
          <span className="brand-mark">
            <Landmark size={18} aria-hidden="true" />
          </span>
          <span className="auth-layout__brand-text">
            <span className="auth-layout__brand-name">Event Ledger</span>
            <span className="auth-layout__brand-sub">Operations console</span>
          </span>
        </div>
        <Outlet />
      </div>
    </div>
  )
}