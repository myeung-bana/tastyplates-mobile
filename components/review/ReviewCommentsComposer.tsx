import { forwardRef, type ElementRef, type Ref } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import type { TextInput as RNTextInput } from 'react-native'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { AppIcon } from '@/components/ui/AppIcon'
import { BRAND_PRIMARY } from '@/constants/brand'
import { reviewDescriptionDisplayLimit } from '@/constants/validation'
import { useOwnProfilePresentation } from '@/hooks/useOwnProfilePresentation'
import type { UseReviewCommentsResult } from '@/hooks/useReviewComments'

const NEUSANS = 'Neusans'
const SEND_BUTTON_SIZE = 36
const COMPOSER_INPUT_MIN_HEIGHT = 36
const COMPOSER_INPUT_MAX_HEIGHT = 120

export type ReviewCommentsComposerProps = {
  comments: Pick<
    UseReviewCommentsResult,
    | 'isAuthenticated'
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
      commentText,
      setCommentText,
      cooldown,
      submitting,
      canSend,
      handleCommentSubmit,
      promptSignIn,
    } = comments

    const { avatarUrl } = useOwnProfilePresentation()

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
      multiline: true,
      blurOnSubmit: false,
      returnKeyType: 'default' as const,
      textAlignVertical: 'top' as const,
      style: {
        flex: 1,
        fontFamily: NEUSANS,
        fontSize: 14,
        color: '#31343F',
        paddingVertical: 8,
        minHeight: COMPOSER_INPUT_MIN_HEIGHT,
        maxHeight: COMPOSER_INPUT_MAX_HEIGHT,
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
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ProfileAvatarImage
              size={32}
              avatarUrl={avatarUrl}
              style={{ marginTop: 6, backgroundColor: '#e5e7eb' }}
            />

            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
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
                accessibilityLabel="Submit comment"
                style={{
                  width: SEND_BUTTON_SIZE,
                  height: SEND_BUTTON_SIZE,
                  borderRadius: SEND_BUTTON_SIZE / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: canSend ? BRAND_PRIMARY : '#e5e7eb',
                  marginBottom: 2,
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <AppIcon name="arrow-up" size={18} color={canSend ? '#ffffff' : '#9ca3af'} />
                )}
              </Pressable>
            </View>
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
