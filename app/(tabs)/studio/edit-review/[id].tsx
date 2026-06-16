import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'

import { EditProfileTopNav } from '@/components/profile/EditProfileTopNav'
import { HalfStarRating } from '@/components/studio/add-review/HalfStarRating'
import { ReviewPhotoGrid } from '@/components/studio/add-review/ReviewPhotoGrid'
import { ReviewRestaurantHeader } from '@/components/studio/add-review/ReviewRestaurantHeader'
import type { ReviewRestaurantSummary } from '@/components/studio/add-review/ReviewRestaurantHeader'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  mergeTextInputBodyTypography,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { useUpload } from '@/contexts/UploadContext'
import { firstSegmentParam } from '@/lib/routeParams'
import {
  normalizeReviewImageOrder,
  parseReviewImages,
  transformUrlsToReviewImages,
  type ReviewImage,
} from '@/lib/reviewImageUtils'
import type { PendingReviewPhoto } from '@/lib/uploadReviewPhotos'
import { uploadReviewPhotos } from '@/lib/uploadReviewPhotos'
import {
  getRestaurantByUuid,
  restaurantDisplayAddress,
} from '@/services/restaurantDetailService'
import { fetchReviewById, updateRestaurantReview } from '@/services/studioReviewApi'

type BootPhase = 'loading' | 'missing' | 'error' | 'ready'

type FormValues = {
  title: string
  review: string
}

type FormSnapshot = {
  title: string
  review: string
  rating: number
  savedImageUrls: string[]
  pendingUris: string[]
}

function snapshotKey(s: FormSnapshot): string {
  return JSON.stringify({
    title: s.title.trim(),
    review: s.review.trim(),
    rating: s.rating,
    saved: [...s.savedImageUrls].sort(),
    pending: [...s.pendingUris].sort(),
  })
}

/** Edit authored review — PATCH via `restaurant-reviews/update-review`. */
export default function EditReviewScreen(): JSX.Element {
  const insets = useSafeAreaInsets()
  const uploadCtx = useUpload()
  const raw = useLocalSearchParams<{ id: string | string[] }>()
  const id = useMemo(() => firstSegmentParam(raw.id).trim(), [raw.id])

  const [phase, setPhase] = useState<BootPhase>('loading')
  const [saving, setSaving] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<ReviewRestaurantSummary | null>(null)
  const [rating, setRating] = useState(0)
  const [savedImages, setSavedImages] = useState<ReviewImage[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<PendingReviewPhoto[]>([])

  const initialRef = useRef<FormSnapshot | null>(null)

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: { title: '', review: '' },
  })

  const titleValue = watch('title')
  const reviewValue = watch('review')

  const previewUris = useMemo(
    () => [...savedImages.map((img) => img.url), ...pendingPhotos.map((p) => p.uri)],
    [savedImages, pendingPhotos],
  )

  const hydrateReview = useCallback(async () => {
    if (!id.length) {
      setPhase('missing')
      return
    }
    setPhase('loading')
    try {
      const review = await fetchReviewById(id)
      const images = parseReviewImages(review.images)
      const ratingValue = Number.isFinite(Number(review.rating)) ? (review.rating as number) : 0
      const title = review.title?.trim() ?? ''
      const body = review.content?.trim() ?? ''

      setReviewStatus(review.status ?? null)
      setSavedImages(images)
      setPendingPhotos([])
      setRating(ratingValue)
      reset({ title, review: body })

      initialRef.current = {
        title,
        review: body,
        rating: ratingValue,
        savedImageUrls: images.map((img) => img.url),
        pendingUris: [],
      }

      try {
        const row = await getRestaurantByUuid(review.restaurant_uuid)
        setRestaurant({
          name: row.title,
          address: restaurantDisplayAddress(row),
          imageUrl: row.featured_image_url,
        })
      } catch {
        setRestaurant({
          name: 'Restaurant',
          address: '',
          imageUrl: null,
        })
      }

      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }, [id, reset])

  useEffect(() => {
    void hydrateReview()
  }, [hydrateReview])

  const currentSnapshot = useMemo(
    (): FormSnapshot => ({
      title: titleValue,
      review: reviewValue,
      rating,
      savedImageUrls: savedImages.map((img) => img.url),
      pendingUris: pendingPhotos.map((p) => p.uri),
    }),
    [titleValue, reviewValue, rating, savedImages, pendingPhotos],
  )

  const isDirty = useMemo(() => {
    if (!initialRef.current) return false
    return snapshotKey(currentSnapshot) !== snapshotKey(initialRef.current)
  }, [currentSnapshot])

  const doneEnabled = isDirty && !saving && !unpublishing && phase === 'ready'

  const onPhotoChange = useCallback((previews: string[], pending: PendingReviewPhoto[]) => {
    setPendingPhotos(pending)
    setSavedImages((prev) => prev.filter((img) => previews.includes(img.url)))
  }, [])

  const handleCancel = useCallback(() => {
    if (!isDirty) {
      router.back()
      return
    }
    Alert.alert('Discard changes?', 'Your edits will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ])
  }, [isDirty])

  const handleSave = handleSubmit(async (vals) => {
    if (!id.length || !doneEnabled) return
    if (!vals.review.trim()) {
      Alert.alert('Body required', 'Reviews require content even when revising drafts.')
      return
    }

    try {
      setSaving(true)
      const newUrls = await uploadReviewPhotos(pendingPhotos, uploadCtx)
      const newImages = transformUrlsToReviewImages(newUrls)
      const images = normalizeReviewImageOrder([...savedImages, ...newImages])

      await updateRestaurantReview({
        id,
        title: vals.title.trim().length ? vals.title.trim() : null,
        content: vals.review.trim(),
        rating,
        images,
      })

      uploadCtx.completeUpload()
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (e) {
      uploadCtx.resetUpload()
      Alert.alert('Update failed', e instanceof Error ? e.message : '')
    } finally {
      setSaving(false)
    }
  })

  const onUnpublish = useCallback(() => {
    if (!id.length) return
    Alert.alert(
      'Unpublish review?',
      'This review will be moved to drafts and hidden from the public feed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpublish',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setUnpublishing(true)
                await updateRestaurantReview({ id, status: 'draft' })
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                router.back()
              } catch (e) {
                Alert.alert('Unpublish failed', e instanceof Error ? e.message : '')
              } finally {
                setUnpublishing(false)
              }
            })()
          },
        },
      ],
    )
  }, [id])

  if (phase === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={BRAND_PRIMARY} />
      </View>
    )
  }

  if (phase === 'missing' || phase === 'error') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-10">
        <Text className="text-center text-base" style={{ color: TEXT_HEADING }}>
          {phase === 'missing' ? 'Missing review identifier.' : 'Could not load this review.'}
        </Text>
      </View>
    )
  }

  const isPublished = reviewStatus === 'approved'

  return (
    <View className="flex-1 bg-white">
      <EditProfileTopNav
        title="Edit review"
        onCancel={handleCancel}
        onDone={() => {
          void handleSave()
        }}
        doneEnabled={doneEnabled}
        saving={saving}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 48}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {restaurant ? <ReviewRestaurantHeader restaurant={restaurant} /> : null}

          <View className="px-4 pt-4">
            <Controller
              control={control}
              name="title"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  accessibilityLabel="Title"
                  value={value}
                  onChangeText={onChange}
                  className="rounded-2xl border px-4 py-3 text-[16px]"
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

            <View className="mt-6">
              <HalfStarRating value={rating} onChange={setRating} />
            </View>

            <Controller
              control={control}
              name="review"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  accessibilityLabel="Review body"
                  multiline
                  textAlignVertical="top"
                  className="mt-6 min-h-[180px] rounded-2xl border px-4 py-3 text-[16px]"
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
          </View>

          <View className="mt-4">
            <ReviewPhotoGrid
              previewUris={previewUris}
              pending={pendingPhotos}
              leadingSavedCount={savedImages.length}
              onChange={onPhotoChange}
            />
          </View>

          {isPublished ? (
            <View className="px-4 pt-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Unpublish review"
                disabled={saving || unpublishing}
                className="rounded-full border px-14 py-3"
                style={{ borderColor: BRAND_PRIMARY, opacity: saving || unpublishing ? 0.6 : 1 }}
                onPress={onUnpublish}
              >
                {unpublishing ? (
                  <ActivityIndicator color={BRAND_PRIMARY} />
                ) : (
                  <Text className="text-center font-semibold" style={{ color: BRAND_PRIMARY }}>
                    Unpublish
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
