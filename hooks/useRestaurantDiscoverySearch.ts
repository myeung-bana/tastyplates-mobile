import { useEffect, useMemo, useRef, useState } from 'react'

import type { SavedLocationPreference } from '@/constants/locations'
import { cityNameFromLocation } from '@/lib/restaurantDiscoveryHelpers'
import { listPickerHybridSearch, previewHybridSearch, hybridSearch } from '@/lib/hybridSearch'
import type { HybridSearchMode } from '@/lib/restaurantSearchConfig'
import { NEARBY_PICKER_RADIUS_METERS } from '@/lib/restaurantSearchConfig'
import { getNearbyRestaurants, type NearbyPlaceRow } from '@/lib/googlePlaces'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'

const DEFAULT_DEBOUNCE_MS = 320

export interface UseRestaurantDiscoverySearchOptions {
  query: string
  location: SavedLocationPreference
  mode?: HybridSearchMode
  debounceMs?: number
  enabled?: boolean
  palateSlug?: string | null
  loadNearby?: boolean
}

export interface UseRestaurantDiscoverySearchResult {
  results: RestaurantSearchResult[]
  tpResults: RestaurantSearchResult[]
  googleResults: RestaurantSearchResult[]
  loading: boolean
  errors: { tp?: string; google?: string }
  nearbyPlaces: NearbyPlaceRow[]
  nearbyLoading: boolean
}

export function useRestaurantDiscoverySearch({
  query,
  location,
  mode = 'preview',
  debounceMs = DEFAULT_DEBOUNCE_MS,
  enabled = true,
  palateSlug = null,
  loadNearby = false,
}: UseRestaurantDiscoverySearchOptions): UseRestaurantDiscoverySearchResult {
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim())
  const [results, setResults] = useState<RestaurantSearchResult[]>([])
  const [tpResults, setTpResults] = useState<RestaurantSearchResult[]>([])
  const [googleResults, setGoogleResults] = useState<RestaurantSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ tp?: string; google?: string }>({})
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceRow[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cityName = useMemo(() => cityNameFromLocation(location), [location.label, location.key])
  const coordinates = location.coordinates ?? null

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), debounceMs)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, debounceMs])

  useEffect(() => {
    if (!loadNearby) {
      setNearbyPlaces([])
      setNearbyLoading(false)
      return
    }

    let cancelled = false
    if (
      !coordinates ||
      !Number.isFinite(coordinates.latitude) ||
      !Number.isFinite(coordinates.longitude)
    ) {
      setNearbyPlaces([])
      setNearbyLoading(false)
      return
    }

    setNearbyLoading(true)
    void getNearbyRestaurants(coordinates, NEARBY_PICKER_RADIUS_METERS).then((rows) => {
      if (!cancelled) setNearbyPlaces(rows)
      if (!cancelled) setNearbyLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [loadNearby, location.key, coordinates?.latitude, coordinates?.longitude])

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
  ])

  return {
    results,
    tpResults,
    googleResults,
    loading,
    errors,
    nearbyPlaces,
    nearbyLoading,
  }
}
