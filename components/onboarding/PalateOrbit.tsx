import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

import { TpMark } from '@/components/brand/TpMark'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { BRAND_PRIMARY, BRAND_PRIMARY_TINT } from '@/constants/brand'

const SIZE = 342
const RING = 256
const SATELLITE = 60
const ORBIT_MS = 36000

type Props = {
  icons: AppIconName[]
  reduceMotion?: boolean
}

function Satellite({
  icon,
  angle,
  spin,
}: {
  icon: AppIconName
  angle: number
  spin: SharedValue<number>
}): JSX.Element {
  const r = RING / 2
  const x = SIZE / 2 + r * Math.sin(angle) - SATELLITE / 2
  const y = SIZE / 2 - r * Math.cos(angle) - SATELLITE / 2
  // Counter-rotate so icons stay upright while the ring turns.
  const upright = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.value * 360}deg` }] }))
  return (
    <Animated.View
      className="absolute items-center justify-center"
      style={[
        {
          left: x,
          top: y,
          width: SATELLITE,
          height: SATELLITE,
          borderRadius: SATELLITE / 2,
          backgroundColor: '#FFFFFF',
          borderWidth: 1.5,
          borderColor: '#FFC999',
        },
        upright,
      ]}
    >
      <AppIcon name={icon} size={22} color={BRAND_PRIMARY} />
    </Animated.View>
  )
}

/** Get-started illustration (design G1): the pin at the centre, cuisine icons orbiting it. */
export function PalateOrbit({ icons, reduceMotion = false }: Props): JSX.Element {
  const spin = useSharedValue(0)
  useEffect(() => {
    if (reduceMotion) return
    spin.value = withRepeat(withTiming(1, { duration: ORBIT_MS, easing: Easing.linear }), -1, false)
  }, [reduceMotion, spin])
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }))

  return (
    <View style={{ width: SIZE, height: SIZE - 20, alignSelf: 'center' }} accessibilityElementsHidden>
      <View
        className="absolute items-center justify-center"
        style={{
          left: SIZE / 2 - 70,
          top: SIZE / 2 - 70,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: BRAND_PRIMARY_TINT,
        }}
      >
        <View
          className="items-center justify-center"
          style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: BRAND_PRIMARY }}
        >
          <TpMark size={44} color="#FFFFFF" />
        </View>
      </View>
      <Animated.View style={[{ position: 'absolute', width: SIZE, height: SIZE }, ring]}>
        <View
          className="absolute"
          style={{
            left: (SIZE - RING) / 2,
            top: (SIZE - RING) / 2,
            width: RING,
            height: RING,
            borderRadius: RING / 2,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: '#FFC999',
          }}
        />
        {icons.map((icon, i) => (
          <Satellite key={`${icon}-${i}`} icon={icon} angle={(i / icons.length) * Math.PI * 2} spin={spin} />
        ))}
      </Animated.View>
    </View>
  )
}
