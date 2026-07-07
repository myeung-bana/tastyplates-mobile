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
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import type { UseReviewCommentsResult } from '@/hooks/useReviewComments'

export type ReviewCommentsSheetHandle = {
  present: (options?: { focusComposer?: boolean }) => void
  dismiss: () => void
}

export type ReviewCommentsSheetProps = {
  comments: UseReviewCommentsResult
}

export const ReviewCommentsSheet = forwardRef<ReviewCommentsSheetHandle, ReviewCommentsSheetProps>(
  function ReviewCommentsSheet({ comments }, ref): JSX.Element {
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
          />
        </BottomSheetFooter>
      ),
      [comments, footerBottomInset],
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
        <Text style={styles.sheetTitle}>Comments ({totalCount})</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close comments"
          hitSlop={12}
          onPress={dismiss}
          style={styles.closeButton}
        >
          <AppIcon name="x" size={22} color={TEXT_HEADING} />
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
        handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
        onChange={handleSheetChange}
        onDismiss={() => Keyboard.dismiss()}
      >
        {loading && replies.length === 0 ? (
          <View style={{ padding: 16 }}>
            {listHeader}
            <ReplySkeleton count={4} />
          </View>
        ) : error && replies.length === 0 ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            {listHeader}
            <Text style={{ fontFamily: 'Neusans', color: TEXT_MUTED, textAlign: 'center', marginTop: 24 }}>
              {error}
            </Text>
            <Pressable onPress={() => void loadReplies()} style={{ marginTop: 12 }}>
              <Text style={{ fontFamily: 'Neusans', color: BRAND_PRIMARY }}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <BottomSheetFlatList
            data={replies}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listHeader}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            onRefresh={() => void loadReplies({ pull: true })}
            refreshing={refreshing}
            ListEmptyComponent={
              !loading ? (
                <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                  <Text style={{ fontFamily: 'Neusans', fontSize: 16, fontWeight: '500', color: '#374151' }}>
                    No Comments Yet
                  </Text>
                  <Text style={{ fontFamily: 'Neusans', fontSize: 14, color: '#6b7280', marginTop: 4 }}>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: 'Neusans',
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_HEADING,
  },
  closeButton: {
    padding: 4,
  },
})
