import { NavLink } from 'react-router-dom'
import {
  ArrowLeftRight,
  BookOpen,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { NAV_SECTIONS } from '../utils/constants'

const ICONS = {
  dashboard: LayoutDashboard,
  accounts: Wallet,
  transfers: ArrowLeftRight,
  ledger: BookOpen,
  events: ScrollText,
  audit: ClipboardList,
  integrity: ShieldCheck,
}

export default function Sidebar({ open, onClose }) {
  const { isStaff } = useAuth()
  const sections = NAV_SECTIONS.filter((section) => !section.staffOnly || isStaff)

  return (
    <>
      <div
        className={`sidebar-overlay${open ? ' sidebar-overlay--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside id="app-sidebar" className={`sidebar${open ? ' sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <span className="brand-mark">
            <Landmark size={18} aria-hidden="true" />
          </span>
          <span className="sidebar__brand-text">
            <span className="sidebar__brand-name">Event Ledger</span>
            <span className="sidebar__brand-sub">Operations console</span>
          </span>
          <button type="button" className="icon-btn sidebar__close" onClick={onClose} aria-label="Close navigation">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Main">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="sidebar__section-label">{section.label}</p>
              <ul className="sidebar__list">
                {section.items.map(({ label, path, icon, end }) => {
                  const Icon = ICONS[icon]

                  return (
                    <li key={path}>
                      <NavLink
                        to={path}
                        end={end}
                        onClick={onClose}
                        className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
                      >
                        <Icon size={18} aria-hidden="true" />
                        <span>{label}</span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}