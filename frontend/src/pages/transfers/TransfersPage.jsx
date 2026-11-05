import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Plus, SearchX } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useDebounce } from '../../hooks/useDebounce'
import { usePagination } from '../../hooks/usePagination'
import { useToast } from '../../hooks/useToast'
import { listTransfers } from '../../services/transferService'
import Button from '../../components/ui/Button'
import FormField from '../../components/form/FormField'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import FilterBar from '../../components/data/FilterBar'
import DataTable from '../../components/data/DataTable'
import Pagination from '../../components/data/Pagination'
import MoneyText from '../../components/domain/MoneyText'
import StatusBadge from '../../components/domain/StatusBadge'
import CreateTransferModal from './CreateTransferModal'
import TransferDetailModal from './TransferDetailModal'
import { formatDateTime } from '../../utils/dates'
import { formatNumber, shortId } from '../../utils/format'
import { formatMinorUnits } from '../../utils/money'
import { accountPath } from '../../utils/constants'

const EMPTY_FILTERS = { search: '', currency: '' }
const DEFAULT_ORDERING = '-created_at'

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: '-amount_minor_units', label: 'Largest amount' },
  { value: 'amount_minor_units', label: 'Smallest amount' },
]

export default function TransfersPage() {
  const notify = useToast()

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [ordering, setOrdering] = useState(DEFAULT_ORDERING)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailTransfer, setDetailTransfer] = useState(null)

  const debouncedSearch = useDebounce(filters.search.trim())
  // The backend filters on the exact currency code, so only apply it once it is complete
  const currencyFilter = filters.currency.length === 3 ? filters.currency : ''

  const resetKey = JSON.stringify([debouncedSearch, currencyFilter, ordering])
  const { page, pageSize, setPage, setPageSize } = usePagination(resetKey)

  const params = useMemo(() => {
    const next = { page, page_size: pageSize, ordering }
    if (debouncedSearch) next.search = debouncedSearch
    if (currencyFilter) next.currency = currencyFilter
    return next
  }, [page, pageSize, ordering, debouncedSearch, currencyFilter])

  const fetchTransfers = useCallback(() => listTransfers(params), [params])
  const transfers = useApi(fetchTransfers)

  // DRF answers 404 for a page past the end: fall back to the first page
  const listError = transfers.error
  useEffect(() => {
    if (listError?.status === 404 && page > 1) setPage(1)
  }, [listError, page, setPage])

  const rows = transfers.data?.results
  const count = transfers.data?.count ?? 0
  const hasFilters = Boolean(filters.search || filters.currency)

  const updateFilter = (name) => (event) => {
    const value = name === 'currency' ? event.target.value.toUpperCase() : event.target.value
    setFilters((current) => ({ ...current, [name]: value }))
  }
  const clearFilters = () => setFilters(EMPTY_FILTERS)

  const handleCompleted = ({ transfer, replayed }) => {
    setCreateOpen(false)

    if (page > 1) setPage(1)
    else transfers.refetch()

    if (replayed) {
      // Same key, same details: the backend returned the original transfer (HTTP 200)
      notify.info('This transfer was already processed with the same idempotency key. No new transfer was created.')
      setDetailTransfer(transfer)
    } else {
      notify.success(
        `Transferred ${formatMinorUnits(transfer.amount_minor_units, transfer.currency)} from ${transfer.source_account_number} to ${transfer.destination_account_number}.`,
      )
    }
  }

  const columns = [
    { key: 'created_at', header: 'Created', render: (transfer) => formatDateTime(transfer.created_at) },
    {
      key: 'source',
      header: 'From',
      render: (transfer) => (
        <>
          <Link className="mono" to={accountPath(transfer.source_account_id)}>
            {transfer.source_account_number}
          </Link>
          <div className="table__sub">{transfer.source_account_name}</div>
        </>
      ),
    },
    {
      key: 'destination',
      header: 'To',
      render: (transfer) => (
        <>
          <Link className="mono" to={accountPath(transfer.destination_account_id)}>
            {transfer.destination_account_number}
          </Link>
          <div className="table__sub">{transfer.destination_account_name}</div>
        </>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (transfer) => <MoneyText minorUnits={transfer.amount_minor_units} currency={transfer.currency} />,
    },
    { key: 'status', header: 'Status', render: (transfer) => <StatusBadge status={transfer.status} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (transfer) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDetailTransfer(transfer)}
          aria-label={`View details of transfer ${shortId(transfer.id)}`}
        >
          Details
        </Button>
      ),
    },
  ]

  return (
    <div className="stack">
      <div className="page-toolbar">
        <Button icon={Plus} onClick={() => setCreateOpen(true)}>
          New transfer
        </Button>
      </div>

      <div className="card">
        <div className="card__body">
          <FilterBar onReset={clearFilters} canReset={hasFilters}>
            <FormField label="Search">
              <Input
                type="search"
                value={filters.search}
                onChange={updateFilter('search')}
                placeholder="Account number or idempotency key"
                autoComplete="off"
              />
            </FormField>
            <FormField label="Currency">
              <Input
                value={filters.currency}
                onChange={updateFilter('currency')}
                placeholder="e.g. INR"
                maxLength={3}
                autoComplete="off"
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

      <section className="card" aria-labelledby="transfer-history-title">
        <div className="card__header">
          <h2 className="card__title" id="transfer-history-title">
            Transfer history
          </h2>
          {transfers.data && <span className="text-muted num">{formatNumber(count)} total</span>}
        </div>
        <div className="card__body card__body--flush">
          <DataTable
            caption="Transfers"
            columns={columns}
            rows={rows}
            loading={transfers.loading}
            error={transfers.error}
            onRetry={transfers.refetch}
            emptyIcon={hasFilters ? SearchX : ArrowLeftRight}
            emptyTitle={hasFilters ? 'No transfers match your filters' : 'No transfers yet'}
            emptyMessage={
              hasFilters
                ? 'Try a different search or clear the filters.'
                : 'Transfers involving your accounts will appear here.'
            }
            emptyAction={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>
                  New transfer
                </Button>
              )
            }
          />
        </div>
        {transfers.data && count > 0 && (
          <div className="card__footer">
            <Pagination
              page={page}
              pageSize={pageSize}
              count={count}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={transfers.loading}
            />
          </div>
        )}
      </section>

      {createOpen && <CreateTransferModal onClose={() => setCreateOpen(false)} onCompleted={handleCompleted} />}
      {detailTransfer && <TransferDetailModal transfer={detailTransfer} onClose={() => setDetailTransfer(null)} />}
    </div>
  )
}