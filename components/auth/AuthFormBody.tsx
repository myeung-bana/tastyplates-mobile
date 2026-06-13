import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'expo-router'
import type { User } from '@nhost/nhost-js'

import { AuthBackButton } from '@/components/auth/AuthBackButton'
import { AuthMethodChooser } from '@/components/auth/AuthMethodChooser'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterEmailForm } from '@/components/auth/RegisterEmailForm'
import { SCREEN_HOME } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn'
import { useSession } from '@/hooks/useSession'
import { navigateAfterAuth } from '@/lib/authNavigation'
import type { AuthScreenMode, TypedResumeHref } from '@/lib/authRoutes'
import { enterGuestBrowseMode } from '@/lib/guestBrowse'

export type AuthFormBodyProps = {
  initialMode?: AuthScreenMode
  resume?: string
  showSkipLogin?: boolean
  /** Called after successful auth before navigation (e.g. close sheet). */
  onBeforeNavigate?: () => void
}

function authCopy(view: AuthScreenMode): { title: string; subtitle: string } {
  if (view === 'signin') {
    return {
      title: 'Login to Continue',
      subtitle: 'Sign in with your Tastyplates email and password.',
    }
  }
  if (view === 'signup') {
    return {
      title: 'Create an account',
      subtitle:
        'Create a free account to save favourites, write reviews, and follow other food lovers.',
    }
  }
  return {
    title: 'Welcome to TastyPlates',
    subtitle: 'Discover restaurants, share reviews, and follow food lovers you trust.',
  }
}

/**
 * Auth chooser + email forms — shared by {@link AuthHeroLayout} and the global auth sheet.
 */
export function AuthFormBody({
  initialMode = 'chooser',
  resume,
  showSkipLogin = false,
  onBeforeNavigate,
  renderShell,
}: AuthFormBodyProps & {
  renderShell: (content: {
    title: string
    subtitle: string
    headerSlot: ReactNode
    body: ReactNode
  }) => ReactNode
}): JSX.Element {
  const router = useRouter()
  const [view, setView] = useState<AuthScreenMode>(initialMode)
  const resumeForNav = useMemo(
    () => (resume?.length ? (resume as TypedResumeHref) : undefined),
    [resume],
  )

  const { isAuthenticated, loading: authLoading } = useAuth()
  const { user, isReady } = useSession()
  const navigatedAfterAuthRef = useRef(false)

  useEffect(() => {
    setView(initialMode)
  }, [initialMode])

  const onAuthSuccess = useCallback(
    async (payload: {
      needsEmailVerification: boolean
      user: User | null
      email?: string
    }) => {
      navigatedAfterAuthRef.current = true
      onBeforeNavigate?.()
      await navigateAfterAuth(
        router,
        {
          needsEmailVerification: payload.needsEmailVerification,
          user: payload.user,
          verificationEmail: payload.email ?? payload.user?.email ?? undefined,
        },
        resumeForNav,
      )
    },
    [router, resumeForNav, onBeforeNavigate],
  )

  const { continueWithGoogle, googleBusy } = useGoogleSignIn({ onSuccess: onAuthSuccess })

  useEffect(() => {
    if (!isReady || authLoading || !isAuthenticated || !user) return
    if (navigatedAfterAuthRef.current) return
    navigatedAfterAuthRef.current = true
    onBeforeNavigate?.()
    void navigateAfterAuth(router, { needsEmailVerification: false, user }, resumeForNav)
  }, [isReady, authLoading, isAuthenticated, user, router, resumeForNav, onBeforeNavigate])

  const goChooser = useCallback(() => setView('chooser'), [])
  const goSignIn = useCallback(() => setView('signin'), [])
  const goSignUp = useCallback(() => setView('signup'), [])

  const onSkipLogin = useCallback(async () => {
    onBeforeNavigate?.()
    await enterGuestBrowseMode()
    router.replace(SCREEN_HOME)
  }, [router, onBeforeNavigate])

  const { title, subtitle } = authCopy(view)
  const headerSlot =
    view === 'chooser' ? null : <AuthBackButton onPress={goChooser} label="Back" />

  const body = (
    <>
      {view === 'chooser' ? (
        <AuthMethodChooser
          onSignUpFree={goSignUp}
          onContinueWithEmail={goSignIn}
          onContinueWithGoogle={() => void continueWithGoogle()}
          onSkipLogin={showSkipLogin && !resume ? () => void onSkipLogin() : undefined}
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
    </>
  )

  return <>{renderShell({ title, subtitle, headerSlot, body })}</>
}
