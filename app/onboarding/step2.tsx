import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import {
  LocationPickerSheet,
  type LocationPickerSheetHandle,
} from '@/components/onboarding/LocationPickerSheet'
import { OnboardingLogo } from '@/components/onboarding/OnboardingLogo'
import { OnboardingStepIndicator } from '@/components/onboarding/OnboardingStepIndicator'
import { getPresetLocationByKey } from '@/constants/locations'
import { SCREEN_LOGIN } from '@/constants/screens'
import { useLocation } from '@/contexts/LocationContext'
import { useAuth } from '@/hooks/useAuth'
import { DEV_MODE } from '@/lib/devMode'
import {
  cityNodeToSavedLocation,
  fetchLocationHierarchy,
  findCityInHierarchy,
  type GetLocationsData,
  type LocationCityNode,
  loadOnboardingDraft,
  mergeOnboardingDraft,
} from '@/services/onboardingService'
import { toast } from '@/utils/toast'

export default function OnboardingStep2(): JSX.Element {
  const router = useRouter()
  const sheetRef = useRef<LocationPickerSheetHandle>(null)
  const { setLocationPreference } = useLocation()
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const [hierarchy, setHierarchy] = useState<GetLocationsData | null>(null)
  const [loadingHi, setLoadingHi] = useState(true)
  const [countryKey, setCountryKey] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<LocationCityNode | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchLocationHierarchy()
        if (cancelled) return
        setHierarchy(data)
        const draft = await loadOnboardingDraft()
        const firstCountry = data.hierarchy.countries[0]?.key ?? null
        let nextCountry = firstCountry
        if (draft.location_key) {
          const city = findCityInHierarchy(data, draft.location_key)
          if (city) {
            setSelectedCity(city)
            nextCountry = city.parentKey
          }
        }
        setCountryKey(nextCountry ?? firstCountry)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not load regions')
      } finally {
        if (!cancelled) setLoadingHi(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const countries = hierarchy?.hierarchy.countries ?? []

  const citiesForCountry = useMemo(() => {
    if (!countryKey) return []
    const c = countries.find((x) => x.key === countryKey)
    return c?.cities ?? []
  }, [countries, countryKey])

  const onContinue = useCallback(async () => {
    if (!selectedCity) {
      toast.error('Choose a city to continue.')
      return
    }
    const country =
      hierarchy?.hierarchy.countries.find((row) => row.key === selectedCity.parentKey) ?? undefined
    const pref = cityNodeToSavedLocation(selectedCity, country)
    await mergeOnboardingDraft({
      location_key: pref.key,
      location_label: pref.label,
    })
    setLocationPreference(pref)
    router.push('/onboarding/step3')
  }, [hierarchy, router, selectedCity, setLocationPreference])

  const onDevSkip = useCallback(async () => {
    const tokyo = getPresetLocationByKey('tokyo')
    if (!tokyo) return
    await mergeOnboardingDraft({ location_key: tokyo.key, location_label: tokyo.label })
    setLocationPreference(tokyo)
    router.push('/onboarding/step3')
  }, [router, setLocationPreference])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  if (!user?.emailVerified) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-gray-600">Verify your email before continuing.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const busy = authLoading || loadingHi

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerClassName="grow px-4 pb-10 pt-4">
        <View className="mb-2 flex-row items-center">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.back()
            }}
            hitSlop={8}
            className="mr-2 rounded-full p-1 active:bg-gray-100"
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-base font-medium text-gray-800">Back</Text>
        </View>

        <OnboardingLogo />
        <OnboardingStepIndicator currentStep={2} />

        <Text className="mb-2 text-lg font-semibold" style={{ color: '#31343F' }}>
          Where are you based?
        </Text>
        <Text className="mb-6 text-base text-gray-600">
          We use this to tune restaurant search and maps near you.
        </Text>

        {busy ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#ff7c0a" />
          </View>
        ) : (
          <>
            <Text className="mb-2 text-sm font-medium text-gray-700">Country</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
              <View className="flex-row flex-wrap gap-2">
                {countries.map((c) => {
                  const on = c.key === countryKey
                  return (
                    <Pressable
                      key={c.key}
                      onPress={() => {
                        setCountryKey(c.key)
                        setSelectedCity(null)
                      }}
                      className={`rounded-full border px-4 py-2 ${on ? 'border-[#ff7c0a] bg-orange-50' : 'border-gray-200 bg-white'}`}
                    >
                      <Text className={`text-sm font-medium ${on ? 'text-[#ff7c0a]' : 'text-gray-700'}`}>
                        {c.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>

            <Text className="mb-2 text-sm font-medium text-gray-700">City</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {citiesForCountry.map((city) => {
                const on = selectedCity?.key === city.key
                return (
                  <Pressable
                    key={city.key}
                    onPress={() => {
                      setSelectedCity(city)
                    }}
                    className={`rounded-full border px-3 py-2 ${on ? 'border-[#ff7c0a] bg-orange-50' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <Text className={`text-sm font-medium ${on ? 'text-[#ff7c0a]' : 'text-gray-800'}`}>
                      {city.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                sheetRef.current?.present()
              }}
              className="mb-8 flex-row items-center justify-center rounded-xl border border-gray-200 py-3 active:bg-gray-50"
            >
              <Ionicons name="globe-outline" size={20} color="#374151" />
              <Text className="ml-2 text-base font-semibold text-gray-800">Browse all regions</Text>
            </Pressable>

            {selectedCity ? (
              <Text className="mb-4 text-center text-sm text-gray-600">
                Selected: <Text className="font-semibold text-gray-900">{selectedCity.label}</Text>
              </Text>
            ) : (
              <Text className="mb-4 text-center text-sm text-gray-500">Tap a city to select it.</Text>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={!selectedCity}
              onPress={() => {
                void onContinue()
              }}
              className="items-center rounded-xl bg-[#ff7c0a] py-4 active:opacity-90 disabled:opacity-50"
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

      <LocationPickerSheet
        ref={sheetRef}
        countries={countries}
        onSelect={(city) => {
          setCountryKey(city.parentKey)
          setSelectedCity(city)
        }}
      />
    </SafeAreaView>
  )
}
