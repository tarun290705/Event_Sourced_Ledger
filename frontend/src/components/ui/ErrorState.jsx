import { CircleAlert, RefreshCw } from 'lucide-react'
import Button from './Button'

export default function ErrorState({ error, onRetry, title = 'Could not load data' }) {
  const message = typeof error === 'string' ? error : error?.message

  return (
    <div className="state-panel state-panel--compact" role="alert">
      <CircleAlert className="state-panel__icon state-panel__icon--error" size={28} aria-hidden="true" />
      <h3>{title}</h3>
      {message && <p className="state-panel__text">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}