import { useCallback } from 'react'
import * as Linking from 'expo-linking'
import { Alert, Pressable, Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'

import { BRAND_PRIMARY, BORDER_SUBTLE, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { firstSegmentParam } from '@/lib/routeParams'

/** Tier-2 deferral stub — see `documentation/tasty-studio-maps-v1.1.md`. */
export default function GooglePlaceStubScreen(): JSX.Element {
  const raw = useLocalSearchParams<{ place_id?: string | string[] }>()
  const placeId = firstSegmentParam(raw.place_id)

  const openOfficial = useCallback(() => {
    void WebBrowser.openBrowserAsync(
      `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`,
    )
  }, [placeId])

  const openNativeMaps = useCallback(() => {
    void (async () => {
      try {
        await Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`,
        )
      } catch {
        Alert.alert('Maps', 'Unable to launch Google Maps.')
      }
    })()
  }, [placeId])

  return (
    <SafeAreaView className="flex-1 bg-white px-8 pt-16" edges={['left', 'right', 'bottom']}>
      <Text className="text-3xl font-semibold" style={{ color: TEXT_HEADING }}>
        Google venue
      </Text>
      <Text className="mt-8 text-[13px]" style={{ color: TEXT_HEADING }}>
        {placeId.length > 0 ? placeId : 'Missing google place id'}
      </Text>

      <Text className="mt-10 leading-relaxed" style={{ color: TEXT_MUTED }}>
        Native map canvases (`MyListMapView`, clustered pins fed by `user_place_collections`) stay slated for tasty-studio
        v1.1. This route keeps testers unblocked via canonical Google Maps intents.
      </Text>

      <Pressable className="mt-12 rounded-full px-14 py-4" style={{ backgroundColor: BRAND_PRIMARY }} onPress={openOfficial}>
        <Text className="text-center font-semibold text-white">Open in Maps (browser)</Text>
      </Pressable>

      <Pressable
        className="mt-5 rounded-full border px-14 py-4"
        style={{ borderColor: BORDER_SUBTLE }}
        onPress={openNativeMaps}
      >
        <Text className="text-center font-semibold" style={{ color: TEXT_HEADING }}>
          Open via Linking fallback
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Documentation"
        className="mt-10 pb-28"
        onPress={openOfficial}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND_PRIMARY }}>
          Doc: tastyplates-mobile/documentation/tasty-studio-maps-v1.1.md
        </Text>
      </Pressable>
    </SafeAreaView>
  )
}
