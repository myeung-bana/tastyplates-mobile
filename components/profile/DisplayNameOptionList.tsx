import { Image, Pressable, Text, View, type ImageSourcePropType } from 'react-native'
import * as Haptics from 'expo-haptics'

import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  BRAND_PRIMARY_TINT,
  SURFACE_CARD,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import {
  buildDisplayName,
  DISPLAY_NAME_VARIANTS,
  type DisplayNameVariant,
} from '@/lib/displayNameOptions'
import { DEFAULT_USER_PROFILE_IMAGE } from '@/lib/profileAvatar'

type Props = {
  firstName: string
  lastName: string
  value: DisplayNameVariant
  onChange: (variant: DisplayNameVariant) => void
  username: string
  avatar?: ImageSourcePropType
}

/** Radio cards for the four display-name variants plus the live preview (design G5c / P5d). */
export function DisplayNameOptionList({
  firstName,
  lastName,
  value,
  onChange,
  username,
  avatar = DEFAULT_USER_PROFILE_IMAGE,
}: Props): JSX.Element {
  const preview = buildDisplayName(firstName, lastName, value) || '—'

  return (
    <View style={{ gap: 16 }}>
      <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
        {DISPLAY_NAME_VARIANTS.map((variant) => {
          const on = variant.id === value
          const label = buildDisplayName(firstName, lastName, variant.id) || '—'
          return (
            <Pressable
              key={variant.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label}, ${variant.hint}`}
              onPress={() => {
                void Haptics.selectionAsync()
                onChange(variant.id)
              }}
              className="flex-row items-center active:opacity-90"
              style={{
                minHeight: 60,
                borderRadius: 14,
                borderWidth: on ? 2 : 1.5,
                borderColor: on ? BRAND_PRIMARY : BORDER_SUBTLE,
                backgroundColor: on ? BRAND_PRIMARY_TINT : SURFACE_CARD,
                paddingHorizontal: 16,
                gap: 14,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: FONT.heading,
                    fontSize: 17,
                    color: on ? BRAND_PRIMARY_DARK : TEXT_HEADING,
                  }}
                >
                  {label}
                </Text>
                <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
                  {variant.hint}
                </Text>
              </View>
              <View
                className="items-center justify-center"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: on ? 0 : 1.5,
                  borderColor: BORDER_SUBTLE,
                  backgroundColor: on ? BRAND_PRIMARY : SURFACE_CARD,
                }}
              >
                {on ? <AppIcon name="check" size={14} color="#FFFFFF" /> : null}
              </View>
            </Pressable>
          )
        })}
      </View>

      <View
        className="flex-row items-center"
        style={{ gap: 12, padding: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: SURFACE_FOG }}
      >
        <Image
          source={avatar}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: BORDER_SUBTLE }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={1} style={{ fontFamily: FONT.heading, fontSize: 16, color: TEXT_HEADING }}>
            {preview}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}>
            @{username}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: FONT.heading,
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: TEXT_MUTED,
          }}
        >
          Preview
        </Text>
      </View>
    </View>
  )
}
