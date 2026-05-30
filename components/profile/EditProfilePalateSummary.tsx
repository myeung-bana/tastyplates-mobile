import { Pressable, Text, View } from 'react-native'

import { BRAND_PRIMARY, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { palateLimit } from '@/constants/validation'
import { labelForPalateKey } from '@/lib/palateLabels'

export interface EditProfilePalateSummaryProps {
  selected: Set<string>
  onPressEdit: () => void
  disabled?: boolean
  error?: string | null
}

export function EditProfilePalateSummary({
  selected,
  onPressEdit,
  disabled = false,
  error = null,
}: EditProfilePalateSummaryProps): JSX.Element {
  const keys = Array.from(selected)
  const filled = keys.length >= palateLimit

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium" style={{ color: TEXT_HEADING }}>
          Your palate
        </Text>
        <Pressable
          onPress={onPressEdit}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Edit palate preferences"
          hitSlop={8}
          className="py-1 active:opacity-70"
        >
          <Text className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
            Edit
          </Text>
        </Pressable>
      </View>

      {filled ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {keys.map((key) => (
            <View
              key={key}
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: '#f3f4f6' }}
            >
              <Text className="text-xs font-medium" style={{ color: TEXT_BODY }}>
                {labelForPalateKey(key)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="mt-2 text-sm" style={{ color: TEXT_MUTED }}>
          Choose {palateLimit} cuisines to represent your taste.
        </Text>
      )}

      <Text className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
        Shown on your profile and reviews.
      </Text>

      {error ? (
        <Text className="mt-2 text-sm" style={{ color: BRAND_PRIMARY }}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}
