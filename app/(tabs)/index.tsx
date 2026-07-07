import { useCallback, useState } from 'react'
import { View, ScrollView, RefreshControl } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

import { useTabBarScrollHandler } from '@/hooks/useTabBarScrollHandler'
import {
  HomeBrandMark,
  HomeHero,
  HomeFeaturedRestaurants,
  HomeQuickFinds,
  HomeReviewsSection,
  HomeArticlesSection,
} from '@/components/home'
import { AppTopNav } from '@/components/layout/AppTopNav'
import { BRAND_PRIMARY } from '@/constants/brand'

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [feedKey, setFeedKey] = useState(0)
  const [recentRefreshKey, setRecentRefreshKey] = useState(0)
  const { onScroll, scrollEventThrottle } = useTabBarScrollHandler()

  useFocusEffect(
    useCallback(() => {
      setRecentRefreshKey((k) => k + 1)
    }, []),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setFeedKey((k) => k + 1)
    await new Promise((r) => setTimeout(r, 400))
    setRefreshing(false)
  }, [])

  return (
    <View className="flex-1 bg-white">
      <AppTopNav />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_PRIMARY} />}
      >
        <HomeBrandMark />
        <HomeHero recentRefreshKey={recentRefreshKey} />
        <HomeQuickFinds />
        <HomeFeaturedRestaurants key={`home-featured-${feedKey}`} />
        <HomeReviewsSection refreshNonce={feedKey} />
        <HomeArticlesSection key={`home-articles-${feedKey}`} />
      </ScrollView>
    </View>
  )
}
