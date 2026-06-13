import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useNhostClient, useUserEmail } from '@nhost/react'

import { AuthHeroLayout } from '@/components/auth/AuthHeroLayout'
import {
  BRAND_PRIMARY,
  mergeTextInputBodyTypography,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { SCREEN_HOME, SCREEN_LOGIN } from '@/constants/screens'
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

export default function UserVerificationScreen() {
  const router = useRouter()
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
      toast.success('Verification email sent')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } finally {
      setSending(false)
    }
  }

  const onRefreshedSession = async () => {
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
      toast.info('Email is not verified yet. Check your inbox and spam folder.')
    } catch {
      if (!isAuthenticated) {
        toast.info('Sign in with your email and password, then tap I\'ve verified again.')
      } else {
        toast.error('Could not refresh session')
      }
    } finally {
      setRefreshing(false)
    }
  }

  const resendDisabled = sending || cooldown > 0
  const resendLabel =
    sending ? null : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'

  const subtitle = email
    ? `We sent a verification link to ${email}. Open the link on this device, then tap "I've verified" below.`
    : showEmailFallback
      ? 'Enter the email you signed up with, then tap Resend email. After you open the link on this device, tap I\'ve verified.'
      : `We sent a verification link to your email. Open the link on this device, then tap "I've verified" below.`

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthHeroLayout title="Verify your email" subtitle={subtitle}>
        {showEmailFallback ? (
          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium" style={{ color: TEXT_HEADING }}>
              Email address
            </Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={TEXT_MUTED}
              value={manualEmail}
              onChangeText={setManualEmail}
              className="rounded-[10px] border border-[#797979] bg-white px-4 py-3 text-base text-gray-900"
              style={mergeTextInputBodyTypography()}
            />
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={refreshing}
          onPress={onRefreshedSession}
          className="mb-4 items-center rounded-full py-4 active:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          {refreshing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">I&apos;ve verified</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={resendDisabled}
          onPress={() => void onResend()}
          className="mb-4 items-center rounded-full border border-gray-200 py-4 active:bg-gray-50 disabled:opacity-50"
        >
          {sending ? (
            <ActivityIndicator color={BRAND_PRIMARY} />
          ) : (
            <Text className="text-base font-semibold" style={{ color: BRAND_PRIMARY }}>
              {resendLabel}
            </Text>
          )}
        </Pressable>

        {showEmailFallback ? (
          <Pressable
            onPress={() => router.replace(SCREEN_LOGIN)}
            className="mb-4 self-center py-2"
          >
            <Text className="text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
              Sign in instead
            </Text>
          </Pressable>
        ) : null}

        <Pressable onPress={() => router.replace(SCREEN_HOME)} className="self-center py-2">
          <Text className="text-sm text-gray-500">Browse without verifying</Text>
        </Pressable>
      </AuthHeroLayout>
    </>
  )
}
