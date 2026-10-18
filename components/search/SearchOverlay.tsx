import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { ImageFallback } from '@/components/brand/ImageFallback'
import { FullScreenOverlay } from '@/components/layout/FullScreenOverlay'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  BRAND_PRIMARY_TINT,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
  mergeTextInputBodyTypography,
} from '@/constants/brand'
import { palateOptions } from '@/constants/palateOptions'
import { RESTAURANT_PARENT_CATEGORIES } from '@/constants/restaurantCategories'
import {
  SCREEN_PLACES_GOOGLE_DETAIL,
  SCREEN_RESTAURANT_DETAIL,
  SCREEN_RESTAURANTS,
} from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { useLocation } from '@/contexts/LocationContext'
import type { OpenSearchOptions } from '@/contexts/SearchOverlayContext'
import { useRecentSearches } from '@/hooks/useRecentSearches'
import { useRestaurantDiscoverySearch } from '@/hooks/useRestaurantDiscoverySearch'
import { useUserPalate } from '@/hooks/useUserPalate'
import { getCuisineIconForSlug } from '@/lib/cuisineIconAssets'
import { resolveEffectiveFeaturedImageUrl } from '@/lib/featuredImageUtils'
import { openRecentSearch } from '@/lib/openRecentSearch'
import { recentKindLabel, type RecentSearch, type RecentSearchInput } from '@/lib/recentSearches'
import { formatRestaurantSearchResultAddress } from '@/lib/restaurantDiscoveryHelpers'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isTPResult } from '@/types/restaurantSearchResult'

const DEBOUNCE_MS = 320
const NAV_DELAY_MS = 120

/** "Browse by category" chips on the empty state (design S1). */
const BROWSE_CATEGORIES: { label: string; slug: string }[] = [
  { label: 'Restaurant', slug: 'casual-dining' },
  { label: 'Café', slug: 'cafe' },
  { label: 'Bar', slug: 'bar' },
  { label: 'Bakery', slug: 'bakery' },
  { label: 'Dessert', slug: 'dessert-shop' },
]

type CuisineHit = { slug: string; label: string; regionKey: string | null; mine: boolean }

function matchCuisines(q: string, palate: readonly string[]): CuisineHit[] {
  const hits: CuisineHit[] = []
  for (const region of palateOptions) {
    if (region.label.toLowerCase().includes(q)) {
      hits.push({ slug: region.key, label: region.label, regionKey: region.key, mine: false })
    }
    for (const c of region.children) {
      if (c.label.toLowerCase().includes(q) || c.key.includes(q)) {
        hits.push({ slug: c.key, label: c.label, regionKey: region.key, mine: palate.includes(c.key) })
      }
    }
  }
  return hits.sort((a, b) => Number(b.mine) - Number(a.mine)).slice(0, 4)
}

function SectionLabel({ children }: { children: string }): JSX.Element {
  return (
    <Text
      style={{
        fontFamily: FONT.heading,
        fontSize: 11,
        letterSpacing: 2.2,
        textTransform: 'uppercase',
        color: TEXT_MUTED,
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  )
}

function ResultRow({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  accessibilityLabel,
}: {
  leading: JSX.Element
  title: string
  subtitle?: string
  trailing?: JSX.Element | null
  onPress: () => void
  accessibilityLabel?: string
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      className="flex-row items-center active:opacity-70"
      style={{ gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SURFACE_FOG }}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text numberOfLines={1} style={{ fontFamily: FONT.headingMedium, fontSize: 16, color: TEXT_HEADING }}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? null}
    </Pressable>
  )
}

interface SearchOverlayProps {
  initialOpts: OpenSearchOptions
  onClose: () => void
}

/**
 * Full-screen search (design S1), opened from the Home hero and the top-bar search.
 * Searches cuisines, categories and restaurants at once; the first row always sends the raw
 * keyword to Explore. Recents are stored on the device.
 */
export function SearchOverlay({ initialOpts, onClose }: SearchOverlayProps) {
  const inputRef = useRef<TextInput>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { location } = useLocation()
  const { palate } = useUserPalate()

  const [keyword, setKeyword] = useState(initialOpts.initialKeyword ?? '')
  const [debounced, setDebounced] = useState(initialOpts.initialKeyword ?? '')
  const [focused, setFocused] = useState(true)
  const { recents, add: addRecent, remove: removeRecent } = useRecentSearches()

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const onChange = useCallback((text: string) => {
    setKeyword(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(text), DEBOUNCE_MS)
  }, [])

  const q = keyword.trim()
  const ql = q.toLowerCase()
  const cuisineHits = useMemo(() => (ql ? matchCuisines(ql, palate ?? []) : []), [ql, palate])
  const categoryHits = useMemo(
    () => (ql ? RESTAURANT_PARENT_CATEGORIES.filter((c) => c.label.toLowerCase().includes(ql)).slice(0, 3) : []),
    [ql],
  )

  const { tpResults, googleResults, loading } = useRestaurantDiscoverySearch({
    query: debounced,
    location,
    mode: 'preview',
    enabled: debounced.trim().length >= 2,
    cuisineSlug: initialOpts.initialPalateKey ?? null,
  })
  const restaurantHits = useMemo(() => [...tpResults, ...googleResults].slice(0, 5), [googleResults, tpResults])

  /** Close first, then navigate once the modal is gone. */
  const go = useCallback(
    async (recent: RecentSearchInput | null, navigate: () => void) => {
      void Haptics.selectionAsync()
      if (recent) await addRecent(recent)
      onClose()
      setTimeout(navigate, NAV_DELAY_MS)
    },
    [addRecent, onClose],
  )

  const searchKeyword = useCallback(
    (text: string) => {
      const value = text.trim()
      if (!value) return
      void go({ query: value, kind: 'keyword' }, () =>
        router.navigate({ pathname: SCREEN_RESTAURANTS, params: { listing: value } }),
      )
    },
    [go],
  )

  const openCuisine = useCallback(
    (hit: { slug: string; label: string }) =>
      void go({ query: hit.label, kind: 'cuisine', value: hit.slug }, () =>
        router.navigate({ pathname: SCREEN_RESTAURANTS, params: { cuisine: hit.slug } }),
      ),
    [go],
  )

  const openCategory = useCallback(
    (hit: { slug: string; label: string }) =>
      void go({ query: hit.label, kind: 'category', value: hit.slug }, () =>
        router.navigate({ pathname: SCREEN_RESTAURANTS, params: { category: hit.slug } }),
      ),
    [go],
  )

  const openRestaurant = useCallback(
    (result: RestaurantSearchResult) => {
      const value = isTPResult(result) ? result.slug : `google:${result.place_id}`
      void go({ query: result.title, kind: 'restaurant', value }, () => {
        if (isTPResult(result)) {
          router.push({ pathname: SCREEN_RESTAURANT_DETAIL, params: { slug: result.slug } })
        } else {
          router.push({ pathname: SCREEN_PLACES_GOOGLE_DETAIL, params: { place_id: result.place_id } })
        }
      })
    },
    [go],
  )

  const openRecent = useCallback(
    (recent: RecentSearch) => void go(recent, () => openRecentSearch(router, recent)),
    [go],
  )

  const searching = debounced.trim().length >= 2
  const noResults =
    Boolean(ql) && searching && !loading && !cuisineHits.length && !categoryHits.length && !restaurantHits.length

  return (
    <FullScreenOverlay onRequestClose={onClose} keyboardAvoiding>
      <View className="flex-1">
        <View className="flex-row items-center" style={{ gap: 10, paddingHorizontal: 16, paddingTop: 4 }}>
          <View
            className="flex-row items-center"
            style={{
              flex: 1,
              height: 48,
              borderRadius: 12,
              backgroundColor: SURFACE_FOG,
              borderWidth: 1.5,
              borderColor: focused ? BRAND_PRIMARY : 'transparent',
              paddingHorizontal: 12,
              gap: 10,
            }}
          >
            <AppIcon name="search" size={18} color={TEXT_MUTED} />
            <TextInput
              ref={inputRef}
              value={keyword}
              onChangeText={onChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Cuisine, restaurant or dish"
              placeholderTextColor={TEXT_TERTIARY}
              returnKeyType="search"
              onSubmitEditing={() => searchKeyword(keyword)}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search"
              style={mergeTextInputBodyTypography({ flex: 1, minWidth: 0, color: TEXT_HEADING })}
            />
            {keyword.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={10}
                onPress={() => {
                  setKeyword('')
                  setDebounced('')
                  inputRef.current?.focus()
                }}
              >
                <AppIcon name="x-circle" size={18} color={TEXT_TERTIARY} />
              </Pressable>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} className="justify-center" style={{ height: 44 }}>
            <Text style={{ fontFamily: FONT.headingMedium, fontSize: 15, color: TEXT_MUTED }}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 30, gap: 22 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {!ql ? (
            <>
              {recents.length > 0 ? (
                <View>
                  <SectionLabel>Recent searches</SectionLabel>
                  {recents.map((r) => (
                    <Pressable
                      key={`${r.kind ?? 'keyword'}:${r.query}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${r.query}, ${recentKindLabel(r.kind)}`}
                      onPress={() => openRecent(r)}
                      onLongPress={() => void removeRecent(r)}
                      className="flex-row items-center active:opacity-70"
                      style={{ height: 48, gap: 12 }}
                    >
                      <AppIcon name="clock" size={16} color={TEXT_TERTIARY} />
                      <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.headingMedium, fontSize: 15, color: TEXT_HEADING }}>
                        {r.query}
                      </Text>
                      <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_TERTIARY }}>{recentKindLabel(r.kind)}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <View style={{ gap: 12 }}>
                <SectionLabel>Browse by category</SectionLabel>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {BROWSE_CATEGORIES.map((c) => (
                    <Pressable
                      key={c.slug}
                      accessibilityRole="button"
                      onPress={() => openCategory(c)}
                      className="active:opacity-70"
                      style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1.5, borderColor: BORDER_SUBTLE }}
                    >
                      <Text style={{ fontFamily: FONT.headingMedium, fontSize: 14, color: TEXT_HEADING }}>{c.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              <ResultRow
                onPress={() => searchKeyword(q)}
                accessibilityLabel={`Search ${q} in Explore`}
                leading={
                  <View className="items-center justify-center" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: BRAND_PRIMARY_TINT }}>
                    <AppIcon name="search" size={18} color={BRAND_PRIMARY} />
                  </View>
                }
                title={`Search “${q}” in Explore`}
                subtitle="Keyword · map and list"
              />

              {cuisineHits.length > 0 ? (
                <View>
                  <SectionLabel>Cuisines</SectionLabel>
                  {cuisineHits.map((hit) => {
                    const icon = getCuisineIconForSlug(hit.slug, hit.regionKey)
                    return (
                      <ResultRow
                        key={hit.slug}
                        onPress={() => openCuisine(hit)}
                        leading={
                          <View className="items-center justify-center" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: SURFACE_FOG }}>
                            {icon ? (
                              <Image source={icon} style={{ width: 26, height: 26 }} resizeMode="contain" />
                            ) : (
                              <Text style={{ fontFamily: FONT.heading, fontSize: 16, color: TEXT_HEADING }}>{hit.label[0]}</Text>
                            )}
                          </View>
                        }
                        title={hit.label}
                        subtitle={`Cuisine · ${location.label}`}
                        trailing={
                          hit.mine ? (
                            <View style={{ paddingVertical: 5, paddingHorizontal: 8, borderRadius: 50, backgroundColor: BRAND_PRIMARY_TINT }}>
                              <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 10, color: BRAND_PRIMARY_DARK }}>Your palate</Text>
                            </View>
                          ) : null
                        }
                      />
                    )
                  })}
                </View>
              ) : null}

              {categoryHits.length > 0 ? (
                <View>
                  <SectionLabel>Categories</SectionLabel>
                  {categoryHits.map((c) => (
                    <ResultRow
                      key={c.slug}
                      onPress={() => openCategory(c)}
                      leading={
                        <View className="items-center justify-center" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: SURFACE_FOG }}>
                          <AppIcon name="tag" size={17} color={TEXT_MUTED} />
                        </View>
                      }
                      title={c.label}
                    />
                  ))}
                </View>
              ) : null}

              {restaurantHits.length > 0 ? (
                <View>
                  <SectionLabel>Restaurants</SectionLabel>
                  {restaurantHits.map((r) => {
                    const tp = isTPResult(r)
                    const img = resolveEffectiveFeaturedImageUrl(r.featured_image_url)
                    const rating = tp ? r.average_rating : r.google_rating
                    const street = formatRestaurantSearchResultAddress(r)
                    const cuisine = r.cuisines[0]?.name
                    return (
                      <ResultRow
                        key={tp ? `tp-${r.id}` : `g-${r.place_id}`}
                        onPress={() => openRestaurant(r)}
                        leading={
                          img ? (
                            <Image source={{ uri: img }} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: SURFACE_FOG }} />
                          ) : (
                            <ImageFallback size={48} style={{ borderRadius: 12 }} />
                          )
                        }
                        title={r.title}
                        subtitle={
                          tp
                            ? [cuisine, street].filter(Boolean).join(' · ')
                            : ['Not on Tastyplates yet', street].filter(Boolean).join(' · ')
                        }
                        trailing={
                          rating ? (
                            <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 13, color: TEXT_HEADING }}>
                              <Text style={{ color: BRAND_PRIMARY, fontSize: 12 }}>★</Text> {rating.toFixed(1)}
                            </Text>
                          ) : null
                        }
                      />
                    )
                  })}
                </View>
              ) : null}

              {loading && searching ? <ActivityIndicator color={BRAND_PRIMARY} style={{ marginTop: 4 }} /> : null}

              {noResults ? (
                <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 20, color: TEXT_MUTED }}>
                  No cuisines or restaurants match “{q}”. Searching Explore will still check nearby Google places.
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </FullScreenOverlay>
  )
}
