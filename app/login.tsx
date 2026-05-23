import { useCallback, useEffect, useMemo } from 'react'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'

import { AuthHeroLayout } from '@/components/auth/AuthHeroLayout'
import { AuthSegmentControl, type AuthSegment } from '@/components/auth/AuthSegmentControl'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterEmailForm } from '@/components/auth/RegisterEmailForm'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import { navigateAfterAuth } from '@/lib/authNavigation'
import { coerceResumeHref, loginScreenHref } from '@/lib/authRoutes'

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

export default function LoginScreen() {
  const router = useRouter()
  const raw = useLocalSearchParams<{ resume?: string | string[]; mode?: string | string[] }>()
  const resume = firstParam(raw.resume)
  const modeParam = firstParam(raw.mode)

  const segment: AuthSegment = modeParam === 'signup' ? 'signup' : 'signin'

  const resumeForNav = useMemo(() => coerceResumeHref(resume), [resume])

  const { isAuthenticated, loading: authLoading } = useAuth()
  const { user, isReady } = useSession()

  useEffect(() => {
    if (!isReady || authLoading || !isAuthenticated || !user) return
    navigateAfterAuth(router, { needsEmailVerification: false, user }, resumeForNav)
  }, [isReady, authLoading, isAuthenticated, user, router, resumeForNav])

  const setSegment = useCallback(
    (next: AuthSegment) => {
      if (next === segment) return
      router.replace(
        loginScreenHref({
          mode: next === 'signup' ? 'signup' : undefined,
          resume,
        }),
      )
    },
    [router, segment, resume],
  )

  const title = segment === 'signin' ? 'Welcome back' : 'Create an account'
  const subtitle =
    segment === 'signin'
      ? 'Sign in with your Tastyplates email and password.'
      : 'Create a free account to save favourites, write reviews, and follow other food lovers.'

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthHeroLayout
        title={title}
        subtitle={subtitle}
        headerSlot={<AuthSegmentControl value={segment} onChange={setSegment} />}
      >
        {segment === 'signin' ? (
          <LoginForm
            resume={resume}
            showIntro={false}
            embedded
            onSignInSuccess={async (payload) => {
              await navigateAfterAuth(
                router,
                {
                  needsEmailVerification: payload.needsEmailVerification,
                  user: payload.user,
                },
                resumeForNav,
              )
            }}
          />
        ) : (
          <RegisterEmailForm
            resume={resume}
            showIntro={false}
            embedded
            onRegisterSuccess={async (payload) => {
              await navigateAfterAuth(
                router,
                {
                  needsEmailVerification: payload.needsEmailVerification,
                  user: payload.user,
                },
                resumeForNav,
              )
            }}
          />
        )}
      </AuthHeroLayout>
    </>
  )
}
