import { Pressable, Text, View } from 'react-native'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { RatingDisplay } from '@/components/ui/RatingDisplay'
import { BORDER_SUBTLE, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { stripHtml } from '@/lib/restaurantDetailUtils'

export type GoogleReviewCardProps = {
  width: number
  authorName: string
  avatarUrl?: string | null
  rating: number | null
  content: string | null
  timeLabel?: string | null
  onPress: () => void
}

/** Text-first read-only card for Google review snippets (no fake cover image). */
export function GoogleReviewCard({
  width,
  authorName,
  avatarUrl,
  rating,
  content,
  timeLabel,
  onPress,
}: GoogleReviewCardProps): JSX.Element {
  const body = stripHtml(content ?? '').trim()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Google review by ${authorName}`}
      onPress={onPress}
      style={{ width }}
      className="active:opacity-95"
    >
      <View
        className="rounded-2xl border bg-white p-3"
        style={{ borderColor: BORDER_SUBTLE, minHeight: 196 }}
      >
        <View className="mb-2 flex-row items-center gap-2">
          <ProfileAvatarImage size={28} avatarUrl={avatarUrl} className="bg-gray-200" />
          <View className="min-w-0 flex-1">
            <Text className="text-[12px] font-medium" style={{ color: TEXT_HEADING }} numberOfLines={1}>
              {authorName}
            </Text>
            {timeLabel ? (
              <Text className="text-[11px] font-normal" style={{ color: TEXT_MUTED }} numberOfLines={1}>
                {timeLabel}
              </Text>
            ) : null}
          </View>
          <RatingDisplay size="xs" value={rating} />
        </View>

        <Text className="text-[12px] font-normal leading-[1.45]" style={{ color: TEXT_BODY }} numberOfLines={5}>
          {body || 'No review text.'}
        </Text>

        <View className="mt-3 flex-row items-center justify-between">
          <View className="rounded-full border px-2 py-0.5" style={{ borderColor: BORDER_SUBTLE, backgroundColor: '#fafafa' }}>
            <Text className="text-[10px] font-medium" style={{ color: TEXT_MUTED }}>
              Google
            </Text>
          </View>
          <Text className="text-[11px] font-medium" style={{ color: TEXT_MUTED }}>
            Read more
          </Text>
        </View>
      </View>
    </Pressable>
  )
}
