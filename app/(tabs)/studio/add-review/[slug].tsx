import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'

import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  mergeTextInputBodyTypography,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { SCREEN_STUDIO_ADD_REVIEW_SUCCESS, SCREEN_STUDIO_REVIEW_LISTING } from '@/constants/screens'
import { firstSegmentParam } from '@/lib/routeParams'
import type { RestaurantDetailRow } from '@/services/restaurantDetailService'
import { getRestaurantBySlug } from '@/services/restaurantDetailService'
import { createRestaurantReview } from '@/services/studioReviewApi'

type FormValues = {
  title: string
  review: string
}

type BootPhase = 'loading' | 'missing' | 'error' | 'ready'

/**
 * Authoring screen for an existing TP listing slug — submits through `restaurant-reviews/create-review`.
 */
export default function AddReviewWriteScreen(): JSX.Element {
  const params = useLocalSearchParams<{ slug: string | string[] }>()
  const slug = useMemo(() => firstSegmentParam(params.slug).trim(), [params.slug])

  const [busy, setBusy] = useState(false)
  const [restaurant, setRestaurant] = useState<RestaurantDetailRow | null>(null)
  const [phase, setPhase] = useState<BootPhase>('loading')

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { title: '', review: '' },
  })

  const [stars, setStars] = useState<number>(5)

  const loadRestaurant = useCallback(async () => {
    if (!slug.length) {
      setPhase('missing')
      return
    }
    setPhase('loading')
    try {
      const row = await getRestaurantBySlug(slug)
      setRestaurant(row)
      setPhase('ready')
    } catch {
      setRestaurant(null)
      setPhase('error')
    }
  }, [slug])

  useEffect(() => {
    void loadRestaurant()
  }, [loadRestaurant])

  const onSubmitPublish = async (vals: FormValues): Promise<void> => {
    if (!restaurant) return
    if (!vals.review.trim()) {
      Alert.alert('Say something', 'Add a short review paragraph before submitting.')
      return
    }

    try {
      setBusy(true)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      await createRestaurantReview({
        restaurant_uuid: restaurant.uuid,
        title: vals.title.trim().length ? vals.title.trim() : null,
        content: vals.review.trim(),
        rating: stars,
        status: 'approved',
      })

      router.replace({
        pathname: SCREEN_STUDIO_ADD_REVIEW_SUCCESS,
        params: { slug: restaurant.slug },
      })
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert('Could not submit', e instanceof Error ? e.message : 'Create review failed.')
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = handleSubmit(async (vals) => {
    if (!restaurant) return
    if (!vals.review.trim()) {
      Alert.alert(
        'Draft empty',
        'Add at least one sentence — drafts still need content on the backend.',
      )
      return
    }

    try {
      setBusy(true)
      await createRestaurantReview({
        restaurant_uuid: restaurant.uuid,
        title: vals.title.trim().length ? vals.title.trim() : null,
        content: vals.review.trim(),
        rating: stars,
        status: 'draft',
      })
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      router.replace(SCREEN_STUDIO_REVIEW_LISTING)
    } catch (e) {
      Alert.alert('Draft failed', e instanceof Error ? e.message : '')
    } finally {
      setBusy(false)
    }
  })

  if (phase === 'loading') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </SafeAreaView>
    )
  }

  if (phase === 'missing' || phase === 'error') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-base" style={{ color: TEXT_HEADING }}>
          {phase === 'missing'
            ? 'Missing restaurant slug.'
            : 'Could not fetch this listing slug.'}
        </Text>
        <Pressable
          className="mt-6 rounded-full px-10 py-3"
          style={{ backgroundColor: BRAND_PRIMARY }}
          onPress={() => router.back()}
        >
          <Text className="font-semibold text-white">Go back</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const rowData = restaurant
  if (!rowData) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-base" style={{ color: TEXT_HEADING }}>
          Unexpected error loading restaurant metadata.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white px-6" edges={['left', 'right', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>
        <Text className="pt-6 text-xl font-semibold" style={{ color: TEXT_HEADING }}>
          {rowData.title}
        </Text>
        {rowData.listing_street ? (
          <Text className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>
            {rowData.listing_street}
          </Text>
        ) : null}

        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange } }) => (
            <TextInput
              accessibilityLabel="Optional title"
              className="mt-8 rounded-3xl border px-4 py-3 text-[16px]"
              style={mergeTextInputBodyTypography({
                borderColor: BORDER_SUBTLE,
                color: TEXT_HEADING,
                fontWeight: '600',
              })}
              placeholder="Optional headline…"
              placeholderTextColor={TEXT_MUTED}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Text className="mt-10 text-[11px] font-bold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>
          Overall vibe
        </Text>
        <View className="mt-4 flex-row gap-2">
          {Array.from({ length: 5 }, (_, index) => {
            const tier = index + 1
            const filled = stars >= tier
            return (
              <Pressable key={tier} accessibilityRole="button" onPress={() => setStars(tier)}>
                <Ionicons name={filled ? 'star' : 'star-outline'} color={filled ? BRAND_PRIMARY : TEXT_MUTED} size={38} />
              </Pressable>
            )
          })}
        </View>

        <Text className="mt-12 text-[11px] font-bold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>
          Review itself
        </Text>
        <Controller
          control={control}
          name="review"
          render={({ field: { value, onChange } }) => (
            <TextInput
              accessibilityLabel="Review body"
              multiline
              textAlignVertical="top"
              className="mt-3 min-h-[160px] rounded-3xl border px-4 py-3 text-[16px]"
              style={mergeTextInputBodyTypography({
                borderColor: BORDER_SUBTLE,
                color: TEXT_HEADING,
              })}
              placeholder="Share pacing, standout dishes…"
              placeholderTextColor={TEXT_MUTED}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Pressable
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Publish review"
          onPress={handleSubmit((vals) => void onSubmitPublish(vals))}
          className="mt-10 rounded-full px-12 py-4 active:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">Publish live</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save draft"
          disabled={busy}
          className="mt-4 px-12 py-3"
          onPress={() => void saveDraft()}
        >
          <Text className="text-center font-semibold" style={{ color: TEXT_HEADING }}>
            Save draft
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
