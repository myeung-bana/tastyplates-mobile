import { useCallback, useState } from 'react'
import {
  Dimensions,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'

import TastyLogoWhite from '@/assets/icons/TastyPlates_Logo_White.svg'
import { BRAND_PRIMARY } from '@/constants/brand'
import { SCREEN_HOME } from '@/constants/screens'
import { useAuthSheet } from '@/contexts/AuthSheetContext'
import { enterGuestBrowseMode } from '@/lib/guestBrowse'
import { setGetStartedCompleted } from '@/lib/getStartedIntro'

const { width: WINDOW_WIDTH } = Dimensions.get('window')
const SPLASH_BACKGROUND = require('@/assets/images/tastyplates-splash.webp')
const FOOTER_LINK_TEXT = 'text-base font-medium text-white/90'
const LOGO_VIEWBOX_RATIO = 35 / 199
const LOGO_WIDTH = 250

type Slide = {
  id: string
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Discover By Your Palate',
    body: 'Browse restaurants and cuisines tailored to your taste profile.',
  },
  {
    id: '2',
    title: 'Share your plates',
    body: 'Write a review, add photos, and become the trusted voice that steers someone else toward their best meal yet.',
  },
  {
    id: '3',
    title: 'Build your food world',
    body: 'Follow reviewers you trust, save places you want to try, and keep a record of everywhere you\'ve been.',
  },
]

export default function GetStartedScreen(): JSX.Element {
  const router = useRouter()
  const { openAuthSheet } = useAuthSheet()
  const [pageIndex, setPageIndex] = useState(0)

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x
    const next = Math.round(x / WINDOW_WIDTH)
    setPageIndex(next)
  }, [])

  const goAuth = useCallback(async () => {
    await setGetStartedCompleted()
    openAuthSheet({ mode: 'chooser', showSkipLogin: true })
  }, [openAuthSheet])

  const goSignIn = useCallback(async () => {
    await setGetStartedCompleted()
    openAuthSheet({ mode: 'signin', showSkipLogin: true })
  }, [openAuthSheet])

  const goBrowse = useCallback(async () => {
    await enterGuestBrowseMode()
    router.replace(SCREEN_HOME)
  }, [router])

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      <StatusBar style="light" />
      <ImageBackground
        source={SPLASH_BACKGROUND}
        resizeMode="cover"
        style={styles.background}
        accessibilityIgnoresInvertColors
      >
        <View pointerEvents="none" style={styles.backgroundScrim} />
        <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
          <View className="flex-1 items-center justify-center">
            <View className="mb-8 items-center" pointerEvents="none">
              <TastyLogoWhite
                accessible
                accessibilityLabel="TastyPlates"
                width={LOGO_WIDTH}
                height={Math.round(LOGO_WIDTH * LOGO_VIEWBOX_RATIO)}
              />
            </View>

            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              onScroll={onScroll}
              scrollEventThrottle={16}
              style={styles.textCarousel}
              contentContainerStyle={styles.textCarouselContent}
            >
              {SLIDES.map((slide) => (
                <View key={slide.id} style={styles.textSlide}>
                  <Text className="mt-10 mb-3 text-center text-2xl font-semibold text-white">
                    {slide.title}
                  </Text>
                  <Text className="text-center text-base leading-relaxed text-white/90">
                    {slide.body}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View className="px-4 pb-2 pt-2">
            <View className="mb-6 flex-row items-center justify-center gap-2">
              {SLIDES.map((s, i) => (
                <View
                  key={s.id}
                  className="h-2 rounded-full"
                  style={{
                    width: i === pageIndex ? 22 : 8,
                    backgroundColor: i === pageIndex ? BRAND_PRIMARY : 'rgba(255, 255, 255, 0.4)',
                  }}
                />
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => void goAuth()}
              className="mb-8 w-full items-center rounded-full py-4 active:opacity-90"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Text className="text-base font-semibold text-white">Get Started</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => void goBrowse()}
              className="mb-4 w-full items-center py-2 active:opacity-70"
            >
              <Text className={FOOTER_LINK_TEXT}>Browse without signing in</Text>
            </Pressable>

            <View className="flex-row flex-wrap items-center justify-center pb-6">
              <Text className={FOOTER_LINK_TEXT}>Already have an account? </Text>
              <Pressable onPress={() => void goSignIn()} hitSlop={8}>
                <Text className="text-base font-semibold text-white">Log in</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  textCarousel: {
    flexGrow: 0,
  },
  textCarouselContent: {
    alignItems: 'center',
  },
  textSlide: {
    width: WINDOW_WIDTH,
    justifyContent: 'center',
    paddingHorizontal: 32,
    minHeight: 120,
  },
})
