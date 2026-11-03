import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'

const ICONS = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
}

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" role="region" aria-label="Notifications">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] ?? Info

        return (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <Icon className="toast__icon" size={18} aria-hidden="true" />
            <p className="toast__message">{toast.message}</p>
            <button
              type="button"
              className="toast__close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}