import { useCallback, useState } from 'react'
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BRAND_PRIMARY, TEXT_BODY, TEXT_HEADING } from '@/constants/brand'
import { SCREEN_HOME } from '@/constants/screens'
import { loginScreenHref } from '@/lib/authRoutes'
import { enterGuestBrowseMode } from '@/lib/guestBrowse'
import { setGetStartedCompleted } from '@/lib/getStartedIntro'

const { width: WINDOW_WIDTH } = Dimensions.get('window')

type Slide = {
  id: string
  title: string
  body: string
  icon: React.ComponentProps<typeof Ionicons>['name']
}

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Discover great food',
    body: 'Browse restaurants and cuisines tailored to your taste. Placeholder copy — replace anytime.',
    icon: 'restaurant-outline',
  },
  {
    id: '2',
    title: 'Share your plates',
    body: 'Post reviews and photos so others can find their next favorite meal.',
    icon: 'camera-outline',
  },
  {
    id: '3',
    title: 'Join the community',
    body: 'Follow reviewers, save spots, and grow your food journey with Tastyplates.',
    icon: 'people-outline',
  },
]

export default function GetStartedScreen(): JSX.Element {
  const router = useRouter()
  const [pageIndex, setPageIndex] = useState(0)

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x
    const next = Math.round(x / WINDOW_WIDTH)
    setPageIndex(next)
  }, [])

  const goAuth = useCallback(async () => {
    await setGetStartedCompleted()
    router.replace(loginScreenHref())
  }, [router])

  const goSignIn = useCallback(async () => {
    await setGetStartedCompleted()
    router.replace(loginScreenHref({ mode: 'signin' }))
  }, [router])

  const goBrowse = useCallback(async () => {
    await enterGuestBrowseMode()
    router.replace(SCREEN_HOME)
  }, [router])

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      <SafeAreaView className="flex-1 bg-[#FCFCFC]" edges={['top', 'left', 'right']}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {SLIDES.map((slide) => (
            <View
              key={slide.id}
              className="flex-1 justify-center px-8 pt-4"
              style={{ width: WINDOW_WIDTH }}
            >
              <View className="mb-8 items-center justify-center">
                <View
                  className="mb-6 h-28 w-28 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${BRAND_PRIMARY}18` }}
                >
                  <Ionicons name={slide.icon} size={56} color={BRAND_PRIMARY} />
                </View>
                <Text className="mb-3 text-center text-2xl font-semibold" style={{ color: TEXT_HEADING }}>
                  {slide.title}
                </Text>
                <Text className="text-center text-base leading-relaxed" style={{ color: TEXT_BODY }}>
                  {slide.body}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View className="px-4 pb-2 pt-2">
          <View className="mb-6 flex-row items-center justify-center gap-2">
            {SLIDES.map((s, i) => (
              <View
                key={s.id}
                className="h-2 rounded-full"
                style={{
                  width: i === pageIndex ? 22 : 8,
                  backgroundColor: i === pageIndex ? BRAND_PRIMARY : '#d1d5db',
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
            <Text className="text-sm font-medium text-gray-500">Browse without signing in</Text>
          </Pressable>

          <View className="flex-row flex-wrap items-center justify-center pb-6">
            <Text className="text-base" style={{ color: TEXT_BODY }}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => void goSignIn()} hitSlop={8}>
              <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }}>
                Log in
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </>
  )
}
