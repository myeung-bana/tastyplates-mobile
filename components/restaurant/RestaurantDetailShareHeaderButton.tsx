import { Pressable } from 'react-native'

import { AppIcon } from '@/components/ui/AppIcon'
import { TEXT_HEADING } from '@/constants/brand'
import {
  shareRestaurantListing,
  type ShareRestaurantListingInput,
} from '@/lib/shareRestaurantListing'

/** Stack header share action for restaurant detail screens. */
export function RestaurantDetailShareHeaderButton(
  props: ShareRestaurantListingInput,
): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Share restaurant"
      hitSlop={8}
      onPress={() => void shareRestaurantListing(props)}
      className="mr-1 h-9 w-9 items-center justify-center active:opacity-80"
    >
      <AppIcon name="share-2" size={22} color={TEXT_HEADING} />
    </Pressable>
  )
}
