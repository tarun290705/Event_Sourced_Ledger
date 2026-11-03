import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeApiError } from '../utils/errors'

export function useApi(request) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const latest = useRef(0)

  const execute = useCallback(async () => {
    const requestId = ++latest.current
    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const data = await request()
      if (requestId === latest.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (requestId === latest.current) {
        setState({ data: null, error: normalizeApiError(error), loading: false })
      }
    }
  }, [request])

  useEffect(() => {
    execute()

    return () => {
      latest.current += 1
    }
  }, [execute])

  return { ...state, refetch: execute }
}