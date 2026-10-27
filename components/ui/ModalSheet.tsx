import { useEffect, useState, type ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Extrapolation,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BORDER_SUBTLE, SURFACE_CARD } from '@/constants/brand'
import {
  SHEET_BACKDROP_OPACITY,
  SHEET_CLOSE_TIMING,
  SHEET_DISMISS_DISTANCE_RATIO,
  SHEET_DISMISS_VELOCITY,
  SHEET_HANDLE,
  SHEET_OPEN_TIMING,
  SHEET_RADIUS,
} from '@/constants/sheet'

export type SheetPanelProps = {
  /** Drives the slide: true slides up, false slides down (then `onClosed`). */
  open: boolean
  /** Backdrop tap, drag past the threshold, or hardware back. The parent decides and flips `open`. */
  onRequestClose: () => void
  /** After the close animation finishes. */
  onClosed?: () => void
  children: ReactNode
  /** False blocks backdrop tap and drag (e.g. while saving). */
  dismissible?: boolean
  /** `handle` — only the grabber row drags, for sheets whose body scrolls. */
  dragArea?: 'sheet' | 'handle'
  /** Lift the sheet above the keyboard (sheets with text inputs). */
  avoidKeyboard?: boolean
  showHandle?: boolean
  contentStyle?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

/**
 * Bottom sheet surface over a dimmed backdrop, without its own `Modal` — use it inside an
 * existing full-screen layer. Most callers want {@link ModalSheet}.
 *
 * Motion follows `constants/sheet`: the panel slides with the iOS sheet curve while the backdrop
 * fades independently, the sheet follows the finger when dragged down, and it snaps back below the
 * dismiss threshold.
 */
export function SheetPanel({
  open,
  onRequestClose,
  onClosed,
  children,
  dismissible = true,
  dragArea = 'sheet',
  avoidKeyboard = false,
  showHandle = true,
  contentStyle,
  accessibilityLabel,
}: SheetPanelProps): JSX.Element {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const progress = useSharedValue(0)
  const drag = useSharedValue(0)
  const sheetHeight = useSharedValue(windowHeight)

  useEffect(() => {
    if (open) {
      drag.value = 0
      progress.value = withTiming(1, SHEET_OPEN_TIMING)
      return
    }
    progress.value = withTiming(0, SHEET_CLOSE_TIMING, (finished) => {
      if (finished && onClosed) runOnJS(onClosed)()
    })
    // Shared values are stable; only `open` should restart the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const pan = Gesture.Pan()
    .enabled(dismissible)
    .activeOffsetY(6)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      // Follow the finger down; resist a little when pulled up.
      drag.value = e.translationY > 0 ? e.translationY : Math.max(e.translationY * 0.15, -12)
    })
    .onEnd((e) => {
      const far = drag.value > sheetHeight.value * SHEET_DISMISS_DISTANCE_RATIO
      if (far || e.velocityY > SHEET_DISMISS_VELOCITY) {
        runOnJS(onRequestClose)()
      } else {
        drag.value = withTiming(0, SHEET_OPEN_TIMING)
      }
    })

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * sheetHeight.value + drag.value }],
  }))

  const backdropStyle = useAnimatedStyle(() => {
    const dragFade = interpolate(drag.value, [0, sheetHeight.value], [1, 0], Extrapolation.CLAMP)
    return { opacity: progress.value * dragFade }
  })

  const handle = showHandle ? (
    <View style={{ alignItems: 'center', paddingBottom: 6 }}>
      <View style={{ ...SHEET_HANDLE, backgroundColor: BORDER_SUBTLE }} />
    </View>
  ) : null

  const body = (
    <Animated.View
      accessibilityViewIsModal
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => {
        sheetHeight.value = e.nativeEvent.layout.height
      }}
      style={[
        {
          backgroundColor: SURFACE_CARD,
          borderTopLeftRadius: SHEET_RADIUS,
          borderTopRightRadius: SHEET_RADIUS,
          paddingTop: 10,
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 16) + 12,
        },
        contentStyle,
        sheetStyle,
      ]}
    >
      {dragArea === 'handle' ? <GestureDetector gesture={pan}>{handle ?? <View style={{ height: 16 }} />}</GestureDetector> : handle}
      {children}
    </Animated.View>
  )

  const panel = dragArea === 'sheet' ? <GestureDetector gesture={pan}>{body}</GestureDetector> : body

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${SHEET_BACKDROP_OPACITY})` }, backdropStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{ flex: 1 }}
          onPress={dismissible ? onRequestClose : undefined}
        />
      </Animated.View>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
          pointerEvents="box-none"
        >
          {panel}
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
          {panel}
        </View>
      )}
    </View>
  )
}

export type ModalSheetProps = Omit<SheetPanelProps, 'open' | 'onRequestClose' | 'onClosed'> & {
  visible: boolean
  onClose: () => void
  /** After the sheet has fully slid away — e.g. to open a system picker next. */
  onClosed?: () => void
}

/**
 * Standard bottom sheet in its own `Modal` layer (design P7, P10, L7, X2, R4). It stays mounted
 * until the close animation ends, so closing slides down instead of vanishing.
 */
export function ModalSheet({ visible, onClose, onClosed, dismissible = true, ...rest }: ModalSheetProps): JSX.Element | null {
  const [mounted, setMounted] = useState(visible)

  useEffect(() => {
    if (visible) setMounted(true)
  }, [visible])

  if (!visible && !mounted) return null

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissible ? onClose : () => undefined}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SheetPanel
          {...rest}
          open={visible}
          dismissible={dismissible}
          onRequestClose={onClose}
          onClosed={() => {
            setMounted(false)
            onClosed?.()
          }}
        />
      </GestureHandlerRootView>
    </Modal>
  )
}
