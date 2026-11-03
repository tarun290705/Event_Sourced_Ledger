import { useCallback, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '../utils/constants'

export function usePagination(resetKey = '', initialPageSize = DEFAULT_PAGE_SIZE) {
  const [state, setState] = useState({ page: 1, resetKey })
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const page = state.resetKey === resetKey ? state.page : 1

  const setPage = useCallback((nextPage) => setState({ page: nextPage, resetKey }), [resetKey])

  const setPageSize = useCallback(
    (size) => {
      setPageSizeState(size)
      setState({ page: 1, resetKey })
    },
    [resetKey],
  )

  return { page, pageSize, setPage, setPageSize }
}