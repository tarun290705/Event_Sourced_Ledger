import Badge from '../ui/Badge'
import { humanize } from '../../utils/format'

const TONES = {
  ACTIVE: 'success',
  FROZEN: 'warning',
  CLOSED: 'neutral',
  COMPLETED: 'success',
  POSTED: 'success',
  DRAFT: 'neutral',
}

export default function StatusBadge({ status }) {
  return <Badge tone={TONES[status] ?? 'neutral'}>{humanize(status)}</Badge>
}