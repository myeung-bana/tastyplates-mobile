import { View, ScrollView, RefreshControl } from 'react-native'

import { useCallback, useState } from 'react'
import {
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_PRIMARY} />}
      >
        <HomeHero />
        <HomeQuickFinds />
        <HomeFeaturedRestaurants key={`home-featured-${feedKey}`} />
        <HomeReviewsSection refreshNonce={feedKey} />
        <HomeArticlesSection key={`home-articles-${feedKey}`} />
      </ScrollView>
    </View>
  )
}
