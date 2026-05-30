import { useCallback, useEffect, useRef } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'

import { ChoosePalatesTopNav } from '@/components/profile/ChoosePalatesTopNav'
import { PalateChipPicker } from '@/components/profile/PalateChipPicker'
import { TEXT_MUTED } from '@/constants/brand'
import { SCREEN_LOGIN } from '@/constants/screens'
import { palateLimit } from '@/constants/validation'
import { useEditProfileDraft } from '@/contexts/EditProfileDraftContext'
import { useAuth } from '@/hooks/useAuth'

export default function EditProfilePalatesScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { selectedPalates, togglePalate, cancelPalatePicker } = useEditProfileDraft()

  const userToggledRef = useRef(false)

  const handleCancel = useCallback(() => {
    cancelPalatePicker()
    router.back()
  }, [cancelPalatePicker, router])

  const handleToggle = useCallback(
    (key: string) => {
      userToggledRef.current = true
      togglePalate(key, palateLimit)
    },
    [togglePalate],
  )

  useEffect(() => {
    if (!userToggledRef.current) return
    if (selectedPalates.size !== palateLimit) return

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const t = setTimeout(() => router.back(), 120)
    return () => clearTimeout(t)
  }, [selectedPalates, router])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  return (
    <View className="flex-1 bg-white">
      <ChoosePalatesTopNav selectedCount={selectedPalates.size} onCancel={handleCancel} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-4 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
          Select exactly {palateLimit} cuisines. You&apos;ll return to edit profile when both are
          chosen.
        </Text>
        <PalateChipPicker selected={selectedPalates} onToggle={handleToggle} />
      </ScrollView>
    </View>
  )
}
