import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'

import { ReplyItem } from '@/components/review/ReplyItem'
import { ReplySkeleton } from '@/components/ui/Skeleton/ReplySkeleton'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import type { UseReviewCommentsResult } from '@/hooks/useReviewComments'
import { FONT } from '@/constants/typography'


export type ReviewCommentsListProps = {
  comments: Pick<
    UseReviewCommentsResult,
    | 'replies'
    | 'replyLikes'
    | 'replyUserLiked'
    | 'replyLikeBusy'
    | 'loading'
    | 'refreshing'
    | 'error'
    | 'loadReplies'
    | 'handleReplyLike'
    | 'isAuthenticated'
    | 'promptSignIn'
  >
  /** Extra bottom padding when list sits above a fixed composer. */
  contentPaddingBottom?: number
}

export function ReviewCommentsList({
  comments,
  contentPaddingBottom = 8,
}: ReviewCommentsListProps): JSX.Element {
  const {
    replies,
    replyLikes,
    replyUserLiked,
    replyLikeBusy,
    loading,
    refreshing,
    error,
    loadReplies,
    handleReplyLike,
    isAuthenticated,
    promptSignIn,
  } = comments

  if (loading && replies.length === 0) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <ReplySkeleton count={3} />
      </View>
    )
  }

  if (error && replies.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontFamily: FONT.body, color: TEXT_MUTED, textAlign: 'center' }}>{error}</Text>
        <Pressable onPress={() => void loadReplies()} style={{ marginTop: 12 }}>
          <Text style={{ fontFamily: FONT.body, color: BRAND_PRIMARY }}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <FlashList
      data={replies}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: contentPaddingBottom }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadReplies({ pull: true })}
          tintColor={BRAND_PRIMARY}
        />
      }
      ListEmptyComponent={
        !loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontFamily: FONT.heading, fontSize: 18, color: TEXT_HEADING }}>No comments yet</Text>
            <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED, marginTop: 4 }}>
              Start the conversation.
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <ReplyItem
          reply={item}
          likesCount={replyLikes[item.id]}
          userLiked={replyUserLiked[item.id]}
          isLikeLoading={replyLikeBusy[item.id]}
          onLike={handleReplyLike}
          isAuthenticated={isAuthenticated}
          onAuthRequired={promptSignIn}
        />
      )}
    />
  )
}

export function ReviewCommentsListFooterLoading({
  loadingMore,
}: {
  loadingMore?: boolean
}): JSX.Element | null {
  if (!loadingMore) return null
  return (
    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
      <ActivityIndicator color={BRAND_PRIMARY} />
    </View>
  )
}
