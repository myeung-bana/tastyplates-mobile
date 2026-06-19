import { KeyboardAvoidingView, Platform } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReviewCommentsComposer } from '@/components/review/ReviewCommentsComposer'
import { ReviewCommentsList } from '@/components/review/ReviewCommentsList'
import { STACK_DETAIL_HEADER_OPTIONS } from '@/constants/stackHeader'
import { SCREEN_HOME, SCREEN_REVIEW_COMMENTS } from '@/constants/screens'
import { useReviewComments } from '@/hooks/useReviewComments'

function singleParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined
  return Array.isArray(v) ? v[0] : v
}

export default function ReviewCommentsScreen() {
  const insets = useSafeAreaInsets()
  const rawReviewId = useLocalSearchParams<{ reviewId?: string | string[] }>().reviewId
  const reviewId = singleParam(rawReviewId)?.trim() ?? ''

  const comments = useReviewComments({
    reviewId,
    resumePath: reviewId
      ? { pathname: SCREEN_REVIEW_COMMENTS, params: { reviewId } }
      : SCREEN_HOME,
  })

  return (
    <>
      <Stack.Screen
        options={{
          ...STACK_DETAIL_HEADER_OPTIONS,
          title: `Comments (${comments.totalCount})`,
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ReviewCommentsList comments={comments} />
        <ReviewCommentsComposer
          comments={comments}
          bottomInset={Math.max(insets.bottom, 12)}
        />
      </KeyboardAvoidingView>
    </>
  )
}
