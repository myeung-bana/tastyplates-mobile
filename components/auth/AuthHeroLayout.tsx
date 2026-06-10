import type { ReactNode } from 'react'
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'

import TastyLogoWhite from '@/assets/icons/TastyPlates_Logo_White.svg'
import { TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'

const AUTH_HEADER_IMAGE = require('@/assets/images/tastyplates-splash.webp')

const HERO_HEIGHT_MIN = 200
const HERO_HEIGHT_MAX = 280
const HERO_HEIGHT_RATIO = 0.32
const SHEET_OVERLAP = 24
const LOGO_VIEWBOX_RATIO = 35 / 199
/** Matches get-started hero logo width. */
const LOGO_WIDTH = 250
const HERO_OVERLAY = 'rgba(0, 0, 0, 0.68)'

export function getAuthHeroHeight(screenHeight: number): number {
  return Math.round(
    Math.min(HERO_HEIGHT_MAX, Math.max(HERO_HEIGHT_MIN, screenHeight * HERO_HEIGHT_RATIO)),
  )
}

type AuthHeroLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
  /** Optional slot above title (e.g. back button on email sign-in / sign-up). */
  headerSlot?: ReactNode
}

/**
 * Shared auth shell: hero image background + overlapping white form sheet.
 */
export function AuthHeroLayout({
  title,
  subtitle,
  children,
  headerSlot,
}: AuthHeroLayoutProps): JSX.Element {
  const { height: screenHeight } = useWindowDimensions()
  const heroHeight = getAuthHeroHeight(screenHeight)

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />
      <View style={{ height: heroHeight }}>
        <ImageBackground
          source={AUTH_HEADER_IMAGE}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
          accessibilityIgnoresInvertColors
        >
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: HERO_OVERLAY }]}
          />
          <View className="flex-1 items-center justify-center pb-6 pt-6">
            <TastyLogoWhite
              accessible={false}
              importantForAccessibility="no"
              width={LOGO_WIDTH}
              height={Math.round(LOGO_WIDTH * LOGO_VIEWBOX_RATIO)}
            />
          </View>
        </ImageBackground>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ marginTop: -SHEET_OVERLAP }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            className="min-h-full bg-white px-5 pb-4 pt-6"
            style={{
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {headerSlot ? <View className="mb-5">{headerSlot}</View> : null}

            <Text
              className="pt-10 text-center text-2xl font-bold"
              style={{ color: TEXT_HEADING }}
              maxFontSizeMultiplier={1.3}
            >
              {title}
            </Text>

            {subtitle ? (
              <Text
                className="mt-2 text-center text-base leading-relaxed"
                style={{ color: TEXT_MUTED }}
                maxFontSizeMultiplier={1.25}
              >
                {subtitle}
              </Text>
            ) : null}

            <View className="mt-6">{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
