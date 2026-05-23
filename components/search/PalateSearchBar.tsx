import { Keyboard, Pressable, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { BRAND_PRIMARY, mergeTextInputBodyTypography } from '@/constants/brand'
import { labelForPalateKey } from '@/lib/palateLabels'

export type PalateSearchMode = 'cuisine' | 'keyword'

export type PalateSearchBarProps = {
  mode: PalateSearchMode
  onModeChange: (mode: PalateSearchMode) => void
  palateKey: string | null
  onOpenPalatePicker: () => void
  keyword: string
  onKeywordChange: (value: string) => void
  onSubmit: () => void
  /** When false, hides outer shadow (e.g. embedded in restaurants tab). */
  elevated?: boolean
}

/**
 * Unified palate / keyword search bar — web Hero parity (`design_system` §11).
 */
export function PalateSearchBar({
  mode,
  onModeChange,
  palateKey,
  onOpenPalatePicker,
  keyword,
  onKeywordChange,
  onSubmit,
  elevated = true,
}: PalateSearchBarProps): JSX.Element {
  const cuisineLabel = labelForPalateKey(palateKey)
  const searchDisabled = mode === 'keyword' && !keyword.trim()

  const toggleMode = () => {
    const next: PalateSearchMode = mode === 'cuisine' ? 'keyword' : 'cuisine'
    onModeChange(next)
    onKeywordChange('')
  }

  const handleSubmit = () => {
    Keyboard.dismiss()
    onSubmit()
  }

  return (
    <View
      className={`rounded-2xl border border-[#f3f4f6] bg-white p-1 ${elevated ? 'shadow-sm shadow-black/5' : ''}`}
    >
      <View className="flex-row items-center rounded-xl bg-gray-50 px-2">
        {mode === 'cuisine' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose cuisine or palate"
            className="min-h-[48px] flex-1 justify-center px-2"
            onPress={onOpenPalatePicker}
          >
            <Text className="text-xs font-medium text-gray-500">Palate</Text>
            <Text className="text-base font-medium text-gray-900" numberOfLines={1}>
              {cuisineLabel}
            </Text>
          </Pressable>
        ) : (
          <TextInput
            className="min-h-[48px] flex-1 px-2 py-2 text-base text-gray-900"
            style={mergeTextInputBodyTypography()}
            placeholder="Search restaurants…"
            placeholderTextColor="#9ca3af"
            value={keyword}
            onChangeText={onKeywordChange}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            accessibilityLabel="Search restaurants by keyword"
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${mode === 'cuisine' ? 'keyword' : 'cuisine'} search`}
          onPress={toggleMode}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-200"
        >
          <Ionicons name="options-outline" size={22} color="#4b5563" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search"
          onPress={handleSubmit}
          disabled={searchDisabled}
          className="ml-1 h-10 w-10 items-center justify-center rounded-full active:opacity-80"
          style={{
            backgroundColor: searchDisabled ? '#d1d5db' : BRAND_PRIMARY,
          }}
        >
          <Ionicons name="search" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  )
}
