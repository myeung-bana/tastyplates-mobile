import { memo, useEffect, useMemo, useState } from 'react'
import { Marker } from 'react-native-maps'

import { RestaurantMapPin } from '@/components/restaurant/RestaurantMapPin'
import {
  restaurantSearchResultCoords,
  restaurantSearchResultId,
  restaurantSearchResultRating,
} from '@/lib/restaurantSearchMerge'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isTPResult } from '@/types/restaurantSearchResult'

const TRACKS_VIEW_CHANGES_MS = 400

export type RestaurantMapMarkerProps = {
  result: RestaurantSearchResult
  isSelected: boolean
  onPress: (result: RestaurantSearchResult) => void
  /** Palate match 0–100 when a palate cuisine filter is active. */
  matchPercent?: number | null
}

/**
 * Memoized map marker with brief `tracksViewChanges` after mount/selection updates —
 * avoids custom-pin flicker from react-native-maps snapshotting too early or too often.
 */
function RestaurantMapMarkerInner({
  result,
  isSelected,
  onPress,
  matchPercent = null,
}: RestaurantMapMarkerProps): JSX.Element | null {
  const coords = restaurantSearchResultCoords(result)
  const rating = restaurantSearchResultRating(result)
  const id = restaurantSearchResultId(result)

  const coordinate = useMemo(
    () =>
      coords.latitude != null && coords.longitude != null
        ? { latitude: coords.latitude, longitude: coords.longitude }
        : null,
    [coords.latitude, coords.longitude],
  )

  const [tracksViewChanges, setTracksViewChanges] = useState(true)

  useEffect(() => {
    setTracksViewChanges(true)
    const timer = setTimeout(() => setTracksViewChanges(false), TRACKS_VIEW_CHANGES_MS)
    return () => clearTimeout(timer)
  }, [isSelected, rating, id, matchPercent])

  if (!coordinate) return null

  return (
    <Marker
      identifier={id}
      coordinate={coordinate}
      stopPropagation
      onPress={() => onPress(result)}
      tracksViewChanges={tracksViewChanges}
    >
      <RestaurantMapPin
        isSelected={isSelected}
        rating={rating}
        isGoogle={!isTPResult(result)}
        matchPercent={matchPercent}
      />
    </Marker>
  )
}

export const RestaurantMapMarker = memo(
  RestaurantMapMarkerInner,
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.matchPercent === next.matchPercent &&
    restaurantSearchResultId(prev.result) === restaurantSearchResultId(next.result) &&
    restaurantSearchResultRating(prev.result) === restaurantSearchResultRating(next.result) &&
    restaurantSearchResultCoords(prev.result).latitude ===
      restaurantSearchResultCoords(next.result).latitude &&
    restaurantSearchResultCoords(prev.result).longitude ===
      restaurantSearchResultCoords(next.result).longitude,
)
