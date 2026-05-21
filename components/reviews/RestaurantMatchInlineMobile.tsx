import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { BORDER_SUBTLE, BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import type { PlacesAutocompletePrediction } from '@/lib/googlePlaces'
import type { MatchedRestaurant } from '@/lib/findTastyPlatesMatch'

type Props = {
  matching: boolean
  chosen: PlacesAutocompletePrediction | null
  matched: MatchedRestaurant[]
  onWriteReviewSlug: (slug: string) => void
  onCreateListingPress: () => void
  onPickDifferentVenue: () => void
}

/**
 * Matches / misses after a Google Places pick — ported from web `RestaurantMatchInline.tsx` structure.
 */
export function RestaurantMatchInlineMobile({
  matching,
  chosen,
  matched,
  onWriteReviewSlug,
  onCreateListingPress,
  onPickDifferentVenue,
}: Props): JSX.Element | null {
  if (!chosen) return null

  return (
    <View className="mt-6 gap-6">
      {matching ? (
        <ActivityIndicator />
      ) : matched.length === 1 ? (
        <>
          <View className="rounded-3xl border border-[#ff7c0a] bg-[#fffbf5] p-5">
            <Text className="text-[11px] font-bold uppercase tracking-widest" style={{ color: BRAND_PRIMARY }}>
              Found on TastyPlates
            </Text>
            <Text className="mt-1 text-sm text-gray-600">
              We already list this venue. Prefer the existing listing so reviews stay together.
            </Text>
            <Text className="mt-4 text-xl font-bold" style={{ color: TEXT_HEADING }}>
              {matched[0]!.title}
            </Text>
            {matched[0]!.listing_street ? (
              <Text className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>
                {matched[0]!.listing_street}
              </Text>
            ) : null}
          </View>
          <Pressable
            className="items-center rounded-full py-5 active:opacity-90"
            style={{ backgroundColor: BRAND_PRIMARY }}
            accessibilityRole="button"
            accessibilityLabel="Continue to write review for matched restaurant"
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              onWriteReviewSlug(matched[0]!.slug)
            }}
          >
            <Text className="text-base font-bold text-white">Use this listing</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void Haptics.selectionAsync()
              onPickDifferentVenue()
            }}
            className="-mt-4 items-center"
          >
            <Text className="text-sm font-semibold" style={{ color: TEXT_MUTED }}>
              Pick a different venue
            </Text>
          </Pressable>
        </>
      ) : matched.length > 1 ? (
        <View className="gap-4">
          <Text className="text-sm font-semibold" style={{ color: TEXT_HEADING }}>
            Multiple possible matches — tap the correct listing:
          </Text>
          {matched.slice(0, 5).map((listing) => (
            <Pressable
              key={listing.slug}
              onPress={() => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                onWriteReviewSlug(listing.slug)
              }}
              className="rounded-3xl border p-4"
              style={{ borderColor: BORDER_SUBTLE }}
            >
              <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }}>
                {listing.title}
              </Text>
              {listing.listing_street ? (
                <Text className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
                  {listing.listing_street}
                </Text>
              ) : null}
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void Haptics.selectionAsync()
              onPickDifferentVenue()
            }}
            className="items-center py-4"
          >
            <Text className="font-semibold" style={{ color: BRAND_PRIMARY }}>
              Pick a different venue
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="rounded-3xl border p-6" style={{ borderColor: BORDER_SUBTLE }}>
          <Text className="text-base font-bold" style={{ color: TEXT_HEADING }}>
            This restaurant isn&apos;t on TastyPlates yet.
          </Text>
          <Text className="mt-3 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
            Create a listing so others can discover it — or bookmark it under My Lists while we match the Google
            place ID.
          </Text>
          <Pressable
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              onCreateListingPress()
            }}
            className="mt-6 rounded-full px-8 py-4"
            style={{ backgroundColor: '#111827' }}
          >
            <Text className="text-center text-base font-bold text-white">Create listing &amp; write review</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void Haptics.selectionAsync()
              onPickDifferentVenue()
            }}
            className="mt-4 items-center pb-6"
          >
            <Text className="font-semibold" style={{ color: BRAND_PRIMARY }}>
              Pick a different venue
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

/** Footer helper text + mailto (per palate review wireframe). */
export function ReviewSearchHelpFooter(): JSX.Element {
  return (
    <View className="px-4 py-8 items-center">
      <Text className="text-center text-xs" style={{ color: TEXT_MUTED }}>
        Can&apos;t find the restaurant?{' '}
        <Text
          className="font-semibold text-[#ff7c0a]"
          onPress={() => {
            void Linking.openURL('mailto:support@tastyplates.co').catch(() => undefined)
          }}
        >
          Contact the team
        </Text>
      </Text>
    </View>
  )
}
