export default function Select({ invalid = false, className = '', children, ...rest }) {
  const classes = ['input', 'select', invalid ? 'input--invalid' : '', className].filter(Boolean).join(' ')

  return (
    <select className={classes} aria-invalid={invalid || undefined} {...rest}>
      {children}
    </select>
  )
}