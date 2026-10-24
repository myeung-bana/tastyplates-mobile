import { Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { BORDER_SUBTLE, SURFACE_CARD, TEXT_HEADING } from '@/constants/brand'

export type CircleIconButtonProps = {
  icon: AppIconName
  accessibilityLabel: string
  onPress: () => void
}

/** 44pt outlined circle button used in the design's top bars (R1, R2, R6). */
export function CircleIconButton({ icon, accessibilityLabel, onPress }: CircleIconButtonProps): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      className="items-center justify-center active:opacity-80"
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: BORDER_SUBTLE,
        backgroundColor: SURFACE_CARD,
      }}
    >
      <AppIcon name={icon} size={20} color={TEXT_HEADING} />
    </Pressable>
  )
}
