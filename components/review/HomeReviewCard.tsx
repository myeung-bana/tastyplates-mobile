import { Image, Pressable, Text, View } from 'react-native'
import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { RatingDisplay } from '@/components/ui/RatingDisplay'
import { BORDER_SUBTLE, SURFACE_FOG, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { useModeration } from '@/contexts/ModerationContext'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { resolveReviewAuthorAvatarUrl, resolveReviewAuthorLabel } from '@/lib/reviewAuthorDisplay'
import { firstReviewImageUri, reviewHashtagLabels } from '@/lib/reviewDisplayUtils'
import type { TrendingReviewRow } from '@/services/homeReviewsService'

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'

function capitalizeWords(s: string): string {
  if (!s.trim()) return ''
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface HomeReviewCardProps {
  /** Card width — 2-col grid: `(screen - padding*2 - gap) / 2` (`auth-review.md` §2). */
  width: number
  review: TrendingReviewRow
  onPressCard?: () => void
  onPressAuthor?: () => void
  /** Read-only tile — no navigation (e.g. Google review snippets). */
  readOnly?: boolean
  /** Muted timestamp below author row (e.g. Google `relative_time_description`). */
  timeLabel?: string
  /** Hashtag chips under the excerpt (off on Home, per design H1). */
  showTags?: boolean
}

/**
 * Image-forward review tile — 4.5:6 portrait, `rounded-2xl`, typography from `design_system.md` §2.3.
 */
export function HomeReviewCard({
  width,
  review,
  onPressCard,
  onPressAuthor,
  readOnly = false,
  timeLabel,
  showTags = false,
}: HomeReviewCardProps) {
  const avatarUrl = resolveReviewAuthorAvatarUrl(review.AuthorProfile)
  const cover = firstReviewImageUri(review.images, DEFAULT_COVER)
  const title = capitalizeWords(stripHtml(review.title ?? '').trim())
  const bodyRaw = capitalizeWords(stripHtml(review.content ?? '').trim())
  const tags = reviewHashtagLabels(review.hashtags, 3)
  const name = resolveReviewAuthorLabel(review.AuthorProfile)
  const restaurantName = review.restaurant?.title?.trim() ?? ''
  const { openContentActions, canModerate } = useModeration()
  const openActions = canModerate(review.author_id)
    ? () =>
        openContentActions({
          targetType: 'review',
          targetId: review.id,
          ownerId: review.author_id,
          ownerLabel: name,
        })
    : undefined

  const imageBlock = (
    <View
      className="overflow-hidden"
      style={{ aspectRatio: 0.71, width, borderRadius: 16, backgroundColor: SURFACE_FOG, marginBottom: 6 }}
    >
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: cover }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    </View>
  )

  const authorRow = (
    <View className="flex-row items-center" style={{ gap: 6, marginBottom: 6 }}>
      {readOnly ? (
        <ProfileAvatarImage size={20} avatarUrl={avatarUrl} className="bg-gray-200" />
      ) : (
        <Pressable onPress={onPressAuthor} hitSlop={8} accessibilityRole="button">
          <ProfileAvatarImage size={20} avatarUrl={avatarUrl} className="bg-gray-200" />
        </Pressable>
      )}
      {readOnly ? (
        <Text className="min-w-0 flex-1" style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_HEADING }} numberOfLines={1}>
          {name}
        </Text>
      ) : (
        <Pressable onPress={onPressAuthor} className="min-w-0 flex-1" hitSlop={4}>
          <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_HEADING }} numberOfLines={1}>
            {name}
          </Text>
        </Pressable>
      )}
      <RatingDisplay size="xs" value={review.rating} className="ml-auto" />
    </View>
  )

  return (
    <View style={{ width }} className="mb-1">
      {readOnly ? (
        imageBlock
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Review ${title || 'Untitled'}`}
          accessibilityHint={openActions ? 'Long press to report or block' : undefined}
          onPress={onPressCard}
          onLongPress={openActions}
          className="active:opacity-95"
        >
          {imageBlock}
        </Pressable>
      )}

      <View className="px-0.5">
        {authorRow}

        {timeLabel ? (
          <Text className="mb-1 text-[11px] font-body" style={{ color: TEXT_MUTED }} numberOfLines={1}>
            {timeLabel}
          </Text>
        ) : null}

        {/* Restaurant name, then the review excerpt (design H1). Older payloads fall back to the title. */}
        {restaurantName || title ? (
          <Text style={{ fontFamily: FONT.headingMedium, fontSize: 13, lineHeight: 16, color: TEXT_HEADING, marginBottom: 4 }} numberOfLines={1}>
            {restaurantName || title}
          </Text>
        ) : null}

        <Text style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 17, color: TEXT_MUTED }} numberOfLines={2}>
          {(restaurantName && title ? title : bodyRaw) || ' '}
        </Text>

        {showTags && tags.length > 0 ? (
          <View className="mt-1.5 flex-row flex-wrap gap-1">
            {tags.map((t) => (
              <View
                key={t}
                className="rounded-full border px-2 py-0.5"
                style={{ borderColor: BORDER_SUBTLE, backgroundColor: SURFACE_FOG }}
              >
                <Text className="text-[11px] font-body" style={{ color: TEXT_MUTED }}>
                  #{t}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  )
}

export function HomeReviewCardSkeleton({ width }: { width: number }) {
  return (
    <View style={{ width }} className="mb-4">
      <View
        className="mb-2 rounded-2xl bg-gray-200"
        style={{ aspectRatio: 4.5 / 6, width }}
      />
      <View className="flex-row items-center gap-2 px-0.5">
        <View className="h-7 w-7 rounded-full bg-gray-200" />
        <View className="h-3 flex-1 rounded bg-gray-200" />
        <View className="h-3 w-8 rounded bg-gray-200" />
      </View>
      <View className="mt-2 h-3 w-full rounded bg-gray-200 px-0.5" />
      <View className="mt-2 h-3 rounded bg-gray-200" style={{ width: '82%' }} />
    </View>
  )
}
