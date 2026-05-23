import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'

import { mergeTextInputBodyTypography, TEXT_HEADING } from '@/constants/brand'
import type { LocationCityNode, LocationCountryNode } from '@/services/onboardingService'

export interface LocationPickerSheetHandle {
  present: () => void
  dismiss: () => void
}

interface Props {
  countries: LocationCountryNode[]
  onSelect: (city: LocationCityNode) => void
  title?: string
}

export const LocationPickerSheet = forwardRef<LocationPickerSheetHandle, Props>(
  function LocationPickerSheet({ countries, onSelect, title = 'Choose a city' }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null)

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          sheetRef.current?.present()
        },
        dismiss: () => {
          sheetRef.current?.dismiss()
        },
      }),
      [],
    )

    const snapPoints = useMemo(() => ['75%', '92%'], [])

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
      ),
      [],
    )

    const onPick = useCallback(
      (city: LocationCityNode) => {
        onSelect(city)
        sheetRef.current?.dismiss()
      },
      [onSelect],
    )

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
      >
        <BottomSheetView style={{ flex: 1, paddingBottom: 24 }}>
          <Text className="mb-3 px-4 pt-2 text-lg font-semibold" style={{ color: TEXT_HEADING }}>
            {title}
          </Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="px-4 pb-8"
          >
            {countries.map((country) => (
              <View key={country.key} className="mb-5">
                <Text className="mb-2 text-base font-semibold text-gray-800">{country.label}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {country.cities.map((city) => (
                    <Pressable
                      key={city.key}
                      onPress={() => {
                        onPick(city)
                      }}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 active:bg-gray-100"
                    >
                      <Text style={mergeTextInputBodyTypography()} className="text-sm text-gray-800">
                        {city.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    )
  },
)
