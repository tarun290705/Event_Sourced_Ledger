import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'
import { getAccount } from '../../services/accountService'
import ErrorState from '../../components/ui/ErrorState'
import MoneyText from '../../components/domain/MoneyText'
import StatusBadge from '../../components/domain/StatusBadge'
import AccountStatusActions from '../../components/domain/AccountStatusActions'
import HistoricalBalance from './HistoricalBalance'
import AccountEntriesCard from './AccountEntriesCard'
import { formatDateTime } from '../../utils/dates'
import { humanize } from '../../utils/format'
import { normalBalanceSide } from '../../utils/ledger'
import { ROUTES } from '../../utils/constants'

function BackLink() {
  return (
    <Link className="back-link" to={ROUTES.ACCOUNTS}>
      <ArrowLeft size={16} aria-hidden="true" />
      Back to accounts
    </Link>
  )
}

function DetailSkeleton() {
  return (
    <div className="stack" role="status" aria-label="Loading account">
      <span className="skeleton skeleton--value" />
      <div className="detail-grid">
        <div className="card">
          <div className="card__body stack">
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        </div>
        <div className="card">
          <div className="card__body">
            <span className="skeleton skeleton--value" />
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountDetailContent({ accountId }) {
  const { user, isStaff } = useAuth()
  const fetchAccount = useCallback(() => getAccount(accountId), [accountId])
  const { data: account, error, refetch } = useApi(fetchAccount)

  // The backend answers 404 for unknown ids and for malformed ids alike
  if (error?.status === 404) {
    return (
      <div className="stack">
        <BackLink />
        <div className="card">
          <div className="state-panel">
            <SearchX className="state-panel__icon" size={32} aria-hidden="true" />
            <h2>Account not found</h2>
            <p className="state-panel__text">This account does not exist or the link is wrong.</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="stack">
        <BackLink />
        <div className="card">
          <ErrorState error={error} onRetry={refetch} title="Could not load the account" />
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="stack">
        <BackLink />
        <DetailSkeleton />
      </div>
    )
  }

  // Ledger entries and historical balances are limited to staff and the account owner (404 otherwise)
  const canViewLedger = isStaff || account.owner === user.id
  const balanceHidden = account.balance_minor_units === null
  const normalSide = normalBalanceSide(account.account_type)

  return (
    <div className="stack">
      <BackLink />

      <div className="detail-header">
        <div className="detail-header__title">
          <h2>{account.name}</h2>
          <StatusBadge status={account.status} />
        </div>
        {isStaff && <AccountStatusActions account={account} onChanged={refetch} variant="secondary" size="md" />}
      </div>

      {account.status === 'FROZEN' && (
        <div className="alert alert--warning" role="status">
          This account is frozen. Transfers involving it are rejected until it is reactivated.
        </div>
      )}
      {account.status === 'CLOSED' && (
        <div className="alert alert--info" role="status">
          This account is closed permanently. Its ledger history remains available.
        </div>
      )}

      <div className="detail-grid">
        <section className="card" aria-labelledby="account-info-title">
          <div className="card__header">
            <h2 className="card__title" id="account-info-title">
              Account information
            </h2>
          </div>
          <div className="card__body">
            <dl className="definition-list">
              <dt>Account number</dt>
              <dd className="mono">{account.account_number}</dd>
              <dt>Name</dt>
              <dd>{account.name}</dd>
              <dt>Type</dt>
              <dd>{humanize(account.account_type)}</dd>
              <dt>Currency</dt>
              <dd>{account.currency}</dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={account.status} />
              </dd>
              <dt>Owner</dt>
              <dd>{account.owner_username ?? <span className="text-muted">No owner</span>}</dd>
              <dt>Created</dt>
              <dd>{formatDateTime(account.created_at)}</dd>
              <dt>Account ID</dt>
              <dd className="mono">{account.id}</dd>
            </dl>
          </div>
        </section>

        <section className="card" aria-labelledby="balance-title">
          <div className="card__header">
            <h2 className="card__title" id="balance-title">
              Current balance
            </h2>
          </div>
          <div className="card__body stack">
            {balanceHidden ? (
              <p className="text-muted">Balances are visible to staff and the account owner only.</p>
            ) : (
              <>
                <div className="balance-figure">
                  <MoneyText minorUnits={account.balance_minor_units} currency={account.currency} />
                </div>
                <p className="text-muted">
                  {normalSide === 'DEBIT'
                    ? 'Debit-normal account: balance is total debits minus total credits.'
                    : 'Credit-normal account: balance is total credits minus total debits.'}
                </p>
              </>
            )}
          </div>
        </section>
      </div>

      {canViewLedger ? (
        <>
          <HistoricalBalance account={account} />
          <AccountEntriesCard account={account} />
        </>
      ) : (
        <div className="alert alert--info" role="status">
          Ledger entries and balance history are visible to staff and the account owner only.
        </div>
      )}
    </div>
  )
}

export default function AccountDetailPage() {
  const { accountId } = useParams()

  // key resets all state (filters, lookups) when navigating from one account to another
  return <AccountDetailContent key={accountId} accountId={accountId} />
}