import type { Router } from 'expo-router'

import type { AuthScreenMode } from '@/lib/authRoutes'

/** Copy for a sign-in wall (design R4): shown instead of "Create your account". */
export type AuthWallCopy = {
  title: string
  subtitle?: string
}

export type OpenAuthSheetOptions = {
  mode?: AuthScreenMode
  resume?: Parameters<Router['replace']>[0]
  showSkipLogin?: boolean
  wall?: AuthWallCopy
}

/** Imperative opener set by {@link AuthSheetProvider} — used by {@link pushLoginScreen}. */
export const authSheetOpenRef: {
  current: ((options?: OpenAuthSheetOptions) => void) | null
} = { current: null }
