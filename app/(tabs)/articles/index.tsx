import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native'
import { Stack, router } from 'expo-router'

import { ArticleListCard } from '@/components/articles/ArticleListCard'
import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_ARTICLE_DETAIL } from '@/constants/screens'
import { useLocation } from '@/contexts/LocationContext'
import {
  fetchArticlesPage,
  type ArticleApi,
} from '@/lib/homeContentApi'

const PAGE_SIZE = 20

export default function ArticlesListScreen(): JSX.Element {
  const { location } = useLocation()
  const [articles, setArticles] = useState<ArticleApi[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPage = useCallback(
    async (offset: number, replace: boolean) => {
      const result = await fetchArticlesPage(location.key, PAGE_SIZE, offset)
      setHasMore(result.hasMore)
      setArticles((prev) => (replace ? result.articles : [...prev, ...result.articles]))
      return result.articles.length
    },
    [location.key],
  )

  const initialLoad = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const count = await loadPage(0, true)
      if (count === 0) setError('No articles available right now.')
    } catch {
      setError('Could not load articles.')
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [loadPage])

  useEffect(() => {
    void initialLoad()
  }, [initialLoad])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const count = await loadPage(0, true)
      if (count === 0) setError('No articles available right now.')
    } catch {
      setError('Could not load articles.')
    } finally {
      setRefreshing(false)
    }
  }, [loadPage])

  const onEndReached = useCallback(async () => {
    if (loading || refreshing || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      await loadPage(articles.length, false)
    } finally {
      setLoadingMore(false)
    }
  }, [articles.length, hasMore, loadPage, loading, loadingMore, refreshing])

  const navigateToArticle = useCallback((article: ArticleApi) => {
    const segment = article.slug?.trim() || String(article.id)
    router.push({
      pathname: SCREEN_ARTICLE_DETAIL,
      params: { slug: segment },
    })
  }, [])

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <ReviewDetailTopNav title="Articles" />

      {loading && articles.length === 0 ? (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator color={BRAND_PRIMARY} size="large" />
        </View>
      ) : error && articles.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 py-16">
          <Text className="text-center text-base" style={{ color: TEXT_MUTED }}>
            {error}
          </Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={BRAND_PRIMARY}
            />
          }
          onEndReached={() => void onEndReached()}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <ArticleListCard article={item} onPress={() => navigateToArticle(item)} />
          )}
          ListFooterComponent={
            loadingMore ? (
              <View className="items-center py-6">
                <ActivityIndicator color={BRAND_PRIMARY} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  )
}
