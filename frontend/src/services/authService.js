import apiClient, { ensureCsrfCookie } from './apiClient'

export async function fetchCurrentUser() {
  const { data } = await apiClient.get('/auth/me/')
  return data
}

export async function login(username, password) {
  await ensureCsrfCookie()
  const { data } = await apiClient.post('/auth/login/', { username, password })
  return data
}

export async function logout() {
  await apiClient.post('/auth/logout/')
}