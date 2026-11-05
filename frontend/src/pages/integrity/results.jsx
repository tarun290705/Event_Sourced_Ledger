import { Link } from 'react-router-dom'
import DataTable from '../../components/data/DataTable'
import MoneyText from '../../components/domain/MoneyText'
import StatusBadge from '../../components/domain/StatusBadge'
import { ResultBanner } from './ResultPanel'
import { formatNumber, shortId } from '../../utils/format'
import { formatMinorUnits } from '../../utils/money'
import { accountPath, transactionPath } from '../../utils/constants'

const PREVIEW_LIMIT = 50

const plural = (count, word) => `${formatNumber(count)} ${word}${count === 1 ? '' : 's'}`

const showValue = (value) => (value === null || value === undefined ? '—' : String(value))

function TruncationNote({ shown, total }) {
  if (total <= shown) return null

  return (
    <p className="text-muted">
      Showing the first {formatNumber(shown)} of {formatNumber(total)}.
    </p>
  )
}

function ResultTable({ columns, rows, rowKey, caption }) {
  return (
    <div className="result-table">
      <DataTable columns={columns} rows={rows} rowKey={rowKey} caption={caption} />
    </div>
  )
}

function IdList({ ids, renderId = (id) => id }) {
  const shown = ids.slice(0, PREVIEW_LIMIT)

  return (
    <>
      <ul className="id-list">
        {shown.map((id) => (
          <li key={id} className="mono">
            {renderId(id)}
          </li>
        ))}
      </ul>
      <TruncationNote shown={shown.length} total={ids.length} />
    </>
  )
}

function Finding({ title, description, children }) {
  return (
    <div className="stack">
      <div>
        <h3>{title}</h3>
        <p className="text-muted">{description}</p>
      </div>
      {children}
    </div>
  )
}

function difference(live, replayed, currency) {
  if (live === null || live === undefined || replayed === null || replayed === undefined) return '—'

  const delta = BigInt(live) - BigInt(replayed)
  return `${delta > 0n ? '+' : ''}${formatMinorUnits(delta, currency)}`
}

/* ---------- Replay transfers ---------- */

const REPLAYED_TRANSFER_COLUMNS = [
  {
    key: 'transfer_id',
    header: 'Transfer',
    render: (transfer) => (
      <span className="mono" title={transfer.transfer_id}>
        {shortId(transfer.transfer_id)}
      </span>
    ),
  },
  {
    key: 'source',
    header: 'From account',
    render: (transfer) => (
      <Link className="mono" to={accountPath(transfer.source_account_id)} title={transfer.source_account_id}>
        {shortId(transfer.source_account_id)}
      </Link>
    ),
  },
  {
    key: 'destination',
    header: 'To account',
    render: (transfer) => (
      <Link className="mono" to={accountPath(transfer.destination_account_id)} title={transfer.destination_account_id}>
        {shortId(transfer.destination_account_id)}
      </Link>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: (transfer) => <MoneyText minorUnits={transfer.amount_minor_units} currency={transfer.currency} />,
  },
  {
    key: 'ledger',
    header: 'Ledger transaction',
    render: (transfer) => (
      <Link className="mono" to={transactionPath(transfer.ledger_transaction_id)} title={transfer.ledger_transaction_id}>
        {shortId(transfer.ledger_transaction_id)}
      </Link>
    ),
  },
  { key: 'status', header: 'Status', render: (transfer) => <StatusBadge status={transfer.status} /> },
]

export function ReplayTransfersResult({ data }) {
  const shown = data.transfers.slice(0, PREVIEW_LIMIT)

  return (
    <>
      <ResultBanner
        tone="success"
        title={`Replay completed: ${plural(data.count, 'transfer')} rebuilt from events`}
        checkedAt={data.checked_at}
      >
        This is the state implied by the TransferCompleted events alone. Nothing was changed.
      </ResultBanner>
      {shown.length > 0 && (
        <>
          <ResultTable
            caption="Transfers rebuilt from events"
            columns={REPLAYED_TRANSFER_COLUMNS}
            rows={shown}
            rowKey="transfer_id"
          />
          <TruncationNote shown={shown.length} total={data.count} />
        </>
      )}
    </>
  )
}

/* ---------- Replay balances ---------- */

const REPLAYED_BALANCE_COLUMNS = [
  {
    key: 'account',
    header: 'Account',
    render: (item) => (
      <Link className="mono" to={accountPath(item.account_id)} title={item.account_id}>
        {item.account_number ?? shortId(item.account_id)}
      </Link>
    ),
  },
  { key: 'currency', header: 'Currency' },
  {
    key: 'balance',
    header: 'Replayed balance',
    align: 'right',
    render: (item) => <MoneyText minorUnits={item.balance_minor_units} currency={item.currency} />,
  },
]

export function ReplayBalancesResult({ data }) {
  const shown = data.balances.slice(0, PREVIEW_LIMIT)

  return (
    <>
      <ResultBanner
        tone="success"
        title={`Replay completed: balances rebuilt for ${plural(data.count, 'account')}`}
        checkedAt={data.checked_at}
      >
        These balances come from the LedgerTransactionPosted events alone. Only accounts that appear in events are
        listed. Nothing was changed.
      </ResultBanner>
      {shown.length > 0 && (
        <>
          <ResultTable
            caption="Account balances rebuilt from events"
            columns={REPLAYED_BALANCE_COLUMNS}
            rows={shown}
            rowKey="account_id"
          />
          <TruncationNote shown={shown.length} total={data.count} />
        </>
      )}
    </>
  )
}

/* ---------- Verify transfers ---------- */

const TRANSFER_MISMATCH_COLUMNS = [
  {
    key: 'transfer_id',
    header: 'Transfer',
    render: (mismatch) => (
      <span className="mono" title={mismatch.transfer_id}>
        {shortId(mismatch.transfer_id)}
      </span>
    ),
  },
  {
    key: 'field',
    header: 'Field',
    render: (mismatch) => (
      <span className="mono">
        {mismatch.field}
        {mismatch.field === 'amount_minor_units' ? ' (minor units)' : ''}
      </span>
    ),
  },
  {
    key: 'replayed_value',
    header: 'From events',
    render: (mismatch) => <span className="mono">{showValue(mismatch.replayed_value)}</span>,
  },
  {
    key: 'database_value',
    header: 'In database',
    render: (mismatch) => <span className="mono">{showValue(mismatch.database_value)}</span>,
  },
]

export function VerifyTransfersResult({ data }) {
  if (data.is_consistent) {
    return (
      <ResultBanner tone="success" title="Transfers are consistent" checkedAt={data.checked_at}>
        Every transfer in the database matches its event, and every transfer event has a matching transfer.
      </ResultBanner>
    )
  }

  const parts = []
  if (data.missing_events.length > 0) parts.push(`${plural(data.missing_events.length, 'transfer')} without an event`)
  if (data.missing_transfers.length > 0) parts.push(`${plural(data.missing_transfers.length, 'event')} without a transfer`)
  if (data.mismatches.length > 0) parts.push(plural(data.mismatches.length, 'mismatched field'))

  const mismatches = data.mismatches.slice(0, PREVIEW_LIMIT)

  return (
    <>
      <ResultBanner tone="error" title="Transfers are inconsistent" checkedAt={data.checked_at}>
        {parts.join(', ')}.
      </ResultBanner>

      {data.missing_events.length > 0 && (
        <Finding
          title="Missing events"
          description="Transfers that exist in the database but have no TransferCompleted event."
        >
          <IdList ids={data.missing_events} />
        </Finding>
      )}

      {data.missing_transfers.length > 0 && (
        <Finding
          title="Missing transfers"
          description="TransferCompleted events whose transfer does not exist in the database."
        >
          <IdList ids={data.missing_transfers} />
        </Finding>
      )}

      {mismatches.length > 0 && (
        <Finding
          title="Mismatches"
          description="Transfers whose stored values differ from the values recorded in their event."
        >
          <ResultTable
            caption="Transfer fields that differ from their events"
            columns={TRANSFER_MISMATCH_COLUMNS}
            rows={mismatches}
            rowKey={(mismatch) => `${mismatch.transfer_id}-${mismatch.field}`}
          />
          <TruncationNote shown={mismatches.length} total={data.mismatches.length} />
        </Finding>
      )}
    </>
  )
}

/* ---------- Verify balances ---------- */

const BALANCE_MISMATCH_COLUMNS = [
  {
    key: 'account',
    header: 'Account',
    render: (mismatch) => (
      <Link className="mono" to={accountPath(mismatch.account_id)} title={mismatch.account_id}>
        {mismatch.account_number ?? shortId(mismatch.account_id)}
      </Link>
    ),
  },
  { key: 'currency', header: 'Currency', render: (mismatch) => mismatch.currency ?? '—' },
  {
    key: 'replayed',
    header: 'From events',
    align: 'right',
    render: (mismatch) => <MoneyText minorUnits={mismatch.replayed_balance} currency={mismatch.currency} />,
  },
  {
    key: 'live',
    header: 'Live ledger',
    align: 'right',
    render: (mismatch) => <MoneyText minorUnits={mismatch.live_balance} currency={mismatch.currency} />,
  },
  {
    key: 'difference',
    header: 'Difference',
    align: 'right',
    render: (mismatch) => (
      <span className="num">{difference(mismatch.live_balance, mismatch.replayed_balance, mismatch.currency)}</span>
    ),
  },
]

export function VerifyBalancesResult({ data }) {
  if (data.is_consistent) {
    return (
      <ResultBanner tone="success" title="Account balances are consistent" checkedAt={data.checked_at}>
        The balances rebuilt from events equal the live ledger balances for every account.
      </ResultBanner>
    )
  }

  const shown = data.mismatches.slice(0, PREVIEW_LIMIT)

  return (
    <>
      <ResultBanner
        tone="error"
        title="Account balances are inconsistent"
        checkedAt={data.checked_at}
      >
        {plural(data.mismatches.length, 'account')} where the balance rebuilt from events differs from the live ledger.
      </ResultBanner>
      <ResultTable
        caption="Accounts whose replayed balance differs from the live balance"
        columns={BALANCE_MISMATCH_COLUMNS}
        rows={shown}
        rowKey="account_id"
      />
      <TruncationNote shown={shown.length} total={data.mismatches.length} />
    </>
  )
}

/* ---------- Missing events ---------- */

export function MissingEventsResult({ data }) {
  if (data.is_consistent) {
    return (
      <ResultBanner tone="success" title="No posted transaction is missing its event" checkedAt={data.checked_at}>
        Every posted ledger transaction has a LedgerTransactionPosted event.
      </ResultBanner>
    )
  }

  return (
    <>
      <ResultBanner
        tone="error"
        title={`${plural(data.count, 'posted transaction')} without an event`}
        checkedAt={data.checked_at}
      >
        These transactions are in the ledger but were never recorded in the event log.
      </ResultBanner>
      <Finding title="Transactions" description="Open one to inspect its entries.">
        <IdList
          ids={data.transaction_ids}
          renderId={(id) => <Link to={transactionPath(id)}>{id}</Link>}
        />
      </Finding>
    </>
  )
}