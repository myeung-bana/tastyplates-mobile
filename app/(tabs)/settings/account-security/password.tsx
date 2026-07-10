import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { SettingsFormFooter } from '@/components/settings/SettingsFormFooter'
import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { SCREEN_LOGIN, SCREEN_SETTINGS } from '@/constants/screens'
import { getFloatingTabBarOccupiedHeight } from '@/constants/tabBar'
import { useAuth } from '@/hooks/useAuth'
import { resetPasswordEmailDirect } from '@/lib/nhostAuthDirect'
import { fetchRestaurantUserById } from '@/services/restaurantUserService'
import { toast } from '@/utils/toast'

function isGoogleAuthUser(
  metadata: Record<string, unknown> | null | undefined,
  authMethod?: string | null,
): boolean {
  const provider = metadata?.provider
  if (typeof provider === 'string' && provider === 'google') return true
  return authMethod === 'google'
}

export default function PasswordSettingsScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isAuthenticated, loading: authLoading, user } = useAuth()

  const [profileLoading, setProfileLoading] = useState(true)
  const [isGoogleAuth, setIsGoogleAuth] = useState(false)
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const email = user?.email?.trim() ?? ''

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setProfileLoading(false)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const profile = await fetchRestaurantUserById(user.id)
        if (cancelled) return
        setIsGoogleAuth(
          isGoogleAuthUser(
            user.metadata as Record<string, unknown> | null | undefined,
            profile.auth_method,
          ),
        )
      } catch {
        if (!cancelled) {
          setIsGoogleAuth(
            isGoogleAuthUser(user.metadata as Record<string, unknown> | null | undefined, null),
          )
        }
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id, user?.metadata])

  const handleSendResetEmail = useCallback(async () => {
    if (!email) return
    setSending(true)
    try {
      const result = await resetPasswordEmailDirect(email)
      if (result.isError && result.error) {
        toast.error(result.error.message ?? 'Failed to send reset email. Please try again.')
        return
      }
      setEmailSent(true)
    } finally {
      setSending(false)
    }
  }, [email])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  if (authLoading || profileLoading) {
    return (
      <View className="flex-1 bg-white">
        <ReviewDetailTopNav title="Change Password" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={TEXT_HEADING} />
        </View>
      </View>
    )
  }

  if (isGoogleAuth) {
    return (
      <View className="flex-1 bg-white">
        <ReviewDetailTopNav title="Password Settings" />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 32,
            paddingTop: 48,
            paddingBottom: getFloatingTabBarOccupiedHeight(insets) + 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            className="mb-4 h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: '#f3f4f6' }}
          >
            <AppIcon name="lock" size={32} color={TEXT_MUTED} />
          </View>
          <Text
            className="mb-2 text-center text-xl font-semibold font-neusans"
            style={{ color: TEXT_HEADING }}
          >
            Password Not Available
          </Text>
          <Text className="mb-8 text-center text-base font-neusans" style={{ color: TEXT_BODY }}>
            You signed in with Google. Password management is handled by your Google account.
          </Text>
          <Button className="w-full" onPress={() => router.back()}>
            Go Back
          </Button>
        </ScrollView>
      </View>
    )
  }

  if (emailSent) {
    return (
      <View className="flex-1 bg-white">
        <ReviewDetailTopNav title="Check Your Email" showBack={false} />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 32,
            paddingTop: 48,
            paddingBottom: getFloatingTabBarOccupiedHeight(insets) + 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            className="mb-4 h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: '#fef7f0' }}
          >
            <AppIcon name="check-circle" size={32} color={BRAND_PRIMARY} />
          </View>
          <Text
            className="mb-2 text-center text-xl font-semibold font-neusans"
            style={{ color: TEXT_HEADING }}
          >
            Reset Link Sent
          </Text>
          <Text className="mb-1 text-center text-base font-neusans" style={{ color: TEXT_BODY }}>
            We&apos;ve sent a password reset link to
          </Text>
          <Text
            className="mb-4 text-center text-base font-semibold font-neusans"
            style={{ color: TEXT_HEADING }}
          >
            {email}
          </Text>
          <Text className="mb-8 text-center text-sm font-neusans" style={{ color: TEXT_MUTED }}>
            Click the link in the email to set your new password. Check your spam folder if you
            don&apos;t see it.
          </Text>
          <Button className="w-full" onPress={() => router.replace(SCREEN_SETTINGS)}>
            Back to Settings
          </Button>
        </ScrollView>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      <ReviewDetailTopNav title="Change Password" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: getFloatingTabBarOccupiedHeight(insets) + 24,
        }}
      >
        <View
          className="mb-6 flex-row items-center gap-3 rounded-xl border p-4"
          style={{ borderColor: BORDER_SUBTLE, backgroundColor: '#f9fafb' }}
        >
          <AppIcon name="mail" size={20} color={TEXT_MUTED} />
          <View className="flex-1">
            <Text className="text-xs font-neusans" style={{ color: TEXT_MUTED }}>
              Reset link will be sent to
            </Text>
            <Text className="text-sm font-semibold font-neusans" style={{ color: TEXT_HEADING }}>
              {email}
            </Text>
          </View>
        </View>

        <Text className="text-sm leading-5 font-neusans" style={{ color: TEXT_BODY }}>
          For your security, we&apos;ll send a reset link to your email address. Click it to
          securely set a new password.
        </Text>

        <SettingsFormFooter
          cancelLabel="Cancel"
          saveLabel="Send Reset Email"
          onCancel={() => router.back()}
          onSave={() => void handleSendResetEmail()}
          saving={sending}
          disabled={!email}
        />
      </ScrollView>
    </View>
  )
}
