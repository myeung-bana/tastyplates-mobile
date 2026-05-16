import { View, Text, Pressable, Image } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_PROFILE } from '@/constants/screens'
import { useSearchCuisinesSheet } from '@/contexts/SearchCuisinesSheetContext'
import { useNhostSession } from '@/hooks/useNhostSession'
import { initialsFromName } from '@/lib/profileFormatting'

const AVATAR_SIZE = 40

function ProfileShortcut() {
  const router = useRouter()
  const { authUser, profile, loading } = useNhostSession()
  const isSignedIn = Boolean(authUser?.id)
  const avatarUrl = profile?.avatarUrl?.trim() ?? null
  const name =
    profile?.displayName?.trim() ??
    authUser?.displayName?.trim() ??
    'Member'

  const goProfile = () => {
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
          <Ionicons name="person-outline" size={22} color={TEXT_MUTED} />
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
            className="text-sm font-semibold"
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

/**
 * Top bar: profile shortcut — brand — search (cuisines sheet).
 */
export function AppTopNav() {
  const { openSearchCuisines } = useSearchCuisinesSheet()

  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
      <View className="min-w-0 flex-1 flex-row items-center gap-3 pr-2">
        <ProfileShortcut />
        <Text
          className="flex-shrink text-xl font-semibold text-gray-900"
          style={{ letterSpacing: -0.5 }}
          numberOfLines={1}
        >
          Tasty<Text style={{ color: BRAND_PRIMARY }}>Plates</Text>
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search cuisines"
        hitSlop={12}
        onPress={() => openSearchCuisines()}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
      >
        <Ionicons name="search-outline" size={24} color="#374151" />
      </Pressable>
    </View>
  )
}

/** @deprecated Shortcuts removed from top nav — returns nothing; exported so stale Metro bundles don’t crash. */
export function HomeTopNavShortcuts(): null {
  return null
}
