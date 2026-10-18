import { View, Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { GlobalLocationPill } from '@/components/navigation/GlobalLocationPill'
import { SURFACE_CARD, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_PROFILE } from '@/constants/screens'
import { useAuthSheet } from '@/contexts/AuthSheetContext'
import { useSearchOverlay } from '@/contexts/SearchOverlayContext'
import { FULL_SCREEN_OVERLAY_INNER_PAD } from '@/hooks/useFullScreenOverlayInsets'
import { useOwnProfilePresentation } from '@/hooks/useOwnProfilePresentation'

const AVATAR_SIZE = 32

function ProfileShortcut(): JSX.Element {
  const router = useRouter()
  const { openAuthSheet } = useAuthSheet()
  const { authUserId, avatarUrl } = useOwnProfilePresentation()
  const isSignedIn = Boolean(authUserId)

  const goProfile = (): void => {
    void Haptics.selectionAsync()
    if (!isSignedIn) {
      openAuthSheet({ mode: 'signin', resume: SCREEN_PROFILE })
      return
    }
    router.replace(SCREEN_PROFILE)
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Profile"
      accessibilityHint="Opens your profile"
      hitSlop={8}
      onPress={goProfile}
      className="overflow-hidden rounded-full border border-[#DCDDE2] bg-[#EFEFF1] active:opacity-80"
      style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
    >
      {!isSignedIn ? (
        <View className="h-full w-full items-center justify-center">
          <AppIcon name="user" size="md" color={TEXT_MUTED} />
        </View>
      ) : (
        <ProfileAvatarImage
          key={avatarUrl ?? 'default'}
          size={AVATAR_SIZE}
          avatarUrl={avatarUrl}
          className="h-full w-full"
        />
      )}
    </Pressable>
  )
}

const APP_TOP_NAV_INNER_PAD = FULL_SCREEN_OVERLAY_INNER_PAD

/** White floating chrome over the Explore map (design S2). */
const FLOATING = {
  backgroundColor: SURFACE_CARD,
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
} as const

export type AppTopNavVariant = 'default' | 'mapOverlay'

export type AppTopNavProps = {
  /** Transparent chrome for map screens — map shows through status bar and nav row. */
  variant?: AppTopNavVariant
}

/** Location pill (left) | cuisine search + profile (right). */
export function AppTopNav({ variant = 'default' }: AppTopNavProps): JSX.Element {
  const insets = useSafeAreaInsets()
  const { openSearch } = useSearchOverlay()
  const isMapOverlay = variant === 'mapOverlay'

  return (
    <View
      className={
        isMapOverlay
          ? 'flex-row items-center justify-between'
          : 'flex-row items-center justify-between'
      }
      style={{
        paddingTop: insets.top + APP_TOP_NAV_INNER_PAD,
        paddingLeft: insets.left + (isMapOverlay ? 16 : 20),
        paddingRight: insets.right + 12,
        minHeight: insets.top + APP_TOP_NAV_INNER_PAD + 52,
        gap: 8,
        backgroundColor: isMapOverlay ? 'transparent' : SURFACE_CARD,
      }}
    >
      <View pointerEvents="box-none" className="min-w-0 flex-1 items-start justify-center pr-2">
        <View style={isMapOverlay ? [FLOATING, { borderRadius: 50, paddingHorizontal: 14, height: 40, justifyContent: 'center' }] : null}>
          <GlobalLocationPill maxWidth={260} />
        </View>
      </View>

      {/* Right: cuisine search + profile */}
      <View className="flex-shrink-0 flex-row items-center" style={{ gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search restaurants"
          hitSlop={6}
          onPress={() => {
            void Haptics.selectionAsync()
            openSearch()
          }}
          className="items-center justify-center rounded-full active:opacity-70"
          style={[{ width: 44, height: 44 }, isMapOverlay ? [FLOATING, { borderRadius: 22 }] : null]}
        >
          <AppIcon name="search" size={21} color={TEXT_HEADING} />
        </Pressable>
        <View
          className="items-center justify-center"
          style={[{ width: 44, height: 44 }, isMapOverlay ? [FLOATING, { borderRadius: 22 }] : null]}
        >
          <ProfileShortcut />
        </View>
      </View>
    </View>
  )
}

/** @deprecated Shortcuts removed from top nav — returns nothing; exported so stale Metro bundles do not crash. */
export function HomeTopNavShortcuts(): null {
  return null
}
