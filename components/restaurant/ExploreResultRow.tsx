import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import { ImageFallback } from '@/components/brand/ImageFallback'
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
import { resolveEffectiveFeaturedImageUrl } from '@/lib/featuredImageUtils'
import { formatRatingValue } from '@/lib/ratingDisplayUtils'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isTPResult } from '@/types/restaurantSearchResult'

type Props = {
  result: RestaurantSearchResult
  subtitle?: string | null
  rating?: number | null
  /** Active cuisine filter slug — that chip gets the orange outline. */
  activeCuisine?: string | null
  /** 0–100; shown as "94% palate match" under a palate cuisine filter. */
  palateMatchPercent?: number | null
  selected?: boolean
  onPress: () => void
}

function Chip({ label, on = false, muted = false }: { label: string; on?: boolean; muted?: boolean }): JSX.Element {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 50,
        borderWidth: muted ? 1 : 1.5,
        borderColor: on ? BRAND_PRIMARY : BORDER_SUBTLE,
        backgroundColor: SURFACE_CARD,
      }}
    >
      <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 11, color: muted ? TEXT_MUTED : TEXT_HEADING }}>
        {label}
      </Text>
    </View>
  )
}

/** Explore results row (design S2/S3): 84px thumb, name + ★, address, chips, palate match. */
export function ExploreResultRow({
  result,
  subtitle,
  rating,
  activeCuisine,
  palateMatchPercent,
  selected = false,
  onPress,
}: Props): JSX.Element {
  const tp = isTPResult(result)
  const uri = resolveEffectiveFeaturedImageUrl(result.featured_image_url)
  const [failed, setFailed] = useState(false)
  const score = formatRatingValue(rating ?? null)
  const cuisines = tp ? result.cuisines.slice(0, 2) : []

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[result.title, score ? `rated ${score}` : null, tp ? null : 'not on Tastyplates yet']
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      className="flex-row active:opacity-80"
      style={{
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: SURFACE_FOG,
        backgroundColor: selected ? BRAND_PRIMARY_TINT : undefined,
      }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          onError={() => setFailed(true)}
          style={{ width: 84, height: 84, borderRadius: 12, backgroundColor: SURFACE_FOG }}
        />
      ) : (
        <ImageFallback size={84} style={{ borderRadius: 12 }} />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <View className="flex-row items-baseline justify-between" style={{ gap: 8 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: FONT.headingMedium, fontSize: 16, color: TEXT_HEADING }}>
            {result.title}
          </Text>
          {score ? (
            <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 13, color: TEXT_HEADING }}>
              <Text style={{ color: BRAND_PRIMARY, fontSize: 12 }}>{tp ? '★' : 'G'}</Text> {score}
            </Text>
          ) : null}
        </View>
        {subtitle ? (
          <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
            {subtitle}
          </Text>
        ) : null}
        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {tp ? (
            cuisines.map((c) => (
              <Chip key={c.slug || String(c.id)} label={c.name} on={Boolean(activeCuisine && c.slug === activeCuisine)} />
            ))
          ) : (
            <Chip label="Not on Tastyplates yet" muted />
          )}
        </View>
        {palateMatchPercent != null ? (
          <View style={{ alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 50, backgroundColor: BRAND_PRIMARY_TINT }}>
            <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 11, color: BRAND_PRIMARY_DARK }}>
              {palateMatchPercent}% palate match
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}
