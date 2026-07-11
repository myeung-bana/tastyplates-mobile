import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ElementRef,
} from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { AppIcon } from '@/components/ui/AppIcon'
import { RatingDisplay } from '@/components/ui/RatingDisplay'
import { BRAND_PRIMARY, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { stripHtml } from '@/lib/restaurantDetailUtils'

export type GoogleReviewDetailPayload = {
  authorName: string
  avatarUrl?: string | null
  rating: number | null
  content: string | null
  timeLabel?: string | null
  authorUrl?: string | null
}

export type GoogleReviewDetailSheetHandle = {
  present: (review: GoogleReviewDetailPayload) => void
  dismiss: () => void
}

export type GoogleReviewDetailSheetProps = {
  onViewOnGoogleMaps?: () => void
}

export const GoogleReviewDetailSheet = forwardRef<
  GoogleReviewDetailSheetHandle,
  GoogleReviewDetailSheetProps
>(function GoogleReviewDetailSheet({ onViewOnGoogleMaps }, ref): JSX.Element {
  const insets = useSafeAreaInsets()
  const sheetRef = useRef<ElementRef<typeof BottomSheetModal>>(null)
  const [review, setReview] = useState<GoogleReviewDetailPayload | null>(null)

  const present = useCallback((next: GoogleReviewDetailPayload) => {
    setReview(next)
    sheetRef.current?.present()
  }, [])

  const dismiss = useCallback(() => {
    sheetRef.current?.dismiss()
  }, [])

  useImperativeHandle(ref, () => ({ present, dismiss }), [present, dismiss])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  )

  const openAuthorProfile = () => {
    const url = review?.authorUrl?.trim()
    if (!url?.startsWith('http')) return
    void Linking.openURL(url)
  }

  const body = stripHtml(review?.content ?? '').trim()

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['55%', '85%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 20),
        }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="font-neusans text-lg font-normal" style={{ color: TEXT_HEADING }}>
            Review
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close review"
            hitSlop={12}
            onPress={dismiss}
          >
            <AppIcon name="x" size={22} color={TEXT_HEADING} />
          </Pressable>
        </View>

        {review ? (
          <>
            <View className="mb-4 flex-row items-center gap-3">
              <ProfileAvatarImage size={40} avatarUrl={review.avatarUrl} className="bg-gray-200" />
              <View className="min-w-0 flex-1">
                {review.authorUrl?.startsWith('http') ? (
                  <Pressable accessibilityRole="link" onPress={openAuthorProfile}>
                    <Text className="font-neusans text-base font-medium" style={{ color: TEXT_HEADING }} numberOfLines={1}>
                      {review.authorName}
                    </Text>
                  </Pressable>
                ) : (
                  <Text className="font-neusans text-base font-medium" style={{ color: TEXT_HEADING }} numberOfLines={1}>
                    {review.authorName}
                  </Text>
                )}
                {review.timeLabel ? (
                  <Text className="font-neusans text-sm" style={{ color: TEXT_MUTED }}>
                    {review.timeLabel}
                  </Text>
                ) : null}
              </View>
              <RatingDisplay size="sm" value={review.rating} />
            </View>

            <Text className="font-neusans text-base leading-6" style={{ color: TEXT_BODY }}>
              {body || 'No review text.'}
            </Text>

            <Text className="mt-6 text-center font-neusans text-xs" style={{ color: TEXT_MUTED }}>
              Review from Google
            </Text>

            {onViewOnGoogleMaps ? (
              <Pressable
                accessibilityRole="button"
                onPress={onViewOnGoogleMaps}
                className="mt-3 w-full items-center justify-center rounded-xl border border-gray-300 bg-white py-3 active:opacity-90"
              >
                <Text className="font-neusans text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  View on Google Maps
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  )
})
