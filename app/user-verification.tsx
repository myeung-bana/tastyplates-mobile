import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useNhostClient, useUserEmail } from '@nhost/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { SCREEN_HOME, SCREEN_LOGIN } from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { useAuthSheet } from '@/contexts/AuthSheetContext'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import {
  loadPendingVerificationEmail,
  storePendingVerificationEmail,
} from '@/lib/authProfileSetup'
import { navigateAfterAuth } from '@/lib/authNavigation'
import { sendVerificationEmailDirect } from '@/lib/nhostAuthDirect'
import { toast } from '@/utils/toast'

const RESEND_COOLDOWN_SECONDS = 30
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed?.length ? trimmed : null
}

/** `/user-verification` (design G4). Resend has a 30 s cooldown; returning to the app re-checks. */
export default function UserVerificationScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { openAuthSheet } = useAuthSheet()
  const nhost = useNhostClient()
  const params = useLocalSearchParams<{ email?: string | string[] }>()
  const paramEmail = normalizeEmail(firstParam(params.email))
  const sessionEmail = normalizeEmail(useUserEmail())
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [manualEmail, setManualEmail] = useState('')
  const [emailHydrated, setEmailHydrated] = useState(false)
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { user, isReady } = useSession()
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    void (async () => {
      const stored = normalizeEmail(await loadPendingVerificationEmail())
      if (stored) {
        setPendingEmail(stored)
      } else if (paramEmail) {
        await storePendingVerificationEmail(paramEmail)
        setPendingEmail(paramEmail)
      }
      setEmailHydrated(true)
    })()
  }, [paramEmail])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const email = useMemo(
    () => sessionEmail ?? normalizeEmail(user?.email) ?? paramEmail ?? pendingEmail,
    [sessionEmail, user?.email, paramEmail, pendingEmail],
  )

  const showEmailFallback = emailHydrated && !email

  useEffect(() => {
    if (!isReady || authLoading || !isAuthenticated || !user) return
    if (user.emailVerified) {
      void navigateAfterAuth(router, {
        needsEmailVerification: false,
        user,
        verificationEmail: user.email ?? undefined,
      })
    }
  }, [isReady, authLoading, isAuthenticated, user, router])

  const resolveEmailForResend = useCallback(async (): Promise<string | null> => {
    const fromState = email
    if (fromState) return fromState

    const manual = normalizeEmail(manualEmail)
    if (manual && EMAIL_PATTERN.test(manual)) return manual

    const fromStorage = normalizeEmail(await loadPendingVerificationEmail())
    if (fromStorage) {
      setPendingEmail(fromStorage)
      return fromStorage
    }

    return normalizeEmail(nhost.auth.getUser()?.email)
  }, [email, manualEmail, nhost])

  const onResend = async () => {
    if (sending || cooldown > 0) return

    const targetEmail = await resolveEmailForResend()
    if (!targetEmail) {
      if (showEmailFallback) {
        toast.error('Enter the email address you used to sign up.')
      } else {
        toast.error('Could not find your email. Sign in again or enter it below.')
      }
      return
    }

    if (!EMAIL_PATTERN.test(targetEmail)) {
      toast.error('Enter a valid email address.')
      return
    }

    setSending(true)
    try {
      await storePendingVerificationEmail(targetEmail)
      setPendingEmail(targetEmail)

      const result = await sendVerificationEmailDirect(targetEmail)
      if (result.isError && result.error) {
        toast.error(result.error.message ?? 'Could not send email')
        return
      }
      toast.success('Verification link sent')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } finally {
      setSending(false)
    }
  }

  const onRefreshedSession = async (silent = false) => {
    setRefreshing(true)
    try {
      await nhost.auth.refreshSession()
      const u = nhost.auth.getUser()
      if (u?.emailVerified) {
        void navigateAfterAuth(router, {
          needsEmailVerification: false,
          user: u,
          verificationEmail: u.email ?? undefined,
        })
        return
      }
      if (u?.email) {
        await storePendingVerificationEmail(u.email)
        setPendingEmail(normalizeEmail(u.email))
      }
      if (!silent) toast.info('Email is not verified yet. Check your inbox and spam folder.')
    } catch {
      if (silent) return
      if (!isAuthenticated) {
        toast.info('Sign in with your email and password, then tap I\'ve verified again.')
      } else {
        toast.error('Could not refresh session')
      }
    } finally {
      setRefreshing(false)
    }
  }

  // Coming back from the mail app: check whether the link was opened.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) void onRefreshedSession(true)
    })
    return () => sub.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const openMailApp = async (): Promise<void> => {
    const url = Platform.OS === 'ios' ? 'message://' : 'mailto:'
    try {
      await Linking.openURL(url)
    } catch {
      toast.info('Open your email app to find the link.')
    }
  }

  const changeEmail = (): void => {
    openAuthSheet({ mode: 'signup' })
  }

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE_CARD }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center" style={{ paddingHorizontal: 32, gap: 16, paddingTop: insets.top }}>
          <View
            className="items-center justify-center"
            style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: BORDER_SUBTLE }}
          >
            <AppIcon name="mail" size={30} color={TEXT_HEADING} />
          </View>
          <Text accessibilityRole="header" className="text-center" style={{ fontFamily: FONT.heading, fontSize: 28, lineHeight: 34, color: TEXT_HEADING }}>
            Check your email
          </Text>
          {email ? (
            <Text className="text-center" style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: TEXT_MUTED }}>
              We sent a verification link to{' '}
              <Text style={{ fontFamily: FONT.bodySemibold, color: TEXT_HEADING }}>{email}</Text>. Open it on this phone
              to continue.
            </Text>
          ) : (
            <Text className="text-center" style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: TEXT_MUTED }}>
              Enter the email you signed up with and we’ll send the link again.
            </Text>
          )}
          {showEmailFallback ? (
            <View style={{ alignSelf: 'stretch' }}>
              <TextField
                value={manualEmail}
                onChangeText={setManualEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                accessibilityLabel="Email address"
              />
            </View>
          ) : null}
          <Pressable accessibilityRole="button" onPress={changeEmail} hitSlop={8}>
            <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: BRAND_PRIMARY_DARK }}>
              Wrong email? Change it
            </Text>
          </Pressable>
          {refreshing ? <ActivityIndicator color={BRAND_PRIMARY} /> : null}
        </View>

        <View className="px-6" style={{ gap: 10, paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
          <Button onPress={() => void openMailApp()}>Open mail app</Button>
          {cooldown > 0 ? (
            <Button variant="secondary" disabled accessibilityLabel={`Sent. Resend available in ${cooldown} seconds`}>
              <Text style={{ fontFamily: FONT.heading, fontSize: 17, letterSpacing: 0.6, color: TEXT_TERTIARY }}>
                Sent · resend in {cooldown}s
              </Text>
            </Button>
          ) : (
            <Button
              variant="secondary"
              loading={sending}
              onPress={() => void onResend()}
              style={{ borderColor: BRAND_PRIMARY }}
            >
              <Text style={{ fontFamily: FONT.heading, fontSize: 17, letterSpacing: 0.6, color: BRAND_PRIMARY_DARK }}>
                Resend link
              </Text>
            </Button>
          )}
          <Pressable onPress={() => router.replace(showEmailFallback ? SCREEN_LOGIN : SCREEN_HOME)} className="items-center py-2">
            <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_TERTIARY }}>
              {showEmailFallback ? 'Sign in instead' : 'Browse without verifying'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
