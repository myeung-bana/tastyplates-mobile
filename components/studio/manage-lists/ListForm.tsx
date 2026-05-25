/**
 * Shared form for Create List and Edit List.
 * Create uses a centered Spotify-style layout; edit uses the compact field form.
 */
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { Button } from '@/components/ui/Button'

export interface ListFormValues {
  title: string
  description: string
  is_public: boolean
}

interface Props {
  variant?: 'create' | 'edit'
  initialValues?: Partial<ListFormValues>
  submitLabel: string
  submitting: boolean
  onSubmit: (values: ListFormValues) => void
}

function VisibilityPills({
  isPublic,
  onChange,
  centered,
}: {
  isPublic: boolean
  onChange: (isPublic: boolean) => void
  centered?: boolean
}): JSX.Element {
  return (
    <View className={centered ? 'items-center' : undefined}>
      <Text
        className={`mb-3 font-neusans text-sm text-[#374151]${centered ? ' text-center' : ''}`}
      >
        Who can see this list?
      </Text>
      <View className={`flex-row gap-3${centered ? ' justify-center' : ''}`}>
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
              <Feather
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

function CreateListForm({
  submitLabel,
  submitting,
  onSubmit,
}: Pick<Props, 'submitLabel' | 'submitting' | 'onSubmit'>): JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [titleError, setTitleError] = useState<string | null>(null)

  function handleSubmit(): void {
    if (!title.trim()) {
      setTitleError('Give your list a name to continue.')
      return
    }
    setTitleError(null)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onSubmit({ title: title.trim(), description: description.trim(), is_public: isPublic })
  }

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
        <View
          className="mb-8 items-center justify-center rounded-2xl bg-gray-100"
          style={{ width: 200, height: 200 }}
        >
          <Ionicons name="albums-outline" size={72} color="#9ca3af" />
        </View>

        <TextInput
          value={title}
          onChangeText={(v) => {
            setTitle(v)
            if (titleError) setTitleError(null)
          }}
          placeholder="Give your list a name"
          placeholderTextColor="#9ca3af"
          maxLength={100}
          autoFocus
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
          <VisibilityPills isPublic={isPublic} onChange={setIsPublic} centered />
        </View>
      </ScrollView>

      <View className="border-t border-gray-100 bg-white px-6 pb-8 pt-3">
        <Button variant="primary" onPress={handleSubmit} disabled={submitting}>
          {submitting ? 'Creating…' : submitLabel}
        </Button>
      </View>
    </KeyboardAvoidingView>
  )
}

function EditListForm({
  initialValues,
  submitLabel,
  submitting,
  onSubmit,
}: Pick<Props, 'initialValues' | 'submitLabel' | 'submitting' | 'onSubmit'>): JSX.Element {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [isPublic, setIsPublic] = useState(initialValues?.is_public ?? false)
  const [titleError, setTitleError] = useState<string | null>(null)

  function handleSubmit(): void {
    if (!title.trim()) {
      setTitleError('List name is required.')
      return
    }
    setTitleError(null)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onSubmit({ title: title.trim(), description: description.trim(), is_public: isPublic })
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-5">
          <Text className="mb-2 font-neusans text-sm text-[#374151]">List Name</Text>
          <TextInput
            value={title}
            onChangeText={(v) => {
              setTitle(v)
              if (titleError) setTitleError(null)
            }}
            placeholder="Give your list a name"
            maxLength={100}
            className="rounded-[10px] border border-[#797979] px-4 py-3 font-neusans text-base text-[#31343F]"
            style={{ fontSize: 16 }}
            returnKeyType="next"
          />
          <View className="mt-1 flex-row items-center justify-between">
            {titleError ? (
              <Text className="text-xs text-red-600">{titleError}</Text>
            ) : (
              <View />
            )}
            <Text className="font-neusans text-xs text-[#9ca3af]">{title.length}/100</Text>
          </View>
        </View>

        <View className="mb-5">
          <View className="mb-2 flex-row items-center gap-1">
            <Text className="font-neusans text-sm text-[#374151]">Description</Text>
            <Text className="font-neusans text-xs text-[#9ca3af]">(optional)</Text>
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your list"
            maxLength={500}
            multiline
            numberOfLines={3}
            className="rounded-[10px] border border-[#797979] px-4 py-3 font-neusans text-base text-[#31343F]"
            style={{ fontSize: 16, minHeight: 80, textAlignVertical: 'top' }}
          />
          <Text className="mt-1 self-end font-neusans text-xs text-[#9ca3af]">
            {description.length}/500
          </Text>
        </View>

        <View className="mb-6">
          <VisibilityPills isPublic={isPublic} onChange={setIsPublic} />
        </View>
      </ScrollView>

      <View className="border-t border-gray-100 bg-white px-4 pb-8 pt-3">
        <Button variant="primary" onPress={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </View>
    </KeyboardAvoidingView>
  )
}

export function ListForm({
  variant = 'edit',
  initialValues,
  submitLabel,
  submitting,
  onSubmit,
}: Props): JSX.Element {
  if (variant === 'create') {
    return (
      <CreateListForm submitLabel={submitLabel} submitting={submitting} onSubmit={onSubmit} />
    )
  }
  return (
    <EditListForm
      initialValues={initialValues}
      submitLabel={submitLabel}
      submitting={submitting}
      onSubmit={onSubmit}
    />
  )
}
