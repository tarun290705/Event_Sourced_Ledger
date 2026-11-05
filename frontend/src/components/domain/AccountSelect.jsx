import Select from '../form/Select'

export default function AccountSelect({ accounts, placeholder = 'Select an account', ...rest }) {
  return (
    <Select {...rest}>
      <option value="">{placeholder}</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.account_number} · {account.name} ({account.currency})
        </option>
      ))}
    </Select>
  )
}