import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'

import { ProfileReviewsTabPanel } from '@/components/profile/ProfileReviewsTabPanel'
import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { TEXT_BODY, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_REVIEW_VIEWER } from '@/constants/screens'
import {
  fetchRestaurantUserByUsername,
  isRestaurantUserRouteId,
} from '@/services/restaurantUserService'

/** Full list of approved reviews for `[userId]` (UUID or username segment). */
export default function PublicProfileReviewsListScreen(): JSX.Element {
  const raw = useLocalSearchParams<{ userId: string | string[] }>()
  const userSeg =
    typeof raw.userId === 'string' ? raw.userId.trim().replace(/^@/, '') : raw.userId?.[0]?.trim() ?? ''

  const [authorUuid, setAuthorUuid] = useState<string | null>(
    userSeg && isRestaurantUserRouteId(userSeg) ? userSeg : null,
  )
  const [resolveError, setResolveError] = useState<string | null>(null)

  useEffect(() => {
    if (!userSeg) {
      setResolveError('Missing profile.')
      setAuthorUuid(null)
      return
    }

    if (isRestaurantUserRouteId(userSeg)) {
      setAuthorUuid(userSeg)
      setResolveError(null)
      return
    }

    let cancelled = false
    setResolveError(null)
    setAuthorUuid(null)

    void (async () => {
      try {
        const ru = await fetchRestaurantUserByUsername(userSeg)
        if (!cancelled) {
          setAuthorUuid(ru.id)
          setResolveError(null)
        }
      } catch {
        if (!cancelled) {
          setAuthorUuid(null)
          setResolveError('We could not find this profile.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userSeg])

  if (!userSeg) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen options={{ headerShown: false }} />
        <ReviewDetailTopNav title="Reviews" />
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: TEXT_MUTED }}>Invalid profile link.</Text>
        </View>
      </View>
    )
  }

  if (resolveError) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen options={{ headerShown: false }} />
        <ReviewDetailTopNav title="Reviews" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base" style={{ color: TEXT_BODY }}>
            {resolveError}
          </Text>
        </View>
      </View>
    )
  }

  if (!authorUuid) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen options={{ headerShown: false }} />
        <ReviewDetailTopNav title="Reviews" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <ReviewDetailTopNav title="Reviews" />
      <ProfileReviewsTabPanel
        userId={authorUuid}
        onPressReview={(reviewId) =>
          router.push({
            pathname: SCREEN_REVIEW_VIEWER,
            params: { reviewId },
          })
        }
      />
    </View>
  )
}
