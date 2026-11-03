import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/ErrorState'

function SkeletonRows({ columns, count }) {
  return Array.from({ length: count }, (_, rowIndex) => (
    <tr key={rowIndex} aria-hidden="true">
      {columns.map((column) => (
        <td key={column.key}>
          <span className="skeleton" />
        </td>
      ))}
    </tr>
  ))
}

export default function DataTable({
  columns,
  rows,
  rowKey = 'id',
  loading = false,
  error = null,
  onRetry,
  caption,
  emptyTitle = 'Nothing to show',
  emptyMessage,
  emptyIcon,
  emptyAction,
  skeletonRows = 5,
}) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />

  const hasRows = Array.isArray(rows) && rows.length > 0

  if (!loading && !hasRows) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} action={emptyAction} />
  }

  const getKey = typeof rowKey === 'function' ? rowKey : (row) => row[rowKey]
  const cellClass = (column) => (column.align === 'right' ? 'table__cell--right' : undefined)
  const wrapClass = `table-wrap${loading && hasRows ? ' table-wrap--loading' : ''}`

  return (
    <div className={wrapClass} aria-busy={loading || undefined}>
      {loading && (
        <span className="sr-only" role="status">
          Loading
        </span>
      )}
      <table className="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cellClass(column)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !hasRows ? (
            <SkeletonRows columns={columns} count={skeletonRows} />
          ) : (
            rows.map((row) => (
              <tr key={getKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={cellClass(column)}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}