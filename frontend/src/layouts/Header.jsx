import { LogOut, Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import { NAV_SECTIONS, ROUTES } from '../utils/constants'
import { useState } from 'react'

const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)

function getPageTitle(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'

  if (path.startsWith('/accounts/')) return 'Account details'
  if (path.startsWith('/transactions/')) return 'Transaction details'

  const match = NAV_ITEMS.find((item) => item.path === path)
  return match ? match.label : 'Page not found'
}

export default function Header({ onMenuClick, menuOpen }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    // Explicit sign-out: go to /login with no "return to" destination
    navigate(ROUTES.LOGIN, { replace: true, state: null })
  }

  return (
    <header className="header">
      <div className="header__left">
        <button
          type="button"
          className="icon-btn header__menu"
          onClick={onMenuClick}
          aria-label="Open navigation"
          aria-controls="app-sidebar"
          aria-expanded={menuOpen}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <h1 className="header__title">{getPageTitle(pathname)}</h1>
      </div>

      <div className="header__right">
        <div className="user-chip">
          <span className="user-chip__avatar" aria-hidden="true">
            {user.username.charAt(0).toUpperCase()}
          </span>
          <span className="user-chip__text">
            <span className="user-chip__name">{user.username}</span>
            <span className="user-chip__role">{user.is_staff ? 'Staff' : 'Account holder'}</span>
          </span>
        </div>
        <Button variant="secondary" size="sm" icon={LogOut} loading={loggingOut} onClick={handleLogout}>
          <span className="header__logout-label">Log out</span>
        </Button>
      </div>
    </header>
  )
}