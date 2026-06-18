import { Image, Pressable, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { RatingDisplay } from '@/components/ui/RatingDisplay'
import { BORDER_SUBTLE, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
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
  onPressCard: () => void
  onPressAuthor: () => void
}

/**
 * Image-forward review tile — 4.5:6 portrait, `rounded-2xl`, typography from `design_system.md` §2.3.
 */
export function HomeReviewCard({
  width,
  review,
  onPressCard,
  onPressAuthor,
}: HomeReviewCardProps) {
  const avatarUrl = resolveReviewAuthorAvatarUrl(review.AuthorProfile)
  const cover = firstReviewImageUri(review.images, DEFAULT_COVER)
  const title = capitalizeWords(stripHtml(review.title ?? '').trim())
  const bodyRaw = capitalizeWords(stripHtml(review.content ?? '').trim())
  const tags = reviewHashtagLabels(review.hashtags, 3)
  const name = resolveReviewAuthorLabel(review.AuthorProfile)

  return (
    <View style={{ width }} className="mb-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Review ${title || 'Untitled'}`}
        onPress={onPressCard}
        className="active:opacity-95"
      >
        <View
          className="mb-2 overflow-hidden rounded-2xl bg-gray-100"
          style={{ aspectRatio: 4.5 / 6, width }}
        >
          <Image
            accessibilityIgnoresInvertColors
            source={{ uri: cover }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      </Pressable>

      <View className="px-0.5">
        <View className="mb-1 flex-row items-center gap-2">
          <Pressable onPress={onPressAuthor} hitSlop={8} accessibilityRole="button">
            {avatarUrl ? (
              <Image
                accessibilityIgnoresInvertColors
                source={{ uri: avatarUrl }}
                className="rounded-full bg-gray-200"
                style={{ width: 28, height: 28 }}
              />
            ) : (
              <View
                className="items-center justify-center rounded-full bg-gray-100"
                style={{ width: 28, height: 28 }}
              >
                <AppIcon name="user" size={16} color={TEXT_MUTED} />
              </View>
            )}
          </Pressable>
          <Pressable onPress={onPressAuthor} className="min-w-0 flex-1" hitSlop={4}>
            <Text className="text-[12px] font-medium" style={{ color: TEXT_HEADING }} numberOfLines={1}>
              {name}
            </Text>
          </Pressable>
          <RatingDisplay size="xs" value={review.rating} className="ml-auto" />
        </View>

        {title ? (
          <Text className="mb-0.5 text-[12px] font-normal" style={{ color: TEXT_HEADING }} numberOfLines={1}>
            {title}
          </Text>
        ) : null}

        <Text className="text-[12px] font-normal leading-[1.4]" style={{ color: TEXT_BODY }} numberOfLines={2}>
          {bodyRaw || ' '}
        </Text>

        {tags.length > 0 ? (
          <View className="mt-1.5 flex-row flex-wrap gap-1">
            {tags.map((t) => (
              <View
                key={t}
                className="rounded-full border px-2 py-0.5"
                style={{ borderColor: BORDER_SUBTLE, backgroundColor: '#fafafa' }}
              >
                <Text className="text-[11px]" style={{ color: TEXT_MUTED }}>
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
