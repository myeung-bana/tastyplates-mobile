import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { Redirect } from 'expo-router'

import { SURFACE_CARD, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_LOGIN } from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { useAuth } from '@/hooks/useAuth'

/** Shared gate for every onboarding step: signed in and email verified. */
export function OnboardingGuard({ children }: { children: ReactNode }): JSX.Element {
  const { isAuthenticated, loading, user } = useAuth()

  if (!loading && !isAuthenticated) return <Redirect href={SCREEN_LOGIN} />

  if (!user?.emailVerified) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: SURFACE_CARD }}>
        <Text className="text-center" style={{ fontFamily: FONT.body, fontSize: 16, color: TEXT_MUTED }}>
          Verify your email before continuing.
        </Text>
      </View>
    )
  }

  return <>{children}</>
}
