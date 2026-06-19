import { forwardRef, type ElementRef, type Ref } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import type { TextInput as RNTextInput } from 'react-native'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { AppIcon } from '@/components/ui/AppIcon'
import { reviewDescriptionDisplayLimit } from '@/constants/validation'
import type { UseReviewCommentsResult } from '@/hooks/useReviewComments'

const NEUSANS = 'Neusans'

export type ReviewCommentsComposerProps = {
  comments: Pick<
    UseReviewCommentsResult,
    | 'isAuthenticated'
    | 'profile'
    | 'commentText'
    | 'setCommentText'
    | 'cooldown'
    | 'submitting'
    | 'canSend'
    | 'handleCommentSubmit'
    | 'promptSignIn'
  >
  /** Use gorhom input when rendered inside a bottom sheet footer. */
  variant?: 'default' | 'bottomSheet'
  bottomInset?: number
}

export const ReviewCommentsComposer = forwardRef<RNTextInput, ReviewCommentsComposerProps>(
  function ReviewCommentsComposer(
    { comments, variant = 'default', bottomInset = 12 },
    ref,
  ): JSX.Element {
    const {
      isAuthenticated,
      profile,
      commentText,
      setCommentText,
      cooldown,
      submitting,
      canSend,
      handleCommentSubmit,
      promptSignIn,
    } = comments

    const inputProps = {
      value: commentText,
      onChangeText: setCommentText,
      placeholder:
        cooldown > 0
          ? `Please wait ${cooldown}s before commenting again...`
          : 'Add a comment...',
      placeholderTextColor: '#9ca3af' as const,
      maxLength: reviewDescriptionDisplayLimit,
      editable: cooldown === 0 && !submitting,
      onSubmitEditing: () => void handleCommentSubmit(),
      returnKeyType: 'send' as const,
      style: {
        flex: 1,
        fontFamily: NEUSANS,
        fontSize: 14,
        color: '#31343F',
        paddingVertical: 8,
      },
    }

    return (
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: bottomInset,
          backgroundColor: '#fff',
        }}
      >
        {isAuthenticated ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ProfileAvatarImage
              size={32}
              avatarUrl={profile?.avatarUrl}
              style={{ backgroundColor: '#e5e7eb' }}
            />

            {variant === 'bottomSheet' ? (
              <BottomSheetTextInput
                ref={ref as Ref<ElementRef<typeof BottomSheetTextInput>>}
                {...inputProps}
              />
            ) : (
              <TextInput ref={ref} {...inputProps} />
            )}

            <Pressable
              onPress={() => void handleCommentSubmit()}
              disabled={!canSend}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Send comment"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <AppIcon name="send" size={20} color={canSend ? '#3b82f6' : '#d1d5db'} />
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={promptSignIn} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontFamily: NEUSANS, fontSize: 14, color: '#6b7280' }}>
              Sign in to like or comment{' '}
              <Text style={{ color: '#3b82f6' }}>Sign in</Text>
            </Text>
          </Pressable>
        )}
      </View>
    )
  },
)
