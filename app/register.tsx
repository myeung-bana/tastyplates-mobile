import { Redirect, useLocalSearchParams } from 'expo-router'

import { loginScreenHref } from '@/lib/authRoutes'

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

/**
 * Deep link / legacy route: same flow as `/login?mode=signup` (`auth-review.md` §7).
 */
export default function RegisterRedirectScreen() {
  const raw = useLocalSearchParams<{ resume?: string | string[] }>()
  const resume = firstParam(raw.resume)

  return <Redirect href={loginScreenHref({ mode: 'signup', resume })} />
}
