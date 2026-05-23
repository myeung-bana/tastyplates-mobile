import { Pressable, Text, View } from 'react-native'

import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'

export type AuthSegment = 'signin' | 'signup'

type AuthSegmentControlProps = {
  value: AuthSegment
  onChange: (segment: AuthSegment) => void
}

/**
 * Pill toggle for sign-in vs sign-up on the unified login screen.
 */
export function AuthSegmentControl({ value, onChange }: AuthSegmentControlProps): JSX.Element {
  return (
    <View className="flex-row rounded-full bg-gray-100 p-1">
      <SegmentPill
        label="Sign in"
        selected={value === 'signin'}
        onPress={() => onChange('signin')}
      />
      <SegmentPill
        label="Sign up"
        selected={value === 'signup'}
        onPress={() => onChange('signup')}
      />
    </View>
  )
}

function SegmentPill({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-1 items-center rounded-full py-2.5 active:opacity-80 ${
        selected ? 'bg-white shadow-sm' : ''
      }`}
    >
      <Text
        className="text-sm font-semibold"
        style={{ color: selected ? BRAND_PRIMARY : TEXT_MUTED }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
