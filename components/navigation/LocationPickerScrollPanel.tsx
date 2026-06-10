import { Pressable, ScrollView, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import type { LocationCityNode, LocationCountryNode } from '@/services/onboardingService'

const pillBase = 'rounded-full border'

interface LocationPickerScrollPanelProps {
  countries: LocationCountryNode[]
  selectedKey: string
  loading: boolean
  error: string | null
  onSelectCity: (city: LocationCityNode, country: LocationCountryNode) => void
}

/**
 * Scrollable country sections with pill-shaped city selectors — palate picker parity.
 */
export function LocationPickerScrollPanel({
  countries,
  selectedKey,
  loading,
  error,
  onSelectCity,
}: LocationPickerScrollPanelProps): JSX.Element {
  if (loading) {
    return (
      <View className="py-8">
        <Text className="text-center font-neusans text-sm text-gray-500">Loading cities…</Text>
      </View>
    )
  }

  if (error?.length) {
    return (
      <View className="py-8">
        <Text className="text-center font-neusans text-sm text-red-600">{error}</Text>
      </View>
    )
  }

  if (countries.length === 0) {
    return (
      <View className="py-8">
        <Text className="text-center font-neusans text-sm text-gray-500">No cities match your search.</Text>
      </View>
    )
  }

  const selectedKeyNorm = selectedKey.trim().toLowerCase()

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: 8,
        paddingBottom: 32,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {countries.map((country) => (
        <View key={country.key} className="mb-5 w-full">
          <Text className="mb-2 font-neusans text-xs font-semibold uppercase tracking-wide text-gray-500">
            {country.label}
          </Text>

          <View className="w-full flex-row flex-wrap gap-2">
            {country.cities.map((city) => {
              const isOn = city.key.trim().toLowerCase() === selectedKeyNorm
              return (
                <Pressable
                  key={city.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isOn }}
                  accessibilityLabel={`Select ${city.label}`}
                  onPress={() => {
                    void Haptics.selectionAsync()
                    onSelectCity(city, country)
                  }}
                  className={`flex-row items-center gap-2 ${pillBase} px-3 py-2 ${
                    isOn ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text
                    className={`font-neusans text-sm font-medium ${
                      isOn ? 'text-orange-600' : 'text-gray-800'
                    }`}
                  >
                    {city.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  )
}
