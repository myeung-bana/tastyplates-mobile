import { Image, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'

import { BORDER_SUBTLE } from '@/constants/brand'
import { useLocation } from '@/contexts/LocationContext'
import { formatLocationDisplay } from '@/utils/locationUtils'

type Props = {
  /** Max pill width inside tight headers (approx px). */
  maxWidth?: number
}

/** Tappable city pill — opens global hierarchy sheet via context. */
export function GlobalLocationPill({ maxWidth = 200 }: Props): JSX.Element {
  const { location, hierarchy, openLocationPicker } = useLocation()
  const countries = hierarchy?.hierarchy.countries ?? null
  const line = formatLocationDisplay(location, countries)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Location ${line}. Opens picker.`}
      onPress={() => {
        void Haptics.selectionAsync()
        openLocationPicker()
      }}
      className="flex-row items-center rounded-[50px] border bg-[#FCFCFC] px-3 py-1.5 active:opacity-90"
      style={{
        borderColor: BORDER_SUBTLE,
        maxWidth,
        gap: 6,
      }}
    >
      <Text
        numberOfLines={1}
        className="flex-shrink text-xs font-medium"
        style={{ color: '#494D5D' }}
        maxFontSizeMultiplier={1.15}
      >
        {line}
      </Text>
      <AppIcon name="chevron-down" size={13} color="#494D5D" />
    </Pressable>
  )
}
