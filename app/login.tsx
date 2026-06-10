import { useEffect, useMemo, useRef } from 'react'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { View } from 'react-native'

import { AuthFormBody } from '@/components/auth/AuthFormBody'
import { AuthHeroLayout } from '@/components/auth/AuthHeroLayout'
import { SCREEN_GET_STARTED } from '@/constants/screens'
import { useAuthSheet } from '@/contexts/AuthSheetContext'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import { coerceResumeHref, type AuthScreenMode } from '@/lib/authRoutes'

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

function parseAuthMode(modeParam: string | undefined): AuthScreenMode {
  if (modeParam === 'signup') return 'signup'
  if (modeParam === 'signin') return 'signin'
  return 'chooser'
}

/**
 * OAuth callback route (`tastyplates://login`) and deep-link fallback.
 * Primary auth UX is the global sheet on get-started / in-app CTAs.
 */
export default function LoginScreen() {
  const router = useRouter()
  const { openAuthSheet } = useAuthSheet()
  const raw = useLocalSearchParams<{ resume?: string | string[]; mode?: string | string[] }>()
  const resume = firstParam(raw.resume)
  const mode = parseAuthMode(firstParam(raw.mode))
  const resumeForNav = useMemo(() => coerceResumeHref(resume), [resume])

  const { isAuthenticated, loading: authLoading } = useAuth()
  const { user, isReady } = useSession()
  const delegatedToSheetRef = useRef(false)

  useEffect(() => {
    if (!isReady || authLoading) return
    if (isAuthenticated && user) return
    if (delegatedToSheetRef.current) return
    delegatedToSheetRef.current = true
    openAuthSheet({
      mode,
      resume: resumeForNav,
      showSkipLogin: !resume,
    })
    router.replace(SCREEN_GET_STARTED)
  }, [isReady, authLoading, isAuthenticated, user, mode, resumeForNav, openAuthSheet, router])

  if (!isReady || authLoading) {
    return null
  }

  if (isAuthenticated && user) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <AuthFormBody
          initialMode={mode}
          resume={resume}
          showSkipLogin={!resume}
          renderShell={({ title, subtitle, headerSlot, body }) => (
            <AuthHeroLayout title={title} subtitle={subtitle} headerSlot={headerSlot}>
              {body}
            </AuthHeroLayout>
          )}
        />
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-black" />
    </>
  )
}
