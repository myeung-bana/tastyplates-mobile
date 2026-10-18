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
  FadeIn,
  FadeInRight,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import {
  SCREEN_STUDIO_ADD_REVIEW,
  SCREEN_STUDIO_MANAGE_LISTS,
  SCREEN_STUDIO_MANAGE_LISTS_CREATE,
  SCREEN_STUDIO_MY_LISTS,
  SCREEN_STUDIO_REVIEW_LISTING,
} from '@/constants/screens'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { FloatingTabBarPill } from '@/components/navigation/FloatingTabBarPill'
import { useTabBarScroll } from '@/contexts/TabBarScrollContext'
import { getStudioSheetBottomPadding } from '@/constants/tabBar'
import { studioQuickMenuToggleRef } from '@/contexts/StudioQuickMenuContext'
import { useStudioQuickMenu } from '@/contexts/StudioQuickMenuContext'

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window')

const SHEET_MAX_H = Math.min(SCREEN_H * 0.7, 560)
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
  const { expandTabBar } = useTabBarScroll()
  const { insets } = props

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
    orbRotate.value = withTiming(135, { duration: 380, easing: Easing.bezier(0.32, 0.72, 0, 1) })
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
    expandTabBar()
    sheetY.value = SHEET_HIDDEN_Y
    orbOpacity.value = 0
    orbRotate.value = 0
    backdropProg.value = 0
    setModalVisible(true)
  }, [backdropProg, expandTabBar, orbOpacity, orbRotate, sheetY])

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
    const frame = requestAnimationFrame(() => {
      animateOpenRef.current()
    })
    return () => cancelAnimationFrame(frame)
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
    opacity: interpolate(backdropProg.value, [0, 1], [0, 0.5]),
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
    <>
      <FloatingTabBarPill insets={insets}>
        <BottomTabBar {...props} />
      </FloatingTabBarPill>

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
            <View style={styles.handle} />
            <Animated.Text entering={FadeInRight.delay(40).duration(320)} style={styles.sheetTitle} accessibilityRole="header">
              Studio
            </Animated.Text>

            <GroupLabel delay={80}>Create</GroupLabel>
            <QuickActionRow
              index={0}
              icon="edit-3"
              label="Write Review"
              subtitle="Leave a review for a restaurant"
              onPress={() => queueNavThenClose(SCREEN_STUDIO_ADD_REVIEW)}
            />
            <QuickActionRow
              index={1}
              icon="plus-circle"
              label="Create List"
              subtitle="Start a new list of places"
              onPress={() => queueNavThenClose(castHref(SCREEN_STUDIO_MANAGE_LISTS_CREATE))}
            />

            <View style={styles.groupDivider} />
            <GroupLabel delay={230}>Manage</GroupLabel>
            <QuickActionRow
              index={2}
              icon="file-text"
              label="My Reviews"
              subtitle="Edit or delete past reviews"
              onPress={() => queueNavThenClose(SCREEN_STUDIO_REVIEW_LISTING)}
            />
            <QuickActionRow
              index={3}
              icon="list"
              label="My Lists"
              subtitle="Lists you recommend to others"
              onPress={() => queueNavThenClose(castHref(SCREEN_STUDIO_MANAGE_LISTS))}
            />
            <QuickActionRow
              index={4}
              icon="map-pin"
              label="Dine-In / Check-Ins"
              subtitle="Track your favourite restaurants."
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
    </>
  )
}

/** Rows slide in from the right one after another (design ST): Create group first, then Manage. */
const ROW_DELAYS = [100, 160, 220, 280, 340]

function GroupLabel({ children, delay }: { children: string; delay: number }): JSX.Element {
  return (
    <Animated.Text entering={FadeIn.delay(delay).duration(300)} style={styles.groupLabel}>
      {children}
    </Animated.Text>
  )
}

function QuickActionRow({
  index,
  icon,
  label,
  subtitle,
  onPress,
}: {
  index: number
  icon: AppIconName
  label: string
  subtitle: string
  onPress: () => void
}): JSX.Element {
  return (
    <Animated.View entering={FadeInRight.delay(ROW_DELAYS[index] ?? 0).duration(420).easing(Easing.bezier(0.32, 0.72, 0, 1))}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${subtitle}`}
        onPress={onPress}
        className="flex-row items-center active:opacity-70"
        style={{ gap: 14, paddingVertical: 10 }}
      >
        <View
          className="items-center justify-center"
          style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: BORDER_SUBTLE, backgroundColor: SURFACE_CARD }}
        >
          <AppIcon name={icon} size={20} color={TEXT_HEADING} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={{ fontFamily: FONT.heading, fontSize: 16, color: TEXT_HEADING }}>{label}</Text>
          <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 17, color: TEXT_MUTED }} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <AppIcon name="chevron-right" size={18} color={TEXT_TERTIARY} />
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: SURFACE_CARD,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: BORDER_SUBTLE,
  },
  sheetTitle: {
    fontFamily: FONT.heading,
    fontSize: 24,
    lineHeight: 30,
    color: TEXT_HEADING,
    marginTop: 10,
    marginBottom: 12,
  },
  groupLabel: {
    fontFamily: FONT.heading,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: TEXT_MUTED,
  },
  groupDivider: {
    height: 1,
    backgroundColor: BORDER_SUBTLE,
    marginTop: 6,
    marginBottom: 12,
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
