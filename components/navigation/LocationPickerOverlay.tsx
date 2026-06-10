import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { FullScreenOverlay } from '@/components/layout/FullScreenOverlay'
import { LocationPickerScrollPanel } from '@/components/navigation/LocationPickerScrollPanel'
import { AppIcon } from '@/components/ui/AppIcon'
import { TEXT_MUTED, mergeTextInputBodyTypography } from '@/constants/brand'
import type { SavedLocationPreference } from '@/constants/locations'
import {
  cityNodeToSavedLocation,
  type GetLocationsData,
  type LocationCityNode,
  type LocationCountryNode,
} from '@/services/onboardingService'

interface LocationPickerOverlayProps {
  hierarchy: GetLocationsData | null
  hierarchyLoading: boolean
  hierarchyError: string | null
  selectedLocation: SavedLocationPreference
  setLocationPreference: (pref: SavedLocationPreference) => void
  onClose: () => void
}

function filterCountriesByKeyword(
  countries: LocationCountryNode[],
  keyword: string,
): LocationCountryNode[] {
  const q = keyword.trim().toLowerCase()
  if (!q) return countries

  return countries
    .map((country) => {
      const countryMatch = country.label.toLowerCase().includes(q)
      const cities = countryMatch
        ? country.cities
        : country.cities.filter((city) => city.label.toLowerCase().includes(q))
      return { ...country, cities }
    })
    .filter((country) => country.cities.length > 0)
}

/** Full-screen location picker — search bar + palate-style city pills. */
export function LocationPickerOverlay({
  hierarchy,
  hierarchyLoading,
  hierarchyError,
  selectedLocation,
  setLocationPreference,
  onClose,
}: LocationPickerOverlayProps): JSX.Element {
  const inputRef = useRef<TextInput>(null)
  const [keyword, setKeyword] = useState('')

  const countries = hierarchy?.hierarchy.countries ?? []

  const filteredCountries = useMemo(
    () => filterCountriesByKeyword(countries, keyword),
    [countries, keyword],
  )

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const clearKeyword = useCallback(() => {
    setKeyword('')
    inputRef.current?.focus()
  }, [])

  const handleClose = useCallback(() => {
    void Haptics.selectionAsync()
    setKeyword('')
    onClose()
  }, [onClose])

  const pickCity = useCallback(
    (city: LocationCityNode, country: LocationCountryNode) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setLocationPreference(cityNodeToSavedLocation(city, country))
      setKeyword('')
      onClose()
    },
    [setLocationPreference, onClose],
  )

  const showFilteredEmpty =
    !hierarchyLoading && !hierarchyError && keyword.trim().length > 0 && filteredCountries.length === 0

  return (
    <FullScreenOverlay onRequestClose={handleClose} keyboardAvoiding>
      <View className="flex-1">
        <View className="flex-row items-center gap-2.5 border-b border-gray-100 px-2 pb-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close location picker"
            hitSlop={12}
            onPress={handleClose}
            className="p-1"
          >
            <AppIcon name="arrow-left" size={22} color="#374151" />
          </Pressable>

          <View className="min-h-[44px] flex-1 flex-row items-center rounded-[14px] bg-gray-100 px-3">
            <AppIcon name="search" size={18} color={TEXT_MUTED} />
            <TextInput
              ref={inputRef}
              style={[
                { flex: 1, marginLeft: 8, marginRight: 4, fontSize: 16 },
                mergeTextInputBodyTypography(),
              ]}
              placeholder="Search cities..."
              placeholderTextColor="#9ca3af"
              value={keyword}
              onChangeText={setKeyword}
              returnKeyType="search"
              autoCapitalize="words"
              autoCorrect={false}
              accessibilityLabel="Search cities by name"
            />
            {keyword.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={10}
                onPress={clearKeyword}
              >
                <AppIcon name="x-circle" size={18} color={TEXT_MUTED} />
              </Pressable>
            )}
          </View>
        </View>

        <View className="flex-1 pt-5">
          <View className="mb-2.5">
            <Text className="font-neusans text-xs font-semibold uppercase tracking-wide text-gray-400">
              Select a city
            </Text>
          </View>

          {showFilteredEmpty ? (
            <View className="py-8">
              <Text className="text-center font-neusans text-sm text-gray-500">
                No cities match your search.
              </Text>
            </View>
          ) : (
            <LocationPickerScrollPanel
              countries={filteredCountries}
              selectedKey={selectedLocation.key}
              loading={hierarchyLoading}
              error={hierarchyError}
              onSelectCity={pickCity}
            />
          )}
        </View>
      </View>
    </FullScreenOverlay>
  )
}
