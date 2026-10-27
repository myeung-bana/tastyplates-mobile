import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { DisplayNameOptionList } from '@/components/profile/DisplayNameOptionList'
import { EditProfileTopNav } from '@/components/profile/EditProfileTopNav'
import { TextField } from '@/components/ui/TextField'
import { SURFACE_CARD, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { useEditProfileDraft } from '@/contexts/EditProfileDraftContext'
import { useOwnProfilePresentation } from '@/hooks/useOwnProfilePresentation'
import { useHideTabBarWhileFocused } from '@/hooks/useHideTabBarWhileFocused'
import type { DisplayNameVariant } from '@/lib/displayNameOptions'
import { resolveProfileAvatarSource } from '@/lib/profileAvatar'

/**
 * Edit profile → Display name (design P5d). Edits first / last name and the same four variants as
 * onboarding step 3. Done returns to Edit profile; it's written on Edit profile's main Done.
 */
export default function EditDisplayNameScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { nameDraft, setNameDraft } = useEditProfileDraft()
  // Full-screen editor (design P5 / P5d / P6) — no floating tab bar.
  useHideTabBarWhileFocused()
  const { restaurantUser, avatarUrl } = useOwnProfilePresentation()
  const [firstName, setFirstName] = useState(nameDraft.firstName)
  const [lastName, setLastName] = useState(nameDraft.lastName)
  const [variant, setVariant] = useState<DisplayNameVariant>(nameDraft.variant)

  const username = restaurantUser?.username?.trim().replace(/^@/, '') || 'member'
  const canSave = firstName.trim().length > 0 || lastName.trim().length > 0

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE_CARD }}>
      <EditProfileTopNav
        variant="push"
        title="Display name"
        onCancel={() => router.back()}
        onDone={() => {
          setNameDraft({ firstName: firstName.trim(), lastName: lastName.trim(), variant })
          router.back()
        }}
        doneEnabled={canSave}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: insets.bottom + 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Design P5d: first and last name side by side. */}
          <View className="flex-row" style={{ gap: 10 }}>
            <View style={{ flex: 1 }}>
              <TextField label="First name" value={firstName} onChangeText={setFirstName} placeholder="First" maxLength={40} autoCapitalize="words" textContentType="givenName" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last" maxLength={40} autoCapitalize="words" textContentType="familyName" />
            </View>
          </View>
          <Text
            style={{ marginTop: 4, fontFamily: FONT.heading, fontSize: 11, lineHeight: 14, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}
          >
            Show my name as
          </Text>
          <DisplayNameOptionList
            firstName={firstName}
            lastName={lastName}
            value={variant}
            onChange={setVariant}
            username={username}
            avatar={resolveProfileAvatarSource(avatarUrl)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
