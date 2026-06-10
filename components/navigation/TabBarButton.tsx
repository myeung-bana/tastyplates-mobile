import type { JSX } from 'react'
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'
import * as Haptics from 'expo-haptics'
import { Pressable } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

const PRESS_SCALE = 0.9
const SPRING = { damping: 15, stiffness: 400 }

/**
 * Bottom tab item with light haptic + scale feedback on press.
 * Uses RN `Pressable` (not a self-closing wrapper) so tab `children` and `onPress` reach React Navigation.
 */
export function TabBarButton({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  ...rest
}: BottomTabBarButtonProps): JSX.Element {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <Pressable
        {...rest}
        accessibilityRole="button"
        onPress={onPress}
        onLongPress={onLongPress}
        style={[{ flex: 1 }, style]}
        onPressIn={(event) => {
          scale.value = withSpring(PRESS_SCALE, SPRING)
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onPressIn?.(event)
        }}
        onPressOut={(event) => {
          scale.value = withSpring(1, SPRING)
          onPressOut?.(event)
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}
