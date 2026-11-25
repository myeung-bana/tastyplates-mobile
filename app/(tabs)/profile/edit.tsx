import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useNhostClient } from '@nhost/react'
import * as Haptics from 'expo-haptics'

import { EditProfileTopNav } from '@/components/profile/EditProfileTopNav'
import { ProfileCityPickerOverlay } from '@/components/profile/ProfileCityPickerOverlay'
import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { ModalSheet } from '@/components/ui/ModalSheet'
import { TextField } from '@/components/ui/TextField'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  DANGER,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import {
  maximumBioLength,
  palateExactLimitMessage,
  profileUpdateFailed,
} from '@/constants/messages'
import { useEditProfileDraft, type DisplayNameDraft } from '@/contexts/EditProfileDraftContext'
import {
  SCREEN_EDIT_PROFILE_DISPLAY_NAME,
  SCREEN_EDIT_PROFILE_PALATES,
  SCREEN_LOGIN,
  SCREEN_SETTINGS_ACCOUNT_SECURITY,
} from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { aboutMeMaxLimit, palateLimit } from '@/constants/validation'
import { useAuth } from '@/hooks/useAuth'
import { invalidateOwnRestaurantUserCache } from '@/hooks/useOwnProfilePresentation'
import { useHideTabBarWhileFocused } from '@/hooks/useHideTabBarWhileFocused'
import { buildDisplayName, detectDisplayNameVariant, DISPLAY_NAME_VARIANTS } from '@/lib/displayNameOptions'
import type { ProfileCitySelection } from '@/lib/googlePlaces'
import { labelForPalateKey } from '@/lib/palateLabels'
import { palateKeysFromProfile } from '@/lib/profilePalateKeys'
import {
  fetchRestaurantUserById,
  updateRestaurantUserProfile,
  type UserProfileLocationSnapshot,
} from '@/services/restaurantUserService'
import { toast } from '@/utils/toast'

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
  name: DisplayNameDraft
  currentLocation: ProfileLocationFormValue | null
  hometownLocation: ProfileLocationFormValue | null
}

/** Field names for the discard prompt (design P7): "Your edits to bio and hometown…". */
function changedFieldLabels(a: FormSnapshot, b: FormSnapshot): string[] {
  const out: string[] = []
  if (a.aboutMe.trim() !== b.aboutMe.trim()) out.push('bio')
  if (JSON.stringify(a.name) !== JSON.stringify(b.name)) out.push('display name')
  if (locationFormKey(a.currentLocation) !== locationFormKey(b.currentLocation)) out.push('current city')
  if (locationFormKey(a.hometownLocation) !== locationFormKey(b.hometownLocation)) out.push('hometown')
  if ([...a.palateKeys].sort().join() !== [...b.palateKeys].sort().join()) out.push('palates')
  return out
}

function joinLabels(items: string[]): string {
  if (items.length <= 1) return items[0] ?? 'your profile'
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** Older accounts have only a display name — split it to seed first / last. */
function seedNames(first: string | null | undefined, last: string | null | undefined, display: string | null | undefined) {
  const f = first?.trim() ?? ''
  const l = last?.trim() ?? ''
  if (f || l) return { firstName: f, lastName: l }
  const parts = (display ?? '').trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
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
    name: s.name,
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
  // `?open=palates` (e.g. "Set your palates" on a restaurant's reading card) jumps to Palates once loaded.
  const { open } = useLocalSearchParams<{ open?: string }>()
  const openedPalatesRef = useRef(false)
  const insets = useSafeAreaInsets()
  const nhost = useNhostClient()
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  // Full-screen editor (design P5 / P5d / P6) — no floating tab bar.
  useHideTabBarWhileFocused()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { selectedPalates, setSelectedPalates, openPalatePicker, nameDraft, setNameDraft } = useEditProfileDraft()
  const [aboutMe, setAboutMe] = useState('')
  const [username, setUsername] = useState('')
  const [currentLocation, setCurrentLocation] = useState<ProfileLocationFormValue | null>(null)
  const [hometownLocation, setHometownLocation] = useState<ProfileLocationFormValue | null>(null)
  const [activeLocationPicker, setActiveLocationPicker] = useState<LocationPickerTarget | null>(
    null,
  )
  const [bioError, setBioError] = useState<string | null>(null)
  const [palateError, setPalateError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const leaveAfterDiscardRef = useRef(false)

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
        const handle = row.username?.trim().replace(/^@/, '') ?? ''
        const seeded = seedNames(row.first_name, row.last_name, row.display_name)
        const name: DisplayNameDraft = {
          ...seeded,
          variant: detectDisplayNameVariant(seeded.firstName, seeded.lastName, row.display_name),
        }
        const current = locationFromApiRow(row.current_location)
        const hometown = locationFromApiRow(row.hometown)

        setAboutMe(bio)
        setSelectedPalates(new Set(keys))
        setNameDraft(name)
        setUsername(handle)
        setCurrentLocation(current)
        setHometownLocation(hometown)
        setActiveLocationPicker(null)

        initialRef.current = {
          aboutMe: bio,
          palateKeys: keys,
          name,
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
      name: nameDraft,
      currentLocation,
      hometownLocation,
    }),
    [aboutMe, selectedPalates, nameDraft, currentLocation, hometownLocation],
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

  useEffect(() => {
    if (loading || open !== 'palates' || openedPalatesRef.current) return
    openedPalatesRef.current = true
    handleOpenPalatePicker()
  }, [handleOpenPalatePicker, loading, open])

  const handleCancel = useCallback(() => {
    if (!isDirty) {
      router.back()
      return
    }
    setDiscardOpen(true)
  }, [isDirty, router])

  const discardFields = initialRef.current ? changedFieldLabels(currentSnapshot, initialRef.current) : []

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
      const payload: Parameters<typeof updateRestaurantUserProfile>[0] = {
        about_me: aboutMe.trim(),
        palates: Array.from(selectedPalates),
      }

      const initial = initialRef.current
      if (initial && JSON.stringify(initial.name) !== JSON.stringify(nameDraft)) {
        payload.first_name = nameDraft.firstName.trim()
        payload.last_name = nameDraft.lastName.trim()
        const display = buildDisplayName(nameDraft.firstName, nameDraft.lastName, nameDraft.variant)
        if (display) payload.display_name = display
      }
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
      setSaving(false)
    }
  }, [
    aboutMe,
    currentLocation,
    doneEnabled,
    hometownLocation,
    nameDraft,
    nhost.auth,
    router,
    selectedPalates,
    user?.id,
  ])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  const displayPreview = buildDisplayName(nameDraft.firstName, nameDraft.lastName, nameDraft.variant)
  const variantHint = DISPLAY_NAME_VARIANTS.find((v) => v.id === nameDraft.variant)?.hint ?? ''

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE_CARD }}>
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
          keyboardVerticalOffset={insets.top + 52}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 40, gap: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 8 }}>
              <View className="flex-row items-baseline justify-between">
                <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING }}>Bio</Text>
                <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
                  {aboutMe.length} / {aboutMeMaxLimit}
                </Text>
              </View>
              <TextField
                accessibilityLabel="Bio"
                value={aboutMe}
                onChangeText={(t) => {
                  setBioError(null)
                  setAboutMe(t)
                }}
                editable={!saving}
                multiline
                height={96}
                placeholder="What do you love to eat?"
                maxLength={aboutMeMaxLimit}
                error={bioError}
              />
            </View>

            {/* Design P5: one bordered group of rows — details, cities, palates. */}
            <View style={{ borderRadius: 12, borderWidth: 1.5, borderColor: BORDER_SUBTLE, overflow: 'hidden' }}>
              <GroupRow
                label="Username"
                value={username ? `@${username}` : '@member'}
                valueColor={TEXT_TERTIARY}
                accessibilityHint="Your username can’t be changed"
                trailing={<AppIcon name="lock" size={16} color={TEXT_TERTIARY} />}
              />
              <GroupRow
                label="Display name"
                value={displayPreview || 'Add your name'}
                valueColor={displayPreview ? TEXT_HEADING : TEXT_TERTIARY}
                trailing={variantHint ? <Text style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_TERTIARY }}>{variantHint}</Text> : null}
                onPress={() => router.push(SCREEN_EDIT_PROFILE_DISPLAY_NAME)}
                disabled={saving}
              />
              <GroupRow
                label="Current city"
                value={currentLocation?.label ?? 'Add your city'}
                valueColor={currentLocation ? TEXT_HEADING : TEXT_TERTIARY}
                onPress={() => handleOpenLocationPicker('current')}
                disabled={saving}
              />
              <GroupRow
                label="Hometown · optional"
                value={hometownLocation?.label ?? 'Add your hometown'}
                valueColor={hometownLocation ? TEXT_HEADING : TEXT_TERTIARY}
                trailing={
                  hometownLocation ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear hometown"
                      hitSlop={10}
                      onPress={() => setHometownLocation(null)}
                      className="active:opacity-60"
                    >
                      <AppIcon name="x-circle" size={18} color={TEXT_TERTIARY} />
                    </Pressable>
                  ) : null
                }
                onPress={() => handleOpenLocationPicker('hometown')}
                disabled={saving}
              />
              <GroupRow label={`Palates · exactly ${palateLimit}`} onPress={handleOpenPalatePicker} disabled={saving} last>
                {selectedPalates.size > 0 ? (
                  <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                    {Array.from(selectedPalates).map((key) => (
                      <View
                        key={key}
                        className="justify-center"
                        style={{ height: 28, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER_SUBTLE }}
                      >
                        <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 13, color: TEXT_HEADING }}>{labelForPalateKey(key)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontFamily: FONT.body, fontSize: 15, color: TEXT_TERTIARY }}>Choose {palateLimit} cuisines</Text>
                )}
              </GroupRow>
            </View>
            {palateError ? (
              <Text style={{ marginTop: -12, fontFamily: FONT.body, fontSize: 13, color: DANGER }}>{palateError}</Text>
            ) : null}

            <Text style={{ marginTop: -2, fontFamily: FONT.body, fontSize: 12, lineHeight: 18, color: TEXT_MUTED }}>
              Current city here is your profile city — separate from the browse city in the top bar. Email, birthdate and
              gender live in{' '}
              <Text
                accessibilityRole="link"
                onPress={() => router.push(SCREEN_SETTINGS_ACCOUNT_SECURITY)}
                style={{ textDecorationLine: 'underline', color: TEXT_HEADING }}
              >
                Settings → Account Security
              </Text>
              .
            </Text>
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

      {/* Design P7: unsaved edits — Discard (dark) or Keep editing (outlined). */}
      <ModalSheet
        visible={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onClosed={() => {
          if (!leaveAfterDiscardRef.current) return
          leaveAfterDiscardRef.current = false
          router.back()
        }}
        accessibilityLabel="Discard changes?"
        contentStyle={{ gap: 16 }}
      >
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 22, lineHeight: 28, color: TEXT_HEADING }}>
            Discard changes?
          </Text>
          <Text style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 21, color: TEXT_MUTED }}>
            Your edits to {joinLabels(discardFields)} haven’t been saved.
          </Text>
        </View>
        <Button
          variant="dark"
          onPress={() => {
            leaveAfterDiscardRef.current = true
            setDiscardOpen(false)
          }}
        >
          Discard
        </Button>
        <Button variant="outline" onPress={() => setDiscardOpen(false)}>
          Keep editing
        </Button>
      </ModalSheet>
    </View>
  )
}

/** One row of the Edit profile group (design P5): small label over the value, chevron when tappable. */
function GroupRow({
  label,
  value,
  valueColor = TEXT_HEADING,
  trailing,
  onPress,
  disabled,
  last = false,
  accessibilityHint,
  children,
}: {
  label: string
  value?: string
  valueColor?: string
  trailing?: ReactNode
  onPress?: () => void
  disabled?: boolean
  last?: boolean
  accessibilityHint?: string
  children?: ReactNode
}): JSX.Element {
  const content = (
    <>
      <View style={{ flex: 1, minWidth: 0, gap: children ? 6 : 4 }}>
        <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>{label}</Text>
        {children ?? (
          <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 20, color: valueColor }}>
            {value}
          </Text>
        )}
      </View>
      {trailing}
      {onPress ? <AppIcon name="chevron-right" size={18} color={TEXT_TERTIARY} /> : null}
    </>
  )
  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: last ? 0 : 1,
    borderBottomColor: BORDER_SUBTLE,
  }
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${label}, ${value ?? ''}`} accessibilityHint={accessibilityHint} style={rowStyle}>
        {content}
      </View>
    )
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      disabled={disabled}
      className="active:bg-[#EFEFF1]"
      style={rowStyle}
    >
      {content}
    </Pressable>
  )
}
