import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { DisplayNameOptionList } from '@/components/profile/DisplayNameOptionList'
import { EditProfileTopNav } from '@/components/profile/EditProfileTopNav'
import { TextField } from '@/components/ui/TextField'
import { SURFACE_CARD, TEXT_HEADING } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { useEditProfileDraft } from '@/contexts/EditProfileDraftContext'
import { useOwnProfilePresentation } from '@/hooks/useOwnProfilePresentation'
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
  const { restaurantUser, avatarUrl } = useOwnProfilePresentation()
  const [firstName, setFirstName] = useState(nameDraft.firstName)
  const [lastName, setLastName] = useState(nameDraft.lastName)
  const [variant, setVariant] = useState<DisplayNameVariant>(nameDraft.variant)

  const username = restaurantUser?.username?.trim().replace(/^@/, '') || 'member'
  const canSave = firstName.trim().length > 0 || lastName.trim().length > 0

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE_CARD }}>
      <EditProfileTopNav
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <TextField label="First name" value={firstName} onChangeText={setFirstName} maxLength={40} autoCapitalize="words" textContentType="givenName" />
          <TextField label="Last name" value={lastName} onChangeText={setLastName} maxLength={40} autoCapitalize="words" textContentType="familyName" />
          <Text style={{ marginTop: 6, fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING }}>Show my name as</Text>
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
