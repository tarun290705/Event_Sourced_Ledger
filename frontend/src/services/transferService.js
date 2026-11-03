import apiClient from './apiClient'

export async function listTransfers(params = {}) {
  const { data } = await apiClient.get('/transfers/', { params })
  return data
}