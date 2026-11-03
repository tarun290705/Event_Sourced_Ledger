const rawBaseUrl = import.meta.env.VITE_BASE_URL || '/api'

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')