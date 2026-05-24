import { Pressable, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

const STAR_SIZE = 36
const GRAY = '#CACACA'
const INK = '#31343F'

function RoundStar({ color, size }: { color: string; size: number }): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12 2l2.9 6.9 7.4.6-5.6 4.9 1.7 7.2L12 17.8 5.6 21.6l1.7-7.2-5.6-4.9 7.4-.6L12 2z"
      />
    </Svg>
  )
}

function StarCell({
  index,
  fill,
  onSelect,
}: {
  index: number
  fill: number
  onSelect: (fraction: number) => void
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rate ${index + 1} stars`}
      onPress={(e) => {
        const x = e.nativeEvent.locationX
        const fraction = x / STAR_SIZE > 0.5 ? 1 : 0.5
        onSelect(index + fraction)
      }}
      style={{ width: STAR_SIZE, height: STAR_SIZE }}
    >
      <RoundStar color={GRAY} size={STAR_SIZE} />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${Math.min(1, Math.max(0, fill)) * 100}%`,
          height: STAR_SIZE,
          overflow: 'hidden',
        }}
      >
        <RoundStar color={INK} size={STAR_SIZE} />
      </View>
    </Pressable>
  )
}

type Props = {
  value: number
  onChange: (rating: number) => void
  error?: string
}

export function HalfStarRating({ value, onChange, error }: Props): JSX.Element {
  const starFill = (index: number): number => {
    if (value > index) return Math.min(1, value - index)
    return 0
  }

  return (
    <View className="px-4 pt-6 pb-4">
      <Text className="mb-3 font-neusans text-sm text-[#374151]">
        How would you rate your experience?
      </Text>
      <View className="flex-row items-center gap-2">
        <View className="flex-row gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <StarCell
              key={i}
              index={i}
              fill={starFill(i)}
              onSelect={(r) => onChange(r)}
            />
          ))}
        </View>
        <Text className="ml-2 font-neusans text-xl text-[#31343F]">{value || ''}</Text>
      </View>
      <Text className="mt-2 font-neusans text-[10px] text-gray-400">
        Rating should be solely based on taste of the food
      </Text>
      {error ? <Text className="mt-1 font-neusans text-xs text-red-600">{error}</Text> : null}
    </View>
  )
}
