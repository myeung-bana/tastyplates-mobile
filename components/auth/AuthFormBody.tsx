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
import { AuthHeroLayout } from '@/components/auth/AuthHeroLayout'
import { AuthMethodChooser } from '@/components/auth/AuthMethodChooser'
import { AuthOverlayLayout } from '@/components/auth/AuthOverlayLayout'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterEmailForm } from '@/components/auth/RegisterEmailForm'
import { SCREEN_HOME } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn'
import { useSession } from '@/hooks/useSession'
import { navigateAfterAuth } from '@/lib/authNavigation'
import type { AuthScreenMode, TypedResumeHref } from '@/lib/authRoutes'
import type { AuthWallCopy } from '@/lib/authSheetRef'
import { enterGuestBrowseMode } from '@/lib/guestBrowse'

export type AuthFormBodyProps = {
  initialMode?: AuthScreenMode
  resume?: string
  showSkipLogin?: boolean
  /** Called after successful auth before navigation (e.g. close sheet). */
  onBeforeNavigate?: () => void
  /** `overlay` — full-screen white modal; `hero` — splash image shell (default). */
  layout?: 'hero' | 'overlay'
  /** Required when `layout` is `overlay`. */
  onClose?: () => void
  /** Sign-in wall copy (design R4) — chooser shows Google / email / Not now. */
  wall?: AuthWallCopy
}

function authCopy(view: AuthScreenMode): { title: string; subtitle: string } {
  if (view === 'signin') {
    return { title: 'Sign in', subtitle: 'Welcome back. Use your Tastyplates email and password.' }
  }
  if (view === 'signup') {
    return { title: 'Sign up with email', subtitle: '' }
  }
  return {
    title: 'Create your account',
    subtitle: 'Save places, follow palates like yours and leave reviews.',
  }
}

/**
 * Auth chooser + email forms — shared by hero screens and the global auth overlay.
 */
export function AuthFormBody({
  initialMode = 'chooser',
  resume,
  showSkipLogin = false,
  onBeforeNavigate,
  layout = 'hero',
  onClose,
  wall,
  renderShell,
}: AuthFormBodyProps & {
  renderShell?: (content: {
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

  const copy = authCopy(view)
  const title = view === 'chooser' && wall ? wall.title : copy.title
  const subtitle = view === 'chooser' && wall ? (wall.subtitle ?? '') : copy.subtitle
  const headerSlot =
    view === 'chooser' ? null : <AuthBackButton onPress={goChooser} label="Back" />

  const body = (
    <>
      {view === 'chooser' ? (
        <AuthMethodChooser
          variant={wall ? 'wall' : 'default'}
          onNotNow={onClose}
          onSignUpFree={goSignUp}
          onContinueWithEmail={wall ? goSignIn : goSignUp}
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
          embedded
          onRegisterSuccess={onAuthSuccess}
          onSwitchToSignIn={goSignIn}
        />
      ) : null}
    </>
  )

  const shellContent = { title, subtitle, headerSlot, body }

  if (layout === 'overlay') {
    if (!onClose) {
      throw new Error('AuthFormBody: onClose is required when layout is "overlay"')
    }
    return (
      <AuthOverlayLayout
        title={shellContent.title}
        subtitle={shellContent.subtitle || undefined}
        variant={view === 'chooser' ? 'sheet' : 'page'}
        // A sheet opened straight on sign-in (from a wall or get-started) closes on back.
        onBack={initialMode === 'chooser' ? goChooser : undefined}
        onClose={onClose}
      >
        {shellContent.body}
      </AuthOverlayLayout>
    )
  }

  if (renderShell) {
    return <>{renderShell(shellContent)}</>
  }

  return (
    <AuthHeroLayout
      title={shellContent.title}
      subtitle={shellContent.subtitle}
      headerSlot={shellContent.headerSlot}
    >
      {shellContent.body}
    </AuthHeroLayout>
  )
}
