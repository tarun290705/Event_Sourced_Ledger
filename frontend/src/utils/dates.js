const LOCALE = 'en-IN'

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })
const dateFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' })

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value) {
  const date = toDate(value)
  return date ? dateTimeFormat.format(date) : '—'
}

export function formatDate(value) {
  const date = toDate(value)
  return date ? dateFormat.format(date) : '—'
}

export function formatCalendarDate(value, options = { day: 'numeric', month: 'short' }) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(LOCALE, options).format(new Date(year, month - 1, day))
}