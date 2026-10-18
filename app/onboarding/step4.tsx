import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { CityPickerField } from '@/components/onboarding/CityPickerField'
import { OnboardingGuard } from '@/components/onboarding/OnboardingGuard'
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold'
import { ProfileCityPickerOverlay } from '@/components/profile/ProfileCityPickerOverlay'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  DANGER,
  SURFACE_CARD,
  TEXT_HEADING,
} from '@/constants/brand'
import { getPresetLocationByKey } from '@/constants/locations'
import { SCREEN_ONBOARDING, SCREEN_ONBOARDING_PALATE } from '@/constants/screens'
import { FONT } from '@/constants/typography'
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

type PickerTarget = 'current' | 'hometown'

/** Step 4 of 5 — current city + hometown (design G6). Both required. */
function CitiesStep(): JSX.Element {
  const router = useRouter()
  const { setLocationPreference } = useLocation()
  const { user } = useAuth()
  const [hierarchy, setHierarchy] = useState<GetLocationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState<OnboardingLocationValue | null>(null)
  const [hometown, setHometown] = useState<OnboardingLocationValue | null>(null)
  const [sameAsCurrent, setSameAsCurrent] = useState(false)
  const [tried, setTried] = useState(false)
  const [picker, setPicker] = useState<PickerTarget | null>(null)

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
        if (!draft.username?.trim()) {
          router.replace(SCREEN_ONBOARDING)
          return
        }
        setHierarchy(data)
        const cur =
          draft.current_location ??
          locationValueFromLegacyDraftKey(draft.location_key, draft.location_label, data) ??
          locationFromProfileSnapshot(row.current_location)
        const home = draft.hometown_location ?? locationFromProfileSnapshot(row.hometown)
        setCurrent(cur)
        setHometown(home)
        setSameAsCurrent(Boolean(cur && home && cur.label === home.label))
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

  // Current city also becomes the browse city for Home and Explore.
  const syncBrowseLocation = useCallback(
    (loc: OnboardingLocationValue) => {
      if (!loc.cmsSlug || !hierarchy) return
      const city = hierarchy.hierarchy.countries
        .flatMap((c) => c.cities)
        .find((c) => c.key.trim().toLowerCase() === loc.cmsSlug)
      if (!city) return
      const country = hierarchy.hierarchy.countries.find((c) => c.key === city.parentKey)
      setLocationPreference(
        enrichSavedLocationFromHierarchy(cityNodeToSavedLocation(city, country), hierarchy),
      )
    },
    [hierarchy, setLocationPreference],
  )

  const bothSet = Boolean(current && hometown)

  const onContinue = useCallback(async () => {
    if (!current || !hometown) {
      setTried(true)
      return
    }
    await mergeOnboardingDraft({
      current_location: current,
      hometown_location: hometown,
      location_key: undefined,
      location_label: undefined,
    })
    syncBrowseLocation(current)
    router.push(SCREEN_ONBOARDING_PALATE)
  }, [current, hometown, router, syncBrowseLocation])

  const onSelectCity = useCallback(
    (selection: ProfileCitySelection) => {
      const value = selectionToLocationValue(selection)
      if (picker === 'current') {
        setCurrent(value)
        if (sameAsCurrent) setHometown({ ...value })
      } else if (picker === 'hometown') {
        setHometown(value)
        setSameAsCurrent(false)
      }
      setPicker(null)
    },
    [picker, sameAsCurrent],
  )

  const toggleSame = useCallback(() => {
    if (sameAsCurrent) {
      setSameAsCurrent(false)
      setHometown(null)
      return
    }
    setSameAsCurrent(true)
    setHometown(current ? { ...current } : null)
  }, [current, sameAsCurrent])

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
    await mergeOnboardingDraft({ current_location: value, hometown_location: value })
    setLocationPreference(tokyo)
    router.push(SCREEN_ONBOARDING_PALATE)
  }, [router, setLocationPreference])

  return (
    <>
      <OnboardingScaffold
        step={4}
        title="Where are you, and where are you from?"
        // Tapping Continue with a missing city shows the inline error instead of disabling.
        ctaDisabled={loading}
        onCta={() => void onContinue()}
        onBack={() => router.back()}
      >
        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color={BRAND_PRIMARY} />
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            <CityPickerField
              label="Where do you currently live"
              value={current?.label ?? null}
              onPress={() => setPicker('current')}
              onClear={() => {
                setCurrent(null)
                setSameAsCurrent(false)
              }}
              helper="Home and Explore will show this city."
              invalid={tried && !current}
            />
            <CityPickerField
              label="Where is your hometown"
              value={hometown?.label ?? null}
              onPress={() => setPicker('hometown')}
              onClear={() => {
                setHometown(null)
                setSameAsCurrent(false)
              }}
              invalid={tried && !hometown}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: sameAsCurrent }}
              onPress={toggleSame}
              className="flex-row items-center active:opacity-80"
              style={{ gap: 10 }}
            >
              <View
                className="items-center justify-center"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: sameAsCurrent ? BRAND_PRIMARY : BORDER_SUBTLE,
                  backgroundColor: sameAsCurrent ? BRAND_PRIMARY : SURFACE_CARD,
                }}
              >
                {sameAsCurrent ? <AppIcon name="check" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_HEADING }}>
                Same as current residence for hometown
              </Text>
            </Pressable>

            {tried && !bothSet ? (
              <View className="flex-row items-center" style={{ gap: 6 }} accessibilityLiveRegion="polite">
                <AppIcon name="alert-circle" size={16} color={DANGER} />
                <Text style={{ flex: 1, fontFamily: FONT.bodyMedium, fontSize: 13, lineHeight: 18, color: DANGER }}>
                  Add both your current city and hometown to continue.
                </Text>
              </View>
            ) : null}

            {DEV_MODE ? (
              <Pressable accessibilityRole="button" onPress={() => void onDevSkip()} className="items-center py-2">
                <Text style={{ fontFamily: FONT.body, fontSize: 14, color: BRAND_PRIMARY }}>
                  DEV: Skip to step 5 (Tokyo)
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </OnboardingScaffold>

      <ProfileCityPickerOverlay
        visible={picker !== null}
        title={picker === 'hometown' ? 'Where is your hometown' : 'Where do you currently live'}
        selectedPlaceId={
          picker === 'hometown' ? (hometown?.googlePlaceId ?? null) : (current?.googlePlaceId ?? null)
        }
        selectedCmsSlug={
          picker === 'hometown' ? (hometown?.cmsSlug ?? null) : (current?.cmsSlug ?? null)
        }
        onSelectCity={onSelectCity}
        onClose={() => setPicker(null)}
      />
    </>
  )
}

export default function OnboardingStep4(): JSX.Element {
  return (
    <OnboardingGuard>
      <CitiesStep />
    </OnboardingGuard>
  )
}
