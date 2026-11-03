import { Children, cloneElement, isValidElement, useId } from 'react'

export default function FormField({ label, error, hint, required = false, children }) {
  const generatedId = useId()
  const child = Children.only(children)
  const id = child.props.id || generatedId
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const control = isValidElement(child)
    ? cloneElement(child, {
        id,
        invalid: Boolean(error),
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })
    : child

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {control}
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}