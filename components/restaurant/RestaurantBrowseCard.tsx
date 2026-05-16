import { Pressable, View, Text, Image, type StyleProp, type ViewStyle } from 'react-native'

import {
  BORDER_SUBTLE,
  RATING_STAR,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'

export interface RestaurantBrowseCardProps {
  title: string
  imageUrl?: string | null
  subtitle?: string | null
  rating?: number | null
  reviewCount?: number | null
  onPress: () => void
  /** `carousel`: fixed tile (pass `containerStyle` with width/height). `list`: full-width row. */
  variant?: 'carousel' | 'list'
  containerStyle?: StyleProp<ViewStyle>
}

/**
 * Shared restaurant tile (featured carousel + browse list).
 * Visual baseline: design_system §5.3 Card, §2.4 palette, §6.2 imagery (rounded cover).
 */
export function RestaurantBrowseCard({
  title,
  imageUrl,
  subtitle,
  rating,
  reviewCount,
  onPress,
  variant = 'list',
  containerStyle,
}: RestaurantBrowseCardProps) {
  const uri = (imageUrl && imageUrl.trim()) || DEFAULT_IMAGE
  const isList = variant === 'list'
  const defaultListStyle: ViewStyle = isList ? { width: '100%' } : {}

  const showRating = rating != null || (reviewCount != null && reviewCount > 0)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="flex-col overflow-hidden rounded-lg border bg-white active:opacity-90"
      style={[
        { borderColor: BORDER_SUBTLE },
        defaultListStyle,
        containerStyle,
        isList
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 2,
              elevation: 2,
            }
          : null,
      ]}
    >
      <View className={isList ? 'h-44 w-full overflow-hidden' : 'w-full flex-[3] min-h-0'}>
        <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
      </View>

      <View
        className={[
          'border-t',
          isList ? 'flex-[0] px-4 py-3' : 'flex-[2] min-h-0 justify-center px-2 py-2',
        ].join(' ')}
        style={{ borderTopColor: BORDER_SUBTLE }}
      >
        <Text
          className={isList ? 'text-base leading-snug' : 'text-xs leading-snug'}
          style={{ color: TEXT_HEADING }}
          numberOfLines={isList ? 2 : 2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className={isList ? 'mt-1 text-sm leading-normal' : 'mt-0.5 text-[11px] leading-normal'}
            style={{ color: TEXT_BODY }}
            numberOfLines={isList ? 2 : 1}
          >
            {subtitle}
          </Text>
        ) : null}
        {showRating ? (
          <View className={isList ? 'mt-2 flex-row flex-wrap items-center gap-x-2' : 'mt-1 flex-row flex-wrap items-center gap-x-1.5'}>
            {rating != null ? (
              <View className="flex-row items-center gap-0.5">
                <Text
                  className={isList ? 'text-xs' : 'text-[10px]'}
                  style={{ color: RATING_STAR }}
                  importantForAccessibility="no"
                >
                  ★
                </Text>
                <Text
                  className={isList ? 'text-xs' : 'text-[11px]'}
                  style={{ color: TEXT_BODY }}
                >
                  {Number(rating).toFixed(1)}
                </Text>
              </View>
            ) : null}
            {reviewCount != null && reviewCount > 0 ? (
              <Text
                className={isList ? 'text-xs' : 'text-[10px]'}
                style={{ color: TEXT_MUTED }}
              >
                ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}
