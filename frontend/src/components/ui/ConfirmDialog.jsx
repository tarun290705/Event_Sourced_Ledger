import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  const destructive = confirmVariant === 'danger'

  return (
    <Modal
      title={title}
      size="sm"
      onClose={onCancel}
      dismissible={!busy}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy} data-autofocus={destructive || undefined}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={busy}
            data-autofocus={!destructive || undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="stack">
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}
        <div>{children}</div>
      </div>
    </Modal>
  )
}