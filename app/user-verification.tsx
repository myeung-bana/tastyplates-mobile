import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text } from 'react-native'
import * as Linking from 'expo-linking'
import { Stack, useRouter } from 'expo-router'
import { useNhostClient, useSendVerificationEmail, useUserEmail } from '@nhost/react'

import { AuthHeroLayout } from '@/components/auth/AuthHeroLayout'
import { BRAND_PRIMARY } from '@/constants/brand'
import { SCREEN_HOME } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import { navigateAfterAuth } from '@/lib/authNavigation'
import { toast } from '@/utils/toast'

export default function UserVerificationScreen() {
  const router = useRouter()
  const nhost = useNhostClient()
  const email = useUserEmail()
  const { sendEmail, isLoading: sending } = useSendVerificationEmail()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { user, isReady } = useSession()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!isReady || authLoading || !isAuthenticated || !user) return
    if (user.emailVerified) {
      navigateAfterAuth(router, { needsEmailVerification: false, user })
    }
  }, [isReady, authLoading, isAuthenticated, user, router])

  const onResend = async () => {
    if (!email) {
      toast.error('No email on this session. Try signing in again.')
      return
    }
    const redirectTo = Linking.createURL('/user-verification')
    const result = await sendEmail(email, { redirectTo })
    if (result.isError && result.error) {
      toast.error(result.error.message ?? 'Could not send email')
      return
    }
    toast.success('Verification email sent')
  }

  const onRefreshedSession = async () => {
    setRefreshing(true)
    try {
      await nhost.auth.refreshSession()
      const u = nhost.auth.getUser()
      if (u?.emailVerified) {
        navigateAfterAuth(router, { needsEmailVerification: false, user: u })
      } else {
        toast.info('Email is not verified yet. Check your inbox and spam folder.')
      }
    } catch {
      toast.error('Could not refresh session')
    } finally {
      setRefreshing(false)
    }
  }

  const busy = sending || refreshing

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthHeroLayout
        title="Verify your email"
        subtitle={`We sent a verification link to ${email ?? 'your email'}. Open the link on this device, then tap "I've verified" below.`}
      >
        <Pressable
          accessibilityRole="button"
          disabled={busy}
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
          disabled={busy}
          onPress={onResend}
          className="mb-8 items-center rounded-full border border-gray-200 py-4 active:bg-gray-50 disabled:opacity-50"
        >
          {sending ? (
            <ActivityIndicator color={BRAND_PRIMARY} />
          ) : (
            <Text className="text-base font-semibold" style={{ color: BRAND_PRIMARY }}>
              Resend email
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.replace(SCREEN_HOME)} className="self-center py-2">
          <Text className="text-sm text-gray-500">Browse without verifying</Text>
        </Pressable>
      </AuthHeroLayout>
    </>
  )
}
