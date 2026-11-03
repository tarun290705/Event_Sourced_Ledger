const LOCALE = 'en-IN'
const FALLBACK_DIGITS = 2

const digitsCache = new Map()
const symbolCache = new Map()

export function getFractionDigits(currency) {
  if (!digitsCache.has(currency)) {
    let digits = FALLBACK_DIGITS

    try {
      digits = new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits
    } catch {
      
    }

    digitsCache.set(currency, digits)
  }

  return digitsCache.get(currency)
}

function getCurrencySymbol(currency) {
  if (!symbolCache.has(currency)) {
    let symbol = currency

    try {
      const part = new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
      })
        .formatToParts(0)
        .find((p) => p.type === 'currency')

      if (part) symbol = part.value
    } catch {
      
    }

    symbolCache.set(currency, symbol)
  }

  return symbolCache.get(currency)
}

export function formatMinorUnits(minorUnits, currency) {
  if (minorUnits === null || minorUnits === undefined || !currency) return '—'

  let value
  try {
    value = BigInt(minorUnits)
  } catch {
    return '—'
  }

  const digits = getFractionDigits(currency)
  const negative = value < 0n
  const padded = (negative ? -value : value).toString().padStart(digits + 1, '0')
  const whole = BigInt(padded.slice(0, padded.length - digits))
  const fraction = digits > 0 ? padded.slice(-digits) : ''
  const grouped = new Intl.NumberFormat(LOCALE).format(whole)
  const symbol = getCurrencySymbol(currency)
  const gap = symbol.length > 1 ? '\u00a0' : ''

  return `${negative ? '-' : ''}${symbol}${gap}${grouped}${fraction ? `.${fraction}` : ''}`
}