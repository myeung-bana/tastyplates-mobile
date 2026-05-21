import { useState, useCallback } from 'react'
import { View, Text, TextInput, Pressable, Keyboard } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { BRAND_PRIMARY, mergeTextInputBodyTypography } from '@/constants/brand'
import { labelForPalateKey } from '@/lib/palateLabels'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import { useSearchCuisinesSheet } from '@/contexts/SearchCuisinesSheetContext'

type SearchMode = 'cuisine' | 'keyword'

/**
 * Hero: headline, tagline, cuisine vs keyword search, shared Search cuisines sheet → Restaurants tab with params.
 */
export function HomeHero() {
  const { openSearchCuisines } = useSearchCuisinesSheet()
  const [searchMode, setSearchMode] = useState<SearchMode>('cuisine')
  const [keyword, setKeyword] = useState('')
  const [palateKey, setPalateKey] = useState<string | null>(null)

  const goDiscover = useCallback(() => {
    Keyboard.dismiss()
    if (searchMode === 'keyword') {
      if (!keyword.trim()) return
      router.push({
        pathname: SCREEN_RESTAURANTS,
        params: { listing: keyword.trim() },
      })
      return
    }
    const params: Record<string, string> = {}
    if (palateKey) params.palate = palateKey
    if (keyword.trim()) params.search = keyword.trim()
    router.push({ pathname: SCREEN_RESTAURANTS, params })
  }, [keyword, palateKey, searchMode])

  const toggleMode = () => {
    setSearchMode((m) => (m === 'cuisine' ? 'keyword' : 'cuisine'))
    setKeyword('')
    setPalateKey(null)
  }

  const cuisinePlaceholder =
    searchMode === 'cuisine' ? labelForPalateKey(palateKey) : 'Search by keyword…'

  return (
    <View className="overflow-hidden rounded-b-3xl bg-[#1a1d2e]">
      <View className="px-4 pb-8 pt-4">
        <Text className="text-center text-2xl font-semibold leading-tight text-white" style={{ letterSpacing: -0.3 }}>
          Discover the meal that fits your taste
        </Text>
        <Text className="mt-2 text-center text-sm leading-snug text-white/80">
          Dine like a Brazilian in Tokyo — or Korean in New York?
        </Text>

        <View className="mt-6 rounded-2xl bg-white/95 p-1 shadow-sm">
          <View className="flex-row items-center rounded-xl bg-gray-50 px-2">
            {searchMode === 'cuisine' ? (
              <Pressable
                className="min-h-[48px] flex-1 justify-center px-2"
                onPress={() =>
                  openSearchCuisines({
                    initialPalateKey: palateKey,
                    onApply: (key) => setPalateKey(key),
                  })
                }
              >
                <Text className="text-xs font-medium text-gray-500">Palate</Text>
                <Text className="text-base font-medium text-gray-900" numberOfLines={1}>
                  {cuisinePlaceholder}
                </Text>
              </Pressable>
            ) : (
              <TextInput
                className="min-h-[48px] flex-1 px-2 py-2 text-base text-gray-900"
                style={mergeTextInputBodyTypography()}
                placeholder="Search restaurants…"
                placeholderTextColor="#9ca3af"
                value={keyword}
                onChangeText={setKeyword}
                returnKeyType="search"
                onSubmitEditing={goDiscover}
              />
            )}
            <Pressable
              accessibilityLabel="Toggle search mode"
              onPress={toggleMode}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-200"
            >
              <Ionicons name="options-outline" size={22} color="#4b5563" />
            </Pressable>
            <Pressable
              accessibilityLabel="Search"
              onPress={goDiscover}
              disabled={searchMode === 'keyword' && !keyword.trim()}
              className="ml-1 h-10 w-10 items-center justify-center rounded-full active:opacity-80"
              style={{
                backgroundColor: searchMode === 'keyword' && !keyword.trim() ? '#d1d5db' : BRAND_PRIMARY,
              }}
            >
              <Ionicons name="search" size={20} color="#fff" />
            </Pressable>
          </View>
          <Text className="px-3 py-2 text-center text-[11px] text-gray-500">
            {searchMode === 'cuisine' ? 'Tap palate to choose a cuisine, then search.' : 'Keyword finds listings by text.'}
          </Text>
        </View>
      </View>
    </View>
  )
}
