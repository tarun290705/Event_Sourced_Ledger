import { Link } from 'react-router-dom'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import MoneyText from '../../components/domain/MoneyText'
import StatusBadge from '../../components/domain/StatusBadge'
import { formatDateTime } from '../../utils/dates'
import { accountPath, transactionPath } from '../../utils/constants'

export default function TransferDetailModal({ transfer, onClose }) {
  return (
    <Modal
      title="Transfer details"
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose} data-autofocus>
          Close
        </Button>
      }
    >
      <div className="stack">
        <dl className="definition-list">
          <dt>Transfer ID</dt>
          <dd className="mono">{transfer.id}</dd>
          <dt>Status</dt>
          <dd>
            <StatusBadge status={transfer.status} />
          </dd>
          <dt>Created</dt>
          <dd>{formatDateTime(transfer.created_at)}</dd>
          <dt>From</dt>
          <dd>
            <Link className="mono" to={accountPath(transfer.source_account_id)}>
              {transfer.source_account_number}
            </Link>{' '}
            · {transfer.source_account_name}
          </dd>
          <dt>To</dt>
          <dd>
            <Link className="mono" to={accountPath(transfer.destination_account_id)}>
              {transfer.destination_account_number}
            </Link>{' '}
            · {transfer.destination_account_name}
          </dd>
          <dt>Amount</dt>
          <dd>
            <MoneyText minorUnits={transfer.amount_minor_units} currency={transfer.currency} />
          </dd>
          <dt>Currency</dt>
          <dd>{transfer.currency}</dd>
          <dt>Ledger transaction</dt>
          <dd>
            <Link className="mono" to={transactionPath(transfer.ledger_transaction_id)}>
              {transfer.ledger_transaction_id}
            </Link>
          </dd>
          <dt>Idempotency key</dt>
          <dd className="mono">{transfer.idempotency_key}</dd>
        </dl>
        <p className="text-muted">
          Submitting this key again with the same details returns this transfer instead of creating a new one.
        </p>
      </div>
    </Modal>
  )
}