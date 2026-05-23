import { View, Text, Pressable, Image } from 'react-native'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { palateOptions } from '@/constants/palateOptions'

/** Space for floating Search footer in {@link SearchCuisinesSheetProvider}. */
export const PALATE_PICKER_FOOTER_PADDING = 112

interface PalatePickerPanelProps {
  selectedKey: string | null
  onSelectCuisine: (key: string) => void
  onSelectRegion: (regionKey: string) => void
  onClear: () => void
}

const pillBase = 'rounded-full border'

/**
 * Scrollable palate regions / cuisines — intended inside `@gorhom/bottom-sheet`.
 */
export function PalatePickerPanel({
  selectedKey,
  onSelectCuisine,
  onSelectRegion,
  onClear,
}: PalatePickerPanelProps) {
  return (
    <BottomSheetScrollView
      style={{ flex: 1, width: '100%' }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: PALATE_PICKER_FOOTER_PADDING,
        alignItems: 'stretch',
        width: '100%',
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        onPress={onClear}
        className={`mb-4 self-start ${pillBase} px-4 py-2 ${
          selectedKey === null ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <Text className={`text-sm font-medium ${selectedKey === null ? 'text-orange-600' : 'text-gray-700'}`}>
          All cuisines
        </Text>
      </Pressable>

      {palateOptions.map((region) => (
        <View key={region.key} className="mb-5 w-full">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {region.label}
          </Text>
          <Pressable
            onPress={() => onSelectRegion(region.key)}
            className={`mb-3 self-start ${pillBase} px-3 py-1.5 ${
              selectedKey === region.key ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'
            }`}
          >
            <Text
              className={`text-sm font-medium ${selectedKey === region.key ? 'text-orange-600' : 'text-gray-800'}`}
            >
              All {region.label}
            </Text>
          </Pressable>
          <View className="w-full flex-row flex-wrap gap-2">
            {region.children.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => onSelectCuisine(c.key)}
                className={`flex-row items-center gap-2 ${pillBase} px-3 py-2 ${
                  selectedKey === c.key ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'
                }`}
              >
                <Image source={{ uri: c.flag }} className="h-5 w-5 rounded-full" />
                <Text
                  className={`text-sm font-medium ${selectedKey === c.key ? 'text-orange-600' : 'text-gray-800'}`}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </BottomSheetScrollView>
  )
}
