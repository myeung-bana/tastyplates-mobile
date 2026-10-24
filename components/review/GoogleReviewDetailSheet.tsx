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
import { FONT } from '@/constants/typography'
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
  const rating = review?.rating != null && review.rating > 0 ? review.rating : null
  const meta = ['Google review', review?.timeLabel?.trim()].filter(Boolean).join(' · ')

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: BORDER_SUBTLE, width: 40, height: 5 }}
      backgroundStyle={{ backgroundColor: SURFACE_CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 20) + 12,
          gap: 16,
        }}
      >
        {review ? (
          <>
            {/* Design R5: dashed "G" avatar marks a Google author, not a Tastyplates profile. */}
            <View className="flex-row items-center" style={{ gap: 10 }}>
              {review.avatarUrl ? (
                <ProfileAvatarImage size={36} avatarUrl={review.avatarUrl} style={{ backgroundColor: SURFACE_FOG }} />
              ) : (
                <View
                  className="items-center justify-center"
                  style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: TEXT_TERTIARY }}
                >
                  <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 11, color: TEXT_MUTED }}>G</Text>
                </View>
              )}
              <Pressable
                accessibilityRole={review.authorUrl?.startsWith('http') ? 'link' : 'none'}
                disabled={!review.authorUrl?.startsWith('http')}
                onPress={openAuthorProfile}
                className="min-w-0 flex-1"
                style={{ gap: 4 }}
              >
                <Text numberOfLines={1} style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: TEXT_HEADING }}>
                  {review.authorName}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
                  {meta}
                </Text>
              </Pressable>
              {rating != null ? (
                <View className="flex-row items-center" accessibilityLabel={`Rated ${rating.toFixed(1)} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Text key={n} style={{ fontSize: 13, marginRight: 1, color: n <= Math.round(rating) ? BRAND_PRIMARY : BORDER_SUBTLE }}>
                      ★
                    </Text>
                  ))}
                  <Text style={{ marginLeft: 6, fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING }}>
                    {rating.toFixed(1)}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 23, color: TEXT_HEADING }}>
              {body || 'No review text.'}
            </Text>

            <Text
              style={{
                fontFamily: FONT.body,
                fontSize: 12,
                lineHeight: 18,
                color: TEXT_MUTED,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: SURFACE_FOG,
                overflow: 'hidden',
              }}
            >
              This is a Google review, so it can’t be liked or commented on in Tastyplates.
            </Text>

            {onViewOnGoogleMaps ? (
              <Pressable
                accessibilityRole="link"
                onPress={onViewOnGoogleMaps}
                className="flex-row items-center justify-center active:opacity-80"
                style={{ height: 52, gap: 8, borderRadius: 999, borderWidth: 1.5, borderColor: BRAND_PRIMARY }}
              >
                <Text style={{ fontFamily: FONT.heading, fontSize: 17, letterSpacing: 0.7, color: BRAND_PRIMARY_DARK }}>
                  Open in Google Maps
                </Text>
                <AppIcon name="external-link" size={16} color={BRAND_PRIMARY_DARK} />
              </Pressable>
            ) : null}
          </>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  )
})
