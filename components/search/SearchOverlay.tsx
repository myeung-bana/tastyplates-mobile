import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { FullScreenOverlay } from '@/components/layout/FullScreenOverlay'
import { HybridSearchResults } from '@/components/search/HybridSearchResults'
import { PalatePickerScrollPanel } from '@/components/search/PalatePickerScrollPanel'
import { AppIcon } from '@/components/ui/AppIcon'
import { BRAND_PRIMARY, TEXT_MUTED, mergeTextInputBodyTypography } from '@/constants/brand'
import {
  SCREEN_PLACES_GOOGLE_DETAIL,
  SCREEN_RESTAURANT_DETAIL,
  SCREEN_RESTAURANTS,
} from '@/constants/screens'
import type { OpenSearchOptions } from '@/contexts/SearchOverlayContext'
import { useRecentSearches } from '@/hooks/useRecentSearches'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isTPResult } from '@/types/restaurantSearchResult'

const DEBOUNCE_MS = 320

interface SearchOverlayProps {
  initialOpts: OpenSearchOptions
  onClose: () => void
}

export function SearchOverlay({ initialOpts, onClose }: SearchOverlayProps) {
  const inputRef = useRef<TextInput>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [keyword, setKeyword] = useState(initialOpts.initialKeyword ?? '')
  const [debouncedKeyword, setDebouncedKeyword] = useState(initialOpts.initialKeyword ?? '')
  const [selectedPalateKey, setSelectedPalateKey] = useState<string | null>(
    initialOpts.initialPalateKey ?? null,
  )

  const { recents, add: addRecent, remove: removeRecent, clear: clearRecents } = useRecentSearches()

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const handleKeywordChange = useCallback((text: string) => {
    setKeyword(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedKeyword(text), DEBOUNCE_MS)
  }, [])

  const clearKeyword = useCallback(() => {
    setKeyword('')
    setDebouncedKeyword('')
    inputRef.current?.focus()
  }, [])

  const commit = useCallback(
    async (queryOverride?: string, palateOverride?: string | null) => {
      const q = (queryOverride ?? keyword).trim()
      const p = palateOverride !== undefined ? palateOverride : selectedPalateKey
      void Haptics.selectionAsync()

      if (q) await addRecent(q)

      const params: Record<string, string | undefined> = {}
      if (q) params.listing = q
      if (p) params.cuisine = p

      onClose()

      setTimeout(() => {
        router.navigate({ pathname: SCREEN_RESTAURANTS, params })
      }, 120)
    },
    [keyword, selectedPalateKey, addRecent, onClose],
  )

  const handlePalateSelect = useCallback(
    (key: string) => {
      const next = selectedPalateKey === key ? null : key
      setSelectedPalateKey(next)
      void commit(undefined, next)
    },
    [selectedPalateKey, commit],
  )

  const handleRegionSelect = useCallback(
    (regionKey: string) => {
      const next = selectedPalateKey === regionKey ? null : regionKey
      setSelectedPalateKey(next)
      void commit(undefined, next)
    },
    [selectedPalateKey, commit],
  )

  const handleResultSelect = useCallback(
    async (result: RestaurantSearchResult) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await addRecent(debouncedKeyword.trim())
      onClose()
      setTimeout(() => {
        if (isTPResult(result)) {
          const params: { slug: string; cuisine?: string } = { slug: result.slug }
          if (selectedPalateKey) params.cuisine = selectedPalateKey
          router.push({
            pathname: SCREEN_RESTAURANT_DETAIL,
            params,
          })
        } else {
          router.push({
            pathname: SCREEN_PLACES_GOOGLE_DETAIL,
            params: { place_id: result.place_id },
          })
        }
      }, 120)
    },
    [debouncedKeyword, addRecent, onClose, selectedPalateKey],
  )

  const showResults = debouncedKeyword.trim().length >= 2

  return (
    <FullScreenOverlay onRequestClose={onClose} keyboardAvoiding>
      <View className="flex-1">
        <View className="flex-row items-center gap-2.5 border-b border-gray-100 pb-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close search"
            hitSlop={12}
            onPress={onClose}
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
              placeholder="Search restaurants..."
              placeholderTextColor="#9ca3af"
              value={keyword}
              onChangeText={handleKeywordChange}
              returnKeyType="search"
              onSubmitEditing={() => void commit()}
              autoCapitalize="none"
              autoCorrect={false}
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

          {keyword.trim().length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit search"
              onPress={() => void commit()}
              className="h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <AppIcon name="search" size={20} color="#fff" />
            </Pressable>
          )}
        </View>

        {showResults ? (
          <HybridSearchResults
            keyword={debouncedKeyword}
            cuisineSlug={selectedPalateKey}
            onSelect={handleResultSelect}
          />
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {recents.length > 0 && (
              <View className="pt-5">
                <View className="mb-2 flex-row items-center justify-between px-4">
                  <Text className="font-neusans text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Recent Searches
                  </Text>
                  <Pressable hitSlop={8} onPress={() => void clearRecents()}>
                    <Text className="font-neusans text-xs text-gray-400">Clear all</Text>
                  </Pressable>
                </View>

                {recents.map((r) => (
                  <RecentSearchRow
                    key={r.query}
                    query={r.query}
                    onTap={() => void commit(r.query)}
                    onRemove={() => void removeRecent(r.query)}
                  />
                ))}
              </View>
            )}

            <View className={recents.length > 0 ? 'pt-6' : 'pt-5'}>
              <View className="mb-2.5 px-4">
                <Text className="font-neusans text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Search by Cuisine
                </Text>
              </View>
              <PalatePickerScrollPanel
                selectedKey={selectedPalateKey}
                onSelectCuisine={handlePalateSelect}
                onSelectRegion={handleRegionSelect}
                onClear={() => setSelectedPalateKey(null)}
              />
            </View>
          </ScrollView>
        )}
      </View>
    </FullScreenOverlay>
  )
}

function RecentSearchRow({
  query,
  onTap,
  onRemove,
}: {
  query: string
  onTap: () => void
  onRemove: () => void
}) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        onTap()
      }}
      className="flex-row items-center gap-3 border-b border-gray-50 px-4 py-3"
      accessibilityRole="button"
      accessibilityLabel={`Search for ${query}`}
    >
      <AppIcon name="clock" size={18} color="#d1d5db" />
      <Text className="flex-1 font-neusans text-[15px] text-[#31343F]" numberOfLines={1}>
        {query}
      </Text>
      <Pressable
        hitSlop={12}
        onPress={(e) => {
          e.stopPropagation()
          void Haptics.selectionAsync()
          onRemove()
        }}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${query} from recent searches`}
      >
        <AppIcon name="x" size={18} color="#9ca3af" />
      </Pressable>
    </Pressable>
  )
}
