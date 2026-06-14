import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'

import { FullScreenOverlay } from '@/components/layout/FullScreenOverlay'
import { RestaurantDiscoveryNearby, RestaurantDiscoveryResults } from '@/components/restaurant-search/RestaurantDiscoveryResults'
import { CuisineFilterPills } from '@/components/studio/add-review/CuisineFilterPills'
import { ReviewSearchHelpFooter } from '@/components/reviews/RestaurantMatchInlineMobile'
import { AppIcon } from '@/components/ui/AppIcon'
import { BRAND_PRIMARY, mergeTextInputBodyTypography } from '@/constants/brand'
import { listItemAddedSuccess } from '@/constants/messages'
import { useLocation } from '@/contexts/LocationContext'
import { matchRestaurantForPlace } from '@/lib/findTastyPlatesMatch'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import { fetchGooglePlaceDetails, googlePlacePhotoUrl } from '@/lib/googlePlaces'
import { listItemAddErrorMessage } from '@/lib/listItemAddErrorMessage'
import { useRestaurantDiscoverySearch } from '@/hooks/useRestaurantDiscoverySearch'
import { addListItem } from '@/services/restaurantListService'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'
import { formatLocationDisplay } from '@/utils/locationUtils'
import { toast } from '@/utils/toast'

export interface AddRestaurantOverlayContentProps {
  listUuid: string
  listTitle?: string
  onClose: () => void
}

export function AddRestaurantOverlayContent({
  listUuid,
  listTitle,
  onClose,
}: AddRestaurantOverlayContentProps): JSX.Element {
  const { location, hierarchy } = useLocation()
  const hierarchyCountries = hierarchy?.hierarchy.countries ?? null
  const localityLine = formatLocationDisplay(location, hierarchyCountries)

  const [query, setQuery] = useState('')
  const [activeCuisineFilter, setActiveCuisineFilter] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  const selectSeqRef = useRef(0)

  const hasQuery = query.trim().length >= 2
  const isAdding = addingId != null

  const {
    tpResults,
    googleResults,
    loading: searchLoading,
    errors: searchErrors,
    tpNearby,
    nearbyPlaces,
    nearbyLoading,
    nearbyErrors,
  } = useRestaurantDiscoverySearch({
    query,
    location,
    mode: 'listPicker',
    enabled: hasQuery && !isAdding,
    loadNearby: !hasQuery,
    cuisineSlug: activeCuisineFilter,
  })

  const addGooglePlace = useCallback(
    async (placeId: string, name: string) => {
      if (!listUuid) return
      const seq = ++selectSeqRef.current
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setAddingId(placeId)

      try {
        const placeData = await fetchGooglePlaceDetails(placeId)
        if (seq !== selectSeqRef.current) return
        if (!placeData) {
          toast.error('Could not load restaurant details.')
          return
        }

        const address = placeData.formatted_address ?? placeData.vicinity ?? ''
        const existing = await matchRestaurantForPlace({
          placeId,
          name: placeData.name ?? name,
          address,
          latitude: placeData.geometry?.location?.lat,
          longitude: placeData.geometry?.location?.lng,
        })
        if (seq !== selectSeqRef.current) return

        const photoRef = placeData.photos?.[0]?.photo_reference
        await addListItem({
          list_uuid: listUuid,
          restaurant_uuid: existing?.uuid ?? undefined,
          google_place_id: placeId,
          place_name: placeData.name ?? name,
          place_address: address || undefined,
          place_photo_url: photoRef ? googlePlacePhotoUrl(photoRef, 400) : undefined,
          place_rating: placeData.rating,
          place_latitude: placeData.geometry?.location?.lat,
          place_longitude: placeData.geometry?.location?.lng,
          restaurant_slug: existing?.slug,
        })

        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        toast.success(listItemAddedSuccess(placeData.name ?? name))
        onClose()
      } catch (err) {
        if (seq !== selectSeqRef.current) return
        toast.error(listItemAddErrorMessage(err))
      } finally {
        if (seq === selectSeqRef.current) setAddingId(null)
      }
    },
    [listUuid, onClose],
  )

  const addTpResult = useCallback(
    async (result: RestaurantSearchResult) => {
      if (!isTPResult(result) || !listUuid) return
      const seq = ++selectSeqRef.current
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setAddingId(result.uuid)

      try {
        await addListItem({
          list_uuid: listUuid,
          restaurant_uuid: result.uuid,
          restaurant_slug: result.slug,
          google_place_id: result.google_place_id ?? undefined,
          place_name: result.title,
          place_address:
            result.listing_street ??
            result.address?.street_address ??
            undefined,
        })

        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        toast.success(listItemAddedSuccess(result.title))
        onClose()
      } catch (err) {
        if (seq !== selectSeqRef.current) return
        toast.error(listItemAddErrorMessage(err))
      } finally {
        if (seq === selectSeqRef.current) setAddingId(null)
      }
    },
    [listUuid, onClose],
  )

  const handleAddResult = useCallback(
    (result: RestaurantSearchResult) => {
      if (isGoogleResult(result)) {
        void addGooglePlace(result.place_id, result.title)
        return
      }
      void addTpResult(result)
    },
    [addGooglePlace, addTpResult],
  )

  const handleAddNearby = useCallback(
    (row: NearbyPlaceRow) => {
      if (!row.place_id) return
      void addGooglePlace(row.place_id, row.name)
    },
    [addGooglePlace],
  )

  const clearSearch = useCallback(() => {
    selectSeqRef.current += 1
    setQuery('')
    setAddingId(null)
  }, [])

  return (
    <FullScreenOverlay onRequestClose={onClose} keyboardAvoiding>
      <View className="flex-1">
        <View className="border-b border-gray-100 pb-2">
          <View className="mb-2 flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              onPress={onClose}
              className="p-1"
            >
              <AppIcon name="arrow-left" size={22} color="#374151" />
            </Pressable>
            <Text className="flex-1 font-neusans text-base font-semibold text-[#31343F]" numberOfLines={1}>
              {listTitle ? `Add to ${listTitle}` : 'Add restaurant'}
            </Text>
          </View>

          <View className="flex-row items-center gap-2.5 rounded-[14px] bg-gray-100 px-3 py-2.5">
            <AppIcon name="search" size={18} color="#9ca3af" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search restaurants..."
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              editable={!isAdding}
              style={[
                { flex: 1, fontSize: 16 },
                mergeTextInputBodyTypography(),
              ]}
            />
            {searchLoading ? <ActivityIndicator size="small" color={BRAND_PRIMARY} /> : null}
            {query.length > 0 && !searchLoading ? (
              <Pressable accessibilityRole="button" onPress={clearSearch} hitSlop={8}>
                <AppIcon name="x" size={16} color="#9ca3af" />
              </Pressable>
            ) : null}
          </View>

          <Text className="mt-2 font-neusans text-xs text-gray-400">
            Searching in {localityLine}
          </Text>
        </View>

        <View style={{ flexGrow: 0, flexShrink: 0 }}>
          <CuisineFilterPills
            activeCuisineFilter={activeCuisineFilter}
            onSelect={setActiveCuisineFilter}
          />
        </View>

        {hasQuery ? (
          <RestaurantDiscoveryResults
            keyword={query.trim()}
            variant="addToList"
            loading={searchLoading}
            tpResults={tpResults}
            googleResults={googleResults}
            errors={searchErrors}
            onAddResult={handleAddResult}
            addingId={addingId}
            addDisabled={isAdding}
          />
        ) : (
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <RestaurantDiscoveryNearby
              tpResults={tpNearby}
              places={nearbyPlaces}
              loading={nearbyLoading}
              variant="addToList"
              errors={nearbyErrors}
              onAddTp={addTpResult}
              onAddNearby={handleAddNearby}
              addingId={addingId}
              addingPlaceId={addingId}
              addDisabled={isAdding}
            />
            {!isAdding ? <ReviewSearchHelpFooter /> : null}
          </ScrollView>
        )}
      </View>
    </FullScreenOverlay>
  )
}
