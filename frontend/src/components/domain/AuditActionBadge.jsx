import Badge from '../ui/Badge'
import { humanize } from '../../utils/format'

const TONES = {
  ACCOUNT_CREATED: 'success',
  ACCOUNT_UPDATED: 'info',
  ACCOUNT_FROZEN: 'warning',
  ACCOUNT_CLOSED: 'neutral',
  TRANSFER_POSTED: 'info',
  TRANSFER_COMPLETED: 'success',
  TRANSFER_FAILED: 'danger',
}

export default function AuditActionBadge({ action }) {
  return <Badge tone={TONES[action] ?? 'neutral'}>{humanize(action)}</Badge>
}