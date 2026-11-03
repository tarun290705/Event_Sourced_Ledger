import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, SearchX, Wallet } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'
import { useDebounce } from '../../hooks/useDebounce'
import { usePagination } from '../../hooks/usePagination'
import { useToast } from '../../hooks/useToast'
import { listAccounts } from '../../services/accountService'
import Button from '../../components/ui/Button'
import FormField from '../../components/form/FormField'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import FilterBar from '../../components/data/FilterBar'
import DataTable from '../../components/data/DataTable'
import Pagination from '../../components/data/Pagination'
import MoneyText from '../../components/domain/MoneyText'
import StatusBadge from '../../components/domain/StatusBadge'
import AccountStatusActions from '../../components/domain/AccountStatusActions'
import CreateAccountModal from './CreateAccountModal'
import { formatDate } from '../../utils/dates'
import { formatNumber, humanize } from '../../utils/format'
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_ACTIONS, ACCOUNT_TYPES, accountPath } from '../../utils/constants'

const EMPTY_FILTERS = { search: '', status: '', accountType: '', currency: '' }
const DEFAULT_ORDERING = 'account_number'

const SORT_OPTIONS = [
  { value: 'account_number', label: 'Account number (A–Z)' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: '-created_at', label: 'Newest first' },
  { value: '-balance_minor_units', label: 'Highest balance', staffOnly: true },
  { value: 'balance_minor_units', label: 'Lowest balance', staffOnly: true },
]

export default function AccountsPage() {
  const { isStaff } = useAuth()
  const notify = useToast()

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [ordering, setOrdering] = useState(DEFAULT_ORDERING)
  const [createOpen, setCreateOpen] = useState(false)

  const debouncedSearch = useDebounce(filters.search.trim())
  // The backend filters on the exact currency code, so only apply it once it is complete
  const currencyFilter = filters.currency.length === 3 ? filters.currency : ''

  const resetKey = JSON.stringify([debouncedSearch, filters.status, filters.accountType, currencyFilter, ordering])
  const { page, pageSize, setPage, setPageSize } = usePagination(resetKey)

  const params = useMemo(() => {
    const next = { page, page_size: pageSize, ordering }
    if (debouncedSearch) next.search = debouncedSearch
    if (filters.status) next.status = filters.status
    if (filters.accountType) next.account_type = filters.accountType
    if (currencyFilter) next.currency = currencyFilter
    return next
  }, [page, pageSize, ordering, debouncedSearch, filters.status, filters.accountType, currencyFilter])

  const fetchAccounts = useCallback(() => listAccounts(params), [params])
  const accounts = useApi(fetchAccounts)

  // DRF answers 404 for a page past the end (data shrank): fall back to the first page
  const listError = accounts.error
  useEffect(() => {
    if (listError?.status === 404 && page > 1) setPage(1)
  }, [listError, page, setPage])

  const rows = accounts.data?.results
  const count = accounts.data?.count ?? 0
  const hasFilters = Boolean(filters.search || filters.status || filters.accountType || filters.currency)

  const updateFilter = (name) => (event) => {
    const value = name === 'currency' ? event.target.value.toUpperCase() : event.target.value
    setFilters((current) => ({ ...current, [name]: value }))
  }
  const clearFilters = () => setFilters(EMPTY_FILTERS)

  const handleCreated = (account) => {
    setCreateOpen(false)
    notify.success(`Account ${account.account_number} created.`)
    accounts.refetch()
  }

  const columns = [
    {
      key: 'account_number',
      header: 'Account number',
      render: (account) => (
        <Link className="mono" to={accountPath(account.id)}>
          {account.account_number}
        </Link>
      ),
    },
    { key: 'name', header: 'Name' },
    { key: 'account_type', header: 'Type', render: (account) => humanize(account.account_type) },
    { key: 'currency', header: 'Currency' },
    { key: 'status', header: 'Status', render: (account) => <StatusBadge status={account.status} /> },
    {
      key: 'owner',
      header: 'Owner',
      render: (account) => account.owner_username ?? <span className="text-muted">—</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (account) =>
        account.balance_minor_units === null ? (
          <span className="text-muted" title="Balances are visible to staff and the account owner">
            —
          </span>
        ) : (
          <MoneyText minorUnits={account.balance_minor_units} currency={account.currency} />
        ),
    },
    { key: 'created_at', header: 'Created', render: (account) => formatDate(account.created_at) },
  ]

  if (isStaff) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (account) =>
        (ACCOUNT_STATUS_ACTIONS[account.status] ?? []).length === 0 ? (
          <span className="text-muted">—</span>
        ) : (
          <AccountStatusActions account={account} onChanged={accounts.refetch} />
        ),
    })
  }

  return (
    <div className="stack">
      <div className="page-toolbar">
        <Button icon={Plus} onClick={() => setCreateOpen(true)}>
          New account
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
                placeholder="Account number or name"
                autoComplete="off"
              />
            </FormField>
            <FormField label="Status">
              <Select value={filters.status} onChange={updateFilter('status')}>
                <option value="">All statuses</option>
                {ACCOUNT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {humanize(status)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Type">
              <Select value={filters.accountType} onChange={updateFilter('accountType')}>
                <option value="">All types</option>
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {humanize(type)}
                  </option>
                ))}
              </Select>
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
                {SORT_OPTIONS.filter((option) => !option.staffOnly || isStaff).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </FilterBar>
        </div>
      </div>

      <section className="card" aria-labelledby="account-list-title">
        <div className="card__header">
          <h2 className="card__title" id="account-list-title">
            Account list
          </h2>
          {accounts.data && <span className="text-muted num">{formatNumber(count)} total</span>}
        </div>
        <div className="card__body card__body--flush">
          <DataTable
            caption="Accounts"
            columns={columns}
            rows={rows}
            loading={accounts.loading}
            error={accounts.error}
            onRetry={accounts.refetch}
            emptyIcon={hasFilters ? SearchX : Wallet}
            emptyTitle={hasFilters ? 'No accounts match your filters' : 'No accounts yet'}
            emptyMessage={
              hasFilters ? 'Try a different search or clear the filters.' : 'Create an account to get started.'
            }
            emptyAction={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>
                  New account
                </Button>
              )
            }
          />
        </div>
        {accounts.data && count > 0 && (
          <div className="card__footer">
            <Pagination
              page={page}
              pageSize={pageSize}
              count={count}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={accounts.loading}
            />
          </div>
        )}
      </section>

      {createOpen && (
        <CreateAccountModal isStaff={isStaff} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}