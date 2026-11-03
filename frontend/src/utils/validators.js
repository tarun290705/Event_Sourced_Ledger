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