import { useCallback, useEffect, useState } from 'react'
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import TastyLogoColour from '@/assets/icons/TastyPlates_Logo_Colour.svg'
import { PalateOrbit } from '@/components/onboarding/PalateOrbit'
import type { AppIconName } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { BORDER_SUBTLE, BRAND_PRIMARY, SURFACE_CARD, TEXT_HEADING } from '@/constants/brand'
import { SCREEN_HOME } from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { useAuthSheet } from '@/contexts/AuthSheetContext'
import { setGetStartedCompleted } from '@/lib/getStartedIntro'
import { enterGuestBrowseMode } from '@/lib/guestBrowse'
import { firstSegmentParam } from '@/lib/routeParams'
import { toast } from '@/utils/toast'

type Slide = { id: string; title: string; body: string; icons: AppIconName[] }

const SLIDES: Slide[] = [
  {
    id: 'discover',
    title: 'Discover By Your Palate',
    body: 'Restaurants scored by people who grew up eating what you grew up eating.',
    icons: ['coffee', 'map-pin', 'star', 'globe', 'heart', 'compass', 'award'],
  },
  {
    id: 'share',
    title: 'Share your plates',
    body: 'Write a review, add photos, and become the trusted voice that steers someone toward their best meal yet.',
    icons: ['camera', 'edit-3', 'star', 'image', 'message-circle', 'thumbs-up', 'send'],
  },
  {
    id: 'world',
    title: 'Build your food world',
    body: 'Follow reviewers you trust, save places you want to try, and keep a record of everywhere you’ve been.',
    icons: ['users', 'bookmark', 'map', 'check-circle', 'list', 'user-plus', 'flag'],
  },
]

const LOGO_HEIGHT = 24
const LOGO_RATIO = 199 / 35

/**
 * `/get-started` (design G1). Three swipeable slides; Create account → auth chooser, Sign in →
 * same sheet on the sign-in form, Browse as guest → Home with no account.
 *
 * `?deletionScheduledFor=<ISO date>` shows the one-time D3 toast after an account deletion.
 */
export default function GetStartedScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { openAuthSheet } = useAuthSheet()
  const params = useLocalSearchParams<{ deletionScheduledFor?: string | string[] }>()
  const [page, setPage] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
  }, [])

  const deletionScheduledFor = firstSegmentParam(params.deletionScheduledFor)
  useEffect(() => {
    if (!deletionScheduledFor) return
    const date = new Date(deletionScheduledFor)
    if (Number.isNaN(date.getTime())) return
    const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    toast.info(`Your account is scheduled for deletion. Sign in before ${label} to restore it.`)
  }, [deletionScheduledFor])

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setPage(Math.round(e.nativeEvent.contentOffset.x / width))
    },
    [width],
  )

  const createAccount = useCallback(async () => {
    await setGetStartedCompleted()
    openAuthSheet({ mode: 'chooser', showSkipLogin: true })
  }, [openAuthSheet])

  const signIn = useCallback(async () => {
    await setGetStartedCompleted()
    openAuthSheet({ mode: 'signin', showSkipLogin: true })
  }, [openAuthSheet])

  const browseAsGuest = useCallback(async () => {
    await enterGuestBrowseMode()
    router.replace(SCREEN_HOME)
  }, [router])

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE_CARD, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      <StatusBar style="dark" />

      <View className="justify-center px-6" style={{ height: 44, marginTop: 8 }}>
        <TastyLogoColour
          accessible
          accessibilityLabel="Tastyplates"
          height={LOGO_HEIGHT}
          width={Math.round(LOGO_HEIGHT * LOGO_RATIO)}
        />
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={{ width }}>
            <View style={{ marginTop: 18 }}>
              <PalateOrbit icons={slide.icons} reduceMotion={reduceMotion} />
            </View>
            <View className="px-7" style={{ marginTop: 56, gap: 10 }}>
              <Text
                accessibilityRole="header"
                className="text-center"
                style={{ fontFamily: FONT.heading, fontSize: 30, lineHeight: 36, color: TEXT_HEADING }}
              >
                {slide.title}
              </Text>
              <Text
                className="text-center"
                style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: TEXT_HEADING }}
              >
                {slide.body}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        className="flex-row justify-center"
        style={{ gap: 6, marginBottom: 20 }}
        accessibilityLabel={`Slide ${page + 1} of ${SLIDES.length}`}
      >
        {SLIDES.map((s, i) => (
          <View
            key={s.id}
            style={{
              width: i === page ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === page ? BRAND_PRIMARY : BORDER_SUBTLE,
            }}
          />
        ))}
      </View>

      <View className="px-6" style={{ gap: 10, paddingBottom: Math.max(insets.bottom, 12) + 22 }}>
        <Button onPress={() => void createAccount()}>Create account</Button>
        <Button variant="secondary" onPress={() => void signIn()}>
          Sign in
        </Button>
        <Pressable
          accessibilityRole="button"
          onPress={() => void browseAsGuest()}
          className="items-center justify-center active:opacity-70"
          style={{ height: 40 }}
        >
          <Text
            style={{
              fontFamily: FONT.bodyMedium,
              fontSize: 15,
              color: TEXT_HEADING,
              textDecorationLine: 'underline',
            }}
          >
            Browse as guest
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
