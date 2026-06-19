import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'

import { ReplyItem } from '@/components/review/ReplyItem'
import { ReplySkeleton } from '@/components/ui/Skeleton/ReplySkeleton'
import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'
import type { UseReviewCommentsResult } from '@/hooks/useReviewComments'

const NEUSANS = 'Neusans'

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
        <Text style={{ fontFamily: NEUSANS, color: TEXT_MUTED, textAlign: 'center' }}>{error}</Text>
        <Pressable onPress={() => void loadReplies()} style={{ marginTop: 12 }}>
          <Text style={{ fontFamily: NEUSANS, color: BRAND_PRIMARY }}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <FlashList
      data={replies}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: contentPaddingBottom }}
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
            <Text style={{ fontFamily: NEUSANS, fontSize: 16, fontWeight: '500', color: '#374151' }}>
              No Comments Yet
            </Text>
            <Text style={{ fontFamily: NEUSANS, fontSize: 14, color: '#6b7280', marginTop: 4 }}>
              Be the first to comment!
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
