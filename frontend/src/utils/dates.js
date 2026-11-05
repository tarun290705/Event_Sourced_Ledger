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

export function startOfLocalDayISO(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString()
}

export function endOfLocalDayISO(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  // The backend compares with <=, so use the last microsecond of the day
  return new Date(year, month - 1, day, 23, 59, 59, 0).toISOString().replace('.000Z', '.999999Z')
}

const preciseDateTimeFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'medium' })

export function formatPreciseDateTime(value) {
  const date = toDate(value)
  return date ? preciseDateTimeFormat.format(date) : '—'
}