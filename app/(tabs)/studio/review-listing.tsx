import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Swipeable } from 'react-native-gesture-handler'

import {
  ReviewListingFilterChips,
  type ReviewListingFilter,
} from '@/components/studio/ReviewListingFilterChips'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { studioEditReviewPath } from '@/constants/screens'
import { castHref } from '@/lib/routeParams'
import { useAuth } from '@/hooks/useAuth'
import {
  deleteRestaurantReview,
  fetchMyReviews,
  type RestaurantReviewMine,
  updateRestaurantReview,
} from '@/services/studioReviewApi'

function emptyStateMessage(filter: ReviewListingFilter): string {
  if (filter === 'draft') return 'There are no drafts currently.'
  return 'There are no reviews yet.'
}

function ReviewListRowSkeleton(): JSX.Element {
  return (
    <View
      className="mb-3 rounded-3xl border bg-white px-4 py-4"
      style={{ borderColor: BORDER_SUBTLE }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <View className="mb-3 flex-row items-center justify-between">
        <View className="h-5 w-16 rounded-full bg-gray-200" />
        <View className="h-4 w-4 rounded bg-gray-200" />
      </View>
      <View className="h-5 rounded bg-gray-200" style={{ width: '72%' }} />
      <View className="mt-2 h-4 w-full rounded bg-gray-200" />
      <View className="mt-2 h-4 rounded bg-gray-200" style={{ width: '92%' }} />
      <View className="mt-2 h-4 rounded bg-gray-200" style={{ width: '64%' }} />
    </View>
  )
}

function summarizeStatus(raw: string | null | undefined): string {
  if (!raw) return 'review'
  if (raw === 'approved') return 'live'
  if (raw === 'draft') return 'draft'
  if (raw === 'pending') return 'pending'
  return raw
}

function ReviewSwipeRow(props: {
  row: RestaurantReviewMine
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
          <Text className="text-center text-[11px] font-bold uppercase" style={{ color: BRAND_PRIMARY }}>
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
        <Ionicons name="trash-outline" color="#ffffff" size={22} />
      </Pressable>
    </View>
  )

  const trimmedTitle = props.row.title?.trim() ?? ''

  const statusBadge = summarizeStatus(props.row.status)
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
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row rounded-full px-4 py-1" style={{ backgroundColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: TEXT_MUTED }}>{statusBadge}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
        </View>
        <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }} numberOfLines={2}>
          {trimmedTitle.length > 0 ? trimmedTitle : 'Untitled review'}
        </Text>
        <Text className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_BODY }} numberOfLines={5}>
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
  const { authUser, loading } = useAuth()
  const userId = authUser?.id ?? null

  const [reviews, setReviews] = useState<RestaurantReviewMine[]>([])
  const [fetching, setFetching] = useState(true)
  const [chip, setChip] = useState<ReviewListingFilter>('all')

  const loadReviews = useCallback(async () => {
    if (!userId) return
    setFetching(true)
    try {
      const payload = await fetchMyReviews(userId, { limit: 80 })
      setReviews(payload.reviews)
    } catch {
      setReviews([])
    } finally {
      setFetching(false)
    }
  }, [userId])

  useEffect(() => {
    void loadReviews()
  }, [loadReviews])

  const filtered = useMemo(() => {
    const sorted = [...reviews].sort((a, b) => {
      const al = `${a.updated_at ?? a.created_at ?? ''}`
      const bl = `${b.updated_at ?? b.created_at ?? ''}`
      return bl.localeCompare(al)
    })

    if (chip === 'all') return sorted
    if (chip === 'draft') return sorted.filter((r) => r.status === 'draft' || r.status === 'pending')
    return sorted.filter((r) => r.status === 'approved')
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

  if (!loading && userId == null) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-sm" style={{ color: TEXT_MUTED }}>
          Unexpected — Studio stack redirects guests prior to arriving here.
        </Text>
      </SafeAreaView>
    )
  }

  const isLoading = fetching || loading

  return (
    <SafeAreaView className="flex-1 bg-white px-6" edges={['left', 'right', 'bottom']}>
      <ReviewListingFilterChips active={chip} onChange={setChip} />

      {isLoading ? (
        <ScrollView
          style={{ flex: 1, marginTop: 24 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <ReviewListRowSkeleton key={index} />
          ))}
        </ScrollView>
      ) : (
        <FlashList
          data={filtered}
          style={{ flex: 1, marginTop: 24 }}
          keyExtractor={(review) => review.id}
          ListEmptyComponent={
            <Text className="mt-24 text-center text-sm" style={{ color: TEXT_MUTED }}>
              {emptyStateMessage(chip)}
            </Text>
          }
          renderItem={({ item }) => (
            <ReviewSwipeRow
              row={item}
              onDelete={() => guardedDelete(item.id)}
              onPublishDraft={item.status === 'draft' ? () => publishDraft(item.id) : undefined}
            />
          )}
        />
      )}
    </SafeAreaView>
  )
}
