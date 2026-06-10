import type { Router } from 'expo-router'

import type { AuthScreenMode } from '@/lib/authRoutes'

export type OpenAuthSheetOptions = {
  mode?: AuthScreenMode
  resume?: Parameters<Router['replace']>[0]
  showSkipLogin?: boolean
}

/** Imperative opener set by {@link AuthSheetProvider} — used by {@link pushLoginScreen}. */
export const authSheetOpenRef: {
  current: ((options?: OpenAuthSheetOptions) => void) | null
} = { current: null }
