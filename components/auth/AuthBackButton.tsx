import { Pressable, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { TEXT_HEADING } from '@/constants/brand'

type AuthBackButtonProps = {
  onPress: () => void
  label?: string
}

export function AuthBackButton({ onPress, label = 'Back' }: AuthBackButtonProps): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="mb-2 flex-row items-center self-start py-1 active:opacity-70"
    >
      <Feather name="chevron-left" size={20} color={TEXT_HEADING} />
      <Text className="ml-0.5 text-sm font-medium" style={{ color: TEXT_HEADING }}>
        {label}
      </Text>
    </Pressable>
  )
}
