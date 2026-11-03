import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { usePagination } from '../../hooks/usePagination'
import { listAccountEntries } from '../../services/ledgerService'
import FormField from '../../components/form/FormField'
import Select from '../../components/form/Select'
import FilterBar from '../../components/data/FilterBar'
import DataTable from '../../components/data/DataTable'
import Pagination from '../../components/data/Pagination'
import MoneyText from '../../components/domain/MoneyText'
import { formatDateTime } from '../../utils/dates'
import { formatNumber, humanize, shortId } from '../../utils/format'
import { ENTRY_SIDES, transactionPath } from '../../utils/constants'

const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: '-amount_minor_units', label: 'Largest amount' },
  { value: 'amount_minor_units', label: 'Smallest amount' },
]

export default function AccountEntriesCard({ account }) {
  const [side, setSide] = useState('')
  const [ordering, setOrdering] = useState('')

  const resetKey = JSON.stringify([side, ordering])
  const { page, pageSize, setPage, setPageSize } = usePagination(resetKey)

  const params = useMemo(() => {
    const next = { page, page_size: pageSize }
    if (side) next.side = side
    if (ordering) next.ordering = ordering
    return next
  }, [page, pageSize, side, ordering])

  const fetchEntries = useCallback(() => listAccountEntries(account.id, params), [account.id, params])
  const entries = useApi(fetchEntries)

  // DRF answers 404 for a page past the end: fall back to the first page
  const listError = entries.error
  useEffect(() => {
    if (listError?.status === 404 && page > 1) setPage(1)
  }, [listError, page, setPage])

  const rows = entries.data?.results
  const count = entries.data?.count ?? 0
  const hasFilters = Boolean(side)

  const amountCell = (entry, entrySide) =>
    entry.side === entrySide ? (
      <MoneyText minorUnits={entry.amount_minor_units} currency={account.currency} />
    ) : (
      <span className="text-muted">—</span>
    )

  const columns = [
    { key: 'posted_at', header: 'Posted', render: (entry) => formatDateTime(entry.posted_at) },
    {
      key: 'transaction',
      header: 'Transaction',
      render: (entry) => (
        <>
          <Link className="mono" to={transactionPath(entry.transaction_id)} title={entry.transaction_id}>
            {shortId(entry.transaction_id)}
          </Link>
          <div className="table__sub">{humanize(entry.transaction_type)}</div>
        </>
      ),
    },
    { key: 'description', header: 'Description' },
    { key: 'debit', header: 'Debit', align: 'right', render: (entry) => amountCell(entry, 'DEBIT') },
    { key: 'credit', header: 'Credit', align: 'right', render: (entry) => amountCell(entry, 'CREDIT') },
  ]

  return (
    <section className="card" aria-labelledby="entries-title">
      <div className="card__header">
        <div>
          <h2 className="card__title" id="entries-title">
            Ledger entries
          </h2>
          <p className="text-muted">Every posted transaction that touched this account.</p>
        </div>
        {entries.data && <span className="text-muted num">{formatNumber(count)} entries</span>}
      </div>

      <div className="card__body">
        <FilterBar onReset={() => setSide('')} canReset={hasFilters}>
          <FormField label="Side">
            <Select value={side} onChange={(event) => setSide(event.target.value)}>
              <option value="">Debits and credits</option>
              {ENTRY_SIDES.map((entrySide) => (
                <option key={entrySide} value={entrySide}>
                  {humanize(entrySide)} only
                </option>
              ))}
            </Select>
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

      <div className="card__body card__body--flush">
        <DataTable
          caption="Ledger entries for this account"
          columns={columns}
          rows={rows}
          loading={entries.loading}
          error={entries.error}
          onRetry={entries.refetch}
          emptyIcon={BookOpen}
          emptyTitle={hasFilters ? 'No entries match the filter' : 'No ledger entries yet'}
          emptyMessage={
            hasFilters ? 'Try showing both debits and credits.' : 'Posted transactions on this account will appear here.'
          }
        />
      </div>

      {entries.data && count > 0 && (
        <div className="card__footer">
          <Pagination
            page={page}
            pageSize={pageSize}
            count={count}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            disabled={entries.loading}
          />
        </div>
      )}
    </section>
  )
}