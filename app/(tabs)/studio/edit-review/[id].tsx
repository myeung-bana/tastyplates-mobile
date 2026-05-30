import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
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
import { SCREEN_STUDIO_REVIEW_LISTING } from '@/constants/screens'
import { firstSegmentParam } from '@/lib/routeParams'
import { fetchReviewById, updateRestaurantReview } from '@/services/studioReviewApi'

type BootPhase = 'loading' | 'missing' | 'error' | 'ready'

type FormValues = {
  title: string
  review: string
}

/** Edit authored review — PATCH via `restaurant-reviews/update-review`. */
export default function EditReviewScreen(): JSX.Element {
  const raw = useLocalSearchParams<{ id: string | string[] }>()
  const id = useMemo(() => firstSegmentParam(raw.id).trim(), [raw.id])

  const [phase, setPhase] = useState<BootPhase>('loading')
  const [busy, setBusy] = useState(false)
  const [restaurantUuid, setRestaurantUuid] = useState<string | null>(null)
  const [stars, setStars] = useState(5)

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { title: '', review: '' },
  })

  const hydrateReview = useCallback(async () => {
    if (!id.length) {
      setPhase('missing')
      return
    }
    setPhase('loading')
    try {
      const review = await fetchReviewById(id)
      setRestaurantUuid(review.restaurant_uuid)
      reset({
        title: review.title?.trim() ?? '',
        review: review.content?.trim() ?? '',
      })
      setStars(Number.isFinite(Number(review.rating)) ? (review.rating as number) : 4)
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }, [id, reset])

  useEffect(() => {
    void hydrateReview()
  }, [hydrateReview])

  const onSave = handleSubmit(async (vals) => {
    if (!id.length) return
    if (!vals.review.trim()) {
      Alert.alert('Body required', 'Reviews require content even when revising drafts.')
      return
    }

    try {
      setBusy(true)
      await updateRestaurantReview({
        id,
        title: vals.title.trim().length ? vals.title.trim() : null,
        content: vals.review.trim(),
        rating: stars,
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (e) {
      Alert.alert('Update failed', e instanceof Error ? e.message : '')
    } finally {
      setBusy(false)
    }
  })

  const onPublishDraft = async (): Promise<void> => {
    if (!id.length) return
    try {
      setBusy(true)
      await updateRestaurantReview({ id, status: 'approved' })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace(SCREEN_STUDIO_REVIEW_LISTING)
    } catch (e) {
      Alert.alert('Publish failed', e instanceof Error ? e.message : '')
    } finally {
      setBusy(false)
    }
  }

  if (phase === 'loading') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </SafeAreaView>
    )
  }

  if (phase === 'missing' || phase === 'error') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-10">
        <Text className="text-center text-base" style={{ color: TEXT_HEADING }}>
          {phase === 'missing'
            ? 'Missing review identifier.'
            : 'Could not load this review.'}
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white px-6" edges={['left', 'right', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>
        {restaurantUuid ? (
          <Text className="pt-8 text-[11px] font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>
            Restaurant UUID
          </Text>
        ) : null}
        {restaurantUuid ? (
          <Text className="mt-2 text-[13px] font-mono" style={{ color: TEXT_HEADING }}>
            {restaurantUuid}
          </Text>
        ) : null}

        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange } }) => (
            <TextInput
              accessibilityLabel="Title"
              value={value}
              onChangeText={onChange}
              className="mt-8 rounded-3xl border px-4 py-3 text-[16px]"
              style={mergeTextInputBodyTypography({
                borderColor: BORDER_SUBTLE,
                color: TEXT_HEADING,
                fontWeight: '600',
              })}
              placeholder="Optional headline"
              placeholderTextColor={TEXT_MUTED}
            />
          )}
        />

        <Text className="mt-8 text-[11px] font-bold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>
          Score
        </Text>
        <View className="mt-4 flex-row gap-2">
          {Array.from({ length: 5 }, (_, index) => {
            const tier = index + 1
            const filled = stars >= tier
            return (
              <Pressable key={tier} accessibilityRole="button" onPress={() => setStars(tier)}>
                <AppIcon name="star" active={filled} color={filled ? BRAND_PRIMARY : TEXT_MUTED} size={38} />
              </Pressable>
            )
          })}
        </View>

        <Controller
          control={control}
          name="review"
          render={({ field: { value, onChange } }) => (
            <TextInput
              accessibilityLabel="Review body"
              multiline
              textAlignVertical="top"
              className="mt-8 min-h-[180px] rounded-3xl border px-4 py-3 text-[16px]"
              style={mergeTextInputBodyTypography({
                borderColor: BORDER_SUBTLE,
                color: TEXT_HEADING,
              })}
              placeholder="Sharpen wording, pacing, standout dishes..."
              placeholderTextColor={TEXT_MUTED}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Pressable
          disabled={busy}
          className="mt-10 rounded-full px-14 py-4"
          style={{ backgroundColor: BRAND_PRIMARY }}
          onPress={() => void onSave()}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center font-semibold text-white">Save changes</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Publish draft"
          disabled={busy}
          className="mt-4 rounded-full px-14 py-3"
          style={{ borderWidth: 1, borderColor: BRAND_PRIMARY }}
          onPress={() => void onPublishDraft()}
        >
          <Text className="text-center font-semibold" style={{ color: BRAND_PRIMARY }}>
            Publish (force approved status)
          </Text>
        </Pressable>

        <Pressable
          className="mt-6 pb-24"
          onPress={() =>
            Alert.alert(
              'Need to cancel?',
              'Any unsaved changes stay local until you leave this screen manually.',
              [{ text: 'OK', style: 'cancel' }],
            )
          }
        >
          <Text className="text-center text-xs" style={{ color: TEXT_MUTED }}>
            Heads-up — Save applies immediately on the backend.
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
