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
import { TpMark } from '@/components/brand/TpMark'
import { Button } from '@/components/ui/Button'
import { BRAND_PRIMARY, SURFACE_CARD, SURFACE_FOG, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import {
  SCREEN_REVIEW_VIEWER,
} from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useFollowingFeed } from '@/hooks/useFollowingFeed'
import { useTabBarScrollHandler } from '@/hooks/useTabBarScrollHandler'
import { pushLoginScreen } from '@/lib/authRoutes'
import type { ActivityFeedSection } from '@/lib/followingFeedGrouping'
import { publicProfileFromAuthorFields, pushPublicProfile } from '@/lib/publicProfileNavigation'
import {
  fetchSuggestedUsers,
  type FollowingFeedAuthorProfile,
} from '@/services/followingFeedService'

const GRID_GAP = 12

type SuggestedUserList = Awaited<ReturnType<typeof fetchSuggestedUsers>>

/** Page heading under the top bar (design A1). */
function ActivityTitle(): ReactElement {
  return (
    <Text
      accessibilityRole="header"
      style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16, fontFamily: FONT.heading, fontSize: 28, lineHeight: 34, color: TEXT_HEADING }}
    >
      Activity
    </Text>
  )
}

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
    <View className="px-5 pt-1">
      <View className="flex-row items-baseline justify-between">
        <SectionTitle>Suggested</SectionTitle>
        <Text style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}>Newest members</Text>
      </View>
      {suggested.length === 0 ? (
        <Text className="mt-3 text-sm font-body" style={{ color: TEXT_MUTED }}>
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
  const { onScroll, scrollEventThrottle } = useTabBarScrollHandler()

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
    pushPublicProfile(router, publicProfileFromAuthorFields(authorId, profile))
  }

  const loading = (feedLoading || suggestedLoading) && !refreshing
  const error = feedError

  if (!authLoading && !isAuthenticated) {
    return (
      <View className="flex-1 bg-white">
        <AppTopNav />
        <ActivityTitle />
        <View className="flex-1 items-center justify-center" style={{ paddingHorizontal: 32, gap: 12, marginTop: -60 }}>
          <TpMark size={40} />
          <Text accessibilityRole="header" className="text-center" style={{ fontFamily: FONT.heading, fontSize: 24, lineHeight: 30, color: TEXT_HEADING }}>
            See what your people are eating
          </Text>
          <Text className="text-center" style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: TEXT_MUTED }}>
            Sign in to follow people and see their reviews, comments and check-ins here.
          </Text>
          <Button
            style={{ marginTop: 8, alignSelf: 'stretch' }}
            onPress={() => {
              void Haptics.selectionAsync()
              pushLoginScreen(router, { resume: '/(tabs)/following' })
            }}
          >
            Sign in
          </Button>
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
      <ActivityTitle />
      <FollowingSuggestedSection
        userId={userId}
        suggested={suggested}
        onFollowed={() => void onRefresh()}
      />
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
          <ActivityTitle />
          <View className="px-5 pt-1">
            <SectionTitle>Suggested</SectionTitle>
            <View className="mt-3 h-28 rounded-2xl" style={{ backgroundColor: SURFACE_FOG }} />
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
            <Text className="text-center text-sm leading-relaxed font-body" style={{ color: TEXT_MUTED }}>
              {error}
            </Text>
            <Pressable
              onPress={() => void onRefresh()}
              className="mt-4 rounded-full px-6 py-2.5 active:opacity-90"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Text className="text-sm text-white font-body-medium">Try again</Text>
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
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        ListHeaderComponent={feedListHeader}
        ListFooterComponent={feedListFooter}
        ListEmptyComponent={
          activities.length === 0 ? (
            <View className="items-center" style={{ paddingHorizontal: 32, paddingTop: 32, gap: 8 }}>
              <Text style={{ fontFamily: FONT.heading, fontSize: 20, color: TEXT_HEADING }}>Your feed is empty</Text>
              <Text className="text-center" style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 21, color: TEXT_MUTED }}>
                Activity shows reviews, comments and check-ins from people you follow. Follow someone above to get
                started.
              </Text>
            </View>
          ) : null
        }
        renderSectionHeader={({ section }: { section: ActivityFeedSection }) => (
          <View className="px-5 pb-2" style={{ paddingTop: 20, backgroundColor: SURFACE_CARD }}>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: FONT.heading, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}
            >
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View className="px-5">
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
