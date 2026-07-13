import { Text, TextInput, View } from 'react-native'

import {
  BORDER_SUBTLE,
  mergeTextInputBodyTypography,
  TEXT_BODY,
  TEXT_MUTED,
} from '@/constants/brand'

export type OnboardingUsernameFieldProps = {
  value: string
  onChangeText: (text: string) => void
  editable?: boolean
  errorText?: string | null
  statusText?: string | null
}

export function OnboardingUsernameField({
  value,
  onChangeText,
  editable = true,
  errorText = null,
  statusText = null,
}: OnboardingUsernameFieldProps): JSX.Element {
  const hasError = Boolean(errorText?.trim())

  return (
    <View>
      <Text className="mb-2 text-sm font-medium" style={{ color: TEXT_BODY }}>
        Username
      </Text>
      <View
        className="min-h-[48px] flex-row items-center overflow-hidden rounded-xl border bg-white"
        style={{ borderColor: hasError ? '#ef4444' : BORDER_SUBTLE }}
      >
        <View className="justify-center px-4">
          <Text className="text-base" style={{ color: TEXT_MUTED }}>
            @
          </Text>
        </View>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
          onChangeText={onChangeText}
          placeholder="yourname"
          placeholderTextColor={TEXT_MUTED}
          value={value}
          style={mergeTextInputBodyTypography({
            flex: 1,
            paddingRight: 16,
            paddingVertical: 12,
            color: TEXT_BODY,
          })}
        />
      </View>
      <View className="mt-2 min-h-[22px]">
        {hasError ? (
          <Text className="text-sm" style={{ color: '#ef4444' }}>
            {errorText}
          </Text>
        ) : statusText ? (
          <Text className="text-sm" style={{ color: TEXT_MUTED }}>
            {statusText}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
