import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, BookOpen, RefreshCw, Wallet } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useApi } from '../hooks/useApi'
import { getDashboardSummary } from '../services/dashboardService'
import { listAccounts } from '../services/accountService'
import { listTransactions } from '../services/ledgerService'
import { listTransfers } from '../services/transferService'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import StatCard from '../components/data/StatCard'
import DataTable from '../components/data/DataTable'
import MiniBarChart from '../components/data/MiniBarChart'
import MoneyText from '../components/domain/MoneyText'
import StatusBadge from '../components/domain/StatusBadge'
import { formatCalendarDate, formatDateTime } from '../utils/dates'
import { formatNumber, humanize, shortId } from '../utils/format'
import { getTransactionTotal } from '../utils/ledger'
import { ROUTES, accountPath, transactionPath } from '../utils/constants'

const CHART_SERIES = [
  { name: 'Ledger transactions', tone: 'primary' },
  { name: 'Transfers', tone: 'accent' },
]

const TRANSACTION_COLUMNS = [
  {
    key: 'id',
    header: 'Transaction',
    render: (transaction) => (
      <Link className="mono" to={transactionPath(transaction.id)} title={transaction.id}>
        {shortId(transaction.id)}
      </Link>
    ),
  },
  { key: 'posted_at', header: 'Posted', render: (transaction) => formatDateTime(transaction.posted_at) },
  {
    key: 'transaction_type',
    header: 'Type',
    render: (transaction) => <Badge tone="info">{humanize(transaction.transaction_type)}</Badge>,
  },
  { key: 'description', header: 'Description' },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: (transaction) => {
      const total = getTransactionTotal(transaction)
      return total?.currency ? <MoneyText minorUnits={total.minorUnits} currency={total.currency} /> : '—'
    },
  },
]

const TRANSFER_COLUMNS = [
  { key: 'created_at', header: 'Created', render: (transfer) => formatDateTime(transfer.created_at) },
  {
    key: 'source',
    header: 'From',
    render: (transfer) => (
      <Link className="mono" to={accountPath(transfer.source_account_id)}>
        {transfer.source_account_number}
      </Link>
    ),
  },
  {
    key: 'destination',
    header: 'To',
    render: (transfer) => (
      <Link className="mono" to={accountPath(transfer.destination_account_id)}>
        {transfer.destination_account_number}
      </Link>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: (transfer) => <MoneyText minorUnits={transfer.amount_minor_units} currency={transfer.currency} />,
  },
  { key: 'status', header: 'Status', render: (transfer) => <StatusBadge status={transfer.status} /> },
]

const BALANCE_COLUMNS = [
  {
    key: 'account',
    header: 'Account',
    render: (account) => (
      <>
        <Link className="mono" to={accountPath(account.id)}>
          {account.account_number}
        </Link>
        <div className="table__sub">{account.name}</div>
      </>
    ),
  },
  { key: 'account_type', header: 'Type', render: (account) => humanize(account.account_type) },
  { key: 'status', header: 'Status', render: (account) => <StatusBadge status={account.status} /> },
  {
    key: 'balance',
    header: 'Balance',
    align: 'right',
    render: (account) => <MoneyText minorUnits={account.balance_minor_units} currency={account.currency} />,
  },
]

export default function DashboardPage() {
  const { user, isStaff } = useAuth()

  const fetchTransactions = useCallback(() => listTransactions({ page_size: 5 }), [])
  const fetchTransfers = useCallback(() => listTransfers({ page_size: 5 }), [])
  const fetchBalances = useCallback(
    () =>
      listAccounts({
        ordering: '-balance_minor_units',
        page_size: 6,
        // Non-staff users only see balances for accounts they own
        ...(isStaff ? {} : { owner: user.id }),
      }),
    [isStaff, user.id],
  )

  const summary = useApi(getDashboardSummary)
  const transactions = useApi(fetchTransactions)
  const transfers = useApi(fetchTransfers)
  const balances = useApi(fetchBalances)

  const refreshAll = () => {
    summary.refetch()
    transactions.refetch()
    transfers.refetch()
    balances.refetch()
  }
  const refreshing = [summary, transactions, transfers, balances].some((request) => request.loading)

  const summaryData = summary.data
  const initialSummaryLoad = summary.loading && !summaryData
  const scopeCaption = summaryData ? (summaryData.scope === 'own' ? 'On your accounts' : 'Across all accounts') : undefined
  const byStatus = summaryData?.accounts.by_status
  const accountCaption = byStatus
    ? `${formatNumber(byStatus.ACTIVE)} active · ${formatNumber(byStatus.FROZEN)} frozen · ${formatNumber(byStatus.CLOSED)} closed`
    : undefined

  const activity = summaryData?.activity ?? []
  const hasActivity = activity.some((day) => day.transactions > 0 || day.transfers > 0)
  const chartData = activity.map((day) => ({
    key: day.date,
    label: formatCalendarDate(day.date, { day: 'numeric' }),
    fullLabel: formatCalendarDate(day.date),
    values: [day.transactions, day.transfers],
  }))
  const rangeLabel =
    activity.length > 0
      ? `${formatCalendarDate(activity[0].date)} to ${formatCalendarDate(activity[activity.length - 1].date)}`
      : ''

  return (
    <div className="stack">
      <div className="page-toolbar">
        <Button variant="secondary" size="sm" icon={RefreshCw} loading={refreshing} onClick={refreshAll}>
          Refresh
        </Button>
      </div>

      {summary.error ? (
        <div className="card">
          <ErrorState error={summary.error} onRetry={summary.refetch} title="Could not load the summary" />
        </div>
      ) : (
        <>
          <div className="dashboard-stats">
            <StatCard
              label="Accounts"
              icon={Wallet}
              loading={initialSummaryLoad}
              value={formatNumber(summaryData?.accounts.total)}
              caption={accountCaption}
            />
            <StatCard
              label="Posted transactions"
              icon={BookOpen}
              loading={initialSummaryLoad}
              value={formatNumber(summaryData?.transactions.total)}
              caption={scopeCaption}
            />
            <StatCard
              label="Transfers"
              icon={ArrowLeftRight}
              loading={initialSummaryLoad}
              value={formatNumber(summaryData?.transfers.total)}
              caption={scopeCaption}
            />
          </div>

          <section className="card" aria-labelledby="activity-title">
            <div className="card__header">
              <div>
                <h2 className="card__title" id="activity-title">
                  Activity, last 14 days
                </h2>
                {rangeLabel && <p className="text-muted">{rangeLabel}</p>}
              </div>
            </div>
            <div className="card__body">
              {initialSummaryLoad ? (
                <span className="skeleton skeleton--chart" role="status" aria-label="Loading activity" />
              ) : hasActivity ? (
                <div className="stack">
                  <MiniBarChart
                    data={chartData}
                    series={CHART_SERIES}
                    ariaLabel="Ledger transactions and transfers per day, last 14 days"
                  />
                  <p className="text-muted chart__note">
                    Each transfer also posts a ledger transaction, so it counts in both series.
                  </p>
                </div>
              ) : (
                <EmptyState title="No activity yet" message="There were no transactions or transfers in the last 14 days." />
              )}
            </div>
          </section>
        </>
      )}

      <div className="dashboard-columns">
        <section className="card" aria-labelledby="recent-transactions-title">
          <div className="card__header">
            <h2 className="card__title" id="recent-transactions-title">
              Recent transactions
            </h2>
            <Link className="card__action" to={ROUTES.TRANSACTIONS}>
              View all
            </Link>
          </div>
          <div className="card__body card__body--flush">
            <DataTable
              caption="Most recent ledger transactions"
              columns={TRANSACTION_COLUMNS}
              rows={transactions.data?.results}
              loading={transactions.loading}
              error={transactions.error}
              onRetry={transactions.refetch}
              emptyTitle="No transactions yet"
              emptyMessage="Posted ledger transactions will appear here."
            />
          </div>
        </section>

        <section className="card" aria-labelledby="recent-transfers-title">
          <div className="card__header">
            <h2 className="card__title" id="recent-transfers-title">
              Recent transfers
            </h2>
            <Link className="card__action" to={ROUTES.TRANSFERS}>
              View all
            </Link>
          </div>
          <div className="card__body card__body--flush">
            <DataTable
              caption="Most recent transfers"
              columns={TRANSFER_COLUMNS}
              rows={transfers.data?.results}
              loading={transfers.loading}
              error={transfers.error}
              onRetry={transfers.refetch}
              emptyTitle="No transfers yet"
              emptyMessage="Completed transfers will appear here."
            />
          </div>
        </section>
      </div>

      <section className="card" aria-labelledby="balances-title">
        <div className="card__header">
          <h2 className="card__title" id="balances-title">
            Account balances
          </h2>
          <Link className="card__action" to={ROUTES.ACCOUNTS}>
            View all
          </Link>
        </div>
        <div className="card__body card__body--flush">
          <DataTable
            caption="Accounts with the highest balances"
            columns={BALANCE_COLUMNS}
            rows={balances.data?.results}
            loading={balances.loading}
            error={balances.error}
            onRetry={balances.refetch}
            emptyTitle="No accounts yet"
            emptyMessage={isStaff ? 'Create an account to see balances here.' : 'You do not own any accounts yet.'}
          />
        </div>
      </section>
    </div>
  )
}