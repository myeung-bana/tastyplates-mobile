import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { BORDER_SUBTLE, BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_LOGIN } from '@/constants/screens'
import { getFloatingTabBarOccupiedHeight } from '@/constants/tabBar'
import { useAuth } from '@/hooks/useAuth'
import { fetchBlockedUsers, unblockUser, type BlockedUserEntry } from '@/services/moderationService'
import { toast } from '@/utils/toast'

function entryLabel(entry: BlockedUserEntry): string {
  const username = entry.user.username?.trim()
  if (username) return `@${username.replace(/^@/, '')}`
  return entry.user.display_name?.trim() || 'Member'
}

export default function BlockedUsersScreen(): JSX.Element {
  const insets = useSafeAreaInsets()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<BlockedUserEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setEntries(await fetchBlockedUsers())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) void load()
  }, [isAuthenticated, load])

  const confirmUnblock = (entry: BlockedUserEntry) => {
    const label = entryLabel(entry)
    Alert.alert(`Unblock ${label}?`, 'You’ll see each other’s reviews, comments and activity again. Follows aren’t restored.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: () => {
          setPendingId(entry.user.id)
          void unblockUser(entry.user.id)
            .then(() => {
              setEntries((prev) => prev.filter((e) => e.user.id !== entry.user.id))
              toast.success(`${label} has been unblocked.`)
            })
            .catch(() => toast.error('Could not unblock this user. Please try again.'))
            .finally(() => setPendingId(null))
        },
      },
    ])
  }

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  return (
    <View className="flex-1 bg-white">
      <ReviewDetailTopNav title="Blocked Users" />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BRAND_PRIMARY} size="large" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: getFloatingTabBarOccupiedHeight(insets) + 24,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-6 py-16" style={{ gap: 6 }}>
              {error ? (
                <Text className="text-center text-sm font-body" style={{ color: TEXT_MUTED }}>
                  Could not load blocked users. Pull back and try again.
                </Text>
              ) : (
                <>
                  <Text className="text-center text-lg font-heading" style={{ color: TEXT_HEADING }}>
                    No blocked users
                  </Text>
                  <Text className="text-center text-sm font-body" style={{ color: TEXT_MUTED }}>
                    People you block from a review, comment or profile show up here.
                  </Text>
                </>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View
              className="flex-row items-center gap-3 border-b py-3"
              style={{ borderBottomColor: BORDER_SUBTLE }}
            >
              <ProfileAvatarImage size={40} avatarUrl={item.user.profile_image} className="bg-gray-100" />
              <Text
                className="min-w-0 flex-1 text-base font-body"
                style={{ color: TEXT_HEADING }}
                numberOfLines={1}
              >
                {entryLabel(item)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Unblock ${entryLabel(item)}`}
                disabled={pendingId === item.user.id}
                onPress={() => confirmUnblock(item)}
                className="rounded-full border border-gray-300 px-4 py-2 active:opacity-80"
                style={pendingId === item.user.id ? { opacity: 0.5 } : undefined}
              >
                <Text className="text-sm font-body-medium" style={{ color: TEXT_HEADING }}>
                  Unblock
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  )
}
