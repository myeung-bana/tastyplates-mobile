import { ActivityIndicator, FlatList, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { DiscoveryErrorBanner, DiscoverySectionHeader } from '@/components/restaurant-search/DiscoverySectionHeader'
import { RestaurantListRow } from '@/components/restaurant/RestaurantListRow'
import { ListPickerDiscoveryRow } from '@/components/restaurant-search/ListPickerDiscoveryRow'
import { ListPickerNearbyRow } from '@/components/studio/manage-lists/ListPickerRestaurantRow'
import { NearbyRestaurantRow } from '@/components/studio/add-review/RestaurantSearchRows'
import {
  NearbyEmptyState,
  NearbySkeletonList,
} from '@/components/studio/add-review/RestaurantSearchRows'
import { BRAND_PRIMARY } from '@/constants/brand'
import { discoveryErrorMessage } from '@/lib/restaurantDiscoveryHelpers'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'

type DiscoveryResultsVariant = 'navigate' | 'addToList'

interface RestaurantDiscoveryResultsProps {
  keyword: string
  variant: DiscoveryResultsVariant
  loading: boolean
  tpResults: RestaurantSearchResult[]
  googleResults: RestaurantSearchResult[]
  errors: { tp?: string; google?: string }
  onSelect?: (result: RestaurantSearchResult) => void
  onAddResult?: (result: RestaurantSearchResult) => void
  addingId?: string | null
  addDisabled?: boolean
}

function DiscoveryResultRow({
  row,
  variant,
  onSelect,
  onAddResult,
  addingId,
  addDisabled,
}: {
  row: RestaurantSearchResult
  variant: DiscoveryResultsVariant
  onSelect?: (result: RestaurantSearchResult) => void
  onAddResult?: (result: RestaurantSearchResult) => void
  addingId?: string | null
  addDisabled?: boolean
}): JSX.Element {
  if (variant === 'navigate') {
    return (
      <RestaurantListRow
        result={row}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onSelect?.(row)
        }}
      />
    )
  }

  return (
    <ListPickerDiscoveryRow
      result={row}
      onAdd={() => onAddResult?.(row)}
      adding={
        addingId != null &&
        (isTPResult(row) ? addingId === row.uuid : addingId === row.place_id)
      }
      disabled={addDisabled}
    />
  )
}

export function RestaurantDiscoveryResults({
  keyword,
  variant,
  loading,
  tpResults,
  googleResults,
  errors,
  onSelect,
  onAddResult,
  addingId,
  addDisabled,
}: RestaurantDiscoveryResultsProps): JSX.Element {
  const errorMessage = discoveryErrorMessage(errors)
  const totalCount = tpResults.length + googleResults.length

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center pt-10">
        <ActivityIndicator color={BRAND_PRIMARY} />
        <Text className="mt-2.5 font-neusans text-sm text-gray-400">Searching...</Text>
      </View>
    )
  }

  if (totalCount === 0) {
    return (
      <View className="flex-1 px-6 pt-8">
        {errorMessage ? <DiscoveryErrorBanner message={errorMessage} /> : null}
        <Text className="mt-4 text-center font-neusans text-base font-medium text-gray-700">
          No results for &quot;{keyword}&quot;
        </Text>
        <Text className="mt-1.5 text-center font-neusans text-sm text-gray-400">
          Try a different name or check your connection
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={[{ key: 'sections' }]}
      keyExtractor={(item) => item.key}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        <>
          {errorMessage ? <DiscoveryErrorBanner message={errorMessage} /> : null}
          <DiscoverySectionHeader title={`Search results for "${keyword}"`} />
        </>
      }
      renderItem={() => (
        <>
          {tpResults.length > 0 ? (
            <>
              <DiscoverySectionHeader title="Recommended" />
              {tpResults.map((row) => (
                <DiscoveryResultRow
                  key={isTPResult(row) ? row.uuid : row.place_id}
                  row={row}
                  variant={variant}
                  onSelect={onSelect}
                  onAddResult={onAddResult}
                  addingId={addingId}
                  addDisabled={addDisabled}
                />
              ))}
            </>
          ) : null}

          {googleResults.length > 0 ? (
            <>
              <DiscoverySectionHeader title="Nearby" />
              {googleResults.map((row) => (
                <DiscoveryResultRow
                  key={isGoogleResult(row) ? row.place_id : row.title}
                  row={row}
                  variant={variant}
                  onSelect={onSelect}
                  onAddResult={onAddResult}
                  addingId={addingId}
                  addDisabled={addDisabled}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    />
  )
}

interface RestaurantDiscoveryNearbyProps {
  tpResults: RestaurantSearchResult[]
  places: NearbyPlaceRow[]
  loading: boolean
  variant: DiscoveryResultsVariant
  errors?: { tp?: string; google?: string }
  onSelectTp?: (result: RestaurantSearchResult) => void
  onAddTp?: (result: RestaurantSearchResult) => void
  onSelectNearby?: (row: NearbyPlaceRow) => void
  onAddNearby?: (row: NearbyPlaceRow) => void
  addingId?: string | null
  addingPlaceId?: string | null
  addDisabled?: boolean
}

export function RestaurantDiscoveryNearby({
  tpResults,
  places,
  loading,
  variant,
  errors = {},
  onSelectTp,
  onAddTp,
  onSelectNearby,
  onAddNearby,
  addingId,
  addingPlaceId,
  addDisabled,
}: RestaurantDiscoveryNearbyProps): JSX.Element {
  const errorMessage = discoveryErrorMessage(errors)
  const hasResults = tpResults.length > 0 || places.length > 0

  if (loading) return <NearbySkeletonList />

  if (!hasResults) {
    return (
      <>
        {errorMessage ? <DiscoveryErrorBanner message={errorMessage} /> : null}
        <NearbyEmptyState />
      </>
    )
  }

  return (
    <>
      {errorMessage ? <DiscoveryErrorBanner message={errorMessage} /> : null}

      {tpResults.length > 0 ? (
        <>
          <DiscoverySectionHeader title="Recommended" />
          {tpResults.map((row) =>
            variant === 'addToList' ? (
              <ListPickerDiscoveryRow
                key={isTPResult(row) ? row.uuid : row.place_id}
                result={row}
                onAdd={() => onAddTp?.(row)}
                adding={addingId != null && isTPResult(row) && addingId === row.uuid}
                disabled={addDisabled}
              />
            ) : (
              <RestaurantListRow
                key={isTPResult(row) ? row.uuid : row.place_id}
                result={row}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  onSelectTp?.(row)
                }}
              />
            ),
          )}
        </>
      ) : null}

      {places.length > 0 ? (
        <>
          <DiscoverySectionHeader title="Nearby" />
          {places.map((row) =>
            variant === 'addToList' ? (
              <ListPickerNearbyRow
                key={row.place_id}
                row={row}
                onAdd={() => onAddNearby?.(row)}
                adding={addingPlaceId === row.place_id}
                disabled={addDisabled}
              />
            ) : (
              <NearbyRestaurantRow
                key={row.place_id}
                row={row}
                onPress={() => onSelectNearby?.(row)}
              />
            ),
          )}
        </>
      ) : null}
    </>
  )
}
