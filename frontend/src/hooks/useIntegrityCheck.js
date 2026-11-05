import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeApiError } from '../utils/errors'

export function useIntegrityCheck(request) {
  const [state, setState] = useState({ status: 'idle', data: null, error: null })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(async () => {
    setState({ status: 'running', data: null, error: null })

    try {
      const data = await request()
      if (mounted.current) setState({ status: 'done', data, error: null })
    } catch (error) {
      if (mounted.current) setState({ status: 'failed', data: null, error: normalizeApiError(error) })
    }
  }, [request])

  return { ...state, run }
}