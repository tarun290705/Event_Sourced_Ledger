const flatten = (value) => {
  if (Array.isArray(value)) return value.flatMap(flatten)
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(flatten)
  return []
}

export function normalizeApiError(error) {
  if (!error?.response) {
    return {
      status: null,
      message: 'Cannot reach the server. Check your connection and that the backend is running.',
      messages: [],
      fieldErrors: {},
      isNetworkError: true,
    }
  }

  const { status, data } = error.response
  const fieldErrors = {}
  let messages = []

  if (Array.isArray(data)) {
    messages = flatten(data)
  } else if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') {
      messages = [data.detail]
    } else {
      for (const [field, value] of Object.entries(data)) {
        const list = flatten(value)
        if (field === 'non_field_errors') messages.push(...list)
        else fieldErrors[field] = list
      }
    }
  } else if (status >= 500) {
    messages = [`The server returned an error (HTTP ${status}). If this persists, check that the backend is running.`]
  }

  const fieldSummary = Object.entries(fieldErrors).map(([field, list]) => `${field}: ${list.join(' ')}`)
  const message = [...messages, ...fieldSummary].join(' ') || `Request failed (HTTP ${status}).`

  return { status, message, messages, fieldErrors, isNetworkError: false }
}