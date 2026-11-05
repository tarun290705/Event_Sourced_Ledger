import { Link } from 'react-router-dom'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import JsonViewer from '../../components/data/JsonViewer'
import ImmutableNotice from '../../components/domain/ImmutableNotice'
import { formatPreciseDateTime } from '../../utils/dates'
import { humanize } from '../../utils/format'
import { transactionPath } from '../../utils/constants'

// The ledger transaction an event relates to, when it can be determined from the event itself
function getRelatedTransactionId(event) {
  if (event.aggregate_type === 'LEDGER_TRANSACTION') return event.aggregate_id

  const fromPayload = event.payload?.ledger_transaction_id
  return typeof fromPayload === 'string' ? fromPayload : null
}

export default function EventDetailModal({ event, onClose, onViewStream }) {
  const relatedTransactionId = getRelatedTransactionId(event)

  return (
    <Modal
      title="Event details"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={() => onViewStream(event)}>
            View this aggregate&apos;s events
          </Button>
          <Button variant="secondary" onClick={onClose} data-autofocus>
            Close
          </Button>
        </>
      }
    >
      <div className="stack">
        <ImmutableNotice title="Immutable record">
          This event is part of the append-only log. It cannot be edited or deleted.
        </ImmutableNotice>

        <dl className="definition-list">
          <dt>Event ID</dt>
          <dd className="mono">{event.id}</dd>
          <dt>Event type</dt>
          <dd className="mono">{event.event_type}</dd>
          <dt>Aggregate type</dt>
          <dd>
            <Badge tone="neutral">{humanize(event.aggregate_type)}</Badge>
          </dd>
          <dt>Aggregate ID</dt>
          <dd className="mono">{event.aggregate_id}</dd>
          <dt>Sequence number</dt>
          <dd className="num">{event.sequence_number}</dd>
          <dt>Occurred</dt>
          <dd>{formatPreciseDateTime(event.occured_at)}</dd>
          {relatedTransactionId && (
            <>
              <dt>Ledger transaction</dt>
              <dd>
                <Link className="mono" to={transactionPath(relatedTransactionId)}>
                  {relatedTransactionId}
                </Link>
              </dd>
            </>
          )}
        </dl>

        <JsonViewer value={event.payload} label="Payload" />
      </div>
    </Modal>
  )
}