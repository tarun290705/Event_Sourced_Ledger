import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="state-panel state-panel--compact">
      <Icon className="state-panel__icon" size={28} aria-hidden="true" />
      <h3>{title}</h3>
      {message && <p className="state-panel__text">{message}</p>}
      {action}
    </div>
  )
}