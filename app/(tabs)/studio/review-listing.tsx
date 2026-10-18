import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { FlashList } from '@shopify/flash-list'
import { useFocusEffect } from '@react-navigation/native'
import { useAccessToken } from '@nhost/react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Swipeable } from 'react-native-gesture-handler'
import { AppIcon } from '@/components/ui/AppIcon'

import { ReviewListingCreateRow } from '@/components/studio/ReviewListingCreateRow'
import { RatingDisplay } from '@/components/ui/RatingDisplay'
import {
  ReviewListingFilterChips,
  type ReviewListingFilter,
} from '@/components/studio/ReviewListingFilterChips'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  BRAND_PRIMARY_TINT,
  SURFACE_FOG,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { errorOccurred } from '@/constants/messages'
import { studioEditReviewPath } from '@/constants/screens'
import { castHref } from '@/lib/routeParams'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { useSession } from '@/hooks/useSession'
import {
  deleteRestaurantReview,
  fetchAllMyReviews,
  type RestaurantReviewMine,
  updateRestaurantReview,
} from '@/services/studioReviewApi'
import { toast } from '@/utils/toast'

function emptyStateMessage(filter: ReviewListingFilter): string {
  if (filter === 'draft') return 'There are no drafts currently.'
  if (filter === 'all') return 'You haven’t written any reviews yet.'
  return 'There are no published reviews yet.'
}

function ReviewListRowSkeleton(): JSX.Element {
  return (
    <View
      className="mb-3 rounded-3xl border bg-white px-4 py-4"
      style={{ borderColor: BORDER_SUBTLE }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <View className="mb-2 flex-row justify-end">
        <View className="h-4 w-10 rounded bg-gray-200" />
      </View>
      <View className="mb-1 h-3 rounded bg-gray-200" style={{ width: '48%' }} />
      <View className="h-5 rounded bg-gray-200" style={{ width: '72%' }} />
      <View className="mt-2 h-4 w-full rounded bg-gray-200" />
      <View className="mt-2 h-4 rounded bg-gray-200" style={{ width: '92%' }} />
      <View className="mt-2 h-4 rounded bg-gray-200" style={{ width: '64%' }} />
    </View>
  )
}

function resolveRestaurantLabel(row: RestaurantReviewMine): string {
  const title = stripHtml(row.restaurant?.title ?? '').trim()
  if (title.length > 0) return title
  return 'Restaurant'
}

function ReviewSwipeRow(props: {
  row: RestaurantReviewMine
  chip: ReviewListingFilter
  onDelete: () => Promise<void>
  onPublishDraft?: () => Promise<void>
}): JSX.Element {
  const rightAction = (): JSX.Element => (
    <View className="mb-3 ml-4 flex-row items-stretch gap-3">
      {props.onPublishDraft ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Publish draft"
          className="h-full justify-center rounded-2xl border px-6"
          style={{ borderColor: BRAND_PRIMARY, backgroundColor: '#fff8f3' }}
          onPress={() => void props.onPublishDraft?.()}
        >
          <Text className="text-center text-[11px] uppercase font-body-bold" style={{ color: BRAND_PRIMARY }}>
            Publish
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete review"
        className="h-full justify-center rounded-2xl bg-red-600 px-5"
        onPress={() =>
          Alert.alert('Delete review', 'This soft-deletes the review.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => void props.onDelete() },
          ])
        }
      >
        <AppIcon name="trash-2" color="#ffffff" size={22} />
      </Pressable>
    </View>
  )

  const trimmedTitle = props.row.title?.trim() ?? ''
  const restaurantLabel = resolveRestaurantLabel(props.row)
  const isDraft = props.row.status === 'draft' || props.row.status === 'pending'

  return (
    <Swipeable renderRightActions={rightAction}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync()
          router.push(castHref(studioEditReviewPath(props.row.id)))
        }}
        className="mb-3 rounded-3xl border bg-white px-4 py-4 active:bg-gray-50"
        style={{ borderColor: BORDER_SUBTLE }}
      >
        <View className="mb-2 flex-row justify-end">
          {props.row.rating != null ? (
            <RatingDisplay value={props.row.rating} size="sm" />
          ) : (
            <Text className="text-xs font-body" style={{ color: TEXT_MUTED }}>
              —
            </Text>
          )}
        </View>
        <View
          style={{
            alignSelf: 'flex-start',
            marginBottom: 6,
            paddingVertical: 3,
            paddingHorizontal: 8,
            borderRadius: 50,
            backgroundColor: isDraft ? SURFACE_FOG : BRAND_PRIMARY_TINT,
          }}
        >
          <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 11, color: isDraft ? TEXT_MUTED : BRAND_PRIMARY_DARK }}>
            {isDraft ? 'Draft' : 'Published'}
          </Text>
        </View>
        <Text
          className="mb-1 text-sm font-body-semibold"
          style={{ color: BRAND_PRIMARY }}
          numberOfLines={1}
        >
          {restaurantLabel}
        </Text>
        <Text className="text-base font-body-semibold" style={{ color: TEXT_HEADING }} numberOfLines={2}>
          {trimmedTitle.length > 0 ? trimmedTitle : 'Untitled review'}
        </Text>
        <Text className="mt-2 text-sm leading-relaxed font-body" style={{ color: TEXT_BODY }} numberOfLines={5}>
          {props.row.content ?? '—'}
        </Text>
      </Pressable>
    </Swipeable>
  )
}

/**
 * Bearer `restaurant-reviews/get-user-reviews` for the signed-in author.
 */
export default function ReviewListingScreen(): JSX.Element {
  const { authUser, loading, isReady } = useSession()
  const accessToken = useAccessToken()
  const userId = authUser?.id ?? null

  const [reviews, setReviews] = useState<RestaurantReviewMine[]>([])
  const [fetching, setFetching] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [chip, setChip] = useState<ReviewListingFilter>('all')

  const loadReviews = useCallback(async () => {
    if (!isReady || !userId || !accessToken) {
      if (isReady && !accessToken) {
        setReviews([])
        setFetching(false)
      }
      if (isReady && !userId) {
        setReviews([])
        setFetching(false)
      }
      return
    }

    setFetching(true)
    setLoadError(null)
    try {
      const rows = await fetchAllMyReviews(userId)
      setReviews(rows)
    } catch (e) {
      const message = e instanceof Error ? e.message : errorOccurred
      setReviews([])
      setLoadError(message)
      toast.error(message)
    } finally {
      setFetching(false)
    }
  }, [accessToken, isReady, userId])

  useEffect(() => {
    void loadReviews()
  }, [loadReviews])

  useFocusEffect(
    useCallback(() => {
      void loadReviews()
    }, [loadReviews]),
  )

  const filtered = useMemo(() => {
    const sorted = [...reviews].sort((a, b) => {
      const al = `${a.updated_at ?? a.created_at ?? ''}`
      const bl = `${b.updated_at ?? b.created_at ?? ''}`
      return bl.localeCompare(al)
    })

    if (chip === 'draft') return sorted.filter((r) => r.status === 'draft' || r.status === 'pending')
    if (chip === 'live') return sorted.filter((r) => r.status === 'approved')
    return sorted
  }, [chip, reviews])

  const guardedDelete = async (id: string): Promise<void> => {
    try {
      await deleteRestaurantReview(id)
      await loadReviews()
    } catch (e) {
      Alert.alert('Delete failed', e instanceof Error ? e.message : 'Try again.')
    }
  }

  const publishDraft = async (id: string): Promise<void> => {
    try {
      await updateRestaurantReview({ id, status: 'approved' })
      await loadReviews()
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e) {
      Alert.alert('Publish failed', e instanceof Error ? e.message : '')
    }
  }

  if (isReady && userId == null) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-sm font-body" style={{ color: TEXT_MUTED }}>
          Unexpected — Studio stack redirects guests prior to arriving here.
        </Text>
      </SafeAreaView>
    )
  }

  const isLoading = !isReady || fetching || loading

  return (
    <SafeAreaView className="flex-1 bg-white px-6" edges={['left', 'right', 'bottom']}>
      <ReviewListingFilterChips active={chip} onChange={setChip} />

      {loadError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadReviews()}
          className="mt-3 rounded-xl bg-red-50 px-3 py-2"
        >
          <Text className="text-xs text-red-600 font-body">{loadError}</Text>
          <Text className="mt-1 text-xs text-red-700 font-body-semibold">Tap to retry</Text>
        </Pressable>
      ) : null}

      {isLoading ? (
        <ScrollView
          style={{ flex: 1, marginTop: 24 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <ReviewListingCreateRow />
          {Array.from({ length: 5 }).map((_, index) => (
            <ReviewListRowSkeleton key={index} />
          ))}
        </ScrollView>
      ) : (
        <FlashList
          data={filtered}
          style={{ flex: 1, marginTop: 24 }}
          estimatedItemSize={140}
          keyExtractor={(review) => review.id}
          ListHeaderComponent={<ReviewListingCreateRow />}
          ListEmptyComponent={
            <Text className="mt-24 text-center text-sm font-body" style={{ color: TEXT_MUTED }}>
              {emptyStateMessage(chip)}
            </Text>
          }
          renderItem={({ item }) => (
            <ReviewSwipeRow
              row={item}
              chip={chip}
              onDelete={() => guardedDelete(item.id)}
              onPublishDraft={item.status === 'draft' ? () => publishDraft(item.id) : undefined}
            />
          )}
        />
      )}
    </SafeAreaView>
  )
}
