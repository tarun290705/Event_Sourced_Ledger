import apiClient from './apiClient'

export async function listTransfers(params = {}) {
  const { data } = await apiClient.get('/transfers/', { params })
  return data
}

export async function createTransfer(payload) {
  const response = await apiClient.post('/transfers/', payload)
  return { transfer: response.data, replayed: response.status === 200 }
}