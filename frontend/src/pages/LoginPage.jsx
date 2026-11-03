import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { normalizeApiError } from '../utils/errors'
import { validateRequired } from '../utils/validators'
import { ROUTES } from '../utils/constants'
import Button from '../components/ui/Button'
import { PageLoader } from '../components/ui/Spinner'
import FormField from '../components/form/FormField'
import Input from '../components/form/Input'

export default function LoginPage() {
  const { status, login } = useAuth()
  const location = useLocation()
  const [values, setValues] = useState({ username: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from
  const redirectTo =
    from && from.pathname !== ROUTES.LOGIN
      ? `${from.pathname}${from.search}${from.hash}`
      : ROUTES.DASHBOARD

  if (status === 'loading') return <PageLoader label="Checking session" />
  if (status === 'authenticated') return <Navigate to={redirectTo} replace />

  const handleChange = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const errors = validateRequired(values, ['username', 'password'])
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      await login(values.username.trim(), values.password)
    } catch (error) {
      const normalized = normalizeApiError(error)
      const hasFieldErrors = Object.keys(normalized.fieldErrors).length > 0

      setFieldErrors(
        Object.fromEntries(Object.entries(normalized.fieldErrors).map(([field, list]) => [field, list[0]])),
      )
      setFormError(hasFieldErrors ? null : normalized.message)
      setValues((current) => ({ ...current, password: '' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <form className="card__body stack" onSubmit={handleSubmit} noValidate>
        <div>
          <h1>Sign in</h1>
          <p className="text-muted">Use your ledger account credentials.</p>
        </div>

        {from && !formError && (
          <div className="alert alert--info" role="status">
            Please sign in to continue.
          </div>
        )}
        {formError && (
          <div className="alert alert--error" role="alert">
            {formError}
          </div>
        )}

        <FormField label="Username" required error={fieldErrors.username}>
          <Input name="username" value={values.username} onChange={handleChange} autoComplete="username" />
        </FormField>
        <FormField label="Password" required error={fieldErrors.password}>
          <Input
            name="password"
            type="password"
            value={values.password}
            onChange={handleChange}
            autoComplete="current-password"
          />
        </FormField>

        <Button type="submit" loading={submitting}>
          Sign in
        </Button>
      </form>
    </div>
  )
}