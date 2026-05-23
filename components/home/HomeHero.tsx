import { useState, useCallback } from 'react'
import { View, Text } from 'react-native'
import { router } from 'expo-router'

import { PalateSearchBar, type PalateSearchMode } from '@/components/search/PalateSearchBar'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import { useSearchCuisinesSheet } from '@/contexts/SearchCuisinesSheetContext'

/**
 * Hero: subtitle + shared {@link PalateSearchBar} → Restaurants tab with query params.
 */
export function HomeHero() {
  const { openSearchCuisines } = useSearchCuisinesSheet()
  const [searchMode, setSearchMode] = useState<PalateSearchMode>('cuisine')
  const [keyword, setKeyword] = useState('')
  const [palateKey, setPalateKey] = useState<string | null>(null)

  const goDiscover = useCallback(() => {
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

  const onModeChange = (next: PalateSearchMode) => {
    setSearchMode(next)
    setKeyword('')
    setPalateKey(null)
  }

  return (
    <View className="overflow-hidden bg-white">
      <View className="px-4 pb-6 pt-0">
        <Text className="text-center text-sm leading-snug text-gray-600">
          Dine like a Brazilian in Tokyo — or Korean in New York?
        </Text>

        <View className="mt-4">
          <PalateSearchBar
            mode={searchMode}
            onModeChange={onModeChange}
            palateKey={palateKey}
            onOpenPalatePicker={() =>
              openSearchCuisines({
                initialPalateKey: palateKey,
                onApply: (key) => setPalateKey(key),
              })
            }
            keyword={keyword}
            onKeywordChange={setKeyword}
            onSubmit={goDiscover}
          />
        </View>
      </View>
    </View>
  )
}
