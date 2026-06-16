import { useCallback, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { ReviewRestaurantHeader } from '@/components/studio/add-review/ReviewRestaurantHeader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useUserData } from '@nhost/react'

import { Button } from '@/components/ui/Button'
import { ContentGuidelinesReminder } from '@/components/reviews/ContentGuidelinesReminder'
import { HalfStarRating } from '@/components/studio/add-review/HalfStarRating'
import { RecognitionTags } from '@/components/studio/add-review/RecognitionTags'
import { ReviewPhotoGrid } from '@/components/studio/add-review/ReviewPhotoGrid'
import { mergeTextInputBodyTypography } from '@/constants/brand'
import {
  commentDuplicateError,
  commentDuplicateWeekError,
  commentFloodError,
  errorOccurred,
  maximumImageLimit,
  maximumReviewDescription,
  maximumReviewTitle,
  minimumImageLimit,
  requiredDescription,
  requiredRating,
  reviewPublishedSuccess,
  savedAsDraft,
} from '@/constants/messages'
import {
  maximumImage,
  minimumImage,
  reviewDescriptionMaxLimit,
  reviewTitleMaxLimit,
} from '@/constants/validation'
import { SCREEN_STUDIO_REVIEW_LISTING } from '@/constants/screens'
import { useUpload } from '@/contexts/UploadContext'
import { transformUrlsToReviewImages } from '@/lib/reviewImageUtils'
import type { PendingReviewPhoto } from '@/lib/uploadReviewPhotos'
import { uploadReviewPhotos } from '@/lib/uploadReviewPhotos'
import { createRestaurantReview } from '@/services/studioReviewApi'
import { toast } from '@/utils/toast'

export type WriteReviewRestaurant = {
  uuid: string
  name: string
  address: string
  imageUrl?: string | null
}

export type { ReviewRestaurantSummary } from '@/components/studio/add-review/ReviewRestaurantHeader'

type Props = {
  restaurant: WriteReviewRestaurant
  /** Called before create when listing must be created (create route only). */
  resolveRestaurantUuid?: () => Promise<string>
}

const inputBorder = {
  borderColor: '#797979',
  borderWidth: 1,
  borderRadius: 10,
} as const

export function WriteReviewForm({ restaurant, resolveRestaurantUuid }: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const user = useUserData()
  const uploadCtx = useUpload()

  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [recognitions, setRecognitions] = useState<string[]>([])
  const [previewUris, setPreviewUris] = useState<string[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<PendingReviewPhoto[]>([])

  const [ratingError, setRatingError] = useState('')
  const [titleError, setTitleError] = useState('')
  const [bodyError, setBodyError] = useState('')
  const [photoError, setPhotoError] = useState('')

  const [publishing, setPublishing] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)

  const toggleRecognition = useCallback((name: string) => {
    setRecognitions((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  }, [])

  const validate = useCallback((): boolean => {
    let ok = true
    if (rating === 0) {
      setRatingError(requiredRating)
      ok = false
    } else setRatingError('')

    if (previewUris.length < minimumImage) {
      setPhotoError(minimumImageLimit(minimumImage))
      ok = false
    } else if (previewUris.length > maximumImage) {
      setPhotoError(maximumImageLimit(maximumImage))
      ok = false
    } else setPhotoError('')

    if (body.trim() === '') {
      setBodyError(requiredDescription)
      ok = false
    } else if (body.length > reviewDescriptionMaxLimit) {
      setBodyError(maximumReviewDescription(reviewDescriptionMaxLimit))
      ok = false
    } else setBodyError('')

    if (title.length > reviewTitleMaxLimit) {
      setTitleError(maximumReviewTitle(reviewTitleMaxLimit))
      ok = false
    } else setTitleError('')

    return ok
  }, [rating, previewUris.length, body, title.length])

  const submit = useCallback(
    async (mode: 'approved' | 'draft') => {
      if (!validate()) return
      const authorId = user?.id
      if (!authorId) {
        toast.error('User not authenticated')
        return
      }

      if (mode === 'approved') setPublishing(true)
      else setSavingDraft(true)

      try {
        let restaurantUuid = restaurant.uuid
        if (resolveRestaurantUuid) {
          restaurantUuid = await resolveRestaurantUuid()
        }

        const urls = await uploadReviewPhotos(pendingPhotos, uploadCtx)
        const images = transformUrlsToReviewImages(urls)

        await createRestaurantReview({
          restaurant_uuid: restaurantUuid,
          author_id: authorId,
          title: title.trim() || null,
          content: body.trim(),
          rating,
          images,
          recognitions: recognitions.length ? recognitions : undefined,
          status: mode,
        })

        uploadCtx.completeUpload()

        if (mode === 'draft') {
          toast.success(savedAsDraft)
        } else {
          toast.success(reviewPublishedSuccess)
        }
        router.replace(SCREEN_STUDIO_REVIEW_LISTING)
      } catch (e) {
        uploadCtx.resetUpload()
        const msg = e instanceof Error ? e.message : errorOccurred
        if (msg.toLowerCase().includes('duplicate')) toast.error(commentDuplicateError)
        else if (msg.toLowerCase().includes('week')) toast.error(commentDuplicateWeekError)
        else if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('flood'))
          toast.error(commentFloodError)
        else toast.error(msg)
      } finally {
        setPublishing(false)
        setSavingDraft(false)
      }
    },
    [
      validate,
      user?.id,
      restaurant.uuid,
      restaurant.name,
      resolveRestaurantUuid,
      pendingPhotos,
      uploadCtx,
      title,
      body,
      rating,
      recognitions,
    ],
  )

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        <ReviewRestaurantHeader restaurant={restaurant} />

        <HalfStarRating value={rating} onChange={setRating} error={ratingError} />

        <View className="px-4 pb-4">
          <Text className="mb-2 font-neusans text-sm text-[#374151]">Review Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Start with a review title..."
            placeholderTextColor="#797979"
            maxLength={reviewTitleMaxLimit}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            className="px-4 py-3 font-neusans text-base text-[#31343F]"
            style={mergeTextInputBodyTypography({ fontSize: 16, ...inputBorder })}
          />
          <Text
            className={`mt-1 text-right font-neusans text-xs ${title.length > 40 ? 'text-red-500' : 'text-gray-500'}`}
          >
            {title.length}/{reviewTitleMaxLimit}
          </Text>
          {titleError ? (
            <Text className="mt-1 font-neusans text-xs text-red-600">{titleError}</Text>
          ) : null}
        </View>

        <View className="px-4 pb-4">
          <Text className="mb-2 font-neusans text-sm text-[#374151]">Tell us about your experience</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write a review about the food, service or ambiance of the restaurant"
            placeholderTextColor="#797979"
            maxLength={reviewDescriptionMaxLimit}
            multiline
            textAlignVertical="top"
            className="min-h-[120px] px-4 py-3 font-neusans text-base text-[#31343F]"
            style={mergeTextInputBodyTypography({ fontSize: 16, minHeight: 120, ...inputBorder })}
          />
          <Text
            className={`mt-1 text-right font-neusans text-xs ${body.length > 1000 ? 'text-red-500' : 'text-gray-500'}`}
          >
            {body.length}/{reviewDescriptionMaxLimit}
          </Text>
          {bodyError ? (
            <Text className="mt-1 font-neusans text-xs text-red-600">{bodyError}</Text>
          ) : null}
        </View>

        <ReviewPhotoGrid
          previewUris={previewUris}
          pending={pendingPhotos}
          onChange={(previews, pending) => {
            setPreviewUris(previews)
            setPendingPhotos(pending)
            setPhotoError('')
          }}
          error={photoError}
        />

        <RecognitionTags selected={recognitions} onToggle={toggleRecognition} />

        <View className="px-4 pb-2">
          <ContentGuidelinesReminder />
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 flex-row gap-3 border-t border-gray-100 bg-white px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Button
          variant="primary"
          className="flex-1"
          loading={publishing}
          disabled={savingDraft}
          onPress={() => void submit('approved')}
        >
          Create Review
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          loading={savingDraft}
          disabled={publishing}
          onPress={() => void submit('draft')}
        >
          Save as Draft
        </Button>
      </View>
    </KeyboardAvoidingView>
  )
}
