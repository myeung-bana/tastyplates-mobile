/**
 * Tabs-integrated Studio quick menu: custom tab (+) triggers a bottom-sliding modal.
 * Uses `react-native-reanimated` — ensure `babel.config.js` includes the Reanimated plugin.
 */
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import {
  BackHandler,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BottomTabBar } from '@react-navigation/bottom-tabs'
import type { Href } from 'expo-router'
import { useRouter } from 'expo-router'
import { castHref } from '@/lib/routeParams'
import * as Haptics from 'expo-haptics'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import {
  SCREEN_STUDIO_ADD_REVIEW,
  SCREEN_STUDIO_MANAGE_LISTS,
  SCREEN_STUDIO_MY_LISTS,
  SCREEN_STUDIO_REVIEW_LISTING,
} from '@/constants/screens'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { getStudioSheetBottomPadding, getTabBarStyle } from '@/constants/tabBar'
import { studioQuickMenuToggleRef } from '@/contexts/StudioQuickMenuContext'
import { useStudioQuickMenu } from '@/contexts/StudioQuickMenuContext'

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window')

const SHEET_MAX_H = Math.min(SCREEN_H * 0.52, 400)
/** Sheet translate baseline: hides panel below viewport */
const SHEET_HIDDEN_Y = SHEET_MAX_H + 24

const DURATION_MS = 280
const EASE = Easing.out(Easing.cubic)

/** Match tab bar icon sizing in `TabsShell`. */
const TAB_BAR_ICON_SIZE = 22

const ORB_SIZE = Math.round(TAB_BAR_ICON_SIZE * 2)

export function StudioTabBarWithQuickActions(props: BottomTabBarProps): JSX.Element {
  const router = useRouter()
  const { anchorRect } = useStudioQuickMenu()
  const { insets } = props

  const tabBarStyle = useMemo(() => getTabBarStyle(insets), [insets])

  const sheetBottomPadding = useMemo(() => getStudioSheetBottomPadding(insets), [insets])
  const [modalVisible, setModalVisible] = useState(false)
  const modalVisibleRef = useRef(false)
  useEffect(() => {
    modalVisibleRef.current = modalVisible
  }, [modalVisible])

  const sheetY = useSharedValue(SHEET_HIDDEN_Y)
  const backdropProg = useSharedValue(0)
  const orbOpacity = useSharedValue(0)
  const orbRotate = useSharedValue(0)

  const pendingHrefRef = useRef<Href | null>(null)

  const onCloseCompleteJS = useCallback(() => {
    setModalVisible(false)
    sheetY.value = SHEET_HIDDEN_Y
    backdropProg.value = 0
    orbOpacity.value = 0
    orbRotate.value = 0
    const href = pendingHrefRef.current
    pendingHrefRef.current = null
    if (href) {
      router.push(href)
    }
  }, [router, sheetY, backdropProg, orbOpacity, orbRotate])

  const animateOpen = useCallback(() => {
    sheetY.value = SHEET_HIDDEN_Y
    orbOpacity.value = 0
    orbRotate.value = 0
    backdropProg.value = 0
    sheetY.value = withTiming(0, { duration: DURATION_MS, easing: EASE })
    backdropProg.value = withTiming(1, { duration: DURATION_MS, easing: EASE })
    orbOpacity.value = withTiming(1, { duration: DURATION_MS, easing: EASE })
    orbRotate.value = withTiming(45, { duration: DURATION_MS, easing: EASE })
  }, [sheetY, backdropProg, orbOpacity, orbRotate])

  const animateClose = useCallback(
    ({ discardPending = true }: { discardPending?: boolean } = {}) => {
      if (discardPending) {
        pendingHrefRef.current = null
      }

      sheetY.value = withTiming(SHEET_HIDDEN_Y, { duration: DURATION_MS, easing: EASE })
      orbOpacity.value = withTiming(0, { duration: DURATION_MS, easing: EASE })
      orbRotate.value = withTiming(0, { duration: DURATION_MS, easing: EASE })
      backdropProg.value = withTiming(0, { duration: DURATION_MS, easing: EASE }, (finished) => {
        if (finished) {
          runOnJS(onCloseCompleteJS)()
        }
      })
    },
    [backdropProg, orbOpacity, orbRotate, sheetY, onCloseCompleteJS],
  )

  const openMenu = useCallback(() => {
    void Haptics.selectionAsync()
    sheetY.value = SHEET_HIDDEN_Y
    orbOpacity.value = 0
    orbRotate.value = 0
    backdropProg.value = 0
    setModalVisible(true)
  }, [backdropProg, orbOpacity, orbRotate, sheetY])

  const toggleFromTab = useCallback(() => {
    if (modalVisibleRef.current) {
      animateClose()
      return
    }
    openMenu()
  }, [animateClose, openMenu])

  useEffect(() => {
    studioQuickMenuToggleRef.current = toggleFromTab
    return () => {
      studioQuickMenuToggleRef.current = null
    }
  }, [toggleFromTab])

  const animateOpenRef = useRef(animateOpen)
  animateOpenRef.current = animateOpen

  useEffect(() => {
    if (!modalVisible) return
    animateOpenRef.current()
  }, [modalVisible])

  useEffect(() => {
    if (!modalVisible || Platform.OS !== 'android') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      animateClose()
      return true
    })
    return () => sub.remove()
  }, [modalVisible, animateClose])

  const handleBackdropClose = () => {
    animateClose()
  }

  const handleOrbClose = () => {
    void Haptics.selectionAsync()
    animateClose()
  }

  const queueNavThenClose = (href: Href) => {
    void Haptics.selectionAsync()
    pendingHrefRef.current = href
    animateClose({ discardPending: false })
  }

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(backdropProg.value, [0, 1], [0, 0.45]),
  }))

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }))

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [{ rotate: `${orbRotate.value}deg` }],
  }))

  const orbLeft =
    anchorRect != null
      ? anchorRect.x + anchorRect.width / 2 - ORB_SIZE / 2
      : SCREEN_W - ORB_SIZE - 20
  const orbTopRaw =
    anchorRect != null
      ? anchorRect.y + anchorRect.height / 2 - ORB_SIZE / 2
      : SCREEN_H - SHEET_HIDDEN_Y + 8

  /** Nudge orb slightly above measured tab capsule for prominence */
  const orbTop = orbTopRaw - 6

  return (
    <View style={styles.tabBarWrap}>
      <BottomTabBar {...props} style={tabBarStyle} />

      <Modal
        transparent
        visible={modalVisible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => animateClose()}
      >
        <View style={styles.modalRoot}>
          <Pressable accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={handleBackdropClose}>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdropFill, backdropStyle]} />
          </Pressable>

          <Animated.View
            style={[styles.sheet, { paddingBottom: sheetBottomPadding }, sheetStyle]}
            accessibilityViewIsModal
            importantForAccessibility="yes"
          >
            <QuickActionRow
              icon="edit-3"
              label="Create a Review"
              subtitle="Share a taste note from a recent restaurant you visited"
              onPress={() => queueNavThenClose(SCREEN_STUDIO_ADD_REVIEW)}
            />
            <QuickActionRow
              icon="list"
              label="Manage Reviews"
              subtitle="Manage your previous taste notes"
              onPress={() => queueNavThenClose(SCREEN_STUDIO_REVIEW_LISTING)}
            />
            <QuickActionRow
              icon="image"
              label="Manage Lists"
              subtitle="Create and edit your restaurant playlists"
              onPress={() => queueNavThenClose(castHref(SCREEN_STUDIO_MANAGE_LISTS))}
            />
            <QuickActionRow
              icon="bookmark"
              label="Dine-In / Check-Ins"
              subtitle="Track your favourite restaurants"
              onPress={() => queueNavThenClose(SCREEN_STUDIO_MY_LISTS)}
            />
          </Animated.View>

          <Pressable
            accessibilityLabel="Close studio menu"
            accessibilityRole="button"
            accessibilityHint="Closes the studio quick actions menu"
            onPress={handleOrbClose}
            style={[
              styles.orbTouchable,
              {
                left: orbLeft,
                top: orbTop,
                width: ORB_SIZE,
                height: ORB_SIZE,
              },
            ]}
          >
            <Animated.View style={[styles.orbBubble, orbAnimatedStyle]}>
              <AppIcon name="plus" color="#ffffff" size={Math.round(TAB_BAR_ICON_SIZE * 1.05)} />
            </Animated.View>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}

function QuickActionRow({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: AppIconName
  label: string
  subtitle: string
  onPress: () => void
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${subtitle}`}
      onPress={onPress}
      className="mb-1 flex-row items-center gap-4 rounded-xl py-4 pl-3 pr-4 active:bg-gray-50"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100">
        <AppIcon name={icon} size="lg" color={BRAND_PRIMARY} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-medium" style={{ color: TEXT_HEADING }}>
          {label}
        </Text>
        <Text className="mt-0.5 text-xs" style={{ color: TEXT_MUTED }} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tabBarWrap: {
    position: 'relative',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    backgroundColor: '#000',
  },
  sheet: {
    maxHeight: SHEET_MAX_H,
    minHeight: SHEET_MAX_H * 0.85,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  orbTouchable: {
    position: 'absolute',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbBubble: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: BRAND_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
})
