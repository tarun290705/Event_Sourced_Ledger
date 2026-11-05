import { useId } from 'react'
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { formatPreciseDateTime } from '../../utils/dates'

const ICONS = { success: CircleCheck, error: CircleX, warning: TriangleAlert, info: Info }

export function ResultBanner({ tone, title, checkedAt, children }) {
  const Icon = ICONS[tone]

  return (
    <div
      className={`alert alert--${tone} result-banner`}
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
    >
      <Icon className="result-banner__icon" size={18} aria-hidden="true" />
      <div className="result-banner__content">
        <p className="result-banner__title">{title}</p>
        {children && <div className="result-banner__body">{children}</div>}
        {checkedAt && <p className="result-banner__meta">Checked {formatPreciseDateTime(checkedAt)}</p>}
      </div>
    </div>
  )
}

function FailedResult({ error }) {
  // 422: the backend could not rebuild state because an event is malformed or references missing data.
  // That is an integrity finding. Anything else means the check never completed.
  if (error.status === 422) {
    return (
      <ResultBanner tone="error" title="Replay failed: the event log contains data that cannot be replayed">
        <p>This is itself an integrity finding. The backend reported:</p>
        <pre className="code-block message-box">{error.message}</pre>
      </ResultBanner>
    )
  }

  return (
    <ResultBanner tone="warning" title="The check could not run">
      {error.message}
    </ResultBanner>
  )
}

// One card per check: header with the run button, then the state of the last run.
export default function ResultPanel({ title, description, check, renderResult, runLabel = 'Run check' }) {
  const titleId = useId()
  const running = check.status === 'running'

  return (
    <section className="card" aria-labelledby={titleId}>
      <div className="card__header">
        <div>
          <h2 className="card__title" id={titleId}>
            {title}
          </h2>
          <p className="text-muted">{description}</p>
        </div>
        <Button size="sm" onClick={() => check.run()} loading={running}>
          {check.status === 'idle' ? runLabel : 'Run again'}
        </Button>
      </div>

      <div className="card__body stack" aria-busy={running || undefined}>
        {check.status === 'idle' && <p className="text-muted">Not run yet.</p>}
        {running && (
          <div className="cluster">
            <Spinner label={`Running: ${title}`} />
            <span className="text-muted">Running. Large event logs can take a moment.</span>
          </div>
        )}
        {check.status === 'failed' && <FailedResult error={check.error} />}
        {check.status === 'done' && renderResult(check.data)}
      </div>
    </section>
  )
}