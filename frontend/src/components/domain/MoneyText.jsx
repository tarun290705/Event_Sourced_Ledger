import { formatMinorUnits } from '../../utils/money'

export default function MoneyText({ minorUnits, currency, className = '' }) {
  return (
    <span className={`money num ${className}`.trim()} title={currency || undefined}>
      {formatMinorUnits(minorUnits, currency)}
    </span>
  )
}