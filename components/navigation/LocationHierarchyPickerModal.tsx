import { useCallback, useMemo, useState, type RefObject } from 'react'
import { Image, Pressable, Text, TextInput, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import * as Haptics from 'expo-haptics'

import {
  BORDER_SUBTLE,
  mergeTextInputBodyTypography,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import type { SavedLocationPreference } from '@/constants/locations'
import {
  cityNodeToSavedLocation,
  type GetLocationsData,
  type LocationCityNode,
} from '@/services/onboardingService'

type Props = {
  sheetRef: RefObject<BottomSheetModal | null>
  hierarchy: GetLocationsData | null
  hierarchyLoading: boolean
  hierarchyError: string | null
  selectedLocation: SavedLocationPreference
  setLocationPreference: (pref: SavedLocationPreference) => void
}

/** Gorhom city picker sheet — rendered by {@link LocationProvider} (same pattern as cuisine search). */
export function LocationHierarchyPickerModal({
  sheetRef,
  hierarchy,
  hierarchyLoading,
  hierarchyError,
  selectedLocation,
  setLocationPreference,
}: Props): JSX.Element {
  const [search, setSearch] = useState('')

  const countries = hierarchy?.hierarchy.countries ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return countries
    return countries
      .map((c) => ({
        ...c,
        cities: c.cities.filter((city) => city.label.toLowerCase().includes(q)),
      }))
      .filter((c) => c.cities.length > 0)
  }, [countries, search])

  const snapPoints = useMemo(() => ['70%', '92%'], [])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  )

  const pickCity = useCallback(
    (city: LocationCityNode) => {
      const country = hierarchy?.hierarchy.countries.find((row) => row.key === city.parentKey)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setLocationPreference(cityNodeToSavedLocation(city, country))
      setSearch('')
      sheetRef.current?.dismiss()
    },
    [hierarchy?.hierarchy.countries, setLocationPreference, sheetRef],
  )

  const onDismissSheet = useCallback(() => {
    void Haptics.selectionAsync()
    setSearch('')
  }, [])

  const selectedKeyNorm = selectedLocation.key.trim().toLowerCase()

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={onDismissSheet}
      keyboardBlurBehavior="restore"
      handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
    >
      <View className="flex-shrink-0 border-b px-4 pb-3 pt-2" style={{ borderBottomColor: BORDER_SUBTLE }}>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }}>
            Select Location
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close location picker"
            hitSlop={12}
            onPress={() => {
              sheetRef.current?.dismiss()
            }}
          >
            <AppIcon name="x" size={22} color={TEXT_MUTED} />
          </Pressable>
        </View>

        <View
          className="flex-row items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ backgroundColor: '#f3f4f6' }}
        >
          <AppIcon name="search" size={16} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search cities…"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            className="min-h-[40px] flex-1 py-1 text-[15px]"
            style={mergeTextInputBodyTypography()}
          />
        </View>
      </View>

      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 36, paddingTop: 8 }}
      >
        {hierarchyLoading ? (
          <Text className="py-6 text-center text-sm" style={{ color: TEXT_MUTED }}>
            Loading regions…
          </Text>
        ) : hierarchyError?.length ? (
          <Text className="py-6 text-center text-sm text-red-600">{hierarchyError}</Text>
        ) : filtered.length === 0 ? (
          <Text className="py-6 text-center text-sm" style={{ color: TEXT_MUTED }}>
            No cities match your search.
          </Text>
        ) : (
          filtered.map((country) => (
            <View key={country.key} className="mb-5">
              <View className="mb-2 flex-row items-center gap-2 py-2">
                {country.flag?.startsWith('http') ? (
                  <Image
                    accessibilityIgnoresInvertColors
                    source={{ uri: country.flag }}
                    style={{ width: 20, height: 14, borderRadius: 2 }}
                  />
                ) : null}
                <Text className="flex-1 text-base font-semibold text-gray-800">{country.label}</Text>
              </View>
              <View className="pl-1">
                {country.cities.map((city) => {
                  const isOn =
                    selectedKeyNorm.length > 0 && city.key.trim().toLowerCase() === selectedKeyNorm
                  return (
                    <Pressable
                      key={city.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isOn }}
                      onPress={() => pickCity(city)}
                      className={`mb-2 flex-row items-center justify-between rounded-xl px-3 py-3.5 ${
                        isOn ? 'bg-orange-50' : 'bg-white'
                      }`}
                    >
                      <Text className={`text-base ${isOn ? 'font-semibold text-[#ff7c0a]' : 'text-[#494D5D]'}`}>
                        {city.label}
                      </Text>
                      {isOn ? <AppIcon name="check-circle" size={22} color="#ff7c0a" /> : null}
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  )
}
