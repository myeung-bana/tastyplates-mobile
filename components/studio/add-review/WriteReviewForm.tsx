import { useCallback, useMemo, useRef, useState } from 'react'
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

import { HalfStarRating } from '@/components/studio/add-review/HalfStarRating'
import { RecognitionTags } from '@/components/studio/add-review/RecognitionTags'
import { ReviewPhotoGrid } from '@/components/studio/add-review/ReviewPhotoGrid'
import {
  WriteReviewExitSheet,
  type WriteReviewExitSheetHandle,
} from '@/components/studio/add-review/WriteReviewExitSheet'
import { WriteReviewFooter, getWriteReviewFooterHeight } from '@/components/studio/add-review/WriteReviewFooter'
import { WriteReviewTopNav } from '@/components/studio/add-review/WriteReviewTopNav'
import { BORDER_SUBTLE, mergeTextInputBodyTypography } from '@/constants/brand'
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
import { SCREEN_HOME, SCREEN_STUDIO_REVIEW_LISTING } from '@/constants/screens'
import { useUpload } from '@/contexts/UploadContext'
import { useHideTabBarWhileFocused } from '@/hooks/useHideTabBarWhileFocused'
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
  borderColor: BORDER_SUBTLE,
  borderWidth: 1,
  borderRadius: 16,
} as const

export function WriteReviewForm({ restaurant, resolveRestaurantUuid }: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const user = useUserData()
  const uploadCtx = useUpload()
  const exitSheetRef = useRef<WriteReviewExitSheetHandle>(null)

  useHideTabBarWhileFocused()

  const footerHeight = useMemo(() => getWriteReviewFooterHeight(insets), [insets.bottom])
  const scrollBottomPad = footerHeight + 16

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

  const navTitle = useMemo(() => {
    const name = restaurant.name.trim()
    if (!name.length) return 'Write review'
    return name.length > 28 ? `${name.slice(0, 28)}…` : name
  }, [restaurant.name])

  const isDirty = useMemo(
    () =>
      rating !== 0 ||
      title.trim().length > 0 ||
      body.trim().length > 0 ||
      previewUris.length > 0 ||
      recognitions.length > 0,
    [rating, title, body, previewUris.length, recognitions.length],
  )

  const toggleRecognition = useCallback((name: string) => {
    setRecognitions((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  }, [])

  const validate = useCallback((mode: 'approved' | 'draft'): boolean => {
    let ok = true

    if (title.length > reviewTitleMaxLimit) {
      setTitleError(maximumReviewTitle(reviewTitleMaxLimit))
      ok = false
    } else setTitleError('')

    if (previewUris.length > maximumImage) {
      setPhotoError(maximumImageLimit(maximumImage))
      ok = false
    } else if (mode === 'approved' && previewUris.length < minimumImage) {
      setPhotoError(minimumImageLimit(minimumImage))
      ok = false
    } else setPhotoError('')

    if (body.length > reviewDescriptionMaxLimit) {
      setBodyError(maximumReviewDescription(reviewDescriptionMaxLimit))
      ok = false
    } else if (mode === 'approved' && body.trim() === '') {
      setBodyError(requiredDescription)
      ok = false
    } else setBodyError('')

    if (mode === 'draft') {
      setRatingError('')
      return ok
    }

    if (rating === 0) {
      setRatingError(requiredRating)
      ok = false
    } else setRatingError('')

    return ok
  }, [rating, previewUris.length, body, title.length])

  const submit = useCallback(
    async (mode: 'approved' | 'draft') => {
      if (!validate(mode)) return
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
          content: body.trim() || ' ',
          rating: rating || 0,
          images,
          recognitions: recognitions.length ? recognitions : undefined,
          status: mode,
        })

        uploadCtx.completeUpload()
        exitSheetRef.current?.dismiss()

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
      resolveRestaurantUuid,
      pendingPhotos,
      uploadCtx,
      title,
      body,
      rating,
      recognitions,
    ],
  )

  const handleClose = useCallback(() => {
    if (!isDirty) {
      router.replace(SCREEN_HOME)
      return
    }
    exitSheetRef.current?.present()
  }, [isDirty])

  const handleDiscard = useCallback(() => {
    router.replace(SCREEN_HOME)
  }, [])

  const busy = publishing || savingDraft

  return (
    <View className="flex-1 bg-white">
      <WriteReviewTopNav title={navTitle} onClose={handleClose} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 48 : 0}
        style={{ paddingBottom: footerHeight }}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollBottomPad }}
        >
          <ReviewRestaurantHeader restaurant={restaurant} />

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
            <Text className="mb-2 font-neusans text-sm text-[#374151]">
              Tell us about your experience
            </Text>
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

          <RecognitionTags selected={recognitions} onToggle={toggleRecognition} />
        </ScrollView>
      </KeyboardAvoidingView>

      <WriteReviewFooter
        onPublish={() => void submit('approved')}
        publishing={publishing}
        savingDraft={savingDraft}
        insets={insets}
      />

      <WriteReviewExitSheet
        ref={exitSheetRef}
        onDiscard={handleDiscard}
        onSaveDraft={() => void submit('draft')}
        savingDraft={savingDraft}
        busy={busy}
      />
    </View>
  )
}
