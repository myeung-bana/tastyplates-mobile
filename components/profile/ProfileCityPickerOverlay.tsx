import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'

import { FullScreenOverlay } from '@/components/layout/FullScreenOverlay'
import { LocationPickerScrollPanel } from '@/components/navigation/LocationPickerScrollPanel'
import { AppIcon } from '@/components/ui/AppIcon'
import { BRAND_PRIMARY, TEXT_BODY, TEXT_MUTED, mergeTextInputBodyTypography } from '@/constants/brand'
import { useLocationHierarchy } from '@/hooks/useLocationHierarchy'
import { filterCountriesByKeyword } from '@/lib/filterLocationCountries'
import {
  autocompleteCities,
  resolveProfileCitySelection,
  type PlacesAutocompletePrediction,
  type ProfileCitySelection,
} from '@/lib/googlePlaces'
import {
  cityNodeToSavedLocation,
  type LocationCityNode,
  type LocationCountryNode,
} from '@/services/onboardingService'
import { formatLocationDisplay } from '@/utils/locationUtils'

export type ProfileCityPickerOverlayProps = {
  visible: boolean
  title: string
  selectedPlaceId: string | null
  /** CMS slug when the saved city is a supported TastyPlates market. */
  selectedCmsSlug: string | null
  onSelectCity: (selection: ProfileCitySelection) => void
  onClose: () => void
}

/** Full-screen city picker — quick CMS picks + global Google `(cities)` search. */
export function ProfileCityPickerOverlay({
  visible,
  title,
  selectedPlaceId,
  selectedCmsSlug,
  onSelectCity,
  onClose,
}: ProfileCityPickerOverlayProps): JSX.Element | null {
  const inputRef = useRef<TextInput>(null)
  const [keyword, setKeyword] = useState('')
  const [predictions, setPredictions] = useState<PlacesAutocompletePrediction[]>([])
  const [searching, setSearching] = useState(false)
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  const {
    hierarchy,
    loading: hierarchyLoading,
    error: hierarchyError,
  } = useLocationHierarchy(visible)

  const supportedCountries = hierarchy?.hierarchy.countries ?? []
  const filteredSupportedCountries = useMemo(
    () => filterCountriesByKeyword(supportedCountries, keyword),
    [supportedCountries, keyword],
  )

  const showQuickPicks = keyword.trim().length < 2
  const showGoogleResults = keyword.trim().length >= 2

  useEffect(() => {
    if (!visible) {
      setKeyword('')
      setPredictions([])
      setSearchError(null)
      setResolvingPlaceId(null)
      return
    }
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [visible])

  useEffect(() => {
    if (!visible || !showGoogleResults) return

    let cancelled = false
    let handle: ReturnType<typeof globalThis.setTimeout> | undefined
    const q = keyword.trim()

    setSearching(true)
    setSearchError(null)

    handle = globalThis.setTimeout(() => {
      void (async () => {
        try {
          const rows = await autocompleteCities(q)
          if (!cancelled) setPredictions(rows)
        } catch (e) {
          if (!cancelled) {
            setPredictions([])
            setSearchError(e instanceof Error ? e.message : 'Could not search cities')
          }
        } finally {
          if (!cancelled) setSearching(false)
        }
      })()
    }, 320)

    return () => {
      cancelled = true
      if (handle !== undefined) clearTimeout(handle)
    }
  }, [keyword, showGoogleResults, visible])

  const handleClose = useCallback(() => {
    void Haptics.selectionAsync()
    setKeyword('')
    setPredictions([])
    setSearchError(null)
    onClose()
  }, [onClose])

  const pickPrediction = useCallback(
    (prediction: PlacesAutocompletePrediction) => {
      if (resolvingPlaceId) return
      setResolvingPlaceId(prediction.place_id)
      void (async () => {
        try {
          const selection = await resolveProfileCitySelection(prediction)
          if (!selection) {
            setSearchError('Could not resolve that city. Try another result.')
            return
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          setKeyword('')
          setPredictions([])
          onSelectCity(selection)
        } catch (e) {
          setSearchError(e instanceof Error ? e.message : 'Could not resolve city')
        } finally {
          setResolvingPlaceId(null)
        }
      })()
    },
    [onSelectCity, resolvingPlaceId],
  )

  const pickSupportedCity = useCallback(
    (city: LocationCityNode, country: LocationCountryNode) => {
      const pref = cityNodeToSavedLocation(city, country)
      const lat = pref.coordinates?.latitude
      const lng = pref.coordinates?.longitude
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setSearchError('This city has no map coordinates. Try searching for it instead.')
        return
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setKeyword('')
      setPredictions([])
      setSearchError(null)
      onSelectCity({
        label: formatLocationDisplay(pref, supportedCountries),
        latitude: lat!,
        longitude: lng!,
        location_slug: pref.key,
        google_place_id: null,
      })
    },
    [onSelectCity, supportedCountries],
  )

  if (!visible) return null

  const showGoogleEmpty =
    showGoogleResults &&
    !searching &&
    predictions.length === 0 &&
    !searchError

  return (
    <FullScreenOverlay onRequestClose={handleClose} keyboardAvoiding>
      <View className="flex-1">
        <View className="flex-row items-center gap-2.5 border-b border-gray-100 px-2 pb-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close city picker"
            hitSlop={12}
            onPress={handleClose}
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
              placeholder="Search any city worldwide…"
              placeholderTextColor="#9ca3af"
              value={keyword}
              onChangeText={setKeyword}
              returnKeyType="search"
              autoCapitalize="words"
              autoCorrect={false}
              accessibilityLabel="Search cities by name"
            />
            {keyword.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={10}
                onPress={() => {
                  setKeyword('')
                  inputRef.current?.focus()
                }}
              >
                <AppIcon name="x-circle" size={18} color={TEXT_MUTED} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="flex-1 px-4 pt-5">
          <Text className="mb-1 font-neusans text-lg font-semibold text-gray-900">{title}</Text>

          {showQuickPicks ? (
            <View className="mt-3 flex-1">
              <Text className="mb-4 font-neusans text-xs font-semibold uppercase tracking-wide text-gray-400">
                TastyPlates cities
              </Text>
              <View className="flex-1">
                <LocationPickerScrollPanel
                  countries={supportedCountries}
                  selectedKey={selectedCmsSlug ?? ''}
                  loading={hierarchyLoading}
                  error={hierarchyError}
                  onSelectCity={pickSupportedCity}
                />
              </View>
              <Text className="mt-3 pb-4 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                Or search above for any city worldwide.
              </Text>
            </View>
          ) : (
            <View className="mt-3 flex-1">
              <Text className="mb-4 font-neusans text-xs font-semibold uppercase tracking-wide text-gray-400">
                Search results
              </Text>

              {filteredSupportedCountries.length > 0 ? (
                <View className="mb-4">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Supported cities
                  </Text>
                  <LocationPickerScrollPanel
                    countries={filteredSupportedCountries}
                    selectedKey={selectedCmsSlug ?? ''}
                    loading={false}
                    error={null}
                    onSelectCity={pickSupportedCity}
                  />
                </View>
              ) : null}

              {searching ? (
                <View className="py-6">
                  <ActivityIndicator color={BRAND_PRIMARY} />
                </View>
              ) : null}

              {searchError ? (
                <Text className="py-4 text-sm" style={{ color: BRAND_PRIMARY }}>
                  {searchError}
                </Text>
              ) : null}

              {showGoogleEmpty ? (
                <Text className="py-6 text-center text-sm" style={{ color: TEXT_MUTED }}>
                  No cities match your search.
                </Text>
              ) : null}

              <FlatList
                className="flex-1"
                data={predictions}
                keyExtractor={(item) => item.place_id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const selected = selectedPlaceId === item.place_id
                  const resolving = resolvingPlaceId === item.place_id
                  const main = item.structured_formatting?.main_text ?? item.description
                  const secondary = item.structured_formatting?.secondary_text

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => pickPrediction(item)}
                      disabled={Boolean(resolvingPlaceId)}
                      className="border-b border-gray-100 py-3.5 active:opacity-80"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="mr-3 flex-1">
                          <Text className="text-base font-medium" style={{ color: TEXT_BODY }}>
                            {main}
                          </Text>
                          {secondary ? (
                            <Text className="mt-0.5 text-sm" style={{ color: TEXT_MUTED }}>
                              {secondary}
                            </Text>
                          ) : null}
                        </View>
                        {resolving ? (
                          <ActivityIndicator color={BRAND_PRIMARY} size="small" />
                        ) : selected ? (
                          <AppIcon name="check" size={20} color={BRAND_PRIMARY} />
                        ) : (
                          <AppIcon name="chevron-right" size={18} color={TEXT_MUTED} />
                        )}
                      </View>
                    </Pressable>
                  )
                }}
              />
            </View>
          )}
        </View>
      </View>
    </FullScreenOverlay>
  )
}
