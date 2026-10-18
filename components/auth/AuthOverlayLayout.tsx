import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Animated, { FadeIn, FadeOut, SlideInDown, SlideInRight } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { TpMark } from '@/components/brand/TpMark'
import { AppIcon } from '@/components/ui/AppIcon'
import { BORDER_SUBTLE, SURFACE_CARD, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'

type AuthOverlayLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
  /**
   * `sheet` — bottom sheet over a dimmed backdrop (chooser, design G2).
   * `page` — full-screen form with a round back button (sign-in / sign-up, design G3).
   */
  variant?: 'sheet' | 'page'
  /** `page` only: back to the chooser. Falls back to close. */
  onBack?: () => void
  onClose: () => void
}

export function AuthOverlayLayout({
  title,
  subtitle,
  children,
  variant = 'page',
  onBack,
  onClose,
}: AuthOverlayLayoutProps): JSX.Element {
  const insets = useSafeAreaInsets()

  if (variant === 'sheet') {
    return (
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <StatusBar style="light" />
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <Pressable accessibilityRole="button" accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(180)}
          accessibilityViewIsModal
          style={{
            backgroundColor: SURFACE_CARD,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 10,
            paddingHorizontal: 24,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
            gap: 16,
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: BORDER_SUBTLE }} />
          <View style={{ marginTop: 4 }}>
            <TpMark size={32} />
          </View>
          <View style={{ gap: 6 }}>
            <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 26, lineHeight: 32, color: TEXT_HEADING }}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 21, color: TEXT_MUTED }}>{subtitle}</Text>
            ) : null}
          </View>
          {children}
        </Animated.View>
      </View>
    )
  }

  return (
    <Animated.View entering={SlideInRight.duration(260)} style={{ flex: 1, backgroundColor: SURFACE_CARD }}>
      <StatusBar style="dark" />
      <View className="flex-row items-center justify-between" style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={6}
          onPress={onBack ?? onClose}
          className="items-center justify-center active:opacity-80"
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: BORDER_SUBTLE }}
        >
          <AppIcon name="chevron-left" size={20} color={TEXT_HEADING} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose} className="p-2 active:opacity-70">
          <AppIcon name="x" size={22} color={TEXT_HEADING} />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 18,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            accessibilityRole="header"
            style={{ fontFamily: FONT.heading, fontSize: 28, lineHeight: 34, color: TEXT_HEADING }}
            maxFontSizeMultiplier={1.3}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ marginTop: 8, fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: TEXT_MUTED }}>
              {subtitle}
            </Text>
          ) : null}
          <View style={{ marginTop: 22 }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  )
}
