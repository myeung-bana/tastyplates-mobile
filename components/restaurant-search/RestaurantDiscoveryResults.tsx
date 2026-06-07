import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { DiscoveryErrorBanner, DiscoverySectionHeader } from '@/components/restaurant-search/DiscoverySectionHeader'
import { RestaurantListRow } from '@/components/restaurant/RestaurantListRow'
import { ListPickerDiscoveryRow } from '@/components/restaurant-search/ListPickerDiscoveryRow'
import { ListPickerNearbyRow } from '@/components/studio/manage-lists/ListPickerRestaurantRow'
import {
  NearbyEmptyState,
  NearbySkeletonList,
  SearchEmptyState,
} from '@/components/studio/add-review/RestaurantSearchRows'
import { BRAND_PRIMARY } from '@/constants/brand'
import { discoveryErrorMessage } from '@/lib/restaurantDiscoveryHelpers'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'

type DiscoveryResultsVariant = 'navigate' | 'addToList'

interface RestaurantDiscoveryResultsProps {
  keyword: string
  variant: DiscoveryResultsVariant
  loading: boolean
  results: RestaurantSearchResult[]
  errors: { tp?: string; google?: string }
  onSelect?: (result: RestaurantSearchResult) => void
  onAddResult?: (result: RestaurantSearchResult) => void
  addingId?: string | null
  addDisabled?: boolean
}

export function RestaurantDiscoveryResults({
  keyword,
  variant,
  loading,
  results,
  errors,
  onSelect,
  onAddResult,
  addingId,
  addDisabled,
}: RestaurantDiscoveryResultsProps): JSX.Element {
  const errorMessage = discoveryErrorMessage(errors)

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center pt-10">
        <ActivityIndicator color={BRAND_PRIMARY} />
        <Text className="mt-2.5 font-neusans text-sm text-gray-400">Searching...</Text>
      </View>
    )
  }

  if (results.length === 0) {
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
      data={results}
      keyExtractor={(row) => (row.source === 'tp' ? row.uuid : row.place_id)}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        <>
          {errorMessage ? <DiscoveryErrorBanner message={errorMessage} /> : null}
          <DiscoverySectionHeader
            title={`${results.length} result${results.length !== 1 ? 's' : ''} for "${keyword}"`}
          />
        </>
      }
      renderItem={({ item: row }) =>
        variant === 'navigate' ? (
          <View>
            <RestaurantListRow
              result={row}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onSelect?.(row)
              }}
            />
            <View className="mx-4 h-px bg-gray-100" />
          </View>
        ) : (
          <ListPickerDiscoveryRow
            result={row}
            onAdd={() => onAddResult?.(row)}
            adding={
              addingId != null &&
              (row.source === 'tp' ? addingId === row.uuid : addingId === row.place_id)
            }
            disabled={addDisabled}
          />
        )
      }
    />
  )
}

interface RestaurantDiscoveryNearbyProps {
  places: NearbyPlaceRow[]
  loading: boolean
  variant: DiscoveryResultsVariant
  onSelectNearby?: (row: NearbyPlaceRow) => void
  onAddNearby?: (row: NearbyPlaceRow) => void
  addingPlaceId?: string | null
  addDisabled?: boolean
}

export function RestaurantDiscoveryNearby({
  places,
  loading,
  variant,
  onSelectNearby,
  onAddNearby,
  addingPlaceId,
  addDisabled,
}: RestaurantDiscoveryNearbyProps): JSX.Element {
  if (loading) return <NearbySkeletonList />

  if (places.length === 0) return <NearbyEmptyState />

  return (
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
          <Pressable
            key={row.place_id}
            onPress={() => onSelectNearby?.(row)}
            className="border-b border-gray-50 px-4 py-3 active:bg-gray-50"
          >
            <Text className="font-neusans text-[15px] font-medium text-[#31343F]">{row.name}</Text>
            {row.address ? (
              <Text className="mt-0.5 font-neusans text-[13px] text-gray-500" numberOfLines={1}>
                {row.address}
              </Text>
            ) : null}
          </Pressable>
        ),
      )}
    </>
  )
}
