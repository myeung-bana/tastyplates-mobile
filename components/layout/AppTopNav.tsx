import { View, Text, Pressable, Image } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlobalLocationPill } from '@/components/navigation/GlobalLocationPill'
import { TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_PROFILE } from '@/constants/screens'
import { useAuthSheet } from '@/contexts/AuthSheetContext'
import { useSearchOverlay } from '@/contexts/SearchOverlayContext'
import { FULL_SCREEN_OVERLAY_INNER_PAD } from '@/hooks/useFullScreenOverlayInsets'
import { useOwnProfilePresentation } from '@/hooks/useOwnProfilePresentation'
import { initialsFromName } from '@/lib/profileFormatting'

const AVATAR_SIZE = 32

function ProfileShortcut(): JSX.Element {
  const router = useRouter()
  const { openAuthSheet } = useAuthSheet()
  const { authUserId, avatarUrl, displayName, loading } = useOwnProfilePresentation()
  const isSignedIn = Boolean(authUserId)
  const name = displayName

  const goProfile = (): void => {
    void Haptics.selectionAsync()
    if (!isSignedIn) {
      openAuthSheet({ mode: 'signin', resume: SCREEN_PROFILE })
      return
    }
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
          <AppIcon name="user" size="md" color={TEXT_MUTED} />
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

const APP_TOP_NAV_INNER_PAD = FULL_SCREEN_OVERLAY_INNER_PAD

/** Location pill (left) | cuisine search + profile (right). */
export function AppTopNav(): JSX.Element {
  const insets = useSafeAreaInsets()
  const { openSearch } = useSearchOverlay()

  return (
    <View
      className="flex-row items-center justify-between border-b border-gray-100 bg-white pb-3"
      style={{
        paddingTop: insets.top + APP_TOP_NAV_INNER_PAD,
        paddingLeft: insets.left + 12,
        paddingRight: insets.right + 12,
        gap: 8,
      }}
    >
      <View pointerEvents="box-none" className="min-w-0 flex-1 items-start justify-center pr-2">
        <GlobalLocationPill maxWidth={260} />
      </View>

      {/* Right: cuisine search + profile */}
      <View className="flex-shrink-0 flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search restaurants"
          hitSlop={12}
          onPress={() => {
            void Haptics.selectionAsync()
            openSearch()
          }}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
        >
          <AppIcon name="search" size={21} color="#374151" />
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
