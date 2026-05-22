import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image, Pressable, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
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
import { useLocation } from '@/contexts/LocationContext'
import { cityNodeToSavedLocation, type LocationCityNode } from '@/services/onboardingService'

/** Gorhom-backed city picker; mount under {@link BottomSheetModalProvider}. */
export function LocationHierarchyPickerHost(): JSX.Element | null {
  const sheetRef = useRef<BottomSheetModal>(null)
  const {
    hierarchy,
    hierarchyLoading,
    hierarchyError,
    locationPickerSignal,
    location: selectedPref,
    setLocationPreference,
  } = useLocation()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (locationPickerSignal < 1) return

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const presentSheet = (): void => {
      if (cancelled) return
      const modal = sheetRef.current
      if (modal) {
        modal.present()
        return
      }
      // Ref can be null on first mount tick; retry once after the current frame.
      timeoutId = setTimeout(() => {
        if (!cancelled) sheetRef.current?.present()
      }, 0)
    }

    const frameId = requestAnimationFrame(presentSheet)
    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [locationPickerSignal])

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
    [hierarchy?.hierarchy.countries, setLocationPreference],
  )

  const onDismissSheet = useCallback(() => {
    void Haptics.selectionAsync()
    setSearch('')
  }, [])

  const selectedKeyNorm = selectedPref.key.trim().toLowerCase()

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={onDismissSheet}
      keyboardBlurBehavior="restore"
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
            <Ionicons name="close" size={22} color={TEXT_MUTED} />
          </Pressable>
        </View>

        <View
          className="flex-row items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ backgroundColor: '#f3f4f6' }}
        >
          <Ionicons name="search" size={16} color="#9ca3af" />
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
                      {isOn ? <Ionicons name="checkmark-circle" size={22} color="#ff7c0a" /> : null}
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
