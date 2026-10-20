import { Text, View } from 'react-native'

import { RestaurantImageCarousel } from '@/components/restaurant/RestaurantImageCarousel'
import {
  BORDER_SUBTLE,
  SUCCESS,
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
  onBack?: () => void
  onShare?: () => void
}

function Chip({ children, dashed = false }: { children: string; dashed?: boolean }): JSX.Element {
  return (
    <View
      style={{
        height: 28,
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: dashed ? TEXT_TERTIARY : BORDER_SUBTLE,
      }}
    >
      <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 13, color: dashed ? TEXT_MUTED : TEXT_HEADING }}>{children}</Text>
    </View>
  )
}

/** "Open · until 10 PM" from today's hours line ("Open · 11:30 AM – 10:00 PM"). */
function openStatusParts(line: string | null): { label: string; rest: string } | null {
  if (!line || line === 'Not available') return null
  if (line === 'Closed') return { label: 'Closed', rest: 'today' }
  const hours = line.replace(/^Open\s*·\s*/, '')
  const close = hours.split(/\s*[–-]\s*/)[1]
  return { label: 'Open', rest: close ? `until ${close}` : hours }
}

/**
 * Photo hero + header (design S5): cuisine eyebrow, name, Open/Closed when hours exist,
 * address, then category / price chips.
 */
export function RestaurantDetailSummary({
  restaurant,
  googleOnly = false,
  onBack,
  onShare,
}: RestaurantDetailSummaryProps): JSX.Element {
  const images = buildRestaurantImageGallery(restaurant)
  const { primaryPalate } = restaurantPalateAndCategoryLabels(restaurant)
  const categories = extractCategoryNodes(restaurant.categories)
  const locationLine = resolveRestaurantHeaderLocation(restaurant)
  const price = formatPriceRange(restaurant.price_range_id)

  const hours = restaurant.opening_hours as string | object | null | undefined
  const status = openStatusParts(parseOpeningHours(hours) != null ? todayOpeningHoursSummary(hours) : null)

  return (
    <>
      <RestaurantImageCarousel images={images} title={restaurant.title} onBack={onBack} onShare={onShare} />

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
          style={{ fontFamily: FONT.heading, fontSize: 30, lineHeight: 36, color: TEXT_HEADING }}
        >
          {restaurant.title}
        </Text>

        {status ? (
          <Text style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 20, color: TEXT_MUTED }}>
            <Text style={{ fontFamily: FONT.bodySemibold, color: status.label === 'Open' ? SUCCESS : TEXT_MUTED }}>
              {status.label}
            </Text>
            {` · ${status.rest}`}
          </Text>
        ) : null}

        {locationLine ? (
          <Text style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 20, color: TEXT_MUTED }}>{locationLine}</Text>
        ) : null}

        {googleOnly || categories.length > 0 || price ? (
          <View className="flex-row flex-wrap" style={{ gap: 6, marginTop: 4 }}>
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
