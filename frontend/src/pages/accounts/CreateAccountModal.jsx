import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import FormField from '../../components/form/FormField'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import { createAccount } from '../../services/accountService'
import { normalizeApiError } from '../../utils/errors'
import { validateRequired } from '../../utils/validators'
import { humanize } from '../../utils/format'
import { ACCOUNT_TYPES } from '../../utils/constants'

const FORM_ID = 'create-account-form'
const INITIAL_VALUES = { account_number: '', name: '', account_type: '', currency: 'INR', owner: '' }
const CURRENCY_PATTERN = /^[A-Z]{3}$/

function validate(values, isStaff) {
  const errors = validateRequired(values, ['account_number', 'name', 'account_type', 'currency'])

  if (!errors.currency && !CURRENCY_PATTERN.test(values.currency)) {
    errors.currency = 'Use a 3-letter currency code, for example INR.'
  }

  if (isStaff && values.owner.trim() !== '' && !/^\d+$/.test(values.owner.trim())) {
    errors.owner = 'Enter a numeric user ID.'
  }

  return errors
}

export default function CreateAccountModal({ isStaff, onClose, onCreated }) {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    const nextValue = name === 'currency' ? value.toUpperCase() : value

    setValues((current) => ({ ...current, [name]: nextValue }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validation = validate(values, isStaff)
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation)
      return
    }

    const payload = {
      account_number: values.account_number.trim(),
      name: values.name.trim(),
      account_type: values.account_type,
      currency: values.currency,
    }
    if (isStaff && values.owner.trim() !== '') payload.owner = Number(values.owner.trim())

    setSubmitting(true)
    setFormError(null)

    try {
      const account = await createAccount(payload)
      onCreated(account)
    } catch (error) {
      const normalized = normalizeApiError(error)
      const renderedFields = ['account_number', 'name', 'account_type', 'currency', ...(isStaff ? ['owner'] : [])]
      const inline = {}
      const unmatched = []

      for (const [field, list] of Object.entries(normalized.fieldErrors)) {
        if (renderedFields.includes(field)) inline[field] = list[0]
        else unmatched.push(`${field}: ${list.join(' ')}`)
      }

      setFieldErrors(inline)
      setFormError([...normalized.messages, ...unmatched].join(' ') || null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="New account"
      onClose={onClose}
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={submitting}>
            Create account
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="stack" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="alert alert--error" role="alert">
            {formError}
          </div>
        )}

        <FormField label="Account number" required error={fieldErrors.account_number} hint="Up to 30 characters. Must be unique.">
          <Input
            name="account_number"
            value={values.account_number}
            onChange={handleChange}
            maxLength={30}
            autoComplete="off"
            data-autofocus
          />
        </FormField>

        <FormField label="Account name" required error={fieldErrors.name}>
          <Input name="name" value={values.name} onChange={handleChange} maxLength={100} autoComplete="off" />
        </FormField>

        <FormField
          label="Account type"
          required
          error={fieldErrors.account_type}
          hint="Transfers are only possible between Liability accounts."
        >
          <Select name="account_type" value={values.account_type} onChange={handleChange}>
            <option value="">Select a type</option>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {humanize(type)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Currency" required error={fieldErrors.currency} hint="Three-letter code, for example INR.">
          <Input name="currency" value={values.currency} onChange={handleChange} maxLength={3} autoComplete="off" />
        </FormField>

        {isStaff ? (
          <FormField
            label="Owner user ID"
            error={fieldErrors.owner}
            hint="Optional. Leave empty to create an account with no owner."
          >
            <Input name="owner" value={values.owner} onChange={handleChange} inputMode="numeric" autoComplete="off" />
          </FormField>
        ) : (
          <p className="text-muted">This account will be owned by you.</p>
        )}
      </form>
    </Modal>
  )
}