import Button from '../ui/Button'
import Select from '../form/Select'
import { formatNumber } from '../../utils/format'

const PAGE_SIZES = [10, 25, 50, 100]

export default function Pagination({ page, pageSize, count, onPageChange, onPageSizeChange, disabled = false }) {
  if (!count) return null

  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, count)

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__summary num">
        Showing {formatNumber(first)}–{formatNumber(last)} of {formatNumber(count)}
      </p>
      <div className="pagination__controls">
        {onPageSizeChange && (
          <label className="pagination__size">
            <span>Rows</span>
            <Select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              disabled={disabled}
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </label>
        )}
        <Button size="sm" variant="secondary" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="pagination__page num">
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  )
}