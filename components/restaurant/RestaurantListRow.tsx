import { Image, Pressable, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { BRAND_PRIMARY } from '@/constants/brand'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'
import { formatRestaurantCardAddress } from '@/services/restaurantsV2Service'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'

interface RestaurantListRowProps {
  result: RestaurantSearchResult
  isSelected?: boolean
  onPress: () => void
}

export function RestaurantListRow({
  result,
  isSelected = false,
  onPress,
}: RestaurantListRowProps): JSX.Element {
  const isGoogle = isGoogleResult(result)
  const title = result.title
  const imageUrl = result.featured_image_url ?? DEFAULT_IMAGE
  const address = isTPResult(result)
    ? formatRestaurantCardAddress(result.listing_street, result.address)
    : result.address
  const rating = isTPResult(result)
    ? coerceRatingNumber(result.average_rating)
    : coerceRatingNumber(result.google_rating)
  const cuisines = isTPResult(result) ? result.cuisines.slice(0, 2) : []

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        backgroundColor: isSelected ? '#fef7f0' : 'transparent',
      }}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{ width: 56, height: 56, borderRadius: 10 }}
        resizeMode="cover"
      />

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            className="font-neusans text-[15px] font-medium text-[#31343F]"
            style={{ flex: 1 }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {isGoogle ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                backgroundColor: '#f3f4f6',
                borderRadius: 50,
              }}
            >
              <Text className="font-neusans text-[9px] text-[#9ca3af]">Google</Text>
            </View>
          ) : null}
        </View>

        {address ? (
          <Text className="font-neusans text-xs text-[#6b7280]" numberOfLines={1}>
            {address}
          </Text>
        ) : null}

        {cuisines.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
            {cuisines.map((c) => (
              <View
                key={c.slug}
                style={{
                  backgroundColor: BRAND_PRIMARY,
                  borderRadius: 50,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                }}
              >
                <Text className="font-neusans text-[9px] text-white">{c.name}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        {rating != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <AppIcon name="star" size={12} color={isGoogle ? '#f59e0b' : BRAND_PRIMARY} />
            <Text className="font-neusans text-[13px] text-[#31343F]">{rating.toFixed(1)}</Text>
          </View>
        ) : null}
        <AppIcon name="chevron-right" size={14} color="#e5e7eb" />
      </View>
    </Pressable>
  )
}
