import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated'

import TastyLogoWhite from '@/assets/icons/TastyPlates_Logo_White.svg'
import { BRAND_PRIMARY, SURFACE_CARD, TEXT_HEADING } from '@/constants/brand'
import { FONT } from '@/constants/typography'

const LOGO_WIDTH = 230
const LOGO_RATIO = 35 / 199

function Dot({ index, progress }: { index: number; progress: SharedValue<number> }): JSX.Element {
  // The active dot stretches into a pill and travels left → right.
  const style = useAnimatedStyle(() => {
    const phase = (progress.value * 3 - index + 3) % 3
    const on = interpolate(phase, [0, 0.5, 1, 3], [1, 1, 0, 0], 'clamp')
    return {
      width: 5 + 15 * on,
      backgroundColor: on > 0.5 ? SURFACE_CARD : 'rgba(252,252,252,0.6)',
    }
  })
  return <Animated.View style={[{ height: 5, borderRadius: 3 }, style]} />
}

/** Cold-start splash (design G0) shown while fonts and the session load. */
export function BrandSplash(): JSX.Element {
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1, false)
  }, [progress])

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: BRAND_PRIMARY }}
      accessibilityLabel="Tastyplates is loading"
      accessible
    >
      <StatusBar style="dark" />
      <View className="items-center" style={{ gap: 26, marginTop: -80 }}>
        <TastyLogoWhite width={LOGO_WIDTH} height={Math.round(LOGO_WIDTH * LOGO_RATIO)} />
        <Text
          style={{
            fontFamily: FONT.heading,
            fontSize: 12,
            letterSpacing: 5,
            textTransform: 'uppercase',
            color: TEXT_HEADING,
            paddingLeft: 5,
          }}
        >
          Find your next plate
        </Text>
      </View>
      <View className="absolute flex-row items-center" style={{ bottom: 58, gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} index={i} progress={progress} />
        ))}
      </View>
    </View>
  )
}
