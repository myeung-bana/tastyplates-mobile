import { Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'

import { AppIcon } from '@/components/ui/AppIcon'
import { TEXT_HEADING } from '@/constants/brand'
import { SCREEN_HOME } from '@/constants/screens'

export interface CircleCloseButtonProps {
  onPress?: () => void
  accessibilityLabel?: string
}

/** Circular close control — matches {@link CircleBackButton} styling. */
export function CircleCloseButton({
  onPress,
  accessibilityLabel = 'Close',
}: CircleCloseButtonProps): JSX.Element {
  const router = useRouter()

  const handlePress = (): void => {
    void Haptics.selectionAsync()
    if (onPress) {
      onPress()
      return
    }
    router.replace(SCREEN_HOME)
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={handlePress}
      className="h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white active:bg-gray-50"
    >
      <AppIcon name="x" size={22} color={TEXT_HEADING} />
    </Pressable>
  )
}
