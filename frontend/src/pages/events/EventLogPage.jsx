import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollText, SearchX } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { usePagination } from '../../hooks/usePagination'
import { listEvents } from '../../services/eventService'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import FormField from '../../components/form/FormField'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import FilterBar from '../../components/data/FilterBar'
import DataTable from '../../components/data/DataTable'
import Pagination from '../../components/data/Pagination'
import ImmutableNotice from '../../components/domain/ImmutableNotice'
import EventDetailModal from './EventDetailModal'
import { formatPreciseDateTime } from '../../utils/dates'
import { formatNumber, humanize, shortId } from '../../utils/format'
import { isUuid } from '../../utils/validators'
import { EVENT_AGGREGATE_TYPES, EVENT_TYPES } from '../../utils/constants'

const EMPTY_FILTERS = { aggregateType: '', eventType: '', aggregateId: '' }

const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'occured_at', label: 'Oldest first' },
  { value: 'sequence_number', label: 'Sequence number (low to high)' },
  { value: '-sequence_number', label: 'Sequence number (high to low)' },
]

export default function EventLogPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [ordering, setOrdering] = useState('')
  const [detailEvent, setDetailEvent] = useState(null)

  // The backend answers 400 for a malformed UUID, so the filter only applies once it is complete
  const aggregateId = filters.aggregateId.trim()
  const aggregateIdInvalid = aggregateId !== '' && !isUuid(aggregateId)
  const appliedAggregateId = aggregateId !== '' && !aggregateIdInvalid ? aggregateId.toLowerCase() : ''

  const resetKey = JSON.stringify([filters.aggregateType, filters.eventType, appliedAggregateId, ordering])
  const { page, pageSize, setPage, setPageSize } = usePagination(resetKey)

  const params = useMemo(() => {
    const next = { page, page_size: pageSize }
    // Without an ordering parameter the backend sorts newest first with a stable tie-break
    if (ordering) next.ordering = ordering
    if (filters.aggregateType) next.aggregate_type = filters.aggregateType
    if (filters.eventType) next.event_type = filters.eventType
    if (appliedAggregateId) next.aggregate_id = appliedAggregateId
    return next
  }, [page, pageSize, ordering, filters.aggregateType, filters.eventType, appliedAggregateId])

  const fetchEvents = useCallback(() => listEvents(params), [params])
  const events = useApi(fetchEvents)

  // DRF answers 404 for a page past the end: fall back to the first page
  const listError = events.error
  useEffect(() => {
    if (listError?.status === 404 && page > 1) setPage(1)
  }, [listError, page, setPage])

  const rows = events.data?.results
  const count = events.data?.count ?? 0
  const hasFilters = Boolean(filters.aggregateType || filters.eventType || filters.aggregateId)

  const updateFilter = (name) => (event) => setFilters((current) => ({ ...current, [name]: event.target.value }))
  const clearFilters = () => setFilters(EMPTY_FILTERS)

  // Show one aggregate's whole history, in sequence order
  const viewStream = (event) => {
    setFilters({ aggregateType: event.aggregate_type, eventType: '', aggregateId: event.aggregate_id })
    setOrdering('sequence_number')
    setDetailEvent(null)
  }

  const columns = [
    {
      key: 'id',
      header: 'Event',
      render: (event) => (
        <span className="mono" title={event.id}>
          {shortId(event.id)}
        </span>
      ),
    },
    {
      key: 'aggregate_type',
      header: 'Aggregate type',
      render: (event) => <Badge tone="neutral">{humanize(event.aggregate_type)}</Badge>,
    },
    {
      key: 'aggregate_id',
      header: 'Aggregate ID',
      render: (event) => (
        <button
          type="button"
          className="link-button mono"
          onClick={() => viewStream(event)}
          title={`${event.aggregate_id} (show all events for this aggregate)`}
          aria-label={`Show all events for ${humanize(event.aggregate_type)} ${shortId(event.aggregate_id)}`}
        >
          {shortId(event.aggregate_id)}
        </button>
      ),
    },
    { key: 'event_type', header: 'Event type', render: (event) => <span className="mono">{event.event_type}</span> },
    { key: 'sequence_number', header: 'Seq.', align: 'right', render: (event) => <span className="num">{event.sequence_number}</span> },
    { key: 'occured_at', header: 'Occurred', render: (event) => formatPreciseDateTime(event.occured_at) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (event) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDetailEvent(event)}
          aria-label={`View details of event ${shortId(event.id)}`}
        >
          Details
        </Button>
      ),
    },
  ]

  return (
    <div className="stack">
      <ImmutableNotice title="Append-only event log">
        Events are recorded once and can never be edited or deleted, and this screen offers read access only. Each event
        has a sequence number: its position in the history of one aggregate, starting at 1.
      </ImmutableNotice>

      <div className="card">
        <div className="card__body">
          <FilterBar onReset={clearFilters} canReset={hasFilters}>
            <FormField label="Aggregate type">
              <Select value={filters.aggregateType} onChange={updateFilter('aggregateType')}>
                <option value="">All aggregates</option>
                {EVENT_AGGREGATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {humanize(type)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Event type">
              <Select value={filters.eventType} onChange={updateFilter('eventType')}>
                <option value="">All event types</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Aggregate ID"
              error={aggregateIdInvalid ? 'Enter a complete UUID to filter by aggregate.' : undefined}
            >
              <Input
                className="mono"
                value={filters.aggregateId}
                onChange={updateFilter('aggregateId')}
                placeholder="00000000-0000-0000-0000-000000000000"
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

      <section className="card" aria-labelledby="events-title">
        <div className="card__header">
          <h2 className="card__title" id="events-title">
            Domain events
          </h2>
          {events.data && <span className="text-muted num">{formatNumber(count)} total</span>}
        </div>
        <div className="card__body card__body--flush">
          <DataTable
            caption="Domain events"
            columns={columns}
            rows={rows}
            loading={events.loading}
            error={events.error}
            onRetry={events.refetch}
            emptyIcon={hasFilters ? SearchX : ScrollText}
            emptyTitle={hasFilters ? 'No events match your filters' : 'No events yet'}
            emptyMessage={
              hasFilters
                ? 'Try different filters or clear them.'
                : 'Events are recorded when ledger transactions post and transfers complete.'
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
        {events.data && count > 0 && (
          <div className="card__footer">
            <Pagination
              page={page}
              pageSize={pageSize}
              count={count}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={events.loading}
            />
          </div>
        )}
      </section>

      {detailEvent && (
        <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} onViewStream={viewStream} />
      )}
    </div>
  )
}