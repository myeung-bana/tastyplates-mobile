import { useCallback, useMemo, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'
import { FONT } from '@/constants/typography'
import { openLegalPage } from '@/lib/legalLinks'
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
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY_DARK,
  BRAND_PRIMARY_TINT,
  DANGER,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
  mergeTextInputBodyTypography,
} from '@/constants/brand'
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
  imageMBLimit,
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
  /** Google place not listed yet (design W4): shows the "New to Tastyplates" note. */
  isNewPlace?: boolean
}

/** "a rating, review text and a photo" → natural list. */
function joinMissing(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function FieldLabel({ label, hint, count }: { label: string; hint: string; count?: string }): JSX.Element {
  return (
    <View className="flex-row items-baseline justify-between" style={{ marginBottom: 8 }}>
      <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING }}>
        {label} <Text style={{ fontFamily: FONT.body, color: TEXT_TERTIARY }}>· {hint}</Text>
      </Text>
      {count ? <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_TERTIARY }}>{count}</Text> : null}
    </View>
  )
}

const inputBorder = {
  borderColor: BORDER_SUBTLE,
  borderWidth: 1.5,
  borderRadius: 12,
} as const

export function WriteReviewForm({ restaurant, resolveRestaurantUuid, isNewPlace = false }: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const user = useUserData()
  const uploadCtx = useUpload()
  const exitSheetRef = useRef<WriteReviewExitSheetHandle>(null)

  useHideTabBarWhileFocused()


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

  const missing = useMemo(
    () =>
      [!rating && 'a rating', !body.trim() && 'review text', previewUris.length === 0 && 'a photo'].filter(
        (x): x is string => Boolean(x),
      ),
    [rating, body, previewUris.length],
  )
  const missingMessage = missing.length ? `To publish, add ${joinMissing(missing)}.` : null
  const footerHeight = useMemo(
    () => getWriteReviewFooterHeight(insets, Boolean(missingMessage)),
    [insets, missingMessage],
  )
  const scrollBottomPad = footerHeight + 16

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
        // Publish and draft both land on Manage Reviews (design W5), not the success screen.
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

          {isNewPlace ? (
            <View
              className="flex-row"
              style={{
                marginHorizontal: 16,
                marginBottom: 16,
                gap: 10,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#FFE2C7',
                backgroundColor: BRAND_PRIMARY_TINT,
              }}
            >
              <AppIcon name="info" size={16} color={BRAND_PRIMARY_DARK} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING }}>New to Tastyplates</Text>
                <Text style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 17, color: TEXT_MUTED }}>
                  This place is added to Tastyplates when you publish or save a draft — not before.
                </Text>
              </View>
            </View>
          ) : null}

          <View className="px-4 pb-5">
            <FieldLabel label="Rating" hint="required to publish" count={rating ? (rating / 2).toFixed(1) : undefined} />
            <HalfStarRating value={rating} onChange={setRating} error={ratingError} />
          </View>

          <View className="px-4 pb-5">
            <FieldLabel label="Title" hint="optional" count={`${title.length}/${reviewTitleMaxLimit}`} />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Sum it up in a line"
              placeholderTextColor={TEXT_TERTIARY}
              maxLength={reviewTitleMaxLimit}
              accessibilityLabel="Review title"
              style={mergeTextInputBodyTypography({ fontSize: 16, color: TEXT_HEADING, paddingHorizontal: 16, paddingVertical: 14, ...inputBorder })}
            />
            {titleError ? (
              <Text style={{ marginTop: 6, fontFamily: FONT.body, fontSize: 12, color: DANGER }}>{titleError}</Text>
            ) : null}
          </View>

          <View className="px-4 pb-5">
            <FieldLabel label="Review" hint="required to publish" count={`${body.length}/${reviewDescriptionMaxLimit}`} />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="The food, the service, the room — what should people know?"
              placeholderTextColor={TEXT_TERTIARY}
              maxLength={reviewDescriptionMaxLimit}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Review text"
              style={mergeTextInputBodyTypography({ fontSize: 16, color: TEXT_HEADING, minHeight: 140, paddingHorizontal: 16, paddingVertical: 14, ...inputBorder })}
            />
            {bodyError ? (
              <Text style={{ marginTop: 6, fontFamily: FONT.body, fontSize: 12, color: DANGER }}>{bodyError}</Text>
            ) : null}
            <Pressable
              accessibilityRole="link"
              onPress={() => void openLegalPage('content-guidelines')}
              hitSlop={6}
              style={{ alignSelf: 'flex-start', marginTop: 8 }}
            >
              <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: BRAND_PRIMARY_DARK }}>Writing Guidelines</Text>
            </Pressable>
          </View>

          <View className="pb-2">
            <View className="px-4">
              <FieldLabel label="Photos" hint="required to publish" count={`${previewUris.length}/${maximumImage}`} />
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
            <Text style={{ paddingHorizontal: 16, fontFamily: FONT.body, fontSize: 12, color: TEXT_TERTIARY }}>
              {minimumImage}–{maximumImage} photos · {imageMBLimit} MB each
            </Text>
          </View>

          <View className="pt-4">
            <View className="px-4">
              <FieldLabel label="Recognition" hint="optional" />
            </View>
            <RecognitionTags selected={recognitions} onToggle={toggleRecognition} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <WriteReviewFooter
        onPublish={() => void submit('approved')}
        onSaveDraft={() => void submit('draft')}
        publishing={publishing}
        savingDraft={savingDraft}
        insets={insets}
        disabled={missing.length > 0}
        missingMessage={missingMessage}
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
