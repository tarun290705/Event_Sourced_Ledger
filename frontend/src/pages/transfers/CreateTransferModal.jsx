import { useState } from 'react'
import { RefreshCw, Wallet } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import FormField from '../../components/form/FormField'
import Input from '../../components/form/Input'
import AccountSelect from '../../components/domain/AccountSelect'
import MoneyText from '../../components/domain/MoneyText'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'
import { listAccounts } from '../../services/accountService'
import { createTransfer } from '../../services/transferService'
import { generateIdempotencyKey } from '../../utils/idempotency'
import { formatMinorUnits, parseToMinorUnits } from '../../utils/money'
import { normalizeApiError } from '../../utils/errors'

const FORM_ID = 'create-transfer-form'
const MAX_ACCOUNTS = 100
const INITIAL_VALUES = { source: '', destination: '', amount: '', description: '' }

const FIELD_MAP = {
  source_account_id: 'source',
  destination_account_id: 'destination',
  amount_minor_units: 'amount',
  description: 'description',
  idempotency_key: 'key',
}

const fetchEligibleAccounts = () =>
  listAccounts({ status: 'ACTIVE', account_type: 'LIABILITY', ordering: 'account_number', page_size: MAX_ACCOUNTS })

export default function CreateTransferModal({ onClose, onCompleted }) {
  const { user, isStaff } = useAuth()
  const accountsRequest = useApi(fetchEligibleAccounts)

  const [values, setValues] = useState(INITIAL_VALUES)
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [step, setStep] = useState('edit')
  const [submitting, setSubmitting] = useState(false)

  const eligible = accountsRequest.data?.results ?? []
  const truncated = (accountsRequest.data?.count ?? 0) > eligible.length
  // Non-staff users may only send from accounts they own (the backend enforces this too)
  const sources = isStaff ? eligible : eligible.filter((account) => account.owner === user.id)
  const source = eligible.find((account) => account.id === values.source) ?? null
  const destination = eligible.find((account) => account.id === values.destination) ?? null
  const destinations = source
    ? eligible.filter((account) => account.id !== source.id && account.currency === source.currency)
    : []

  const parsedAmount = parseToMinorUnits(values.amount, source?.currency)
  const description = values.description.trim()
  const availableBalance = source && source.balance_minor_units !== null ? source.balance_minor_units : null
  const exceedsBalance =
    parsedAmount.value !== null && availableBalance !== null && BigInt(parsedAmount.value) > BigInt(availableBalance)

  const clearError = (name) => setFieldErrors((current) => ({ ...current, [name]: undefined }))

  const handleChange = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    clearError(name)
  }

  const handleSourceChange = (event) => {
    const nextId = event.target.value
    const nextSource = eligible.find((account) => account.id === nextId) ?? null

    // Keep the chosen destination only while it is still a valid match for the new source
    setValues((current) => {
      const destinationStillValid =
        nextSource !== null &&
        eligible.some(
          (account) =>
            account.id === current.destination &&
            account.id !== nextSource.id &&
            account.currency === nextSource.currency,
        )

      return { ...current, source: nextId, destination: destinationStillValid ? current.destination : '' }
    })
    setFieldErrors((current) => ({ ...current, source: undefined, destination: undefined }))
  }

  const handleKeyChange = (event) => {
    setIdempotencyKey(event.target.value)
    clearError('key')
  }

  const validate = () => {
    const errors = {}

    if (!values.source) errors.source = 'Choose the account to send from.'
    if (!values.destination) errors.destination = 'Choose the account to send to.'
    if (parsedAmount.error) errors.amount = parsedAmount.error
    if (values.description.length > 255) errors.description = 'Use at most 255 characters.'

    const key = idempotencyKey.trim()
    if (!key) errors.key = 'An idempotency key is required.'
    else if (key.length > 155) errors.key = 'Use at most 155 characters.'

    return errors
  }

  const handleReview = (event) => {
    event.preventDefault()

    const errors = validate()
    setFieldErrors(errors)
    setFormError(null)

    if (Object.keys(errors).length === 0) setStep('review')
  }

  const submit = async () => {
    setSubmitting(true)
    setFormError(null)

    const payload = {
      source_account_id: source.id,
      destination_account_id: destination.id,
      amount_minor_units: parsedAmount.value,
      idempotency_key: idempotencyKey.trim(),
    }
    if (description) payload.description = description

    try {
      onCompleted(await createTransfer(payload))
    } catch (error) {
      const normalized = normalizeApiError(error)
      const inline = {}
      const messages = [...normalized.messages]

      for (const [field, list] of Object.entries(normalized.fieldErrors)) {
        const mapped = FIELD_MAP[field]
        if (mapped) inline[mapped] = list[0]
        else messages.push(`${field}: ${list.join(' ')}`)
      }

      if (messages.length === 0 && Object.keys(inline).length === 0) messages.push(normalized.message)

      if (messages.some((message) => message.includes('Idempotency key was already used'))) {
        messages.push('If you meant to send a new transfer, generate a new key.')
      }

      // The request may have been processed even though we never saw the answer
      if (normalized.isNetworkError || (normalized.status !== null && normalized.status >= 500)) {
        messages.push(
          'The result is unknown. Submitting again with the same idempotency key is safe: the transfer is created at most once.',
        )
      }

      setFieldErrors(inline)
      setFormError(messages.join(' ') || null)
      setStep('edit')
    } finally {
      setSubmitting(false)
    }
  }

  const ready = Boolean(accountsRequest.data) && sources.length > 0

  let body
  if (accountsRequest.error) {
    body = <ErrorState error={accountsRequest.error} onRetry={accountsRequest.refetch} title="Could not load accounts" />
  } else if (!accountsRequest.data) {
    body = (
      <div className="state-panel state-panel--compact">
        <Spinner size="lg" label="Loading accounts" />
      </div>
    )
  } else if (sources.length === 0) {
    body = (
      <EmptyState
        icon={Wallet}
        title="No account to send from"
        message={
          isStaff
            ? 'There are no active Liability accounts yet.'
            : 'You do not own an active Liability account. Transfers can only be sent from your own active Liability accounts.'
        }
      />
    )
  } else if (step === 'review') {
    body = (
      <div className="stack">
        <p>Check the details below. A completed transfer cannot be undone from this screen.</p>
        <dl className="definition-list">
          <dt>From</dt>
          <dd>
            <span className="mono">{source.account_number}</span> · {source.name}
          </dd>
          <dt>To</dt>
          <dd>
            <span className="mono">{destination.account_number}</span> · {destination.name}
          </dd>
          <dt>Amount</dt>
          <dd>
            <strong>
              <MoneyText minorUnits={parsedAmount.value} currency={source.currency} />
            </strong>
          </dd>
          <dt>Description</dt>
          <dd>{description || <span className="text-muted">Account transfer (default)</span>}</dd>
          <dt>Idempotency key</dt>
          <dd className="mono">{idempotencyKey.trim()}</dd>
        </dl>
      </div>
    )
  } else {
    body = (
      <form id={FORM_ID} className="stack" onSubmit={handleReview} noValidate>
        {truncated && (
          <div className="alert alert--info" role="status">
            Only the first {MAX_ACCOUNTS} active Liability accounts are listed.
          </div>
        )}
        {formError && (
          <div className="alert alert--error" role="alert">
            {formError}
          </div>
        )}

        <FormField
          label="From account"
          required
          error={fieldErrors.source}
          hint={
            availableBalance !== null
              ? `Available balance: ${formatMinorUnits(availableBalance, source.currency)}`
              : undefined
          }
        >
          <AccountSelect
            name="source"
            accounts={sources}
            value={values.source}
            onChange={handleSourceChange}
            placeholder="Select the sending account"
          />
        </FormField>

        <FormField
          label="To account"
          required
          error={fieldErrors.destination}
          hint={source ? `Only active Liability accounts in ${source.currency} are listed.` : undefined}
        >
          <AccountSelect
            name="destination"
            accounts={destinations}
            value={values.destination}
            onChange={handleChange}
            placeholder={source ? 'Select the receiving account' : 'Choose a sending account first'}
            disabled={!source}
          />
        </FormField>

        <FormField
          label={`Amount${source ? ` (${source.currency})` : ''}`}
          required
          error={fieldErrors.amount}
          hint="Enter the amount in major units, for example 250.00."
        >
          <Input
            name="amount"
            value={values.amount}
            onChange={handleChange}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
          />
        </FormField>
        {exceedsBalance && (
          <div className="alert alert--warning" role="status">
            This amount is higher than the available balance shown above. The transfer will most likely be rejected.
          </div>
        )}

        <FormField label="Description" error={fieldErrors.description} hint="Optional. Defaults to “Account transfer”.">
          <Input name="description" value={values.description} onChange={handleChange} maxLength={255} autoComplete="off" />
        </FormField>

        <FormField
          label="Idempotency key"
          required
          error={fieldErrors.key}
          hint="Sending the same key again returns the original transfer instead of creating a second one. Keep it unchanged when retrying."
        >
          <Input
            name="key"
            className="mono"
            value={idempotencyKey}
            onChange={handleKeyChange}
            maxLength={155}
            autoComplete="off"
            spellCheck={false}
          />
        </FormField>
        <div>
          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            onClick={() => setIdempotencyKey(generateIdempotencyKey())}
          >
            Generate new key
          </Button>
        </div>
      </form>
    )
  }

  let footer
  if (!ready) {
    footer = (
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    )
  } else if (step === 'review') {
    footer = (
      <>
        <Button variant="secondary" onClick={() => setStep('edit')} disabled={submitting}>
          Back
        </Button>
        <Button onClick={submit} loading={submitting} data-autofocus>
          Confirm transfer
        </Button>
      </>
    )
  } else {
    footer = (
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" form={FORM_ID}>
          Review transfer
        </Button>
      </>
    )
  }

  return (
    <Modal
      title={ready && step === 'review' ? 'Review transfer' : 'New transfer'}
      onClose={onClose}
      dismissible={!submitting}
      footer={footer}
    >
      {body}
    </Modal>
  )
}