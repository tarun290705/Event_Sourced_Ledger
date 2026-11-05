import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, SearchX } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useDebounce } from '../../hooks/useDebounce'
import { usePagination } from '../../hooks/usePagination'
import { listAuditLogs } from '../../services/auditService'
import Button from '../../components/ui/Button'
import FormField from '../../components/form/FormField'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import FilterBar from '../../components/data/FilterBar'
import DataTable from '../../components/data/DataTable'
import Pagination from '../../components/data/Pagination'
import AuditActionBadge from '../../components/domain/AuditActionBadge'
import ImmutableNotice from '../../components/domain/ImmutableNotice'
import AuditDetailModal from './AuditDetailModal'
import { getResourcePath } from '../../utils/audit'
import { formatPreciseDateTime } from '../../utils/dates'
import { formatNumber, humanize, shortId } from '../../utils/format'
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../../utils/constants'

const EMPTY_FILTERS = { action: '', resourceType: '', resourceId: '' }

const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'occured_at', label: 'Oldest first' },
]

export default function AuditLogsPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [ordering, setOrdering] = useState('')
  const [detailRecord, setDetailRecord] = useState(null)

  const debouncedResourceId = useDebounce(filters.resourceId.trim())

  const resetKey = JSON.stringify([filters.action, filters.resourceType, debouncedResourceId, ordering])
  const { page, pageSize, setPage, setPageSize } = usePagination(resetKey)

  const params = useMemo(() => {
    const next = { page, page_size: pageSize }
    // Without an ordering parameter the backend sorts newest first
    if (ordering) next.ordering = ordering
    if (filters.action) next.action = filters.action
    if (filters.resourceType) next.resource_type = filters.resourceType
    if (debouncedResourceId) next.resource_id = debouncedResourceId
    return next
  }, [page, pageSize, ordering, filters.action, filters.resourceType, debouncedResourceId])

  const fetchLogs = useCallback(() => listAuditLogs(params), [params])
  const logs = useApi(fetchLogs)

  // DRF answers 404 for a page past the end: fall back to the first page
  const listError = logs.error
  useEffect(() => {
    if (listError?.status === 404 && page > 1) setPage(1)
  }, [listError, page, setPage])

  const rows = logs.data?.results
  const count = logs.data?.count ?? 0
  const hasFilters = Boolean(filters.action || filters.resourceType || filters.resourceId)

  const updateFilter = (name) => (event) => setFilters((current) => ({ ...current, [name]: event.target.value }))
  const clearFilters = () => setFilters(EMPTY_FILTERS)

  // The audit trail of one resource, oldest first so it reads as a timeline
  const viewResource = (record) => {
    setFilters({ action: '', resourceType: record.resource_type, resourceId: record.resource_id })
    setOrdering('occured_at')
    setDetailRecord(null)
  }

  const columns = [
    { key: 'occured_at', header: 'Time', render: (record) => formatPreciseDateTime(record.occured_at) },
    { key: 'action', header: 'Action', render: (record) => <AuditActionBadge action={record.action} /> },
    {
      key: 'actor',
      header: 'Actor',
      render: (record) =>
        record.actor ? <span className="mono">{record.actor}</span> : <span className="text-muted">—</span>,
    },
    {
      key: 'resource',
      header: 'Resource',
      render: (record) => {
        const path = getResourcePath(record.resource_type, record.resource_id)

        return (
          <>
            {path ? (
              <Link className="mono" to={path} title={record.resource_id}>
                {shortId(record.resource_id)}
              </Link>
            ) : (
              <span className="mono" title={record.resource_id}>
                {shortId(record.resource_id)}
              </span>
            )}
            <div className="table__sub">{humanize(record.resource_type)}</div>
          </>
        )
      },
    },
    {
      key: 'description',
      header: 'Description',
      render: (record) => record.description || <span className="text-muted">—</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (record) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDetailRecord(record)}
          aria-label={`View audit record ${shortId(record.id)}`}
        >
          Details
        </Button>
      ),
    },
  ]

  return (
    <div className="stack">
      <ImmutableNotice title="Read-only audit trail">
        Audit records document important system operations. They are written once by the backend and can never be edited
        or deleted, and this screen offers read access only.
      </ImmutableNotice>

      <div className="card">
        <div className="card__body">
          <FilterBar onReset={clearFilters} canReset={hasFilters}>
            <FormField label="Action">
              <Select value={filters.action} onChange={updateFilter('action')}>
                <option value="">All actions</option>
                {AUDIT_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {humanize(action)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Resource type">
              <Select value={filters.resourceType} onChange={updateFilter('resourceType')}>
                <option value="">All resource types</option>
                {AUDIT_RESOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {humanize(type)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Resource ID" hint="Exact match: paste the complete id.">
              <Input
                className="mono"
                value={filters.resourceId}
                onChange={updateFilter('resourceId')}
                placeholder="Account, transfer or transaction ID"
                autoComplete="off"
                spellCheck={false}
              />
            </FormField>
            <FormField label="Sort by">
              <Select value={ordering} onChange={(event) => setOrdering(event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </FilterBar>
        </div>
      </div>

      <section className="card" aria-labelledby="audit-title">
        <div className="card__header">
          <h2 className="card__title" id="audit-title">
            Audit records
          </h2>
          {logs.data && <span className="text-muted num">{formatNumber(count)} total</span>}
        </div>
        <div className="card__body card__body--flush">
          <DataTable
            caption="Audit records"
            columns={columns}
            rows={rows}
            loading={logs.loading}
            error={logs.error}
            onRetry={logs.refetch}
            emptyIcon={hasFilters ? SearchX : ClipboardList}
            emptyTitle={hasFilters ? 'No records match your filters' : 'No audit records yet'}
            emptyMessage={
              hasFilters
                ? 'Try different filters or clear them. The resource ID must match exactly.'
                : 'Records appear when accounts change and transfers are processed.'
            }
            emptyAction={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </div>
        {logs.data && count > 0 && (
          <div className="card__footer">
            <Pagination
              page={page}
              pageSize={pageSize}
              count={count}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={logs.loading}
            />
          </div>
        )}
      </section>

      {detailRecord && (
        <AuditDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} onViewResource={viewResource} />
      )}
    </div>
  )
}