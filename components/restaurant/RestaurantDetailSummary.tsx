import { Text, View } from 'react-native'

import { RestaurantImageCarousel } from '@/components/restaurant/RestaurantImageCarousel'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  SUCCESS,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import {
  buildRestaurantImageGallery,
  extractCategoryNodes,
  formatPriceRange,
  parseOpeningHours,
  resolveRestaurantHeaderLocation,
  restaurantPalateAndCategoryLabels,
  todayOpeningHoursSummary,
} from '@/lib/restaurantDetailUtils'
import type { RestaurantDetailRow } from '@/services/restaurantDetailService'

export type RestaurantDetailSummaryProps = {
  restaurant: RestaurantDetailRow
  /** Google-only place (design S6): adds the "Not on Tastyplates yet" chip. */
  googleOnly?: boolean
}

function Chip({ children, dashed = false }: { children: string; dashed?: boolean }): JSX.Element {
  return (
    <View
      style={{
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 50,
        borderWidth: dashed ? 1 : 1.5,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: dashed ? TEXT_TERTIARY : BORDER_SUBTLE,
        backgroundColor: SURFACE_CARD,
      }}
    >
      <Text style={{ fontFamily: FONT.body, fontSize: 12, color: dashed ? TEXT_MUTED : TEXT_HEADING }}>{children}</Text>
    </View>
  )
}

/**
 * Photo carousel + header (design S5): cuisine, name, Open/Closed when hours exist, address,
 * category chips and price.
 */
export function RestaurantDetailSummary({ restaurant, googleOnly = false }: RestaurantDetailSummaryProps): JSX.Element {
  const images = buildRestaurantImageGallery(restaurant)
  const { primaryPalate } = restaurantPalateAndCategoryLabels(restaurant)
  const categories = extractCategoryNodes(restaurant.categories)
  const locationLine = resolveRestaurantHeaderLocation(restaurant)
  const price = formatPriceRange(restaurant.price_range_id)

  const hours = restaurant.opening_hours as string | object | null | undefined
  const todayLine = parseOpeningHours(hours) != null ? todayOpeningHoursSummary(hours) : null
  const isOpen = todayLine?.startsWith('Open') ?? false

  return (
    <>
      <RestaurantImageCarousel images={images} title={restaurant.title} />

      <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 8 }}>
        {primaryPalate ? (
          <Text
            style={{
              fontFamily: FONT.heading,
              fontSize: 11,
              lineHeight: 14,
              letterSpacing: 2.2,
              textTransform: 'uppercase',
              color: TEXT_MUTED,
            }}
          >
            {primaryPalate}
          </Text>
        ) : null}

        <Text
          accessibilityRole="header"
          numberOfLines={3}
          style={{ fontFamily: FONT.heading, fontSize: 28, lineHeight: 33, color: TEXT_HEADING }}
        >
          {restaurant.title}
        </Text>

        {todayLine && todayLine !== 'Not available' ? (
          <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: isOpen ? SUCCESS : TEXT_MUTED }}>
            {todayLine}
          </Text>
        ) : null}

        {locationLine ? (
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <AppIcon name="map-pin" size={15} color={TEXT_MUTED} />
            <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>{locationLine}</Text>
          </View>
        ) : null}

        {googleOnly || categories.length > 0 || price ? (
          <View className="flex-row flex-wrap" style={{ gap: 6, marginTop: 2 }}>
            {googleOnly ? <Chip dashed>G · Not on Tastyplates yet</Chip> : null}
            {categories.map((category) => (
              <Chip key={category.slug}>{category.name}</Chip>
            ))}
            {price ? <Chip>{price}</Chip> : null}
          </View>
        ) : null}
      </View>
    </>
  )
}
