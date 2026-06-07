import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { SearchOverlay } from '@/components/search/SearchOverlay'

export interface OpenSearchOptions {
  initialKeyword?: string
  initialPalateKey?: string | null
}

interface SearchOverlayContextValue {
  openSearch: (opts?: OpenSearchOptions) => void
  closeSearch: () => void
  isOpen: boolean
}

const SearchOverlayContext = createContext<SearchOverlayContextValue | null>(null)

export function useSearchOverlay(): SearchOverlayContextValue {
  const ctx = useContext(SearchOverlayContext)
  if (!ctx) throw new Error('useSearchOverlay must be inside SearchOverlayProvider')
  return ctx
}

export function SearchOverlayProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false)
  const [initialOpts, setInitialOpts] = useState<OpenSearchOptions>({})

  const openSearch = useCallback((opts?: OpenSearchOptions) => {
    setInitialOpts(opts ?? {})
    setIsOpen(true)
  }, [])

  const closeSearch = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo(
    () => ({ openSearch, closeSearch, isOpen }),
    [openSearch, closeSearch, isOpen],
  )

  return (
    <SearchOverlayContext.Provider value={value}>
      {children}
      {isOpen ? <SearchOverlay initialOpts={initialOpts} onClose={closeSearch} /> : null}
    </SearchOverlayContext.Provider>
  )
}
