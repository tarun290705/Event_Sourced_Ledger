import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'
import MoneyText from './MoneyText'
import { accountPath } from '../../utils/constants'

// Shows a transaction's entries as a double-entry table: debits first, then credits,
// with a totals row and a check that both sides are equal.
export default function EntriesTable({ entries }) {
  // Accounting convention: debit lines before credit lines (sort is stable)
  const sorted = [...entries].sort((a, b) => (a.side === b.side ? 0 : a.side === 'DEBIT' ? -1 : 1))

  const sumOf = (side) =>
    sorted.filter((entry) => entry.side === side).reduce((sum, entry) => sum + BigInt(entry.amount_minor_units), 0n)

  const debitTotal = sumOf('DEBIT')
  const creditTotal = sumOf('CREDIT')
  const balanced = debitTotal === creditTotal
  const totalsCurrency = sorted[0]?.account_currency ?? null

  return (
    <div className="stack">
      <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">Debit and credit entries of this transaction</caption>
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col" className="table__cell--right">
                Debit
              </th>
              <th scope="col" className="table__cell--right">
                Credit
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <Link className="mono" to={accountPath(entry.account)}>
                    {entry.account_number}
                  </Link>
                  <div className="table__sub">{entry.account_name}</div>
                </td>
                <td className="table__cell--right">
                  {entry.side === 'DEBIT' ? (
                    <MoneyText minorUnits={entry.amount_minor_units} currency={entry.account_currency} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="table__cell--right">
                  {entry.side === 'CREDIT' ? (
                    <MoneyText minorUnits={entry.amount_minor_units} currency={entry.account_currency} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Totals</th>
              <td className="table__cell--right">
                <MoneyText minorUnits={debitTotal} currency={totalsCurrency} />
              </td>
              <td className="table__cell--right">
                <MoneyText minorUnits={creditTotal} currency={totalsCurrency} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="cluster">
        <Badge tone={balanced ? 'success' : 'danger'}>{balanced ? 'Balanced' : 'Unbalanced'}</Badge>
        <span className="text-muted">
          {balanced ? 'Total debits equal total credits.' : 'Total debits and total credits differ.'}
        </span>
      </div>
    </div>
  )
}