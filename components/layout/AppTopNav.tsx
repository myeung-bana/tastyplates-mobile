import { View, Text, Pressable, Image } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlobalLocationPill } from '@/components/navigation/GlobalLocationPill'
import { TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_HOME, SCREEN_PROFILE } from '@/constants/screens'
import { useSearchCuisinesSheet } from '@/contexts/SearchCuisinesSheetContext'
import { useNhostSession } from '@/hooks/useNhostSession'
import { initialsFromName } from '@/lib/profileFormatting'

const AVATAR_SIZE = 32
const SIDE_SLOT = 88

function ProfileShortcut(): JSX.Element {
  const router = useRouter()
  const { authUser, profile, loading } = useNhostSession()
  const isSignedIn = Boolean(authUser?.id)
  const avatarUrl = profile?.avatarUrl?.trim() ?? null
  const name =
    profile?.displayName?.trim() ??
    authUser?.displayName?.trim() ??
    'Member'

  const goProfile = (): void => {
    void Haptics.selectionAsync()
    router.push(SCREEN_PROFILE)
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Profile"
      accessibilityHint="Opens your profile"
      hitSlop={8}
      onPress={goProfile}
      className="overflow-hidden rounded-full border border-gray-200 bg-gray-50 active:opacity-80"
      style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
    >
      {!isSignedIn ? (
        <View className="h-full w-full items-center justify-center">
          <Ionicons name="person-outline" size={20} color={TEXT_MUTED} />
        </View>
      ) : avatarUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: avatarUrl }}
          className="h-full w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <Text
            className="text-xs font-semibold"
            style={{ color: TEXT_HEADING }}
            maxFontSizeMultiplier={1.2}
          >
            {loading ? '…' : initialsFromName(name)}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

/** Small brand mark taps home tab (see tasty-palate-review header). */
function HomeLogo(): JSX.Element {
  const router = useRouter()

  const source = require('@/assets/AppIcons/appstore.png')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Home"
      hitSlop={8}
      onPress={() => {
        void Haptics.selectionAsync()
        router.push(SCREEN_HOME)
      }}
      className="active:opacity-80"
    >
      <Image
        accessibilityIgnoresInvertColors
        source={source}
        style={{ width: 24, height: 24 }}
        resizeMode="contain"
      />
    </Pressable>
  )
}

const APP_TOP_NAV_INNER_PAD = 12

/** Top safe area + bordered bar: logo • location pill • search + profile. */
export function AppTopNav(): JSX.Element {
  const insets = useSafeAreaInsets()
  const { openSearchCuisines } = useSearchCuisinesSheet()

  return (
    <View
      className="flex-row items-center justify-between border-b border-gray-100 bg-white px-3 pb-3"
      style={{ paddingTop: insets.top + APP_TOP_NAV_INNER_PAD }}
    >
      <View style={{ width: SIDE_SLOT }} className="items-start justify-center">
        <HomeLogo />
      </View>

      <View pointerEvents="box-none" className="min-w-0 flex-1 items-center px-1">
        <GlobalLocationPill maxWidth={180} />
      </View>

      <View
        style={{ width: SIDE_SLOT }}
        className="flex-row items-center justify-end gap-3"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search cuisines"
          hitSlop={12}
          onPress={() => openSearchCuisines()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
        >
          <Ionicons name="search-outline" size={23} color="#374151" />
        </Pressable>
        <ProfileShortcut />
      </View>
    </View>
  )
}

/** @deprecated Shortcuts removed from top nav — returns nothing; exported so stale Metro bundles do not crash. */
export function HomeTopNavShortcuts(): null {
  return null
}
