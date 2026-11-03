export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  ACCOUNTS: '/accounts',
  ACCOUNT_DETAIL: '/accounts/:accountId',
  TRANSFERS: '/transfers',
  TRANSACTIONS: '/transactions',
  TRANSACTION_DETAIL: '/transactions/:transactionId',
  EVENTS: '/events',
  AUDIT_LOGS: '/audit-logs',
  INTEGRITY: '/integrity',
}

export const accountPath = (accountId) => `/accounts/${accountId}`
export const transactionPath = (transactionId) => `/transactions/${transactionId}`

export const UNAUTHENTICATED_EVENT = 'ledger:unauthenticated'

export const DEFAULT_PAGE_SIZE = 25

export const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']
export const ACCOUNT_STATUSES = ['ACTIVE', 'FROZEN', 'CLOSED']
export const TRANSACTION_TYPES = ['OPENING', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'REVERSAL']
export const ENTRY_SIDES = ['DEBIT', 'CREDIT']

export const AUDIT_ACTIONS = [
  'ACCOUNT_CREATED',
  'ACCOUNT_UPDATED',
  'ACCOUNT_FROZEN',
  'ACCOUNT_CLOSED',
  'TRANSFER_POSTED',
  'TRANSFER_COMPLETED',
  'TRANSFER_FAILED',
]
export const AUDIT_RESOURCE_TYPES = ['ACCOUNT', 'TRANSFER', 'LEDGER_TRANSACTION']

export const EVENT_AGGREGATE_TYPES = ['TRANSFER', 'LEDGER_TRANSACTION']
export const EVENT_TYPES = ['TransferCompleted', 'LedgerTransactionPosted']

export const ACCOUNT_STATUS_ACTIONS = {
  ACTIVE: [{ to: 'FROZEN', label: 'Freeze account' }],
  FROZEN: [
    { to: 'ACTIVE', label: 'Reactivate account' },
    { to: 'CLOSED', label: 'Close account' },
  ],
  CLOSED: [],
}

export const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'dashboard', end: true },
      { label: 'Accounts', path: ROUTES.ACCOUNTS, icon: 'accounts' },
      { label: 'Transfers', path: ROUTES.TRANSFERS, icon: 'transfers' },
      { label: 'Ledger transactions', path: ROUTES.TRANSACTIONS, icon: 'ledger' },
    ],
  },
  {
    label: 'Audit & integrity',
    staffOnly: true,
    items: [
      { label: 'Event log', path: ROUTES.EVENTS, icon: 'events' },
      { label: 'Audit logs', path: ROUTES.AUDIT_LOGS, icon: 'audit' },
      { label: 'System integrity', path: ROUTES.INTEGRITY, icon: 'integrity' },
    ],
  },
]