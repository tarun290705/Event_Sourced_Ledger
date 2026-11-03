import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ToastStack from '../components/ui/Toast'

export const ToastContext = createContext(null)

const DURATIONS = { success: 4000, info: 4000, warning: 6000, error: 8000 }
let nextToastId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (type, message) => {
      const id = nextToastId++
      setToasts((current) => [...current, { id, type, message }])
      timers.current.set(id, setTimeout(() => dismiss(id), DURATIONS[type]))
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const activeTimers = timers.current
    return () => activeTimers.forEach((timer) => clearTimeout(timer))
  }, [])

  const notify = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      warning: (message) => push('warning', message),
      info: (message) => push('info', message),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}