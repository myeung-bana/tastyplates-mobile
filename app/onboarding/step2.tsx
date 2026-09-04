import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'

import { EditProfileLocationField } from '@/components/profile/EditProfileLocationField'
import { ProfileCityPickerOverlay } from '@/components/profile/ProfileCityPickerOverlay'
import { OnboardingTopNav } from '@/components/onboarding/OnboardingTopNav'
import { getPresetLocationByKey } from '@/constants/locations'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_LOGIN } from '@/constants/screens'
import { useLocation } from '@/contexts/LocationContext'
import { useAuth } from '@/hooks/useAuth'
import { DEV_MODE } from '@/lib/devMode'
import type { ProfileCitySelection } from '@/lib/googlePlaces'
import {
  locationFromProfileSnapshot,
  locationValueFromLegacyDraftKey,
  selectionToLocationValue,
} from '@/lib/onboardingLocation'
import {
  cityNodeToSavedLocation,
  enrichSavedLocationFromHierarchy,
  fetchLocationHierarchy,
  loadOnboardingDraft,
  mergeOnboardingDraft,
  type GetLocationsData,
  type OnboardingLocationValue,
} from '@/services/onboardingService'
import { fetchRestaurantUserById } from '@/services/restaurantUserService'
import { toast } from '@/utils/toast'

type LocationPickerTarget = 'current' | 'hometown'

export default function OnboardingStep2(): JSX.Element {
  const router = useRouter()
  const { setLocationPreference } = useLocation()
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const [hierarchy, setHierarchy] = useState<GetLocationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<OnboardingLocationValue | null>(null)
  const [hometownLocation, setHometownLocation] = useState<OnboardingLocationValue | null>(null)
  const [activePicker, setActivePicker] = useState<LocationPickerTarget | null>(null)
  const draftUsernameRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const [data, draft, row] = await Promise.all([
          fetchLocationHierarchy(),
          loadOnboardingDraft(),
          fetchRestaurantUserById(user.id),
        ])
        if (cancelled) return

        setHierarchy(data)
        draftUsernameRef.current = draft.username?.trim() || null

        if (!draft.username?.trim()) {
          router.replace('/onboarding/step1')
          return
        }

        let current =
          draft.current_location ??
          locationValueFromLegacyDraftKey(draft.location_key, draft.location_label, data) ??
          locationFromProfileSnapshot(row.current_location)

        let hometown = draft.hometown_location ?? locationFromProfileSnapshot(row.hometown)

        setCurrentLocation(current)
        setHometownLocation(hometown)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not load locations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router, user?.id])

  const syncBrowseLocation = useCallback(
    (loc: OnboardingLocationValue | null) => {
      if (!loc?.cmsSlug || !hierarchy) return
      const city = hierarchy.hierarchy.countries
        .flatMap((c) => c.cities)
        .find((c) => c.key.trim().toLowerCase() === loc.cmsSlug)
      if (!city) return
      const country = hierarchy.hierarchy.countries.find((c) => c.key === city.parentKey)
      const pref = enrichSavedLocationFromHierarchy(
        cityNodeToSavedLocation(city, country),
        hierarchy,
      )
      setLocationPreference(pref)
    },
    [hierarchy, setLocationPreference],
  )

  const onContinue = useCallback(async () => {
    if (!currentLocation) {
      toast.error('Choose where you currently live to continue.')
      return
    }
    if (!hometownLocation) {
      toast.error('Choose your hometown to continue.')
      return
    }

    await mergeOnboardingDraft({
      current_location: currentLocation,
      hometown_location: hometownLocation,
      location_key: undefined,
      location_label: undefined,
    })
    syncBrowseLocation(currentLocation)
    router.push('/onboarding/step3')
  }, [currentLocation, hometownLocation, router, syncBrowseLocation])

  const onDevSkip = useCallback(async () => {
    const tokyo = getPresetLocationByKey('tokyo')
    if (!tokyo) return
    const value: OnboardingLocationValue = {
      label: tokyo.label,
      latitude: tokyo.coordinates?.latitude ?? 35.6764,
      longitude: tokyo.coordinates?.longitude ?? 139.65,
      googlePlaceId: null,
      cmsSlug: tokyo.key,
    }
    await mergeOnboardingDraft({
      current_location: value,
      hometown_location: value,
    })
    setLocationPreference(tokyo)
    router.push('/onboarding/step3')
  }, [router, setLocationPreference])

  const handleSelectCity = useCallback(
    (selection: ProfileCitySelection) => {
      const value = selectionToLocationValue(selection)
      if (activePicker === 'current') {
        setCurrentLocation(value)
      } else if (activePicker === 'hometown') {
        setHometownLocation(value)
      }
      setActivePicker(null)
    },
    [activePicker],
  )

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  if (!user?.emailVerified) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base" style={{ color: TEXT_MUTED }}>
            Verify your email before continuing.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const busy = authLoading || loading

  return (
    <View className="flex-1 bg-white">
      <OnboardingTopNav title="Set Location" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="grow px-5 pb-10 pt-6" keyboardShouldPersistTaps="handled">
        <Text className="mb-2 text-[21px] font-semibold" style={{ color: TEXT_HEADING }}>
          Where do you live?
        </Text>
        <Text className="mb-6 text-base leading-relaxed" style={{ color: TEXT_MUTED }}>
          Helps personalize restaurants near you. Search any city worldwide.
        </Text>

        {busy ? (
          <View className="items-center py-12">
            <ActivityIndicator color={BRAND_PRIMARY} />
          </View>
        ) : (
          <>
            <EditProfileLocationField
              label="Where do you currently live"
              valueLabel={currentLocation?.label ?? null}
              onPress={() => setActivePicker('current')}
            />
            <EditProfileLocationField
              label="Where is your hometown"
              valueLabel={hometownLocation?.label ?? null}
              onPress={() => setActivePicker('hometown')}
            />

            {currentLocation && hometownLocation === null ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setHometownLocation({ ...currentLocation })}
                className="mb-6 active:opacity-80"
              >
                <Text className="text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  Same as current residence for hometown
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={!currentLocation || !hometownLocation}
              onPress={() => {
                void onContinue()
              }}
              className="items-center rounded-xl py-4 active:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Text className="text-base font-semibold text-white">Continue</Text>
            </Pressable>

            {DEV_MODE ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void onDevSkip()
                }}
                className="mt-4 items-center py-2"
              >
                <Text className="text-sm text-orange-600">DEV: Skip to step 3 (Tokyo)</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>

      <ProfileCityPickerOverlay
        visible={activePicker !== null}
        title={
          activePicker === 'hometown' ? 'Where is your hometown' : 'Where do you currently live'
        }
        selectedPlaceId={
          activePicker === 'hometown'
            ? hometownLocation?.googlePlaceId ?? null
            : currentLocation?.googlePlaceId ?? null
        }
        selectedCmsSlug={
          activePicker === 'hometown'
            ? hometownLocation?.cmsSlug ?? null
            : currentLocation?.cmsSlug ?? null
        }
        onSelectCity={handleSelectCity}
        onClose={() => setActivePicker(null)}
      />
    </View>
  )
}
