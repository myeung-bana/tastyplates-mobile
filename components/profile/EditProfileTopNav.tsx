import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'

export interface EditProfileTopNavProps {
  onCancel: () => void
  onDone: () => void
  doneEnabled: boolean
  saving?: boolean
}

export function EditProfileTopNav({
  onCancel,
  onDone,
  doneEnabled,
  saving = false,
}: EditProfileTopNavProps): JSX.Element {
  const insets = useSafeAreaInsets()

  const handleCancel = () => {
    void Haptics.selectionAsync()
    onCancel()
  }

  const handleDone = () => {
    if (!doneEnabled || saving) return
    void Haptics.selectionAsync()
    onDone()
  }

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-gray-100 bg-white"
    >
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={8}
          onPress={handleCancel}
          disabled={saving}
          className="min-w-[72px] py-2 active:opacity-70"
        >
          <Text className="text-base" style={{ color: TEXT_MUTED }}>
            Cancel
          </Text>
        </Pressable>

        <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }}>
          Edit profile
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save profile"
          hitSlop={8}
          onPress={handleDone}
          disabled={!doneEnabled || saving}
          className="min-w-[72px] items-end py-2 active:opacity-70"
        >
          {saving ? (
            <ActivityIndicator size="small" color={BRAND_PRIMARY} />
          ) : (
            <Text
              className="text-base font-semibold"
              style={{ color: doneEnabled ? BRAND_PRIMARY : TEXT_MUTED }}
            >
              Done
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}
