import { useMemo, useState } from 'react'
import Button from '../../components/ui/Button'
import FormField from '../../components/form/FormField'
import Input from '../../components/form/Input'
import MoneyText from '../../components/domain/MoneyText'
import { getHistoricalBalance } from '../../services/ledgerService'
import { formatDateTime } from '../../utils/dates'
import { normalizeApiError } from '../../utils/errors'
import { formatMinorUnits } from '../../utils/money'

const HOUR = 60 * 60 * 1000

const PRESETS = [
  { label: '1 hour ago', compute: () => new Date(Date.now() - HOUR) },
  {
    label: 'Start of today',
    compute: () => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      return date
    },
  },
  { label: '7 days ago', compute: () => new Date(Date.now() - 7 * 24 * HOUR) },
]

// <input type="datetime-local"> works in local time, in the format YYYY-MM-DDTHH:mm
function toLocalInputValue(date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return shifted.toISOString().slice(0, 16)
}

export default function HistoricalBalance({ account }) {
  const [value, setValue] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [requestError, setRequestError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  const runLookup = async (localValue) => {
    // "2026-11-03T14:30" is parsed as local time; toISOString() then yields UTC with a "Z",
    // which satisfies the backend's requirement that the timestamp carries a timezone.
    const date = new Date(localValue)

    if (!localValue || Number.isNaN(date.getTime())) {
      setFieldError('Choose a date and time.')
      return
    }
    if (date.getTime() > Date.now()) {
      setFieldError('Choose a time that is not in the future.')
      return
    }

    setLoading(true)
    setFieldError(null)
    setRequestError(null)

    try {
      setResult(await getHistoricalBalance(account.id, date.toISOString()))
    } catch (error) {
      const normalized = normalizeApiError(error)
      setResult(null)

      if (normalized.fieldErrors.as_of) setFieldError(normalized.fieldErrors.as_of[0])
      else setRequestError(normalized.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (event) => {
    setValue(event.target.value)
    setFieldError(null)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    runLookup(value)
  }

  const handlePreset = (preset) => {
    const next = toLocalInputValue(preset.compute())
    setValue(next)
    runLookup(next)
  }

  const currentBalance = account.balance_minor_units
  let deltaText = null

  if (result && currentBalance !== null && currentBalance !== undefined) {
    const delta = BigInt(currentBalance) - BigInt(result.balance_minor_units)

    deltaText =
      delta === 0n
        ? 'No change since then.'
        : `Change since then: ${delta > 0n ? '+' : ''}${formatMinorUnits(delta, result.currency)}`
  }

  return (
    <section className="card" aria-labelledby="historical-balance-title">
      <div className="card__header">
        <div>
          <h2 className="card__title" id="historical-balance-title">
            Historical balance
          </h2>
          <p className="text-muted">The balance after every transaction posted up to a chosen moment.</p>
        </div>
      </div>
      <div className="card__body stack">
        <form className="lookup-form" onSubmit={handleSubmit} noValidate>
          <FormField
            label="Date and time"
            error={fieldError}
            hint={`Interpreted in your browser's timezone (${timeZone}).`}
          >
            <Input type="datetime-local" value={value} onChange={handleChange} max={toLocalInputValue(new Date())} />
          </FormField>
          <div>
            <Button type="submit" loading={loading}>
              Look up balance
            </Button>
          </div>
        </form>

        <div className="cluster" role="group" aria-label="Quick selections">
          <span className="text-muted">Quick select:</span>
          {PRESETS.map((preset) => (
            <Button key={preset.label} size="sm" variant="secondary" disabled={loading} onClick={() => handlePreset(preset)}>
              {preset.label}
            </Button>
          ))}
        </div>

        {requestError && (
          <div className="alert alert--error" role="alert">
            {requestError}
          </div>
        )}

        {result && (
          <div className="lookup-result" role="status">
            <span className="text-muted">Balance as of {formatDateTime(result.as_of)}</span>
            <span className="balance-figure">
              <MoneyText minorUnits={result.balance_minor_units} currency={result.currency} />
            </span>
            {deltaText && <span className="text-muted">{deltaText}</span>}
          </div>
        )}
      </div>
    </section>
  )
}