import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useNhostClient, useSendVerificationEmail, useUserEmail } from '@nhost/react'

import { AuthScreenHeader } from '@/components/auth/AuthScreenHeader'
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
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <AuthScreenHeader title="Verify email" />
      <ScrollView contentContainerClassName="grow px-4 pb-8 pt-4">
        <Text className="mb-4 text-base leading-6 text-gray-700">
          We sent a verification link to{' '}
          <Text className="font-semibold text-gray-900">{email ?? 'your email'}</Text>. Open the link
          on this device, then tap &quot;I&apos;ve verified&quot; below.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onRefreshedSession}
          className="mb-4 items-center rounded-xl bg-[#ff7c0a] py-4 active:opacity-90 disabled:opacity-50"
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
          className="mb-8 items-center rounded-xl border border-gray-200 py-4 active:bg-gray-50 disabled:opacity-50"
        >
          {sending ? (
            <ActivityIndicator color="#ff7c0a" />
          ) : (
            <Text className="text-base font-semibold text-[#ff7c0a]">Resend email</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.replace(SCREEN_HOME)} className="self-center py-2">
          <Text className="text-sm text-gray-500">Browse without verifying</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
