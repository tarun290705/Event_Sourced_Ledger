import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, footer, size = 'md', dismissible = true }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog.open) dialog.showModal()
    dialog.querySelector('[data-autofocus]')?.focus()

    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  const handleCancel = (event) => {
    // Escape: React state decides whether the dialog actually closes
    event.preventDefault()
    if (dismissible) onClose()
  }

  const handleBackdropClick = (event) => {
    if (event.target === dialogRef.current && dismissible) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size}`}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="modal__panel">
        <div className="modal__header">
          <h2 className="modal__title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </dialog>
  )
}