import { useCallback, useEffect, useState, type ReactElement } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import {
  FollowingFeedActivityCard,
  FollowingFeedRowSkeleton,
} from '@/components/following/FollowingFeedActivityCard'
import { FollowingFeedShowMore } from '@/components/following/FollowingFeedShowMore'
import { SuggestedUserRow } from '@/components/following/SuggestedUserRow'
import { AppTopNav } from '@/components/layout/AppTopNav'
import { SectionTitle } from '@/components/layout/SectionTitle'
import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'
import {
  SCREEN_PUBLIC_PROFILE,
  SCREEN_REVIEW_VIEWER,
} from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useFollowingFeed } from '@/hooks/useFollowingFeed'
import { pushLoginScreen } from '@/lib/authRoutes'
import type { ActivityFeedSection } from '@/lib/followingFeedGrouping'
import {
  fetchSuggestedUsers,
  type FollowingFeedAuthorProfile,
} from '@/services/followingFeedService'
import { isRestaurantUserRouteId } from '@/services/restaurantUserService'

const GRID_GAP = 12

type SuggestedUserList = Awaited<ReturnType<typeof fetchSuggestedUsers>>

/** Suggested accounts — horizontal row (ScrollView avoids nesting inside the feed list). */
function FollowingSuggestedSection({
  userId,
  suggested,
  onFollowed,
}: {
  userId: string
  suggested: SuggestedUserList
  onFollowed: () => void
}): ReactElement {
  return (
    <View className="px-4 pt-2">
      <SectionTitle>Suggested Users</SectionTitle>
      {suggested.length === 0 ? (
        <Text className="mt-3 text-sm" style={{ color: TEXT_MUTED }}>
          No suggestions right now — check back later.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingTop: 12,
            paddingBottom: 8,
          }}
        >
          {suggested.map((item, index) => (
            <View key={item.id} style={{ marginLeft: index > 0 ? GRID_GAP : 0 }}>
              <SuggestedUserRow user={item} viewerId={userId} onFollowed={onFollowed} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

/**
 * Following feed — gated like home "For You"; auth via `/login` + resume (`auth-review.md` §4–5).
 */
export default function FollowingScreen() {
  const { isAuthenticated, loading: authLoading, authUser } = useAuth()
  const userId = authUser?.id ?? null

  const [suggested, setSuggested] = useState<SuggestedUserList>([])
  const [suggestedLoading, setSuggestedLoading] = useState(true)

  const {
    activities,
    sections,
    loading: feedLoading,
    refreshing,
    loadingMore,
    error: feedError,
    showEarlierCta,
    showLoadMoreCta,
    refresh: refreshFeed,
    loadMore,
    showEarlierActivity,
    keyExtractor,
  } = useFollowingFeed(userId)

  const loadSuggested = useCallback(async () => {
    if (!userId) return
    setSuggestedLoading(true)
    try {
      const suggestedUsers = await fetchSuggestedUsers(12)
      setSuggested(suggestedUsers)
    } catch {
      setSuggested([])
    } finally {
      setSuggestedLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    void loadSuggested()
  }, [userId, loadSuggested])

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshFeed(), loadSuggested()])
  }, [refreshFeed, loadSuggested])

  const onOpenReview = (reviewId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({
      pathname: SCREEN_REVIEW_VIEWER,
      params: { reviewId },
    })
  }

  const onOpenAuthor = (
    authorId: string,
    profile: FollowingFeedAuthorProfile | null | undefined,
  ) => {
    void Haptics.selectionAsync()
    const usernameSlug = profile?.username?.trim().replace(/^@/, '')
    if (usernameSlug) {
      router.push({
        pathname: SCREEN_PUBLIC_PROFILE,
        params: { userId: usernameSlug },
      })
      return
    }
    const id = authorId.trim()
    if (id && isRestaurantUserRouteId(id)) {
      router.push({
        pathname: SCREEN_PUBLIC_PROFILE,
        params: { userId: id },
      })
    }
  }

  const loading = (feedLoading || suggestedLoading) && !refreshing
  const error = feedError

  if (!authLoading && !isAuthenticated) {
    return (
      <View className="flex-1 bg-white">
        <AppTopNav />
        <View className="flex-1 items-center justify-center px-8">
          <SectionTitle className="text-center">Following</SectionTitle>
          <Text className="mt-3 text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
            Sign in to see activity from people you follow.
          </Text>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync()
              pushLoginScreen(router, { resume: '/(tabs)/following' })
            }}
            className="mt-6 rounded-full px-8 py-3 active:opacity-90"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            <Text className="font-normal text-base text-white">Sign in</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  if (authLoading || !userId) {
    return (
      <View className="flex-1 bg-white">
        <AppTopNav />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </View>
    )
  }

  const feedListHeader = (
    <View>
      <FollowingSuggestedSection
        userId={userId}
        suggested={suggested}
        onFollowed={() => void onRefresh()}
      />
      <View className="mt-3 px-4 pb-2">
        <SectionTitle>Follower Activity</SectionTitle>
      </View>
    </View>
  )

  const feedListFooter = (
    <>
      {showEarlierCta ? (
        <FollowingFeedShowMore
          label="Show earlier activity"
          loading={loadingMore}
          onPress={() => void showEarlierActivity()}
        />
      ) : null}
      {showLoadMoreCta ? (
        <FollowingFeedShowMore
          label="Load more"
          loading={loadingMore}
          onPress={() => void loadMore()}
        />
      ) : null}
    </>
  )

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <AppTopNav />
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="px-4 pt-2">
            <SectionTitle>Suggested Users</SectionTitle>
            <View className="mt-3 h-28 rounded-2xl bg-neutral-100" />
          </View>
          <View className="mt-3 px-4 pb-2">
            <SectionTitle>Follower Activity</SectionTitle>
          </View>
          <View className="px-4">
            {[0, 1, 2].map((i) => (
              <FollowingFeedRowSkeleton key={i} />
            ))}
          </View>
        </ScrollView>
      </View>
    )
  }

  if (error) {
    return (
      <View className="flex-1 bg-white">
        <AppTopNav />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BRAND_PRIMARY} />
          }
        >
          <View className="mt-10 items-center px-6">
            <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              {error}
            </Text>
            <Pressable
              onPress={() => void onRefresh()}
              className="mt-4 rounded-full px-6 py-2.5 active:opacity-90"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Text className="text-sm font-medium text-white">Try again</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      <AppTopNav />
      <SectionList
        style={{ flex: 1 }}
        sections={sections}
        keyExtractor={keyExtractor}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={feedListHeader}
        ListFooterComponent={feedListFooter}
        ListEmptyComponent={
          activities.length === 0 ? (
            <Text className="mt-4 px-4 text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              No activity from people you follow yet.
            </Text>
          ) : null
        }
        renderSectionHeader={({ section }: { section: ActivityFeedSection }) => (
          <View className="bg-white px-4 pb-2 pt-4">
            <Text className="font-neusans text-xs font-semibold uppercase tracking-wide text-gray-400">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View className="px-4">
            <FollowingFeedActivityCard
              activity={item}
              onPressReview={onOpenReview}
              onPressComment={onOpenReview}
              onPressAuthor={onOpenAuthor}
            />
          </View>
        )}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BRAND_PRIMARY} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}
