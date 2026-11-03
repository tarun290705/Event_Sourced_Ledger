export default function Input({ invalid = false, className = '', ...rest }) {
  const classes = ['input', invalid ? 'input--invalid' : '', className].filter(Boolean).join(' ')

  return <input className={classes} aria-invalid={invalid || undefined} {...rest} />
}