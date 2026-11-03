export function humanize(value) {
  if (!value) return '—'

  return String(value)
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// First 8 characters of a UUID, for compact tables (the full id goes in a title attribute)
export function shortId(id) {
  return id ? String(id).slice(0, 8) : '—'
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(value ?? 0)
}