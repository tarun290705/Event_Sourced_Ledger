import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, SearchX } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useDebounce } from '../../hooks/useDebounce'
import { usePagination } from '../../hooks/usePagination'
import { listTransactions } from '../../services/ledgerService'
import { listAccounts } from '../../services/accountService'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import FormField from '../../components/form/FormField'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import FilterBar from '../../components/data/FilterBar'
import DataTable from '../../components/data/DataTable'
import Pagination from '../../components/data/Pagination'
import AccountSelect from '../../components/domain/AccountSelect'
import MoneyText from '../../components/domain/MoneyText'
import StatusBadge from '../../components/domain/StatusBadge'
import { endOfLocalDayISO, formatDateTime, startOfLocalDayISO } from '../../utils/dates'
import { formatNumber, humanize, shortId } from '../../utils/format'
import { getTransactionTotal } from '../../utils/ledger'
import { TRANSACTION_TYPES, transactionPath } from '../../utils/constants'

const MAX_ACCOUNTS = 100
const EMPTY_FILTERS = { search: '', type: '', account: '', from: '', to: '' }

const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'posted_at', label: 'Oldest first' },
]

// Defined at module level so the function identity is stable for useApi
const fetchAccountOptions = () => listAccounts({ ordering: 'account_number', page_size: MAX_ACCOUNTS })

const COLUMNS = [
  {
    key: 'id',
    header: 'Transaction',
    render: (transaction) => (
      <Link className="mono" to={transactionPath(transaction.id)} title={transaction.id}>
        {shortId(transaction.id)}
      </Link>
    ),
  },
  {
    key: 'transaction_type',
    header: 'Type',
    render: (transaction) => <Badge tone="info">{humanize(transaction.transaction_type)}</Badge>,
  },
  { key: 'description', header: 'Description' },
  { key: 'posted_at', header: 'Posted', render: (transaction) => formatDateTime(transaction.posted_at) },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: (transaction) => {
      const total = getTransactionTotal(transaction)
      return total?.currency ? <MoneyText minorUnits={total.minorUnits} currency={total.currency} /> : '—'
    },
  },
  { key: 'status', header: 'Status', render: (transaction) => <StatusBadge status={transaction.status} /> },
]

export default function TransactionsPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [ordering, setOrdering] = useState('')

  const debouncedSearch = useDebounce(filters.search.trim())
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const accountOptions = useApi(fetchAccountOptions)

  // Both inputs hold "YYYY-MM-DD", which compares correctly as text
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to)

  const resetKey = JSON.stringify([
    debouncedSearch,
    filters.type,
    filters.account,
    rangeInvalid ? '' : filters.from,
    rangeInvalid ? '' : filters.to,
    ordering,
  ])
  const { page, pageSize, setPage, setPageSize } = usePagination(resetKey)

  const params = useMemo(() => {
    const next = { page, page_size: pageSize }
    // Without an ordering parameter the backend sorts newest first with a stable tie-break
    if (ordering) next.ordering = ordering
    if (debouncedSearch) next.search = debouncedSearch
    if (filters.type) next.transaction_type = filters.type
    if (filters.account) next.account = filters.account
    if (!rangeInvalid) {
      if (filters.from) next.posted_after = startOfLocalDayISO(filters.from)
      if (filters.to) next.posted_before = endOfLocalDayISO(filters.to)
    }
    return next
  }, [page, pageSize, ordering, debouncedSearch, filters.type, filters.account, filters.from, filters.to, rangeInvalid])

  const fetchTransactions = useCallback(() => listTransactions(params), [params])
  const transactions = useApi(fetchTransactions)

  // DRF answers 404 for a page past the end: fall back to the first page
  const listError = transactions.error
  useEffect(() => {
    if (listError?.status === 404 && page > 1) setPage(1)
  }, [listError, page, setPage])

  const rows = transactions.data?.results
  const count = transactions.data?.count ?? 0
  const hasFilters = Object.values(filters).some(Boolean)

  const accounts = accountOptions.data?.results ?? []
  const accountsTruncated = (accountOptions.data?.count ?? 0) > accounts.length
  let accountHint
  if (accountOptions.error) accountHint = 'Accounts could not be loaded.'
  else if (accountsTruncated) accountHint = `Showing the first ${MAX_ACCOUNTS} accounts.`

  const updateFilter = (name) => (event) => setFilters((current) => ({ ...current, [name]: event.target.value }))
  const clearFilters = () => setFilters(EMPTY_FILTERS)

  return (
    <div className="stack">
      <div className="card">
        <div className="card__body">
          <FilterBar onReset={clearFilters} canReset={hasFilters}>
            <FormField label="Search">
              <Input
                type="search"
                value={filters.search}
                onChange={updateFilter('search')}
                placeholder="Description"
                autoComplete="off"
              />
            </FormField>
            <FormField label="Type">
              <Select value={filters.type} onChange={updateFilter('type')}>
                <option value="">All types</option>
                {TRANSACTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {humanize(type)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Account" hint={accountHint}>
              <AccountSelect
                accounts={accounts}
                value={filters.account}
                onChange={updateFilter('account')}
                placeholder="All accounts"
                disabled={!accountOptions.data}
              />
            </FormField>
            <FormField label="From date" hint={`Your timezone: ${timeZone}`}>
              <Input type="date" value={filters.from} onChange={updateFilter('from')} />
            </FormField>
            <FormField label="To date" error={rangeInvalid ? 'To date must not be before From date.' : undefined}>
              <Input type="date" value={filters.to} onChange={updateFilter('to')} />
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

      <section className="card" aria-labelledby="transactions-title">
        <div className="card__header">
          <h2 className="card__title" id="transactions-title">
            Posted transactions
          </h2>
          {transactions.data && <span className="text-muted num">{formatNumber(count)} total</span>}
        </div>
        <div className="card__body card__body--flush">
          <DataTable
            caption="Posted ledger transactions"
            columns={COLUMNS}
            rows={rows}
            loading={transactions.loading}
            error={transactions.error}
            onRetry={transactions.refetch}
            emptyIcon={hasFilters ? SearchX : BookOpen}
            emptyTitle={hasFilters ? 'No transactions match your filters' : 'No transactions yet'}
            emptyMessage={
              hasFilters
                ? 'Try different filters or clear them.'
                : 'Posted ledger transactions involving your accounts will appear here.'
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
        {transactions.data && count > 0 && (
          <div className="card__footer">
            <Pagination
              page={page}
              pageSize={pageSize}
              count={count}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={transactions.loading}
            />
          </div>
        )}
      </section>
    </div>
  )
}