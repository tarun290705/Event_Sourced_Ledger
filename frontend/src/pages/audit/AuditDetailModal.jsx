import { Link } from 'react-router-dom'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import JsonViewer from '../../components/data/JsonViewer'
import AuditActionBadge from '../../components/domain/AuditActionBadge'
import ImmutableNotice from '../../components/domain/ImmutableNotice'
import { getResourcePath } from '../../utils/audit'
import { formatPreciseDateTime } from '../../utils/dates'
import { humanize } from '../../utils/format'

export default function AuditDetailModal({ record, onClose, onViewResource }) {
  const resourcePath = getResourcePath(record.resource_type, record.resource_id)

  return (
    <Modal
      title="Audit record"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={() => onViewResource(record)}>
            Show all records for this resource
          </Button>
          <Button variant="secondary" onClick={onClose} data-autofocus>
            Close
          </Button>
        </>
      }
    >
      <div className="stack">
        <ImmutableNotice title="Read-only record">
          Audit records document what happened and who did it. They cannot be edited or deleted.
        </ImmutableNotice>

        <dl className="definition-list">
          <dt>Record ID</dt>
          <dd className="mono">{record.id}</dd>
          <dt>Action</dt>
          <dd>
            <AuditActionBadge action={record.action} />
          </dd>
          <dt>Actor</dt>
          <dd>{record.actor ? <span className="mono">{record.actor}</span> : <span className="text-muted">Not recorded</span>}</dd>
          <dt>Resource type</dt>
          <dd>{humanize(record.resource_type)}</dd>
          <dt>Resource ID</dt>
          <dd>
            {resourcePath ? (
              <Link className="mono" to={resourcePath}>
                {record.resource_id}
              </Link>
            ) : (
              <span className="mono">{record.resource_id}</span>
            )}
          </dd>
          <dt>Description</dt>
          <dd>{record.description || <span className="text-muted">—</span>}</dd>
          <dt>Occurred</dt>
          <dd>{formatPreciseDateTime(record.occured_at)}</dd>
        </dl>

        <JsonViewer value={record.metadata} label="Metadata" />
      </div>
    </Modal>
  )
}