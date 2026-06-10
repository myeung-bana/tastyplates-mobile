import { Pressable, Text } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'

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
      className="flex-row items-center gap-2 rounded-[50px] border border-gray-300 bg-white px-4 py-2 active:opacity-90"
      style={{ maxWidth }}
    >
      <Text
        numberOfLines={1}
        className="flex-shrink font-neusans text-sm font-normal text-gray-900"
        maxFontSizeMultiplier={1.15}
      >
        {line}
      </Text>
      <AppIcon name="chevron-down" size="sm" color="#6b7280" />
    </Pressable>
  )
}
