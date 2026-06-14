import { useEffect, useMemo, useRef, useState } from 'react'

import type { SavedLocationPreference } from '@/constants/locations'
import {
  cityNameFromLocation,
  cuisineSlugsForFilter,
  googleKeywordForCuisine,
} from '@/lib/restaurantDiscoveryHelpers'
import {
  hybridSearch,
  listPickerHybridSearch,
  nearbyHybridDiscovery,
  previewHybridSearch,
} from '@/lib/hybridSearch'
import type { HybridSearchMode } from '@/lib/restaurantSearchConfig'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'

const DEFAULT_DEBOUNCE_MS = 320

export interface UseRestaurantDiscoverySearchOptions {
  query: string
  location: SavedLocationPreference
  mode?: HybridSearchMode
  debounceMs?: number
  enabled?: boolean
  palateSlug?: string | null
  cuisineSlug?: string | null
  loadNearby?: boolean
}

export interface UseRestaurantDiscoverySearchResult {
  results: RestaurantSearchResult[]
  tpResults: RestaurantSearchResult[]
  googleResults: RestaurantSearchResult[]
  loading: boolean
  errors: { tp?: string; google?: string }
  tpNearby: RestaurantSearchResult[]
  nearbyPlaces: NearbyPlaceRow[]
  nearbyLoading: boolean
  nearbyErrors: { tp?: string; google?: string }
}

export function useRestaurantDiscoverySearch({
  query,
  location,
  mode = 'preview',
  debounceMs = DEFAULT_DEBOUNCE_MS,
  enabled = true,
  palateSlug = null,
  cuisineSlug = null,
  loadNearby = false,
}: UseRestaurantDiscoverySearchOptions): UseRestaurantDiscoverySearchResult {
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim())
  const [results, setResults] = useState<RestaurantSearchResult[]>([])
  const [tpResults, setTpResults] = useState<RestaurantSearchResult[]>([])
  const [googleResults, setGoogleResults] = useState<RestaurantSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ tp?: string; google?: string }>({})
  const [tpNearby, setTpNearby] = useState<RestaurantSearchResult[]>([])
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceRow[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyErrors, setNearbyErrors] = useState<{ tp?: string; google?: string }>({})

  const abortRef = useRef<AbortController | null>(null)
  const nearbyAbortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cityName = useMemo(() => cityNameFromLocation(location), [location.label, location.key])
  const coordinates = location.coordinates ?? null
  const cuisineSlugs = useMemo(() => cuisineSlugsForFilter(cuisineSlug), [cuisineSlug])
  const googleKeyword = useMemo(() => googleKeywordForCuisine(cuisineSlug), [cuisineSlug])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), debounceMs)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, debounceMs])

  useEffect(() => {
    nearbyAbortRef.current?.abort()

    if (!loadNearby) {
      setTpNearby([])
      setNearbyPlaces([])
      setNearbyLoading(false)
      setNearbyErrors({})
      return
    }

    if (
      !coordinates ||
      !Number.isFinite(coordinates.latitude) ||
      !Number.isFinite(coordinates.longitude)
    ) {
      setTpNearby([])
      setNearbyPlaces([])
      setNearbyLoading(false)
      setNearbyErrors({})
      return
    }

    const controller = new AbortController()
    nearbyAbortRef.current = controller
    setNearbyLoading(true)

    void nearbyHybridDiscovery(location.key, coordinates, {
      signal: controller.signal,
      cuisineSlugs,
      googleKeyword,
    })
      .then((response) => {
        if (controller.signal.aborted) return
        setTpNearby(response.tpResults)
        setNearbyPlaces(response.googlePlaces)
        setNearbyErrors(response.errors)
        setNearbyLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setTpNearby([])
        setNearbyPlaces([])
        setNearbyErrors({
          tp: err instanceof Error ? err.message : 'Nearby search failed',
        })
        setNearbyLoading(false)
      })

    return () => controller.abort()
  }, [
    loadNearby,
    location.key,
    coordinates?.latitude,
    coordinates?.longitude,
    cuisineSlugs,
    googleKeyword,
  ])

  useEffect(() => {
    abortRef.current?.abort()

    if (!enabled || debouncedQuery.length < 2) {
      setResults([])
      setTpResults([])
      setGoogleResults([])
      setErrors({})
      setLoading(false)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)

    const runSearch = async () => {
      const baseOpts = {
        signal: controller.signal,
        cityName,
        palateSlug,
        cuisineSlugs,
      }

      if (mode === 'listPicker') {
        return listPickerHybridSearch(debouncedQuery, location.key, coordinates, baseOpts)
      }
      if (mode === 'preview') {
        return previewHybridSearch(debouncedQuery, location.key, coordinates, baseOpts)
      }
      return hybridSearch(debouncedQuery, location.key, coordinates, {
        ...baseOpts,
        mode: 'browse',
      })
    }

    void runSearch()
      .then((response) => {
        if (controller.signal.aborted) return
        setResults(response.results)
        setTpResults(response.tpResults)
        setGoogleResults(response.googleResults)
        setErrors(response.errors)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResults([])
        setTpResults([])
        setGoogleResults([])
        setErrors({
          tp: err instanceof Error ? err.message : 'Search failed',
        })
        setLoading(false)
      })

    return () => controller.abort()
  }, [
    debouncedQuery,
    enabled,
    location.key,
    coordinates?.latitude,
    coordinates?.longitude,
    mode,
    cityName,
    palateSlug,
    cuisineSlugs,
  ])

  return {
    results,
    tpResults,
    googleResults,
    loading,
    errors,
    tpNearby,
    nearbyPlaces,
    nearbyLoading,
    nearbyErrors,
  }
}
