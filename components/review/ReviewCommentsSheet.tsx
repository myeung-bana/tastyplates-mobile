import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type ElementRef,
} from 'react'
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetModal,
} from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps, BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { TextInput } from 'react-native'

import { ReviewCommentsComposer } from '@/components/review/ReviewCommentsComposer'
import { ReplyItem } from '@/components/review/ReplyItem'
import { ReplySkeleton } from '@/components/ui/Skeleton/ReplySkeleton'
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
import { FONT } from '@/constants/typography'
import type { UseReviewCommentsResult } from '@/hooks/useReviewComments'

export type ReviewCommentsSheetHandle = {
  present: (options?: { focusComposer?: boolean }) => void
  dismiss: () => void
}

export type ReviewCommentsSheetProps = {
  comments: UseReviewCommentsResult
  /** Review author, for the composer placeholder ("Add a comment for @jun.eats"). */
  replyToLabel?: string | null
}

export const ReviewCommentsSheet = forwardRef<ReviewCommentsSheetHandle, ReviewCommentsSheetProps>(
  function ReviewCommentsSheet({ comments, replyToLabel }, ref): JSX.Element {
    const insets = useSafeAreaInsets()
    const sheetRef = useRef<ElementRef<typeof BottomSheetModal>>(null)
    const composerRef = useRef<TextInput>(null)
    const focusComposerOnPresentRef = useRef(false)

    /** Fixed height — do not shrink when comment list is short or empty. */
    const snapPoints = useMemo(() => ['90%'], [])
    const footerBottomInset = Math.max(insets.bottom, 12)

    const present = useCallback((options?: { focusComposer?: boolean }) => {
      focusComposerOnPresentRef.current = options?.focusComposer ?? false
      sheetRef.current?.present()
    }, [])

    const dismiss = useCallback(() => {
      Keyboard.dismiss()
      sheetRef.current?.dismiss()
    }, [])

    useImperativeHandle(ref, () => ({ present, dismiss }), [present, dismiss])

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
      ),
      [],
    )

    const handleSheetChange = useCallback((index: number) => {
      if (index >= 0 && focusComposerOnPresentRef.current) {
        focusComposerOnPresentRef.current = false
        setTimeout(() => composerRef.current?.focus(), 350)
      }
    }, [])

    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => (
        <BottomSheetFooter {...props} bottomInset={footerBottomInset}>
          <ReviewCommentsComposer
            ref={composerRef}
            comments={comments}
            variant="bottomSheet"
            bottomInset={0}
            placeholder={replyToLabel ? `Add a comment for ${replyToLabel}` : undefined}
          />
        </BottomSheetFooter>
      ),
      [comments, footerBottomInset, replyToLabel],
    )

    const {
      replies,
      replyLikes,
      replyUserLiked,
      replyLikeBusy,
      loading,
      refreshing,
      error,
      totalCount,
      loadReplies,
      handleReplyLike,
      isAuthenticated,
      promptSignIn,
    } = comments

    const listHeader = (
      <View style={styles.sheetHeader}>
        <Text accessibilityRole="header" style={styles.sheetTitle}>
          Comments <Text style={{ color: TEXT_TERTIARY }}>{totalCount}</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close comments"
          hitSlop={8}
          onPress={dismiss}
          style={styles.closeButton}
        >
          <AppIcon name="x" size={18} color={TEXT_HEADING} />
        </Pressable>
      </View>
    )

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
        handleIndicatorStyle={{ backgroundColor: BORDER_SUBTLE, width: 40, height: 5 }}
        backgroundStyle={{ backgroundColor: SURFACE_CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        onChange={handleSheetChange}
        onDismiss={() => Keyboard.dismiss()}
      >
        {loading && replies.length === 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            {listHeader}
            <ReplySkeleton count={4} />
          </View>
        ) : error && replies.length === 0 ? (
          <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
            {listHeader}
            <Text style={{ fontFamily: FONT.body, color: TEXT_MUTED, textAlign: 'center', marginTop: 24 }}>
              {error}
            </Text>
            <Pressable onPress={() => void loadReplies()} style={{ marginTop: 12 }}>
              <Text style={{ fontFamily: FONT.body, color: BRAND_PRIMARY }}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <BottomSheetFlatList
            data={replies}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listHeader}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
            stickyHeaderIndices={[0]}
            keyboardShouldPersistTaps="handled"
            onRefresh={() => void loadReplies({ pull: true })}
            refreshing={refreshing}
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
        )}
      </BottomSheetModal>
    )
  },
)

const styles = StyleSheet.create({
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingBottom: 12,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
    backgroundColor: SURFACE_CARD,
  },
  sheetTitle: {
    fontFamily: FONT.heading,
    fontSize: 20,
    lineHeight: 26,
    color: TEXT_HEADING,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE_FOG,
  },
})
