import { Pressable, Text } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'

import { TEXT_HEADING } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { useLocation } from '@/contexts/LocationContext'
import { formatLocationDisplay } from '@/utils/locationUtils'

type Props = {
  /** Max pill width inside tight headers (approx px). */
  maxWidth?: number
}

/** Top-bar city (design H1): Jost city name + chevron; opens the shared city picker (H3). */
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
      hitSlop={8}
      className="flex-row items-center active:opacity-70"
      style={{ maxWidth, gap: 4, height: 44 }}
    >
      <Text
        numberOfLines={1}
        className="flex-shrink"
        style={{ fontFamily: FONT.headingMedium, fontSize: 16, color: TEXT_HEADING }}
        maxFontSizeMultiplier={1.15}
      >
        {line}
      </Text>
      <AppIcon name="chevron-down" size={16} color={TEXT_HEADING} />
    </Pressable>
  )
}
