import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import StaffRoute from './StaffRoute'
import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import AccountsPage from '../pages/accounts/AccountsPage'
import AccountDetailPage from '../pages/accounts/AccountDetailPage'
import NotFoundPage from '../pages/NotFoundPage'
import PlaceholderPage from '../pages/PlaceholderPage'
import { ROUTES } from '../utils/constants'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path={ROUTES.ACCOUNTS} element={<AccountsPage />} />
          <Route path={ROUTES.ACCOUNT_DETAIL} element={<AccountDetailPage />} />
          <Route path={ROUTES.TRANSFERS} element={<PlaceholderPage title="Transfers" />} />
          <Route path={ROUTES.TRANSACTIONS} element={<PlaceholderPage title="Ledger transactions" />} />
          <Route path={ROUTES.TRANSACTION_DETAIL} element={<PlaceholderPage title="Transaction details" />} />

          <Route element={<StaffRoute />}>
            <Route path={ROUTES.EVENTS} element={<PlaceholderPage title="Event log" />} />
            <Route path={ROUTES.AUDIT_LOGS} element={<PlaceholderPage title="Audit logs" />} />
            <Route path={ROUTES.INTEGRITY} element={<PlaceholderPage title="System integrity" />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}