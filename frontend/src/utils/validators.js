export const REQUIRED_MESSAGE = 'This field is required.'

export function validateRequired(values, fields) {
  const errors = {}

  for (const field of fields) {
    const value = values[field]

    if (typeof value !== 'string' || value.trim() === '') {
      errors[field] = REQUIRED_MESSAGE
    }
  }

  return errors
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value) {
  return UUID_PATTERN.test(String(value).trim())
}