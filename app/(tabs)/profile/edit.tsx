import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'
import { useNhostClient } from '@nhost/react'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'

import { EditProfilePalateSummary } from '@/components/profile/EditProfilePalateSummary'
import { EditProfileTopNav } from '@/components/profile/EditProfileTopNav'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
  mergeTextInputBodyTypography,
} from '@/constants/brand'
import {
  maximumBioLength,
  palateExactLimitMessage,
  profileUpdateFailed,
} from '@/constants/messages'
import { useEditProfileDraft } from '@/contexts/EditProfileDraftContext'
import { SCREEN_EDIT_PROFILE_PALATES, SCREEN_LOGIN } from '@/constants/screens'
import { aboutMeMaxLimit, palateLimit } from '@/constants/validation'
import { useAuth } from '@/hooks/useAuth'
import { invalidateOwnRestaurantUserCache } from '@/hooks/useOwnProfilePresentation'
import { pickProfilePhoto } from '@/lib/pickProfilePhoto'
import { palateKeysFromProfile } from '@/lib/profilePalateKeys'
import { initialsFromName } from '@/lib/profileFormatting'
import {
  fetchRestaurantUserById,
  normalizeLegacyProfileAvatar,
  updateRestaurantUserProfile,
} from '@/services/restaurantUserService'
import { uploadImageToS3 } from '@/services/uploadService'
import { toast } from '@/utils/toast'

const AVATAR_SIZE = 112

type FormSnapshot = {
  aboutMe: string
  palateKeys: string[]
  avatarPreview: string | null
  pendingPhotoUri: string | null
}

function snapshotKey(s: FormSnapshot): string {
  return JSON.stringify({
    aboutMe: s.aboutMe.trim(),
    palates: [...s.palateKeys].sort(),
    avatar: s.pendingPhotoUri ?? s.avatarPreview ?? '',
  })
}

export default function EditProfileScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const nhost = useNhostClient()
  const { isAuthenticated, loading: authLoading, user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { selectedPalates, setSelectedPalates, openPalatePicker } = useEditProfileDraft()
  const [aboutMe, setAboutMe] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<{
    uri: string
    fileName: string
    mimeType: string
  } | null>(null)
  const [username, setUsername] = useState('')
  const [bioError, setBioError] = useState<string | null>(null)
  const [palateError, setPalateError] = useState<string | null>(null)

  const initialRef = useRef<FormSnapshot | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void (async () => {
      try {
        const row = await fetchRestaurantUserById(user.id)
        if (cancelled) return

        const bio = (row.about_me ?? '').trim()
        const keys = palateKeysFromProfile(row.palates)
        const avatar = normalizeLegacyProfileAvatar(row.avatarUrl, row.profile_image)
        const handle = row.username?.trim().replace(/^@/, '') ?? ''

        setAboutMe(bio)
        setSelectedPalates(new Set(keys))
        setAvatarPreview(avatar)
        setPendingPhoto(null)
        setUsername(handle)

        initialRef.current = {
          aboutMe: bio,
          palateKeys: keys,
          avatarPreview: avatar,
          pendingPhotoUri: null,
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Could not load profile')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  const currentSnapshot = useMemo(
    (): FormSnapshot => ({
      aboutMe,
      palateKeys: Array.from(selectedPalates),
      avatarPreview,
      pendingPhotoUri: pendingPhoto?.uri ?? null,
    }),
    [aboutMe, selectedPalates, avatarPreview, pendingPhoto],
  )

  const isDirty = useMemo(() => {
    if (!initialRef.current) return false
    return snapshotKey(currentSnapshot) !== snapshotKey(initialRef.current)
  }, [currentSnapshot])

  const doneEnabled = isDirty && !saving && !loading

  const handleOpenPalatePicker = useCallback(() => {
    setPalateError(null)
    openPalatePicker()
    router.push(SCREEN_EDIT_PROFILE_PALATES)
  }, [openPalatePicker, router])

  const handleChangePhoto = useCallback(() => {
    void Haptics.selectionAsync()
    void pickProfilePhoto()
      .then((picked) => {
        if (!picked) return
        setPendingPhoto(picked)
        setAvatarPreview(picked.uri)
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Could not pick photo')
      })
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
  }, [isDirty, router])

  const handleSave = useCallback(async () => {
    if (!user?.id || !doneEnabled) return

    setBioError(null)
    setPalateError(null)

    if (aboutMe.length > aboutMeMaxLimit) {
      setBioError(maximumBioLength(aboutMeMaxLimit))
      return
    }
    if (selectedPalates.size !== palateLimit) {
      setPalateError(palateExactLimitMessage(palateLimit))
      return
    }

    setSaving(true)
    try {
      let profileImageUrl: string | undefined
      if (pendingPhoto) {
        const { fileUrl } = await uploadImageToS3({
          uri: pendingPhoto.uri,
          name: pendingPhoto.fileName,
          type: pendingPhoto.mimeType,
        })
        profileImageUrl = fileUrl
      }

      const payload: Parameters<typeof updateRestaurantUserProfile>[0] = {
        about_me: aboutMe.trim(),
        palates: Array.from(selectedPalates),
      }
      if (profileImageUrl) payload.profile_image = profileImageUrl

      await updateRestaurantUserProfile(payload)
      invalidateOwnRestaurantUserCache(user.id)
      await nhost.auth.refreshSession()

      toast.success('Profile updated')
      router.back()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : profileUpdateFailed)
    } finally {
      setSaving(false)
    }
  }, [aboutMe, doneEnabled, nhost.auth, pendingPhoto, router, selectedPalates, user?.id])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  const previewHandle = username ? `@${username}` : '@member'
  const initials = initialsFromName(previewHandle.replace(/^@/, ''))

  return (
    <View className="flex-1 bg-white">
      <EditProfileTopNav
        onCancel={handleCancel}
        onDone={() => {
          void handleSave()
        }}
        doneEnabled={doneEnabled}
        saving={saving}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BRAND_PRIMARY} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 48}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center px-5 pt-6">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
                onPress={handleChangePhoto}
                disabled={saving}
                className="active:opacity-90"
              >
                <View className="relative">
                  {avatarPreview ? (
                    <Image
                      accessibilityIgnoresInvertColors
                      source={{ uri: avatarPreview }}
                      style={{
                        width: AVATAR_SIZE,
                        height: AVATAR_SIZE,
                        borderRadius: AVATAR_SIZE / 2,
                        backgroundColor: '#e5e7eb',
                      }}
                    />
                  ) : (
                    <View
                      className="items-center justify-center rounded-full bg-gray-100"
                      style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
                    >
                      <Text className="text-2xl font-semibold text-gray-500">{initials}</Text>
                    </View>
                  )}
                  <View
                    className="absolute -bottom-1 -right-1 items-center justify-center rounded-full border-2 border-white bg-white p-2 shadow-sm"
                    style={{ elevation: 2 }}
                  >
                    <AppIcon name="edit-3" size={18} color={TEXT_HEADING} />
                  </View>
                </View>
              </Pressable>

              <Pressable
                onPress={handleChangePhoto}
                disabled={saving}
                className="mt-3 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
              >
                <Text className="text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  Change profile photo
                </Text>
              </Pressable>
              <Text className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
                Square crop · max 5 MB
              </Text>

              <Text className="mt-4 text-base font-semibold" style={{ color: TEXT_HEADING }}>
                {previewHandle}
              </Text>
            </View>

            <View className="mt-8 px-5">
              <Text className="mb-2 text-sm font-medium" style={{ color: TEXT_HEADING }}>
                Bio
              </Text>
              <Text className="mb-3 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
                Share your food story — what cuisines you love, memorable meals, or what you look for
                in a restaurant.
              </Text>
              <TextInput
                value={aboutMe}
                onChangeText={(t) => {
                  setBioError(null)
                  setAboutMe(t)
                }}
                editable={!saving}
                multiline
                placeholder="Write something about your taste…"
                placeholderTextColor={TEXT_MUTED}
                maxLength={aboutMeMaxLimit}
                textAlignVertical="top"
                style={mergeTextInputBodyTypography({
                  minHeight: 120,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: bioError ? BRAND_PRIMARY : BORDER_SUBTLE,
                  borderRadius: 12,
                  color: TEXT_BODY,
                })}
              />
              <View className="mt-2 flex-row justify-between">
                {bioError ? (
                  <Text className="text-xs" style={{ color: BRAND_PRIMARY }}>
                    {bioError}
                  </Text>
                ) : (
                  <View />
                )}
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>
                  {aboutMe.length}/{aboutMeMaxLimit}
                </Text>
              </View>
            </View>

            <View className="mt-8 px-5">
              <EditProfilePalateSummary
                selected={selectedPalates}
                onPressEdit={handleOpenPalatePicker}
                disabled={saving}
                error={palateError}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  )
}
