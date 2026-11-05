import { accountPath, transactionPath } from './constants'

export function getResourcePath(resourceType, resourceId) {
  if (resourceType === 'ACCOUNT') return accountPath(resourceId)
  if (resourceType === 'LEDGER_TRANSACTION') return transactionPath(resourceId)
  return null
}