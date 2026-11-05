import apiClient from './apiClient'

export async function listEvents(params = {}) {
  const { data } = await apiClient.get('/events/', { params })
  return data
}