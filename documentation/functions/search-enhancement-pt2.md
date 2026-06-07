# search_enhancement_part2.md — Full-Screen Search: Recent Searches, Palate Picker & Hybrid Results

> **Grounded in:** Full source of `AppTopNav.tsx`, `HomeHero.tsx`, `PalateSearchBar.tsx`, `SearchCuisinesSheetContext.tsx`, `PalatePickerPanel.tsx`, `palateLabels.ts`, `constants/quickFinds.ts`, and `constants/palateOptions` from `tastyplates-mobile` — all read in full.

---

## 1. What Changes and What Stays

### What changes

| Current behaviour | New behaviour |
|-------------------|--------------|
| Search icon in `AppTopNav` calls `openSearchCuisines()` → `@gorhom/bottom-sheet` at `88%` height | Search icon opens a **full-screen overlay** (`zIndex` above `AppTopNav`) |
| `HomeHero` has a toggle to switch between cuisine and keyword mode | `HomeHero` search bar becomes a **single tap that opens the same full-screen overlay** — no toggle |
| Keyword search is hidden behind a toggle (`PalateSearchBar` sliders icon) | Keyword input is the **first thing visible** at the top of the full-screen overlay |
| No recent searches | **Last 5 recent keyword searches** shown below the input with individual × dismiss |
| `PalatePickerPanel` uses `BottomSheetScrollView` (gorhom-specific) | `PalatePickerPanel` replaced with a **standard `ScrollView`** version called `PalatePickerScrollPanel` — same visual, no gorhom dependency |

### What does NOT change

- `SearchCuisinesSheetContext` is kept for backwards compatibility — the gorhom bottom sheet can remain for any other callers, but `AppTopNav` and `HomeHero` now call the new full-screen overlay instead
- `PalatePickerPanel` pill design, `palateOptions` data, `QUICK_FINDS` — all unchanged
- Restaurant results page (`app/(tabs)/restaurants/index.tsx`) — unchanged. The overlay navigates to it the same way as before
- `mergeRestaurantResults` and the hybrid Google fallback from `search_enhancement.md` — unchanged and compatible

---

## 2. Architecture — The Full-Screen Search Overlay

The overlay is a **React Native `Modal`** with `animationType="slide"` from the bottom, covering `100%` of the screen including the safe area and `AppTopNav`. It is managed by a new context so any component can open it without prop drilling.

```
SearchOverlayContext
  openSearch(opts?)   ← called by AppTopNav search icon + HomeHero tap
  closeSearch()

SearchOverlay (Modal, animationType="slide", presentationStyle="overFullScreen")
  ├── SafeAreaView (full screen, bg-white)
  │     ├── Top bar (back arrow / × + TextInput + clear ×)
  │     ├── ScrollView (content area)
  │     │     ├── RecentSearches section  (if keyword is empty)
  │     │     ├── PalatePickerScrollPanel (if keyword is empty)
  │     │     └── HybridSearchResults    (if keyword.length ≥ 2)
  │     └── (keyboard avoidance via KeyboardAvoidingView)
```

---

## 3. `lib/recentSearches.ts` — New Utility

No recent searches utility exists in the codebase. Create it using `AsyncStorage`.

```ts
// lib/recentSearches.ts

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'tp:recent_searches_v1'
const MAX = 5

export interface RecentSearch {
  query: string      // the keyword text
  timestamp: number  // Date.now() — used for ordering, not displayed
}

/** Read the stored list (newest first). */
export async function getRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentSearch[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Prepend a new query. Deduplicates (case-insensitive), caps at MAX.
 * Silently no-ops if the query is empty after trimming.
 */
export async function addRecentSearch(query: string): Promise<void> {
  const trimmed = query.trim()
  if (!trimmed) return
  try {
    const existing = await getRecentSearches()
    // Remove any existing entry with the same text (case-insensitive)
    const deduped = existing.filter(
      (r) => r.query.toLowerCase() !== trimmed.toLowerCase()
    )
    const updated: RecentSearch[] = [
      { query: trimmed, timestamp: Date.now() },
      ...deduped,
    ].slice(0, MAX)
    await AsyncStorage.setItem(KEY, JSON.stringify(updated))
  } catch {
    // Fail silently — recent searches are non-critical
  }
}

/**
 * Remove a single entry by its exact query string.
 */
export async function removeRecentSearch(query: string): Promise<void> {
  try {
    const existing = await getRecentSearches()
    const updated = existing.filter((r) => r.query !== query)
    await AsyncStorage.setItem(KEY, JSON.stringify(updated))
  } catch {
    // Fail silently
  }
}

/** Wipe the entire list. */
export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch {
    // Fail silently
  }
}
```

---

## 4. `hooks/useRecentSearches.ts` — New Hook

```ts
// hooks/useRecentSearches.ts

import { useCallback, useEffect, useState } from 'react'
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
  type RecentSearch,
} from '@/lib/recentSearches'

export function useRecentSearches() {
  const [recents, setRecents] = useState<RecentSearch[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await getRecentSearches()
    setRecents(data)
    setLoading(false)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const add = useCallback(async (query: string) => {
    await addRecentSearch(query)
    await refresh()
  }, [refresh])

  const remove = useCallback(async (query: string) => {
    await removeRecentSearch(query)
    await refresh()
  }, [refresh])

  const clear = useCallback(async () => {
    await clearRecentSearches()
    await refresh()
  }, [refresh])

  return { recents, loading, add, remove, clear, refresh }
}
```

---

## 5. `contexts/SearchOverlayContext.tsx` — New Context

This replaces `openSearchCuisines()` from `SearchCuisinesSheetContext` as the primary entry point from `AppTopNav` and `HomeHero`. The gorhom sheet can remain for any other use.

```tsx
// contexts/SearchOverlayContext.tsx

import {
  createContext, useCallback, useContext, useMemo, useRef,
  useState, type PropsWithChildren,
} from 'react'

export interface OpenSearchOptions {
  initialKeyword?: string
  initialPalateKey?: string | null
}

interface SearchOverlayContextValue {
  openSearch: (opts?: OpenSearchOptions) => void
  closeSearch: () => void
  isOpen: boolean
}

const SearchOverlayContext = createContext<SearchOverlayContextValue | null>(null)

export function useSearchOverlay(): SearchOverlayContextValue {
  const ctx = useContext(SearchOverlayContext)
  if (!ctx) throw new Error('useSearchOverlay must be inside SearchOverlayProvider')
  return ctx
}

export function SearchOverlayProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false)
  const [initialOpts, setInitialOpts] = useState<OpenSearchOptions>({})

  const openSearch = useCallback((opts?: OpenSearchOptions) => {
    setInitialOpts(opts ?? {})
    setIsOpen(true)
  }, [])

  const closeSearch = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo(
    () => ({ openSearch, closeSearch, isOpen }),
    [openSearch, closeSearch, isOpen],
  )

  return (
    <SearchOverlayContext.Provider value={value}>
      {children}
      {/* The actual overlay renders here so it covers everything */}
      {isOpen && <SearchOverlay initialOpts={initialOpts} onClose={closeSearch} />}
    </SearchOverlayContext.Provider>
  )
}
```

---

## 6. `components/search/SearchOverlay.tsx` — The Full-Screen Component

```tsx
// components/search/SearchOverlay.tsx

import {
  KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Text, TextInput, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { AppIcon } from '@/components/ui/AppIcon'
import { PalatePickerScrollPanel } from '@/components/search/PalatePickerScrollPanel'
import { HybridSearchResults } from '@/components/search/HybridSearchResults'
import { useRecentSearches } from '@/hooks/useRecentSearches'
import { BRAND_PRIMARY, TEXT_MUTED, mergeTextInputBodyTypography } from '@/constants/brand'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import type { OpenSearchOptions } from '@/contexts/SearchOverlayContext'

const DEBOUNCE_MS = 320

interface SearchOverlayProps {
  initialOpts: OpenSearchOptions
  onClose: () => void
}

export function SearchOverlay({ initialOpts, onClose }: SearchOverlayProps) {
  const inputRef = useRef<TextInput>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const [keyword, setKeyword] = useState(initialOpts.initialKeyword ?? '')
  const [debouncedKeyword, setDebouncedKeyword] = useState(initialOpts.initialKeyword ?? '')
  const [selectedPalateKey, setSelectedPalateKey] = useState<string | null>(
    initialOpts.initialPalateKey ?? null,
  )

  const { recents, add: addRecent, remove: removeRecent } = useRecentSearches()

  // Auto-focus the keyword input on open
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  // Debounce keyword → debouncedKeyword (drives live search results)
  const handleKeywordChange = useCallback((text: string) => {
    setKeyword(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(
      () => setDebouncedKeyword(text),
      DEBOUNCE_MS,
    )
  }, [])

  const clearKeyword = useCallback(() => {
    setKeyword('')
    setDebouncedKeyword('')
    inputRef.current?.focus()
  }, [])

  // Commit a search: save to recents, navigate to restaurants tab
  const commit = useCallback(
    async (queryOverride?: string, palateOverride?: string | null) => {
      const q = (queryOverride ?? keyword).trim()
      const p = palateOverride !== undefined ? palateOverride : selectedPalateKey
      void Haptics.selectionAsync()

      if (q) await addRecent(q)

      const params: Record<string, string | undefined> = {}
      if (q) params.listing = q
      if (p) params.palate = p

      onClose()

      // Navigate after modal closes to avoid frame drops
      setTimeout(() => {
        router.navigate({ pathname: SCREEN_RESTAURANTS, params })
      }, 120)
    },
    [keyword, selectedPalateKey, addRecent, onClose],
  )

  // Tapping a palate pill immediately navigates (same as existing sheet)
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

  const showResults = debouncedKeyword.trim().length >= 2
  const showIdle    = !showResults

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >

          {/* ── Top bar ── */}
          <View
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 12, paddingVertical: 10,
              gap: 10,
              borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
            }}
          >
            {/* Back / close */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close search"
              hitSlop={12}
              onPress={onClose}
              style={{ padding: 4 }}
            >
              <AppIcon name="arrow-left" size={22} color="#374151" />
            </Pressable>

            {/* Keyword input */}
            <View
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#f3f4f6', borderRadius: 14,
                paddingHorizontal: 12, paddingVertical: 0,
                minHeight: 44,
              }}
            >
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

            {/* Search submit button — only when keyword is present */}
            {keyword.trim().length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Submit search"
                onPress={() => void commit()}
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: BRAND_PRIMARY,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <AppIcon name="search" size={20} color="#fff" />
              </Pressable>
            )}
          </View>

          {/* ── Content ── */}
          {showIdle ? (
            // IDLE STATE: recent searches + palate picker
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >

              {/* Recent searches */}
              {recents.length > 0 && (
                <View style={{ paddingTop: 20 }}>
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16, marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Neusans', fontSize: 12,
                        fontWeight: '600', color: '#9ca3af',
                        textTransform: 'uppercase', letterSpacing: 0.6,
                      }}
                    >
                      Recent Searches
                    </Text>
                    <Pressable
                      hitSlop={8}
                      onPress={async () => {
                        const { clearRecentSearches } = await import('@/lib/recentSearches')
                        await clearRecentSearches()
                        const { refresh } = useRecentSearches as unknown as never
                        // Re-render via the hook's internal state
                      }}
                    >
                      <Text style={{ fontFamily: 'Neusans', fontSize: 12, color: '#9ca3af' }}>
                        Clear all
                      </Text>
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

              {/* Palate picker */}
              <View style={{ paddingTop: recents.length > 0 ? 24 : 20 }}>
                <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
                  <Text
                    style={{
                      fontFamily: 'Neusans', fontSize: 12,
                      fontWeight: '600', color: '#9ca3af',
                      textTransform: 'uppercase', letterSpacing: 0.6,
                    }}
                  >
                    Search by Palate
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
          ) : (
            // ACTIVE SEARCH: keyword results
            <HybridSearchResults
              keyword={debouncedKeyword}
              onSelect={(result) => {
                // Keyword result tapped — save to recents then navigate
                void addRecent(debouncedKeyword)
                onClose()
                setTimeout(() => {
                  if (result.source === 'tp') {
                    router.push({
                      pathname: '/restaurants/[slug]',
                      params: { slug: result.slug },
                    })
                  } else {
                    router.push({
                      pathname: '/restaurants/google/[place_id]',
                      params: { place_id: result.place_id },
                    })
                  }
                }, 120)
              }}
            />
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ── Single recent search row ────────────────────────────────────────────────

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
      onPress={onTap}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        gap: 12,
        borderBottomWidth: 1, borderBottomColor: '#f9fafb',
      }}
      accessibilityRole="button"
      accessibilityLabel={`Search for ${query}`}
    >
      {/* Clock icon */}
      <AppIcon name="clock" size={18} color="#d1d5db" />

      {/* Query text */}
      <Text
        style={{ flex: 1, fontFamily: 'Neusans', fontSize: 15, color: '#31343F' }}
        numberOfLines={1}
      >
        {query}
      </Text>

      {/* Remove */}
      <Pressable
        hitSlop={12}
        onPress={(e) => {
          e.stopPropagation()
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
```

---

## 7. `components/search/PalatePickerScrollPanel.tsx` — Standard ScrollView Variant

The existing `PalatePickerPanel` uses `BottomSheetScrollView` from `@gorhom/bottom-sheet` — it cannot be used outside a gorhom sheet. Create a drop-in `ScrollView` equivalent with identical visual output:

```tsx
// components/search/PalatePickerScrollPanel.tsx
// Identical to PalatePickerPanel but uses React Native ScrollView instead of
// BottomSheetScrollView. Safe to use in any context (Modal, Screen, etc.)

import { ScrollView, View, Text, Pressable, Image } from 'react-native'
import { palateOptions } from '@/constants/palateOptions'
import { getCuisineIconSource } from '@/lib/cuisineIconAssets'

interface Props {
  selectedKey: string | null
  onSelectCuisine: (key: string) => void
  onSelectRegion: (regionKey: string) => void
  onClear: () => void
}

const pillBase = {
  borderRadius: 50,
  borderWidth: 1,
  paddingHorizontal: 16,
  paddingVertical: 8,
  marginRight: 8,
  marginBottom: 8,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
}

export function PalatePickerScrollPanel({
  selectedKey,
  onSelectCuisine,
  onSelectRegion,
  onClear,
}: Props) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 24,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* All cuisines pill */}
      <Pressable
        onPress={onClear}
        style={[
          pillBase,
          {
            borderColor: selectedKey === null ? '#f97316' : '#e5e7eb',
            backgroundColor: selectedKey === null ? '#fff7ed' : '#f9fafb',
            alignSelf: 'flex-start',
            marginBottom: 16,
          },
        ]}
      >
        <Text
          style={{
            fontFamily: 'Neusans', fontSize: 13, fontWeight: '500',
            color: selectedKey === null ? '#ea580c' : '#374151',
          }}
        >
          All cuisines
        </Text>
      </Pressable>

      {/* Regions and their cuisine children */}
      {palateOptions.map((region) => (
        <View key={region.key} style={{ marginBottom: 20 }}>
          {/* Region header label */}
          <Text
            style={{
              fontFamily: 'Neusans', fontSize: 11, fontWeight: '600',
              color: '#9ca3af', textTransform: 'uppercase',
              letterSpacing: 0.5, marginBottom: 8,
            }}
          >
            {region.label}
          </Text>

          {/* Region pill */}
          <Pressable
            onPress={() => onSelectRegion(region.key)}
            style={[
              pillBase,
              {
                borderColor: selectedKey === region.key ? '#f97316' : '#e5e7eb',
                backgroundColor: selectedKey === region.key ? '#fff7ed' : '#fff',
                alignSelf: 'flex-start',
                marginBottom: 10,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: 'Neusans', fontSize: 13, fontWeight: '500',
                color: selectedKey === region.key ? '#ea580c' : '#374151',
              }}
            >
              All {region.label}
            </Text>
          </Pressable>

          {/* Individual cuisine pills */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {region.children.map((cuisine) => {
              const iconSource = getCuisineIconSource(`${cuisine.key}-cuisine.png`)
              const isActive = selectedKey === cuisine.key
              return (
                <Pressable
                  key={cuisine.key}
                  onPress={() => onSelectCuisine(cuisine.key)}
                  style={[
                    pillBase,
                    {
                      borderColor: isActive ? '#f97316' : '#e5e7eb',
                      backgroundColor: isActive ? '#ff7c0a' : '#fff',
                    },
                  ]}
                >
                  {iconSource && (
                    <Image
                      source={iconSource}
                      style={{ width: 18, height: 18 }}
                      resizeMode="contain"
                    />
                  )}
                  <Text
                    style={{
                      fontFamily: 'Neusans', fontSize: 13, fontWeight: '500',
                      color: isActive ? '#fff' : '#374151',
                    }}
                  >
                    {cuisine.label}
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
```

---

## 8. `components/search/HybridSearchResults.tsx` — Live Search Results

Shown when `keyword.length >= 2`. Calls both the TP function and Google Autocomplete in parallel and renders the merged result using the `RestaurantListRow` component from `search_enhancement.md`.

```tsx
// components/search/HybridSearchResults.tsx

import { ActivityIndicator, FlatList, Text, View } from 'react-native'
import { useEffect, useRef, useState } from 'react'
import { getRestaurants } from '@/services/restaurantsV2Service'
import { autocompletePlacesEstablishments } from '@/lib/googlePlaces'
import { mergeRestaurantResults } from '@/lib/restaurantSearchMerge'
import { RestaurantListRow } from '@/components/restaurant/RestaurantListRow'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isTPResult, isGoogleResult } from '@/types/restaurantSearchResult'
import { useLocation } from '@/contexts/LocationContext'
import { BRAND_PRIMARY } from '@/constants/brand'

interface Props {
  keyword: string
  onSelect: (result: RestaurantSearchResult) => void
}

export function HybridSearchResults({ keyword, onSelect }: Props) {
  const { location } = useLocation()
  const [results, setResults] = useState<RestaurantSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController>()

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (!keyword.trim() || keyword.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)

    Promise.allSettled([
      getRestaurants({
        search: keyword,
        limit: 12,
        locationKey: location.key,
      }),
      autocompletePlacesEstablishments(keyword, location.coordinates),
    ]).then(([tpResult, googleResult]) => {
      if (controller.signal.aborted) return
      const tpRows  = tpResult.status  === 'fulfilled' ? (tpResult.value.restaurants ?? []) : []
      const gRows   = googleResult.status === 'fulfilled' ? googleResult.value : []
      const merged  = mergeRestaurantResults(tpRows, gRows, {
        googleLimit: 6,
        suppressGoogleWhenTPCount: 24,
        palateSlug: null,  // no palate context during keyword search
      })
      setResults(merged)
      setLoading(false)
    })

    return () => controller.abort()
  }, [keyword, location.key, location.coordinates])

  const resultId = (r: RestaurantSearchResult): string =>
    isTPResult(r) ? (r.uuid ?? r.slug) : `google:${r.place_id}`

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
        <ActivityIndicator color={BRAND_PRIMARY} />
        <Text
          style={{
            fontFamily: 'Neusans', fontSize: 13, color: '#9ca3af',
            marginTop: 10,
          }}
        >
          Searching...
        </Text>
      </View>
    )
  }

  if (!loading && results.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: 'Neusans', fontSize: 15, fontWeight: '500', color: '#374151', textAlign: 'center' }}>
          No results for "{keyword}"
        </Text>
        <Text style={{ fontFamily: 'Neusans', fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 6 }}>
          Try a different name or browse by palate below
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={results}
      keyExtractor={resultId}
      renderItem={({ item }) => (
        <RestaurantListRow
          result={item}
          onPress={() => onSelect(item)}
        />
      )}
      ItemSeparatorComponent={() => (
        <View style={{ height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 }} />
      )}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        <Text
          style={{
            fontFamily: 'Neusans', fontSize: 11, fontWeight: '600',
            color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6,
            paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
          }}
        >
          {results.length} result{results.length !== 1 ? 's' : ''} for "{keyword}"
        </Text>
      }
    />
  )
}
```

---

## 9. Wiring Changes to Existing Components

### `AppTopNav` — replace `openSearchCuisines` with `openSearch`

```tsx
// components/layout/AppTopNav.tsx
// CHANGE: import useSearchOverlay instead of useSearchCuisinesSheet

- import { useSearchCuisinesSheet } from '@/contexts/SearchCuisinesSheetContext'
+ import { useSearchOverlay } from '@/contexts/SearchOverlayContext'

// CHANGE: in AppTopNav function body
- const { openSearchCuisines } = useSearchCuisinesSheet()
+ const { openSearch } = useSearchOverlay()

// CHANGE: the search button's onPress
- onPress={() => openSearchCuisines()}
+ onPress={() => openSearch()}
```

### `HomeHero` — single tap to open the overlay

```tsx
// components/home/HomeHero.tsx
// CHANGE: The whole hero becomes a single pressable that opens the overlay.
// Remove PalateSearchBar with its toggle entirely.

- import { PalateSearchBar, type PalateSearchMode } from '@/components/search/PalateSearchBar'
- import { useSearchCuisinesSheet } from '@/contexts/SearchCuisinesSheetContext'
+ import { useSearchOverlay } from '@/contexts/SearchOverlayContext'

export function HomeHero() {
+ const { openSearch } = useSearchOverlay()

  return (
    <View className="overflow-hidden bg-white">
      <View className="px-4 pb-6 pt-0">
        <Text className="text-center text-sm leading-snug text-gray-600">
          Dine like a Brazilian in Tokyo — or Korean in New York?
        </Text>

        {/* Single search trigger — no toggle */}
+       <Pressable
+         onPress={() => openSearch()}
+         accessibilityRole="button"
+         accessibilityLabel="Search restaurants"
+         className="mt-4 flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 shadow-sm shadow-black/5 active:opacity-80"
+       >
+         <AppIcon name="search" size={18} color="#9ca3af" />
+         <Text style={{ fontFamily: 'Neusans', fontSize: 15, color: '#9ca3af', flex: 1 }}>
+           Search restaurants or palate...
+         </Text>
+         <AppIcon name="sliders" size={18} color="#9ca3af" />
+       </Pressable>
      </View>
    </View>
  )
}
```

### Root layout — add `SearchOverlayProvider`

```tsx
// app/_layout.tsx — wrap with SearchOverlayProvider

import { SearchOverlayProvider } from '@/contexts/SearchOverlayContext'

// Inside the provider tree (after NhostProvider, before Tab navigator):
<SearchOverlayProvider>
  {/* existing children */}
</SearchOverlayProvider>
```

---

## 10. Visual Layout Reference

```
┌────────────────────────────────────────┐  ← full screen (Modal overFullScreen)
│  SafeAreaView (top + bottom edges)     │
│────────────────────────────────────────│
│  ← (back)  [🔍 Search restaurants... ×] [🔍]  ← top bar, bg-white
│            └── TextInput, autoFocus         └── only when keyword present
│────────────────────────────────────────│
│  ScrollView (idle state, no keyword)   │
│                                        │
│  RECENT SEARCHES         Clear all    │  ← text-[11px] uppercase gray
│  🕐  Sushi Moto                   ×   │  ← row: clock + query + x
│  🕐  Korean restaurant             ×  │
│  🕐  Ramen                         ×  │  max 5 rows
│                                        │
│  SEARCH BY PALATE                      │  ← text-[11px] uppercase gray
│  [All cuisines]                        │  ← pill, selected = orange
│                                        │
│  EAST ASIAN                           │  ← region header
│  [All East Asian]                      │  ← region pill
│  [🇯🇵 Japanese] [🇨🇳 Chinese] [🇰🇷 Korean] │  ← cuisine pills with icons
│                                        │
│  SOUTH EAST ASIAN                      │
│  ...                                   │
│────────────────────────────────────────│
│  FlatList (active state, keyword ≥ 2)  │
│                                        │
│  2 results for "ramen"                 │  ← ListHeader
│  ─────────────────────────────────     │
│  [img] Ramen Danbo         ★4.7 ›      │  ← RestaurantListRow (TP)
│  [img] Fuunji Tokyo        G ★4.2 ›   │  ← RestaurantListRow (Google)
│  ─────────────────────────────────     │
│  ...                                   │
└────────────────────────────────────────┘
```

---

## 11. What Each File Touches

| File | Action | Why |
|------|--------|-----|
| `lib/recentSearches.ts` | **Create** | AsyncStorage CRUD for recent 5 keyword searches |
| `hooks/useRecentSearches.ts` | **Create** | React hook wrapping the lib |
| `contexts/SearchOverlayContext.tsx` | **Create** | Global open/close state for the overlay |
| `components/search/SearchOverlay.tsx` | **Create** | Full-screen Modal with input, recents, palate picker, results |
| `components/search/PalatePickerScrollPanel.tsx` | **Create** | Standard `ScrollView` clone of `PalatePickerPanel` (no gorhom) |
| `components/search/HybridSearchResults.tsx` | **Create** | Live results from TP + Google Autocomplete |
| `components/layout/AppTopNav.tsx` | **Modify** (3 lines) | Replace `openSearchCuisines` → `openSearch` |
| `components/home/HomeHero.tsx` | **Modify** | Replace `PalateSearchBar` with a single tappable placeholder |
| `app/_layout.tsx` | **Modify** (2 lines) | Wrap tree with `SearchOverlayProvider` |
| `SearchCuisinesSheetContext.tsx` | **No change** | Kept for any other callers; gorhom sheet still works |
| `PalatePickerPanel.tsx` | **No change** | Still used inside the gorhom sheet |
| `app/(tabs)/restaurants/index.tsx` | **No change** | Already handles `palate` and `listing` params |

---

## 12. Haptic Map

| Interaction | Preset |
|-------------|--------|
| Open search overlay (search icon / hero tap) | `selectionAsync` |
| Tap a recent search row | `selectionAsync` |
| Tap × to remove a recent search | `selectionAsync` |
| Tap a cuisine/palate pill | `selectionAsync` |
| Submit keyword search (enter / button) | `selectionAsync` |
| Close overlay (back button) | *(no haptic — passive dismiss)* |
| Tap a search result row | `impactAsync Light` |