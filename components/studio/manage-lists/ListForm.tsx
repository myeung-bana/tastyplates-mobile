/**
 * Shared form for Create List (design L2) and Edit List (design L5).
 */
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ListCover } from '@/components/studio/manage-lists/ListCover'
import { ListCoverSheet, type ListCoverOption } from '@/components/studio/manage-lists/ListCoverSheet'
import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  BRAND_PRIMARY_TINT,
  DANGER,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import type { PickedListCoverPhoto } from '@/lib/pickListCoverPhoto'
import { pickListCoverFromCamera, pickListCoverFromLibrary } from '@/lib/pickListCoverPhoto'
import { toast } from '@/utils/toast'

export interface ListFormValues {
  title: string
  description: string
  is_public: boolean
  /** New local photo to upload. */
  pendingCover?: PickedListCoverPhoto
  /** A restaurant photo from the list, used as-is (no upload). */
  coverUrl?: string
  clearDisplayPic?: boolean
}

export interface ListFormInitialValues {
  title?: string
  description?: string
  is_public?: boolean
  display_pic?: string | null
}

interface Props {
  mode?: 'create' | 'edit'
  initialValues?: ListFormInitialValues
  submitLabel: string
  submittingLabel?: string
  submitting: boolean
  onSubmit: (values: ListFormValues) => void
  /** Restaurant photos already in the list (edit only) — "From this list" in the cover sheet. */
  coverOptions?: ListCoverOption[]
  /** Places in the list, so the generated cover matches L3. */
  itemCount?: number
  /** Stable seed for the generated cover colourway. */
  coverSeed?: string
  /** Edit only: "Delete list" at the bottom (asks first). */
  onDelete?: () => void
}

const VISIBILITY = [
  { value: true, label: 'Public', icon: 'globe' as const, hint: 'Public lists show on your profile under Lists.' },
  { value: false, label: 'Private', icon: 'lock' as const, hint: 'Private lists stay in Studio. Only you can see them.' },
]

export function ListForm({
  mode = 'create',
  initialValues,
  submitLabel,
  submittingLabel,
  submitting,
  onSubmit,
  coverOptions = [],
  itemCount = 0,
  coverSeed = 'new-list',
  onDelete,
}: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const isEdit = mode === 'edit'
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  // Public by default (design L2).
  const [isPublic, setIsPublic] = useState(initialValues?.is_public ?? true)
  const [pendingCover, setPendingCover] = useState<PickedListCoverPhoto | null>(null)
  const [pickedUrl, setPickedUrl] = useState<string | null>(null)
  const [clearDisplayPic, setClearDisplayPic] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const savedCoverUrl = initialValues?.display_pic?.trim() || null
  const coverPreviewUri = pendingCover?.uri ?? pickedUrl ?? (clearDisplayPic ? null : savedCoverUrl)
  const hasCustomCover = Boolean(coverPreviewUri)
  const canSubmit = title.trim().length > 0 && !submitting
  const visibility = VISIBILITY.find((v) => v.value === isPublic) ?? VISIBILITY[0]!

  const pick = async (from: 'library' | 'camera'): Promise<void> => {
    setSheetOpen(false)
    try {
      const picked = from === 'library' ? await pickListCoverFromLibrary() : await pickListCoverFromCamera()
      if (!picked) return
      setPendingCover(picked)
      setPickedUrl(null)
      setClearDisplayPic(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not pick photo')
    }
  }

  function handleSubmit(): void {
    if (!title.trim()) return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      is_public: isPublic,
      ...(pendingCover ? { pendingCover } : {}),
      ...(!pendingCover && pickedUrl ? { coverUrl: pickedUrl } : {}),
      ...(clearDisplayPic ? { clearDisplayPic: true } : {}),
    })
  }

  const busyLabel = submittingLabel ?? (isEdit ? 'Saving…' : 'Creating…')

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: SURFACE_CARD }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <ListCover title={title} count={itemCount} imageUrl={coverPreviewUri} seed={coverSeed} size={96} />
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: FONT.heading, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}>
              {isEdit ? 'Cover' : 'New list'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setSheetOpen(true)} hitSlop={6}>
              <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: BRAND_PRIMARY_DARK }}>Change cover</Text>
            </Pressable>
          </View>
        </View>

        <TextField
          label="Name"
          value={title}
          onChangeText={setTitle}
          placeholder="Give your list a name"
          maxLength={100}
          autoFocus={!isEdit}
          returnKeyType="next"
        />

        <TextField
          label="Description · optional"
          value={description}
          onChangeText={setDescription}
          placeholder="What’s this list for?"
          maxLength={500}
          multiline
          height={88}
          style={{ minHeight: 64 }}
        />

        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING }}>Visibility</Text>
          <View className="flex-row" style={{ gap: 8 }} accessibilityRole="radiogroup">
            {VISIBILITY.map((opt) => {
              const on = opt.value === isPublic
              return (
                <Pressable
                  key={opt.label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    void Haptics.selectionAsync()
                    setIsPublic(opt.value)
                  }}
                  className="flex-row items-center justify-center active:opacity-80"
                  style={{
                    flex: 1,
                    height: 44,
                    gap: 8,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: on ? BRAND_PRIMARY : BORDER_SUBTLE,
                    backgroundColor: on ? BRAND_PRIMARY_TINT : SURFACE_CARD,
                  }}
                >
                  <AppIcon name={opt.icon} size={15} color={on ? BRAND_PRIMARY_DARK : TEXT_HEADING} />
                  <Text style={{ fontFamily: FONT.heading, fontSize: 15, color: on ? BRAND_PRIMARY_DARK : TEXT_HEADING }}>
                    {opt.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Text style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 17, color: TEXT_MUTED }}>{visibility.hint}</Text>
        </View>

        {isEdit && onDelete ? (
          <Pressable accessibilityRole="button" onPress={onDelete} className="items-center active:opacity-70" style={{ paddingVertical: 12, marginTop: 8 }}>
            <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 15, color: DANGER }}>Delete list</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 8, borderTopWidth: 1, borderTopColor: BORDER_SUBTLE }}>
        <Button onPress={handleSubmit} loading={submitting} disabled={!canSubmit && !submitting}>
          {submitting ? busyLabel : submitLabel}
        </Button>
      </View>

      <ListCoverSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        options={coverOptions}
        selectedUrl={pickedUrl ?? savedCoverUrl}
        onPickOption={(o) => {
          setPickedUrl(o.imageUrl)
          setPendingCover(null)
          setClearDisplayPic(false)
          setSheetOpen(false)
        }}
        onChooseLibrary={() => void pick('library')}
        onTakePhoto={() => void pick('camera')}
        onUseDefault={
          hasCustomCover
            ? () => {
                setPendingCover(null)
                setPickedUrl(null)
                setClearDisplayPic(true)
                setSheetOpen(false)
              }
            : undefined
        }
      />
    </KeyboardAvoidingView>
  )
}
