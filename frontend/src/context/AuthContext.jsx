import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as authService from '../services/authService'
import { useToast } from '../hooks/useToast'
import { normalizeApiError } from '../utils/errors'
import { UNAUTHENTICATED_EVENT } from '../utils/constants'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const notify = useToast()
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')
  const userRef = useRef(null)

  const setSession = useCallback((nextUser) => {
    userRef.current = nextUser
    setUser(nextUser)
    setStatus(nextUser ? 'authenticated' : 'unauthenticated')
  }, [])

  useEffect(() => {
    let cancelled = false

    authService
      .fetchCurrentUser()
      .then((currentUser) => {
        if (!cancelled) setSession(currentUser)
      })
      .catch((error) => {
        if (cancelled) return
        const normalized = normalizeApiError(error)
        if (normalized.status !== 403) notify.error(normalized.message)
        setSession(null)
      })

    return () => {
      cancelled = true
    }
  }, [notify, setSession])

  useEffect(() => {
    const handleUnauthenticated = () => {
      if (userRef.current) notify.warning('Your session has expired. Please sign in again.')
      setSession(null)
    }

    window.addEventListener(UNAUTHENTICATED_EVENT, handleUnauthenticated)
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, handleUnauthenticated)
  }, [notify, setSession])

  const login = useCallback(
    async (username, password) => {
      const loggedInUser = await authService.login(username, password)
      setSession(loggedInUser)
      return loggedInUser
    },
    [setSession],
  )

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {

    } finally {
      setSession(null)
    }
  }, [setSession])

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isStaff: Boolean(user?.is_staff),
      login,
      logout,
    }),
    [user, status, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}