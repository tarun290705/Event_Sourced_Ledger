import apiClient from './apiClient'

export async function listAccounts(params = {}) {
  const { data } = await apiClient.get('/accounts/', { params })
  return data
}

export async function getAccount(accountId) {
  const { data } = await apiClient.get(`/accounts/${accountId}/`)
  return data
}

export async function createAccount(payload) {
  const { data } = await apiClient.post('/accounts/', payload)
  return data
}

export async function updateAccountStatus(accountId, status) {
  const { data } = await apiClient.patch(`/accounts/${accountId}/status/`, { status })
  return data
}