import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getTransaction } from '../../services/ledgerService'
import Badge from '../../components/ui/Badge'
import ErrorState from '../../components/ui/ErrorState'
import EntriesTable from '../../components/domain/EntriesTable'
import MoneyText from '../../components/domain/MoneyText'
import StatusBadge from '../../components/domain/StatusBadge'
import { formatDateTime } from '../../utils/dates'
import { humanize, shortId } from '../../utils/format'
import { getTransactionTotal } from '../../utils/ledger'
import { ROUTES } from '../../utils/constants'

function BackLink() {
  return (
    <Link className="back-link" to={ROUTES.TRANSACTIONS}>
      <ArrowLeft size={16} aria-hidden="true" />
      Back to transactions
    </Link>
  )
}

function DetailSkeleton() {
  return (
    <div className="stack" role="status" aria-label="Loading transaction">
      <span className="skeleton skeleton--value" />
      <div className="card">
        <div className="card__body stack">
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </div>
      <div className="card">
        <div className="card__body">
          <span className="skeleton skeleton--chart" />
        </div>
      </div>
    </div>
  )
}

function TransactionDetailContent({ transactionId }) {
  const fetchTransaction = useCallback(() => getTransaction(transactionId), [transactionId])
  const { data: transaction, error, refetch } = useApi(fetchTransaction)

  // The backend answers 404 for unknown ids, malformed ids, and transactions you may not see
  if (error?.status === 404) {
    return (
      <div className="stack">
        <BackLink />
        <div className="card">
          <div className="state-panel">
            <SearchX className="state-panel__icon" size={32} aria-hidden="true" />
            <h2>Transaction not found</h2>
            <p className="state-panel__text">
              This transaction does not exist, is not posted, or does not involve one of your accounts.
            </p>
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
          <ErrorState error={error} onRetry={refetch} title="Could not load the transaction" />
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="stack">
        <BackLink />
        <DetailSkeleton />
      </div>
    )
  }

  const total = getTransactionTotal(transaction)

  return (
    <div className="stack">
      <BackLink />

      <div className="detail-header">
        <div className="detail-header__title">
          <h2 className="mono" title={transaction.id}>
            {shortId(transaction.id)}
          </h2>
          <Badge tone="info">{humanize(transaction.transaction_type)}</Badge>
          <StatusBadge status={transaction.status} />
        </div>
      </div>

      <section className="card" aria-labelledby="transaction-info-title">
        <div className="card__header">
          <h2 className="card__title" id="transaction-info-title">
            Transaction information
          </h2>
        </div>
        <div className="card__body">
          <dl className="definition-list">
            <dt>Transaction ID</dt>
            <dd className="mono">{transaction.id}</dd>
            <dt>Type</dt>
            <dd>{humanize(transaction.transaction_type)}</dd>
            <dt>Status</dt>
            <dd>
              <StatusBadge status={transaction.status} />
            </dd>
            <dt>Description</dt>
            <dd>{transaction.description}</dd>
            <dt>Posted</dt>
            <dd>{formatDateTime(transaction.posted_at)}</dd>
            <dt>Created</dt>
            <dd>{formatDateTime(transaction.created_at)}</dd>
            <dt>Total amount</dt>
            <dd>
              {total?.currency ? <MoneyText minorUnits={total.minorUnits} currency={total.currency} /> : '—'}
            </dd>
            <dt>Entries</dt>
            <dd>{transaction.entries.length}</dd>
          </dl>
        </div>
      </section>

      <section className="card" aria-labelledby="entries-title">
        <div className="card__header">
          <div>
            <h2 className="card__title" id="entries-title">
              Debit and credit entries
            </h2>
            <p className="text-muted">
              Every transaction records the same total on the debit side and the credit side. A debit increases asset
              and expense accounts and decreases liability, equity and income accounts. A credit does the opposite.
            </p>
          </div>
        </div>
        <div className="card__body">
          <EntriesTable entries={transaction.entries} />
        </div>
      </section>
    </div>
  )
}

export default function TransactionDetailPage() {
  const { transactionId } = useParams()

  return <TransactionDetailContent key={transactionId} transactionId={transactionId} />
}