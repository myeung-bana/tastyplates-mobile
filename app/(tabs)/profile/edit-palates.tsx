import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'

import { ChoosePalatesTopNav } from '@/components/profile/ChoosePalatesTopNav'
import { PalateIconGrid } from '@/components/onboarding/PalateIconGrid'
import { AppIcon } from '@/components/ui/AppIcon'
import { TextField } from '@/components/ui/TextField'
import { BRAND_PRIMARY_TINT, SURFACE_CARD, TEXT_HEADING, TEXT_MUTED, TEXT_TERTIARY } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { labelForPalateKey } from '@/lib/palateLabels'
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
        <Text style={{ marginBottom: 14, fontFamily: FONT.body, fontSize: 14, lineHeight: 20, color: TEXT_MUTED }}>
          Pick the two cuisines you grew up with. Choosing the second takes you back to Edit profile.
        </Text>
        <View style={{ marginBottom: 18 }}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Search cuisines"
            height={46}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search cuisines"
            prefix={<AppIcon name="search" size={18} color={TEXT_TERTIARY} style={{ marginRight: 8 }} />}
          />
        </View>
        {savedPair ? (
          <View accessibilityLiveRegion="polite" style={{ marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FFE2C7', backgroundColor: BRAND_PRIMARY_TINT, padding: 12 }}>
            <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING }}>
              Saved {savedPair}. Returning to Edit profile…
            </Text>
          </View>
        ) : null}
        <PalateIconGrid selected={selectedPalates} onToggle={handleToggle} query={query} />
      </ScrollView>
    </View>
  )
}
