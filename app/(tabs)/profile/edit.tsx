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

import { EditProfileLocationField } from '@/components/profile/EditProfileLocationField'
import { EditProfilePalateSummary } from '@/components/profile/EditProfilePalateSummary'
import { EditProfileTopNav } from '@/components/profile/EditProfileTopNav'
import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { ProfileCityPickerOverlay } from '@/components/profile/ProfileCityPickerOverlay'
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
import type { ProfileCitySelection } from '@/lib/googlePlaces'
import { pickProfilePhoto } from '@/lib/pickProfilePhoto'
import { palateKeysFromProfile } from '@/lib/profilePalateKeys'
import {
  fetchRestaurantUserById,
  normalizeLegacyProfileAvatar,
  updateRestaurantUserProfile,
  type UserProfileLocationSnapshot,
} from '@/services/restaurantUserService'
import { uploadPickedImage } from '@/lib/uploadPickedImage'
import { toast } from '@/utils/toast'

const AVATAR_SIZE = 112

type LocationPickerTarget = 'current' | 'hometown'

type ProfileLocationFormValue = {
  label: string
  latitude: number
  longitude: number
  googlePlaceId: string | null
  cmsSlug: string | null
}

type FormSnapshot = {
  aboutMe: string
  palateKeys: string[]
  avatarPreview: string | null
  pendingPhotoUri: string | null
  currentLocation: ProfileLocationFormValue | null
  hometownLocation: ProfileLocationFormValue | null
}

function locationFormKey(loc: ProfileLocationFormValue | null): string {
  if (!loc) return ''
  return JSON.stringify({
    label: loc.label.trim(),
    lat: loc.latitude,
    lng: loc.longitude,
    placeId: loc.googlePlaceId ?? '',
    cmsSlug: loc.cmsSlug ?? '',
  })
}

function snapshotKey(s: FormSnapshot): string {
  return JSON.stringify({
    aboutMe: s.aboutMe.trim(),
    palates: [...s.palateKeys].sort(),
    avatar: s.pendingPhotoUri ?? s.avatarPreview ?? '',
    current: locationFormKey(s.currentLocation),
    hometown: locationFormKey(s.hometownLocation),
  })
}

function locationFromApiRow(row: UserProfileLocationSnapshot | null | undefined): ProfileLocationFormValue | null {
  if (!row?.label?.trim()) return null
  const lat = row.latitude
  const lng = row.longitude
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    label: row.label.trim(),
    latitude: lat!,
    longitude: lng!,
    googlePlaceId: row.google_place_id?.trim() || null,
    cmsSlug: row.slug?.trim().toLowerCase() || null,
  }
}

function selectionToFormValue(selection: ProfileCitySelection): ProfileLocationFormValue {
  return {
    label: selection.label,
    latitude: selection.latitude,
    longitude: selection.longitude,
    googlePlaceId: selection.google_place_id?.trim() || null,
    cmsSlug: selection.location_slug?.trim().toLowerCase() || null,
  }
}

export default function EditProfileScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const nhost = useNhostClient()
  const { isAuthenticated, loading: authLoading, user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const { selectedPalates, setSelectedPalates, openPalatePicker } = useEditProfileDraft()
  const [aboutMe, setAboutMe] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<{
    uri: string
    fileName: string
    mimeType: string
  } | null>(null)
  const [username, setUsername] = useState('')
  const [currentLocation, setCurrentLocation] = useState<ProfileLocationFormValue | null>(null)
  const [hometownLocation, setHometownLocation] = useState<ProfileLocationFormValue | null>(null)
  const [activeLocationPicker, setActiveLocationPicker] = useState<LocationPickerTarget | null>(
    null,
  )
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
        const current = locationFromApiRow(row.current_location)
        const hometown = locationFromApiRow(row.hometown)

        setAboutMe(bio)
        setSelectedPalates(new Set(keys))
        setAvatarPreview(avatar)
        setPendingPhoto(null)
        setUsername(handle)
        setCurrentLocation(current)
        setHometownLocation(hometown)
        setActiveLocationPicker(null)

        initialRef.current = {
          aboutMe: bio,
          palateKeys: keys,
          avatarPreview: avatar,
          pendingPhotoUri: null,
          currentLocation: current,
          hometownLocation: hometown,
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
      currentLocation,
      hometownLocation,
    }),
    [aboutMe, selectedPalates, avatarPreview, pendingPhoto, currentLocation, hometownLocation],
  )

  const handleOpenLocationPicker = useCallback((target: LocationPickerTarget) => {
    setActiveLocationPicker(target)
  }, [])

  const handleCloseLocationPicker = useCallback(() => {
    setActiveLocationPicker(null)
  }, [])

  const handleSelectProfileCity = useCallback(
    (selection: ProfileCitySelection) => {
      const value = selectionToFormValue(selection)
      if (activeLocationPicker === 'current') {
        setCurrentLocation(value)
      } else if (activeLocationPicker === 'hometown') {
        setHometownLocation(value)
      }
      setActiveLocationPicker(null)
    },
    [activeLocationPicker],
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
        setUploadingPhoto(true)
        profileImageUrl = await uploadPickedImage(pendingPhoto)
        setUploadingPhoto(false)
      }

      const payload: Parameters<typeof updateRestaurantUserProfile>[0] = {
        about_me: aboutMe.trim(),
        palates: Array.from(selectedPalates),
      }
      if (profileImageUrl) payload.profile_image = profileImageUrl

      const initial = initialRef.current
      if (
        initial &&
        locationFormKey(currentLocation) !== locationFormKey(initial.currentLocation)
      ) {
        payload.current_location = currentLocation
          ? {
              label: currentLocation.label,
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              google_place_id: currentLocation.googlePlaceId,
              location_slug: currentLocation.cmsSlug,
            }
          : null
      }
      if (
        initial &&
        locationFormKey(hometownLocation) !== locationFormKey(initial.hometownLocation)
      ) {
        payload.hometown = hometownLocation
          ? {
              label: hometownLocation.label,
              latitude: hometownLocation.latitude,
              longitude: hometownLocation.longitude,
              google_place_id: hometownLocation.googlePlaceId,
              location_slug: hometownLocation.cmsSlug,
            }
          : null
      }

      await updateRestaurantUserProfile(payload)
      invalidateOwnRestaurantUserCache(user.id)
      await nhost.auth.refreshSession()

      toast.success('Profile updated')
      router.back()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : profileUpdateFailed)
    } finally {
      setUploadingPhoto(false)
      setSaving(false)
    }
  }, [
    aboutMe,
    currentLocation,
    doneEnabled,
    hometownLocation,
    nhost.auth,
    pendingPhoto,
    router,
    selectedPalates,
    user?.id,
  ])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  const previewHandle = username ? `@${username}` : '@member'

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
                  {pendingPhoto?.uri ? (
                    <Image
                      accessibilityIgnoresInvertColors
                      source={{ uri: pendingPhoto.uri }}
                      style={{
                        width: AVATAR_SIZE,
                        height: AVATAR_SIZE,
                        borderRadius: AVATAR_SIZE / 2,
                        backgroundColor: '#e5e7eb',
                      }}
                    />
                  ) : (
                    <ProfileAvatarImage
                      size={AVATAR_SIZE}
                      avatarUrl={avatarPreview}
                      style={{ backgroundColor: '#e5e7eb' }}
                    />
                  )}
                  <View
                    className="absolute -bottom-1 -right-1 items-center justify-center rounded-full p-2"
                    style={{ backgroundColor: BRAND_PRIMARY }}
                  >
                    <AppIcon name="edit-3" size={18} color="#ffffff" />
                  </View>
                </View>
              </Pressable>

              {uploadingPhoto ? (
                <Text className="mt-3 text-xs" style={{ color: TEXT_MUTED }}>
                  Uploading photo…
                </Text>
              ) : null}

              <Text className="mt-4 text-base font-semibold" style={{ color: TEXT_HEADING }}>
                {previewHandle}
              </Text>
            </View>

            <View className="mt-8 px-5">
              <EditProfileLocationField
                label="Where do you currently live"
                helper="Search any city worldwide — not limited to TastyPlates markets."
                valueLabel={currentLocation?.label ?? null}
                onPress={() => handleOpenLocationPicker('current')}
                disabled={saving}
              />
              <EditProfileLocationField
                label="Where is your hometown"
                helper="Optional — share where your food journey started."
                valueLabel={hometownLocation?.label ?? null}
                onPress={() => handleOpenLocationPicker('hometown')}
                disabled={saving}
              />
            </View>

            <View className="mt-3 px-5">
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

      <ProfileCityPickerOverlay
        visible={activeLocationPicker !== null}
        title={
          activeLocationPicker === 'hometown'
            ? 'Where is your hometown'
            : 'Where do you currently live'
        }
        selectedPlaceId={
          activeLocationPicker === 'hometown'
            ? hometownLocation?.googlePlaceId ?? null
            : currentLocation?.googlePlaceId ?? null
        }
        selectedCmsSlug={
          activeLocationPicker === 'hometown'
            ? hometownLocation?.cmsSlug ?? null
            : currentLocation?.cmsSlug ?? null
        }
        onSelectCity={handleSelectProfileCity}
        onClose={handleCloseLocationPicker}
      />
    </View>
  )
}
