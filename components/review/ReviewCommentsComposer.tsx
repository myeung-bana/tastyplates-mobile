import { forwardRef, type ElementRef, type Ref } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import type { TextInput as RNTextInput } from 'react-native'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
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

const SEND_BUTTON_SIZE = 34
/** Faded brand orange for the inactive send button (design R3). */
const SEND_DISABLED = '#FFB070'
const COMPOSER_INPUT_MIN_HEIGHT = 41
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
  placeholder?: string
}

export const ReviewCommentsComposer = forwardRef<RNTextInput, ReviewCommentsComposerProps>(
  function ReviewCommentsComposer(
    { comments, variant = 'default', bottomInset = 12, placeholder = 'Add a comment…' },
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
      placeholder,
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
        minWidth: 0,
        paddingTop: 11,
        paddingBottom: 11,
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
          gap: 6,
          paddingBottom: bottomInset,
          backgroundColor: SURFACE_CARD,
        }}
      >
        {isAuthenticated ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <ProfileAvatarImage
              size={32}
              avatarUrl={avatarUrl}
              style={{ marginBottom: 6, backgroundColor: SURFACE_FOG, borderWidth: 1, borderColor: BORDER_SUBTLE }}
            />

            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 6,
                minHeight: 44,
                borderRadius: 22,
                borderWidth: 1.5,
                borderColor: BRAND_PRIMARY,
                paddingLeft: 16,
                paddingRight: 4,
              }}
            >
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
                accessibilityState={{ disabled: !canSend }}
                style={{
                  width: SEND_BUTTON_SIZE,
                  height: SEND_BUTTON_SIZE,
                  borderRadius: SEND_BUTTON_SIZE / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: canSend ? BRAND_PRIMARY : SEND_DISABLED,
                  marginBottom: 3,
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <AppIcon name="arrow-up" size={18} color="#ffffff" />
                )}
              </Pressable>
            </View>
          </View>
        ) : null}
        {isAuthenticated ? (
          // Composer meta (design R3): cooldown after posting, then the character count.
          <View className="flex-row justify-between" style={{ paddingLeft: 42 }}>
            <Text
              accessibilityLiveRegion="polite"
              style={{ fontFamily: FONT.body, fontSize: 12, color: cooldown > 0 ? BRAND_PRIMARY_DARK : TEXT_MUTED }}
            >
              {cooldown > 0 ? `Posted · next comment in ${cooldown}s` : 'Visible to everyone on this review'}
            </Text>
            <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
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
