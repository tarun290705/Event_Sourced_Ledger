import { useState } from 'react'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../../hooks/useToast'
import { updateAccountStatus } from '../../services/accountService'
import { normalizeApiError } from '../../utils/errors'
import { humanize } from '../../utils/format'
import { ACCOUNT_STATUS_ACTIONS } from '../../utils/constants'

const ACTION_LABELS = { FROZEN: 'Freeze', ACTIVE: 'Reactivate', CLOSED: 'Close' }

const CONFIRM_COPY = {
  FROZEN: {
    title: 'Freeze this account?',
    label: 'Freeze account',
    variant: 'primary',
    body: (number) =>
      `Transfers involving ${number} will be rejected until it is reactivated. Existing history is not affected.`,
  },
  ACTIVE: {
    title: 'Reactivate this account?',
    label: 'Reactivate account',
    variant: 'primary',
    body: (number) => `${number} will accept transfers again.`,
  },
  CLOSED: {
    title: 'Close this account permanently?',
    label: 'Close account',
    variant: 'danger',
    body: (number) =>
      `${number} will be closed. This cannot be undone: a closed account can never be reactivated. Its ledger history is kept.`,
  },
}

export default function AccountStatusActions({ account, onChanged, variant = 'ghost', size = 'sm' }) {
  const notify = useToast()
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const actions = ACCOUNT_STATUS_ACTIONS[account.status] ?? []

  if (actions.length === 0) return null

  const open = (next) => {
    setError(null)
    setTarget(next)
  }

  const cancel = () => {
    if (!busy) setTarget(null)
  }

  const confirm = async () => {
    setBusy(true)
    setError(null)

    try {
      await updateAccountStatus(account.id, target)
      setTarget(null)
      notify.success(`${account.account_number} is now ${humanize(target).toLowerCase()}.`)
      onChanged?.()
    } catch (err) {
      const normalized = normalizeApiError(err)
      setError(normalized.message)
      // A 400 usually means the account changed elsewhere; show the current state
      if (normalized.status === 400) onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  const copy = target ? CONFIRM_COPY[target] : null

  return (
    <>
      <div className="table__actions">
        {actions.map(({ to }) => (
          <Button
            key={to}
            size={size}
            variant={variant}
            onClick={() => open(to)}
            aria-label={`${ACTION_LABELS[to]} account ${account.account_number}`}
          >
            {ACTION_LABELS[to]}
          </Button>
        ))}
      </div>

      {target && (
        <ConfirmDialog
          title={copy.title}
          confirmLabel={copy.label}
          confirmVariant={copy.variant}
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={cancel}
        >
          <p>{copy.body(account.account_number)}</p>
        </ConfirmDialog>
      )}
    </>
  )
}