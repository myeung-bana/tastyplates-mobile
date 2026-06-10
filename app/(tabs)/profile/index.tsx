import { useEffect } from 'react'
import { Redirect } from 'expo-router'

import { ProfileSignedInView } from '@/components/profile/ProfileSignedInView'
import { AppTopNav } from '@/components/layout/AppTopNav'
import { SCREEN_HOME, SCREEN_PROFILE } from '@/constants/screens'
import { useAuthSheet } from '@/contexts/AuthSheetContext'
import { useAuth } from '@/hooks/useAuth'
import { View } from 'react-native'

/** Deep links only — guest profile tab opens the auth sheet without navigating here. */
function GuestProfileFallback(): JSX.Element {
  const { openAuthSheet } = useAuthSheet()

  useEffect(() => {
    openAuthSheet({ mode: 'signin', resume: SCREEN_PROFILE })
  }, [openAuthSheet])

  return <Redirect href={SCREEN_HOME} />
}

export default function ProfileScreen() {
  const { isAuthenticated, loading } = useAuth()

  if (!loading && !isAuthenticated) {
    return <GuestProfileFallback />
  }

  if (isAuthenticated) {
    return (
      <View className="flex-1 bg-white">
        <AppTopNav />
        <ProfileSignedInView />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      <AppTopNav />
      <View className="flex-1" />
    </View>
  )
}
