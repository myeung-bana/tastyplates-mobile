import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'expo-router'
import { useAuthenticationStatus, useUserData } from '@nhost/react'

import { SCREEN_HOME } from '@/constants/screens'
import { pushLoginScreen } from '@/lib/authRoutes'

/**
 * Spec: if `nhostUser` is null on mount, replace home then open sign-in after 100ms.
 */
export function useRequireAuthOnMount(): void {
  const router = useRouter()
  const pathname = usePathname()
  const user = useUserData()
  const { isLoading } = useAuthenticationStatus()
  const firedRef = useRef(false)

  useEffect(() => {
    if (isLoading || user != null || firedRef.current) return
    firedRef.current = true
    router.replace(SCREEN_HOME)
    const t = globalThis.setTimeout(() => {
      pushLoginScreen(router, {
        resume: (pathname ?? SCREEN_HOME) as Parameters<typeof router.replace>[0],
      })
    }, 100)
    return () => globalThis.clearTimeout(t)
  }, [isLoading, user, router, pathname])
}
