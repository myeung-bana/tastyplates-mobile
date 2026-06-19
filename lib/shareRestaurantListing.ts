import { Platform, Share } from 'react-native'
import * as Haptics from 'expo-haptics'

import { restaurantDetailPath } from '@/constants/screens'
import { copyToClipboard } from '@/lib/copyToClipboard'
import { getMarketingWebOrigin } from '@/lib/webAssets'
import { toast } from '@/utils/toast'

export type ShareRestaurantListingInput = {
  title: string
  slug: string
  googlePlaceId?: string | null
}

export async function shareRestaurantListing({
  title,
  slug,
  googlePlaceId,
}: ShareRestaurantListingInput): Promise<void> {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  const placeId = googlePlaceId?.trim()
  const isGoogle = Boolean(placeId)
  const url = isGoogle
    ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId!)}`
    : `${getMarketingWebOrigin()}${restaurantDetailPath(slug)}`

  try {
    const result = await Share.share({
      title,
      message: isGoogle ? `Check out ${title}!` : `Check out ${title} on TastyPlates!`,
      url,
    })
    if (Platform.OS === 'android' && result.action === Share.dismissedAction) {
      return
    }
  } catch {
    const copied = await copyToClipboard(url)
    if (copied) toast.success('Link copied!')
  }
}
