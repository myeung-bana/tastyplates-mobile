import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type StudioTabAnchorRect = {
  x: number
  y: number
  width: number
  height: number
}

type StudioQuickMenuContextValue = {
  anchorRect: StudioTabAnchorRect | null
  setAnchorRect: (r: StudioTabAnchorRect | null) => void
}

const StudioQuickMenuContext = createContext<StudioQuickMenuContextValue | undefined>(undefined)

export function StudioQuickMenuProvider({ children }: { children: ReactNode }) {
  const [anchorRect, setAnchorRect] = useState<StudioTabAnchorRect | null>(null)

  const setAnchorRectStable = useCallback((r: StudioTabAnchorRect | null) => {
    setAnchorRect(r)
  }, [])

  const value = useMemo(
    () => ({
      anchorRect,
      setAnchorRect: setAnchorRectStable,
    }),
    [anchorRect, setAnchorRectStable],
  )

  return <StudioQuickMenuContext.Provider value={value}>{children}</StudioQuickMenuContext.Provider>
}

export function useStudioQuickMenu(): StudioQuickMenuContextValue {
  const v = useContext(StudioQuickMenuContext)
  if (!v) {
    throw new Error('useStudioQuickMenu must be used within StudioQuickMenuProvider')
  }
  return v
}

/**
 * Set by {@link StudioTabBarWithQuickActions}; invoked from Tabs `listeners.tabPress`
 * (listeners cannot consume React context reliably).
 */
export const studioQuickMenuToggleRef = { current: null as null | (() => void) }
