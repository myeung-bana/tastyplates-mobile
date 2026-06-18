import { ActivityIndicator, Text, View } from 'react-native'

import { FollowingFeedActivityCard } from '@/components/following/FollowingFeedActivityCard'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import type { FollowingFeedAuthorProfile } from '@/services/followingFeedService'

export type ProfileRecentActivityPreviewProps = {
  loading: boolean
  error: string | null
  activities: FollowingFeedActivity[]
  onPressReview: (reviewId: string) => void
  onPressComment: (reviewId: string) => void
  onPressAuthor: (
    authorId: string,
    profile: FollowingFeedAuthorProfile | null | undefined,
  ) => void
  emptyMessage?: string
}

export function ProfileRecentActivityPreview({
  loading,
  error,
  activities,
  onPressReview,
  onPressComment,
  onPressAuthor,
  emptyMessage = 'Recent activity will appear here.',
}: ProfileRecentActivityPreviewProps): JSX.Element {
  if (loading && activities.length === 0) {
    return (
      <View className="mt-8 items-center py-6">
        <ActivityIndicator color={BRAND_PRIMARY} />
      </View>
    )
  }

  if (error) {
    return (
      <View className="mt-8">
        <Text className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
          {error}
        </Text>
      </View>
    )
  }

  if (activities.length === 0) {
    return (
      <View className="mt-8">
        <Text className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
          {emptyMessage}
        </Text>
      </View>
    )
  }

  return (
    <View className="mt-8">
      <Text className="mb-3 text-base font-semibold" style={{ color: TEXT_HEADING }}>
        Recent activity
      </Text>
      {activities.map((activity) => (
        <FollowingFeedActivityCard
          key={`${activity.type}:${activity.id}`}
          activity={activity}
          onPressReview={onPressReview}
          onPressComment={onPressComment}
          onPressAuthor={onPressAuthor}
        />
      ))}
    </View>
  )
}
