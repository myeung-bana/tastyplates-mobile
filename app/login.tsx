import { useCallback, useEffect, useMemo } from 'react'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'

import { AuthBackButton } from '@/components/auth/AuthBackButton'
import { AuthHeroLayout } from '@/components/auth/AuthHeroLayout'
import { AuthMethodChooser } from '@/components/auth/AuthMethodChooser'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterEmailForm } from '@/components/auth/RegisterEmailForm'
import { useAuth } from '@/hooks/useAuth'
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn'
import { useSession } from '@/hooks/useSession'
import { navigateAfterAuth } from '@/lib/authNavigation'
import { coerceResumeHref, loginScreenHref, type AuthScreenMode } from '@/lib/authRoutes'

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

function parseAuthMode(modeParam: string | undefined): AuthScreenMode {
  if (modeParam === 'signup') return 'signup'
  if (modeParam === 'signin') return 'signin'
  return 'chooser'
}

export default function LoginScreen() {
  const router = useRouter()
  const raw = useLocalSearchParams<{ resume?: string | string[]; mode?: string | string[] }>()
  const resume = firstParam(raw.resume)
  const modeParam = firstParam(raw.mode)

  const view = parseAuthMode(modeParam)
  const resumeForNav = useMemo(() => coerceResumeHref(resume), [resume])

  const { isAuthenticated, loading: authLoading } = useAuth()
  const { user, isReady } = useSession()

  const onAuthSuccess = useCallback(
    async (payload: { needsEmailVerification: boolean; user: typeof user }) => {
      await navigateAfterAuth(
        router,
        {
          needsEmailVerification: payload.needsEmailVerification,
          user: payload.user,
        },
        resumeForNav,
      )
    },
    [router, resumeForNav],
  )

  const { continueWithGoogle, googleBusy } = useGoogleSignIn({ onSuccess: onAuthSuccess })

  useEffect(() => {
    if (!isReady || authLoading || !isAuthenticated || !user) return
    navigateAfterAuth(router, { needsEmailVerification: false, user }, resumeForNav)
  }, [isReady, authLoading, isAuthenticated, user, router, resumeForNav])

  const goChooser = useCallback(() => {
    router.replace(loginScreenHref({ resume }))
  }, [router, resume])

  const goSignIn = useCallback(() => {
    router.replace(loginScreenHref({ mode: 'signin', resume }))
  }, [router, resume])

  const goSignUp = useCallback(() => {
    router.replace(loginScreenHref({ mode: 'signup', resume }))
  }, [router, resume])

  const title =
    view === 'chooser'
      ? 'Welcome to TastyPlates'
      : view === 'signin'
        ? 'Login to Continue'
        : 'Create an account'

  const subtitle =
    view === 'chooser'
      ? 'Discover restaurants, share reviews, and follow food lovers you trust.'
      : view === 'signin'
        ? 'Sign in with your Tastyplates email and password.'
        : 'Create a free account to save favourites, write reviews, and follow other food lovers.'

  const headerSlot =
    view === 'chooser' ? null : <AuthBackButton onPress={goChooser} label="Back" />

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthHeroLayout title={title} subtitle={subtitle} headerSlot={headerSlot}>
        {view === 'chooser' ? (
          <AuthMethodChooser
            onSignUpFree={goSignUp}
            onContinueWithEmail={goSignIn}
            onContinueWithGoogle={() => void continueWithGoogle()}
            googleBusy={googleBusy}
          />
        ) : null}

        {view === 'signin' ? (
          <LoginForm
            resume={resume}
            showIntro={false}
            embedded
            showGoogle={false}
            onSignInSuccess={onAuthSuccess}
            onSwitchToSignUp={goSignUp}
          />
        ) : null}

        {view === 'signup' ? (
          <RegisterEmailForm
            resume={resume}
            showIntro={false}
            embedded
            onRegisterSuccess={onAuthSuccess}
            onSwitchToSignIn={goSignIn}
          />
        ) : null}
      </AuthHeroLayout>
    </>
  )
}
