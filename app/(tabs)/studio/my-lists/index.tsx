import { useCallback, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, RefreshControl, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { AddToMyListSheet, type AddToMyListSheetHandle } from '@/components/studio/AddToMyListSheet'
import { GlobalLocationPill } from '@/components/navigation/GlobalLocationPill'
import { MyListPlaceCard } from '@/components/studio/MyListPlaceCard'
import { BORDER_SUBTLE, BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { useAuth } from '@/hooks/useAuth'
import type { MyListPlaceRow, StudioListKind } from '@/hooks/useMyList'
import { useMyList } from '@/hooks/useMyList'

export default function StudioMyListsScreen(): JSX.Element {
  const sheetRef = useRef<AddToMyListSheetHandle>(null)
  const { authUser } = useAuth()
  const userId = authUser?.id ?? null
  const insets = useSafeAreaInsets()

  const [segment, setSegment] = useState<StudioListKind>('checkin')
  const [refreshPull, setRefreshPull] = useState(false)
  const { rows, loading, refetch, attachPlaceFromGoogleDetails, removeRow } = useMyList(userId, segment)

  const onPullRefresh = useCallback(async () => {
    setRefreshPull(true)
    try {
      await refetch?.()
    } finally {
      setRefreshPull(false)
    }
  }, [refetch])

  const guardedRemoveRow = useCallback(
    async (id: string) => {
      try {
        await removeRow(id)
      } catch {
        Alert.alert(
          'Could not remove',
          'Verify Hasura delete permissions on user_place_collections, then retry.',
        )
      }
    },
    [removeRow],
  )

  const renderItem = useCallback(
    ({ item }: { item: MyListPlaceRow }) => <MyListPlaceCard row={item} onRemove={guardedRemoveRow} />,
    [guardedRemoveRow],
  )

  const listHeader = useMemo(
    () => (
      <>
        <View className="mb-6 flex-row items-center justify-between">
          <View className="mr-4 flex-shrink">
            <Text className="text-sm" style={{ color: TEXT_MUTED }}>
              Anchored region
            </Text>
          </View>
          <GlobalLocationPill maxWidth={148} />
        </View>

        <View className="mb-4 flex-row rounded-2xl border p-1" style={{ borderColor: BORDER_SUBTLE }}>
          {(
            [
              { key: 'checkin' as const, label: 'Check-ins' },
              { key: 'like' as const, label: 'Likes' },
            ] as const
          ).map((tab) => {
            const chosen = segment === tab.key
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: chosen }}
                key={tab.key}
                onPress={() => {
                  void Haptics.selectionAsync()
                  setSegment(tab.key)
                }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  borderRadius: 14,
                  paddingVertical: 10,
                  backgroundColor: chosen ? BRAND_PRIMARY : '#ffffff',
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: 13, color: chosen ? '#ffffff' : TEXT_HEADING }}>
                  {tab.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </>
    ),
    [segment],
  )

  return (
    <SafeAreaView className="relative flex-1 bg-white px-5 pt-6" edges={['left', 'right', 'bottom']}>
      {!userId ? (
        <ActivityIndicator />
      ) : loading && rows.length === 0 ? (
        <ActivityIndicator />
      ) : (
        <FlashList
          style={{ flex: 1 }}
          data={rows}
          keyExtractor={(row) => row.id}
          ListHeaderComponent={listHeader}
          renderItem={renderItem}
          ListEmptyComponent={
            <View className="items-center pb-28 pt-8">
              <Text className="text-center text-sm" style={{ color: TEXT_MUTED }}>
                No saved places yet. Tap (+) below to anchor a Google venue to this list. We hydrate the TastyPlates match once listings sync (via match-restaurant + slug deep links).
              </Text>
            </View>
          }
          refreshControl={
            userId ? (
              <RefreshControl refreshing={refreshPull || loading} onRefresh={() => void onPullRefresh()} />
            ) : undefined
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add place to list"
        onPress={() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          sheetRef.current?.present()
        }}
        className="absolute h-14 w-14 items-center justify-center rounded-full shadow-lg active:opacity-90"
        style={{
          bottom: Math.max(insets.bottom + 12, 32),
          right: 26,
          backgroundColor: BRAND_PRIMARY,
          elevation: 5,
          shadowOpacity: 0.2,
        }}
      >
        <Ionicons name="add" size={29} color="#ffffff" />
      </Pressable>

      <AddToMyListSheet
        ref={sheetRef}
        userId={userId}
        activeListKind={segment}
        attachPlaceFromGoogleDetails={attachPlaceFromGoogleDetails}
      />
    </SafeAreaView>
  )
}
