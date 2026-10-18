import { Pressable, Text, View } from 'react-native'

import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  DANGER,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'

type Props = {
  label: string
  value: string | null
  onPress: () => void
  onClear?: () => void
  helper?: string
  invalid?: boolean
  placeholder?: string
}

/** Tappable city row (design G6 / P5): pin, value or "Search any city", clear ✕. */
export function CityPickerField({
  label,
  value,
  onPress,
  onClear,
  helper,
  invalid = false,
  placeholder = 'Search any city',
}: Props): JSX.Element {
  const hasValue = Boolean(value?.trim())
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING }}>{label}</Text>
      <View
        className="flex-row items-center"
        style={{
          minHeight: 56,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: invalid ? DANGER : BORDER_SUBTLE,
          backgroundColor: SURFACE_CARD,
          paddingLeft: 14,
          paddingRight: 8,
          gap: 10,
        }}
      >
        <AppIcon name="map-pin" size={18} color={hasValue ? TEXT_HEADING : TEXT_TERTIARY} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${hasValue ? value : placeholder}`}
          onPress={onPress}
          style={{ flex: 1, height: 52, justifyContent: 'center' }}
        >
          <Text
            numberOfLines={1}
            style={{ fontFamily: FONT.body, fontSize: 16, color: hasValue ? TEXT_HEADING : TEXT_TERTIARY }}
          >
            {hasValue ? value : placeholder}
          </Text>
        </Pressable>
        {hasValue && onClear ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            onPress={onClear}
            hitSlop={6}
            className="items-center justify-center"
            style={{ width: 36, height: 36 }}
          >
            <AppIcon name="x" size={18} color={TEXT_TERTIARY} />
          </Pressable>
        ) : null}
      </View>
      {helper ? (
        <Text style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 18, color: TEXT_MUTED }}>{helper}</Text>
      ) : null}
    </View>
  )
}
