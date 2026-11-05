import { Lock } from 'lucide-react'

export default function ImmutableNotice({ title = 'Append-only record', children }) {
  return (
    <div className="immutable-notice" role="note">
      <Lock className="immutable-notice__icon" size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  )
}