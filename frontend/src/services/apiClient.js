import axios from 'axios'
import { API_BASE_URL } from '../config/env'
import { UNAUTHENTICATED_EVENT } from '../utils/constants'

const SAFE_METHODS = ['get', 'head', 'options']
const CSRF_COOKIE = 'csrftoken'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 60000,
  headers: { Accept: 'application/json' },
})

export function readCookie(name) {
  const entry = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return entry ? decodeURIComponent(entry.split('=').slice(1).join('=')) : null
}

let csrfRequest = null

export function ensureCsrfCookie(force = false) {
  if (!force && readCookie(CSRF_COOKIE)) return Promise.resolve()

  if (!csrfRequest) {
    csrfRequest = apiClient.get('/auth/csrf/').finally(() => {
      csrfRequest = null
    })
  }

  return csrfRequest
}

apiClient.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase()

  if (!SAFE_METHODS.includes(method)) {
    await ensureCsrfCookie()
    const token = readCookie(CSRF_COOKIE)
    if (token) config.headers['X-CSRFToken'] = token
  }

  return config
})

function isCsrfFailure(data) {
  if (typeof data === 'string') return data.includes('CSRF verification failed')
  return typeof data?.detail === 'string' && data.detail.startsWith('CSRF Failed')
}

function isNotAuthenticated(data) {
  return (
    typeof data?.detail === 'string' &&
    data.detail.startsWith('Authentication credentials were not provided')
  )
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error

    if (!response || !config || response.status !== 403) {
      return Promise.reject(error)
    }

    if (isCsrfFailure(response.data) && !config._csrfRetried) {
      config._csrfRetried = true
      await ensureCsrfCookie(true)
      return apiClient(config)
    }

    if (isNotAuthenticated(response.data)) {
      window.dispatchEvent(new CustomEvent(UNAUTHENTICATED_EVENT))
    }

    return Promise.reject(error)
  },
)

export default apiClient