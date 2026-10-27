import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'

import { EditProfileTopNav } from '@/components/profile/EditProfileTopNav'
import { PalateChipPicker } from '@/components/profile/PalateChipPicker'
import { AppIcon } from '@/components/ui/AppIcon'
import { SURFACE_CARD, SURFACE_FOG, TEXT_HEADING, TEXT_MUTED, TEXT_TERTIARY } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { labelForPalateKey } from '@/lib/palateLabels'
import { SCREEN_LOGIN } from '@/constants/screens'
import { palateLimit } from '@/constants/validation'
import { useEditProfileDraft } from '@/contexts/EditProfileDraftContext'
import { useAuth } from '@/hooks/useAuth'
import { useHideTabBarWhileFocused } from '@/hooks/useHideTabBarWhileFocused'

export default function EditProfilePalatesScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isAuthenticated, loading: authLoading } = useAuth()
  // Full-screen editor (design P5 / P5d / P6) — no floating tab bar.
  useHideTabBarWhileFocused()
  const { selectedPalates, togglePalate, cancelPalatePicker } = useEditProfileDraft()

  const userToggledRef = useRef(false)
  const [query, setQuery] = useState('')
  const [savedPair, setSavedPair] = useState<string | null>(null)

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
    // Banner, then back to Edit profile (design P6).
    setSavedPair(Array.from(selectedPalates).map((k) => labelForPalateKey(k)).join(' + '))
    const t = setTimeout(() => router.back(), 700)
    return () => clearTimeout(t)
  }, [selectedPalates, router])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE_CARD }}>
      <EditProfileTopNav
        title="Palates"
        onCancel={handleCancel}
        right={
          <Text
            accessibilityLabel={`${selectedPalates.size} of ${palateLimit} selected`}
            style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}
          >
            {selectedPalates.size}/{palateLimit}
          </Text>
        }
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
        <Text style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 21, color: TEXT_MUTED }}>
          Pick the two cuisines you grew up with. Choosing the second takes you back to Edit profile.
        </Text>
        <View
          className="flex-row items-center"
          style={{ height: 44, borderRadius: 12, backgroundColor: SURFACE_FOG, paddingHorizontal: 14, gap: 10 }}
        >
          <AppIcon name="search" size={18} color={TEXT_TERTIARY} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search cuisines"
            placeholderTextColor={TEXT_TERTIARY}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search cuisines"
            returnKeyType="search"
            style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: TEXT_HEADING, paddingVertical: 0 }}
          />
        </View>
      </View>

      {savedPair ? (
        <View
          accessibilityLiveRegion="polite"
          className="flex-row items-center"
          style={{ marginTop: 14, marginHorizontal: 20, gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: TEXT_HEADING }}
        >
          <AppIcon name="check-circle" size={18} color={SURFACE_CARD} />
          <Text style={{ flex: 1, fontFamily: FONT.bodyMedium, fontSize: 14, lineHeight: 18, color: SURFACE_CARD }}>
            Saved {savedPair}. Returning to Edit profile…
          </Text>
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <PalateChipPicker selected={selectedPalates} onToggle={handleToggle} query={query} />
      </ScrollView>
    </View>
  )
}
