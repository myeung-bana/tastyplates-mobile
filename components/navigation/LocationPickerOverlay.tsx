import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { FullScreenOverlay } from '@/components/layout/FullScreenOverlay'
import { LocationPickerScrollPanel } from '@/components/navigation/LocationPickerScrollPanel'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
  mergeTextInputBodyTypography,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import type { SavedLocationPreference } from '@/constants/locations'
import { filterCountriesByKeyword } from '@/lib/filterLocationCountries'
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
        <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
          <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 24, lineHeight: 30, color: TEXT_HEADING }}>
            Browse city
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close city picker"
            hitSlop={12}
            onPress={handleClose}
            className="p-1"
          >
            <AppIcon name="x" size={22} color={TEXT_HEADING} />
          </Pressable>
        </View>
        <View className="flex-row items-center" style={{ paddingBottom: 4 }}>
          <View
            className="flex-1 flex-row items-center"
            style={{ height: 48, borderRadius: 12, backgroundColor: SURFACE_FOG, paddingHorizontal: 12 }}
          >
            <AppIcon name="search" size={18} color={TEXT_MUTED} />
            <TextInput
              ref={inputRef}
              style={[
                { flex: 1, marginLeft: 8, marginRight: 4, fontSize: 16 },
                mergeTextInputBodyTypography(),
              ]}
              placeholder="Search cities"
              placeholderTextColor={TEXT_TERTIARY}
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
            <Text style={{ fontFamily: FONT.heading, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}>
              Cities
            </Text>
          </View>

          {showFilteredEmpty ? (
            <View className="py-8">
              <Text className="text-center text-sm text-gray-500 font-body">
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
