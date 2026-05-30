/**
 * Shared centered form for Create List and Edit List (Spotify-style layout).
 */
import { useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'

import { Button } from '@/components/ui/Button'
import type { PickedListCoverPhoto } from '@/lib/pickListCoverPhoto'
import { pickListCoverPhoto } from '@/lib/pickListCoverPhoto'
import { toast } from '@/utils/toast'

export interface ListFormValues {
  title: string
  description: string
  is_public: boolean
  pendingCover?: PickedListCoverPhoto
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
}

function VisibilityPills({
  isPublic,
  onChange,
}: {
  isPublic: boolean
  onChange: (isPublic: boolean) => void
}): JSX.Element {
  return (
    <View className="items-center">
      <Text className="mb-3 text-center font-neusans text-sm text-[#374151]">
        Who can see this list?
      </Text>
      <View className="flex-row justify-center gap-3">
        {([
          { label: 'Private', value: false, icon: 'lock' as const },
          { label: 'Public', value: true, icon: 'globe' as const },
        ]).map((opt) => {
          const isActive = isPublic === opt.value
          return (
            <Pressable
              key={opt.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                void Haptics.selectionAsync()
                onChange(opt.value)
              }}
              className="flex-row items-center gap-2 rounded-[50px] border-2 px-4 py-2.5"
              style={{
                backgroundColor: isActive ? '#31343F' : '#ffffff',
                borderColor: isActive ? '#31343F' : '#e5e7eb',
              }}
            >
              <AppIcon
                name={opt.icon}
                size={14}
                color={isActive ? '#ffffff' : '#31343F'}
              />
              <Text
                className="font-neusans text-sm"
                style={{ color: isActive ? '#ffffff' : '#31343F' }}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function ListForm({
  mode = 'create',
  initialValues,
  submitLabel,
  submittingLabel,
  submitting,
  onSubmit,
}: Props): JSX.Element {
  const isEdit = mode === 'edit'
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [isPublic, setIsPublic] = useState(initialValues?.is_public ?? true)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [pendingCover, setPendingCover] = useState<PickedListCoverPhoto | null>(null)
  const [clearDisplayPic, setClearDisplayPic] = useState(false)

  const savedCoverUrl = initialValues?.display_pic?.trim() || null
  const coverPreviewUri = pendingCover?.uri ?? (clearDisplayPic ? null : savedCoverUrl)
  const hasCover = Boolean(coverPreviewUri)

  function handlePickCover(): void {
    void Haptics.selectionAsync()
    void pickListCoverPhoto()
      .then((picked) => {
        if (!picked) return
        setPendingCover(picked)
        setClearDisplayPic(false)
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Could not pick photo')
      })
  }

  function handleRemoveCover(): void {
    Alert.alert('Remove cover photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setPendingCover(null)
          setClearDisplayPic(true)
        },
      },
    ])
  }

  function handleSubmit(): void {
    if (!title.trim()) {
      setTitleError(isEdit ? 'List name is required.' : 'Give your list a name to continue.')
      return
    }
    setTitleError(null)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      is_public: isPublic,
      ...(pendingCover ? { pendingCover } : {}),
      ...(clearDisplayPic ? { clearDisplayPic: true } : {}),
    })
  }

  const busyLabel = submittingLabel ?? (isEdit ? 'Saving…' : 'Creating…')

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 120,
          alignItems: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasCover ? 'Change list cover photo' : 'Add list cover photo'}
          onPress={handlePickCover}
          onLongPress={hasCover ? handleRemoveCover : undefined}
          className="mb-2 overflow-hidden rounded-2xl bg-gray-100"
          style={{ width: 200, height: 200 }}
        >
          {hasCover && coverPreviewUri ? (
            <Image
              source={{ uri: coverPreviewUri }}
              style={{ width: 200, height: 200 }}
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <AppIcon name="image" size={72} color="#9ca3af" />
            </View>
          )}
          <View
            className="absolute bottom-0 left-0 right-0 items-center bg-black/40 py-2"
            pointerEvents="none"
          >
            <Text className="font-neusans text-xs font-medium text-white">
              {hasCover ? 'Change photo' : 'Add photo'}
            </Text>
          </View>
        </Pressable>
        {hasCover ? (
          <Pressable accessibilityRole="button" onPress={handleRemoveCover} className="mb-6">
            <Text className="font-neusans text-xs text-[#6b7280]">Remove photo</Text>
          </Pressable>
        ) : (
          <View className="mb-8" />
        )}

        <TextInput
          value={title}
          onChangeText={(v) => {
            setTitle(v)
            if (titleError) setTitleError(null)
          }}
          placeholder="Give your list a name"
          placeholderTextColor="#9ca3af"
          maxLength={100}
          autoFocus={!isEdit}
          textAlign="center"
          className="w-full font-neusans font-semibold text-[#31343F]"
          style={{ fontSize: 28, lineHeight: 34, paddingVertical: 8 }}
          returnKeyType="next"
        />
        {titleError ? (
          <Text className="mt-2 text-center font-neusans text-xs text-red-600">{titleError}</Text>
        ) : (
          <Text className="mt-1 font-neusans text-xs text-[#9ca3af]">{title.length}/100</Text>
        )}

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your list"
          placeholderTextColor="#9ca3af"
          maxLength={500}
          multiline
          textAlign="center"
          className="mt-6 w-full font-neusans text-base text-[#31343F]"
          style={{ fontSize: 16, minHeight: 72, textAlignVertical: 'top', paddingVertical: 8 }}
        />
        <Text className="mt-1 font-neusans text-xs text-[#9ca3af]">{description.length}/500</Text>

        <View className="mt-10 w-full max-w-sm">
          <VisibilityPills isPublic={isPublic} onChange={setIsPublic} />
        </View>
      </ScrollView>

      <View className="border-t border-gray-100 bg-white px-6 pb-8 pt-3">
        <Button variant="primary" onPress={handleSubmit} loading={submitting}>
          {submitting ? busyLabel : submitLabel}
        </Button>
      </View>
    </KeyboardAvoidingView>
  )
}
