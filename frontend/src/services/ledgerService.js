import apiClient from './apiClient'

export async function listTransactions(params = {}) {
  const { data } = await apiClient.get('/ledger/transactions/', { params })
  return data
}

export async function listAccountEntries(accountId, params = {}) {
  const { data } = await apiClient.get(`/ledger/accounts/${accountId}/entries/`, { params })
  return data
}

export async function getHistoricalBalance(accountId, asOf) {
  const { data } = await apiClient.get(`/ledger/accounts/${accountId}/historical-balance/`, {
    params: { as_of: asOf },
  })
  return data
}