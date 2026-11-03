import { X } from 'lucide-react'
import Button from '../ui/Button'

export default function FilterBar({ children, onReset, canReset = false }) {
  return (
    <div className="filter-bar" role="group" aria-label="Filters">
      <div className="filter-bar__fields">{children}</div>
      {onReset && (
        <Button variant="ghost" size="sm" icon={X} onClick={onReset} disabled={!canReset}>
          Clear filters
        </Button>
      )}
    </div>
  )
}