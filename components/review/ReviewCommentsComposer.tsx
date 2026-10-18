import { forwardRef, type ElementRef, type Ref } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import type { TextInput as RNTextInput } from 'react-native'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  SURFACE_CARD,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { commentMaxLength } from '@/constants/validation'
import { useOwnProfilePresentation } from '@/hooks/useOwnProfilePresentation'
import type { UseReviewCommentsResult } from '@/hooks/useReviewComments'
import { FONT } from '@/constants/typography'

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
      placeholder: 'Add a comment…',
      placeholderTextColor: TEXT_TERTIARY,
      maxLength: commentMaxLength,
      editable: cooldown === 0 && !submitting,
      multiline: true,
      blurOnSubmit: false,
      returnKeyType: 'default' as const,
      textAlignVertical: 'top' as const,
      style: {
        flex: 1,
        fontFamily: FONT.body,
        fontSize: 15,
        color: TEXT_HEADING,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 18,
        backgroundColor: SURFACE_FOG,
        minHeight: COMPOSER_INPUT_MIN_HEIGHT,
        maxHeight: COMPOSER_INPUT_MAX_HEIGHT,
      },
    }

    return (
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: BORDER_SUBTLE,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: bottomInset,
          backgroundColor: SURFACE_CARD,
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
                  backgroundColor: canSend ? BRAND_PRIMARY : BORDER_SUBTLE,
                  marginBottom: 2,
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <AppIcon name="arrow-up" size={18} color={canSend ? '#ffffff' : TEXT_TERTIARY} />
                )}
              </Pressable>
            </View>
          </View>
        ) : null}
        {isAuthenticated ? (
          // Composer meta (design R3): cooldown after posting, then the character count.
          <View className="flex-row justify-between" style={{ marginTop: 6, paddingLeft: 42 }}>
            <Text
              accessibilityLiveRegion="polite"
              style={{ fontFamily: FONT.body, fontSize: 11, color: cooldown > 0 ? BRAND_PRIMARY : TEXT_TERTIARY }}
            >
              {cooldown > 0 ? `Posted · next comment in ${cooldown}s` : 'Visible to everyone on this review'}
            </Text>
            <Text style={{ fontFamily: FONT.body, fontSize: 11, color: TEXT_TERTIARY }}>
              {commentText.length.toLocaleString()} / {commentMaxLength.toLocaleString()}
            </Text>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={promptSignIn} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>
              Sign in to like and comment{'  '}
              <Text style={{ fontFamily: FONT.bodySemibold, color: BRAND_PRIMARY }}>Sign in</Text>
            </Text>
          </Pressable>
        )}
      </View>
    )
  },
)
