import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import StaffRoute from './StaffRoute'
import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import NotFoundPage from '../pages/NotFoundPage'
import AccountsPage from '../pages/accounts/AccountsPage'
import AccountDetailPage from '../pages/accounts/AccountDetailPage'
import TransfersPage from '../pages/transfers/TransfersPage'
import TransactionsPage from '../pages/ledger/TransactionsPage'
import TransactionDetailPage from '../pages/ledger/TransactionDetailPage'
import EventLogPage from '../pages/events/EventLogPage'
import AuditLogsPage from '../pages/audit/AuditLogsPage'
import IntegrityPage from '../pages/integrity/IntegrityPage'
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
          <Route path={ROUTES.TRANSFERS} element={<TransfersPage />} />
          <Route path={ROUTES.TRANSACTIONS} element={<TransactionsPage />} />
          <Route path={ROUTES.TRANSACTION_DETAIL} element={<TransactionDetailPage />} />

          <Route element={<StaffRoute />}>
            <Route path={ROUTES.EVENTS} element={<EventLogPage />} />
            <Route path={ROUTES.AUDIT_LOGS} element={<AuditLogsPage />} />
            <Route path={ROUTES.INTEGRITY} element={<IntegrityPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}