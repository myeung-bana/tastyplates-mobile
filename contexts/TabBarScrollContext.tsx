import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react'
import { AccessibilityInfo } from 'react-native'
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'

const COLLAPSE_TIMING = { duration: 220 }

type TabBarScrollContextValue = {
  /** 0 = compact, 1 = expanded */
  collapseProgress: SharedValue<number>
  /** False when Reduce Motion is enabled — pill stays expanded. */
  collapseEnabled: boolean
  expandTabBar: () => void
  compactTabBar: () => void
  reportScrollDirection: (direction: 'up' | 'down') => void
}

const TabBarScrollContext = createContext<TabBarScrollContextValue | undefined>(undefined)

export function TabBarScrollProvider({ children }: { children: ReactNode }): JSX.Element {
  const collapseProgress = useSharedValue(1)
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false)
  const collapseEnabled = !reduceMotionEnabled
  const isCompactRef = useRef(false)

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled)
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    )
    return () => subscription.remove()
  }, [])

  const expandTabBar = useCallback(() => {
    isCompactRef.current = false
    collapseProgress.value = withTiming(1, COLLAPSE_TIMING)
  }, [collapseProgress])

  const compactTabBar = useCallback(() => {
    if (!collapseEnabled) {
      expandTabBar()
      return
    }
    if (isCompactRef.current) return
    isCompactRef.current = true
    collapseProgress.value = withTiming(0, COLLAPSE_TIMING)
  }, [collapseEnabled, collapseProgress, expandTabBar])

  const reportScrollDirection = useCallback(
    (direction: 'up' | 'down') => {
      if (direction === 'up') compactTabBar()
      else expandTabBar()
    },
    [compactTabBar, expandTabBar],
  )

  const value = useMemo(
    () => ({
      collapseProgress,
      collapseEnabled,
      expandTabBar,
      compactTabBar,
      reportScrollDirection,
    }),
    [collapseProgress, collapseEnabled, expandTabBar, compactTabBar, reportScrollDirection],
  )

  return (
    <TabBarScrollContext.Provider value={value}>{children}</TabBarScrollContext.Provider>
  )
}

export function useTabBarScroll(): TabBarScrollContextValue {
  const ctx = useContext(TabBarScrollContext)
  if (!ctx) {
    throw new Error('useTabBarScroll must be used within TabBarScrollProvider')
  }
  return ctx
}

/** Safe no-op when provider is absent (e.g. tests). */
export function useTabBarScrollOptional(): TabBarScrollContextValue | null {
  return useContext(TabBarScrollContext) ?? null
}
