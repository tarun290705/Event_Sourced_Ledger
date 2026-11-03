export function getTransactionTotal(transaction) {
  const debits = (transaction.entries ?? []).filter((entry) => entry.side === 'DEBIT')

  if (debits.length === 0) return null

  return {
    minorUnits: debits.reduce((sum, entry) => sum + BigInt(entry.amount_minor_units), 0n),
    currency: debits[0].account_currency ?? null,
  }
}

export function normalBalanceSide(accountType) {
  return accountType === 'ASSET' || accountType === 'EXPENSE' ? 'DEBIT' : 'CREDIT'
}