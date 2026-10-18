import { Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'

import { SURFACE_CARD, SURFACE_FOG, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { firstSegmentParam } from '@/lib/routeParams'

/** `/hashtag/[hashtag]` (design R6) — the route exists but doesn't list reviews yet. */
export default function HashtagFeedScreen(): JSX.Element {
  const params = useLocalSearchParams<{ hashtag: string | string[] }>()
  const tag = firstSegmentParam(params.hashtag).replace(/^#/, '')
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: SURFACE_CARD, paddingHorizontal: 32, gap: 12 }}>
      <Stack.Screen options={{ title: `#${tag}` }} />
      <View className="items-center justify-center" style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: SURFACE_FOG }}>
        <Text style={{ fontFamily: FONT.heading, fontSize: 28, color: TEXT_HEADING }}>#</Text>
      </View>
      <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 24, color: TEXT_HEADING }}>
        #{tag}
      </Text>
      <Text className="text-center" style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 21, color: TEXT_MUTED }}>
        Reviews tagged with this hashtag will show up here soon.
      </Text>
    </View>
  )
}
