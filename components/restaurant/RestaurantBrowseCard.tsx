import {
  Pressable,
  View,
  Text,
  Image,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import { RatingDisplay } from '@/components/ui/RatingDisplay'
import { BRAND_PRIMARY, BORDER_SUBTLE, TEXT_BODY, TEXT_HEADING } from '@/constants/brand'
import { labelForPalateKey } from '@/lib/palateLabels'
import { coerceRatingNumber, hasDisplayableRating } from '@/lib/ratingDisplayUtils'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'

const PALATE_CHIP_BG = '#f2f2f2'
const PALATE_CHIP_HIGHLIGHT_BG = '#fef7f0'

export interface RestaurantBrowseCardProps {
  title: string
  imageUrl?: string | null
  /** Formatted `street, city` (see `formatRestaurantCardAddress`). */
  subtitle?: string | null
  rating?: number | null
  reviewCount?: number | null
  /** Palate-filtered Search score (preference avg). */
  searchScore?: number | null
  searchScoreLabel?: string
  /** Restaurant palate labels for chip row. */
  palateTags?: string[]
  /** Highlights the chip matching active `?palate=` filter. */
  highlightPalateSlug?: string | null
  onPress: () => void
  /** `carousel`: fixed tile (pass `containerStyle` with width/height). `list`: full-width row. */
  variant?: 'carousel' | 'list'
  containerStyle?: StyleProp<ViewStyle>
}

function buildAccessibilityLabel(
  title: string,
  subtitle: string | null | undefined,
  overallRating: number | null,
  reviewCount: number | null | undefined,
  palateTags: string[],
): string {
  const parts = [title]
  if (subtitle?.trim()) parts.push(subtitle.trim())
  if (hasDisplayableRating(overallRating)) {
    parts.push(
      reviewCount != null && reviewCount > 0
        ? `rated ${overallRating} out of 5, ${reviewCount} reviews`
        : `rated ${overallRating} out of 5`,
    )
  }
  if (palateTags.length > 0) parts.push(`palates: ${palateTags.join(', ')}`)
  return parts.join(', ')
}

function PalateChip({
  label,
  highlighted,
  compact,
}: {
  label: string
  highlighted: boolean
  compact: boolean
}): JSX.Element {
  return (
    <View
      className="rounded-full"
      style={{
        paddingHorizontal: compact ? 8 : 10,
        paddingVertical: compact ? 4 : 5,
        backgroundColor: highlighted ? PALATE_CHIP_HIGHLIGHT_BG : PALATE_CHIP_BG,
        borderWidth: highlighted ? 2 : 0,
        borderColor: highlighted ? BRAND_PRIMARY : 'transparent',
      }}
    >
      <Text
        style={{
          fontSize: compact ? 11 : 12,
          fontWeight: '500',
          color: highlighted ? BRAND_PRIMARY : TEXT_HEADING,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

function PalateTagsRow({
  tags,
  highlightPalateSlug,
  compact,
  maxVisible,
}: {
  tags: string[]
  highlightPalateSlug?: string | null
  compact: boolean
  maxVisible?: number
}): JSX.Element | null {
  if (tags.length === 0) return null

  const activeLabel = highlightPalateSlug?.trim()
    ? labelForPalateKey(highlightPalateSlug.trim())
    : null
  const visible = maxVisible != null ? tags.slice(0, maxVisible) : tags
  const overflow = maxVisible != null ? Math.max(0, tags.length - maxVisible) : 0

  const chips = (
    <>
      {visible.map((tag, index) => (
        <View key={`${tag}-${index}`} style={index > 0 ? { marginLeft: compact ? 6 : 8 } : undefined}>
          <PalateChip
            label={tag}
            highlighted={activeLabel != null && tag === activeLabel}
            compact={compact}
          />
        </View>
      ))}
      {overflow > 0 ? (
        <View style={{ marginLeft: compact ? 6 : 8 }}>
          <PalateChip label={`+${overflow}`} highlighted={false} compact={compact} />
        </View>
      ) : null}
    </>
  )

  if (maxVisible != null) {
    return (
      <View className={compact ? 'mt-1 flex-row flex-wrap items-center' : 'mt-2 flex-row flex-wrap items-center'}>
        {chips}
      </View>
    )
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={compact ? 'mt-1 max-h-8' : 'mt-2'}
      style={{ maxHeight: compact ? 28 : 36 }}
      contentContainerStyle={{ alignItems: 'center', paddingRight: 4 }}
    >
      {chips}
    </ScrollView>
  )
}

/**
 * Shared restaurant tile (featured carousel + browse list).
 * Visual baseline: design_system §5.3 Card, §11.6 RatingDisplay.
 */
export function RestaurantBrowseCard({
  title,
  imageUrl,
  subtitle,
  rating,
  reviewCount,
  searchScore,
  searchScoreLabel,
  palateTags = [],
  highlightPalateSlug,
  onPress,
  variant = 'list',
  containerStyle,
}: RestaurantBrowseCardProps) {
  const uri = (imageUrl && imageUrl.trim()) || DEFAULT_IMAGE
  const isList = variant === 'list'
  const defaultListStyle: ViewStyle = isList ? { width: '100%' } : {}

  const overallRating = coerceRatingNumber(rating)
  const palateRating = coerceRatingNumber(searchScore)
  const showOverall = hasDisplayableRating(overallRating)
  const showSearchScore = hasDisplayableRating(palateRating)

  const a11yLabel = buildAccessibilityLabel(title, subtitle, overallRating, reviewCount, palateTags)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
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
        {isList ? (
          <>
            <View className="flex-row items-start justify-between gap-3">
              <Text
                className="min-w-0 flex-1 text-base leading-snug"
                style={{ color: TEXT_HEADING }}
                numberOfLines={2}
              >
                {title}
              </Text>
              {showOverall ? (
                <RatingDisplay
                  size="sm"
                  value={overallRating}
                  reviewCount={reviewCount ?? undefined}
                  className="shrink-0"
                />
              ) : null}
            </View>

            {subtitle ? (
              <Text
                className="mt-1 text-sm leading-normal"
                style={{ color: TEXT_BODY }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}

            <PalateTagsRow
              tags={palateTags}
              highlightPalateSlug={highlightPalateSlug}
              compact={false}
            />

            {showSearchScore ? (
              <View className="mt-1.5">
                <RatingDisplay size="sm" value={palateRating} label={searchScoreLabel} />
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View className="flex-row items-start justify-between gap-1">
              <Text
                className="min-w-0 flex-1 text-xs leading-snug"
                style={{ color: TEXT_HEADING }}
                numberOfLines={2}
              >
                {title}
              </Text>
              {showOverall ? (
                <RatingDisplay size="xs" value={overallRating} className="shrink-0" />
              ) : null}
            </View>

            {subtitle ? (
              <Text
                className="mt-0.5 text-[11px] leading-normal"
                style={{ color: TEXT_BODY }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}

            <PalateTagsRow
              tags={palateTags}
              highlightPalateSlug={highlightPalateSlug}
              compact
              maxVisible={2}
            />

            {showSearchScore ? (
              <View className="mt-0.5">
                <RatingDisplay size="xs" value={palateRating} label={searchScoreLabel} />
              </View>
            ) : null}
          </>
        )}
      </View>
    </Pressable>
  )
}
