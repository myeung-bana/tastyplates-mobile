import { useEffect, useState, useCallback } from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { ArticleListCard } from '@/components/articles/ArticleListCard'
import { Button } from '@/components/ui/Button'
import { fetchArticles, type ArticleApi } from '@/lib/homeContentApi'
import { SCREEN_ARTICLE_DETAIL, SCREEN_ARTICLES_LIST } from '@/constants/screens'
import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'
import { HomeSectionCard } from '@/components/home/HomeSectionCard'
import { useLocation } from '@/contexts/LocationContext'

/**
 * Article cards — web API when set, else Nhost `articles/get-articles`
 * (`recommend-articles.md`). Styling: `design_system.md` §2.3–2.4, §5.3 Card.
 */
export function HomeArticlesSection() {
  const { location } = useLocation()
  const [articles, setArticles] = useState<ArticleApi[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (locationKey: string) => {
    setLoading(true)
    const data = await fetchArticles(locationKey, 8)
    setArticles(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load(location.key)
  }, [load, location.key])

  const navigateToArticle = (a: ArticleApi) => {
    const segment = a.slug?.trim() || String(a.id)
    router.push({
      pathname: SCREEN_ARTICLE_DETAIL,
      params: { slug: segment },
    })
  }

  const viewAllArticles = () => {
    void Haptics.selectionAsync()
    router.push(SCREEN_ARTICLES_LIST)
  }

  return (
    <HomeSectionCard title="Articles" className="pb-8">
      {loading ? (
        <View className="items-center py-12">
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      ) : (
        <>
          {articles.length > 0 ? (
            <View className="gap-4">
              {articles.map((article) => (
                <ArticleListCard
                  key={String(article.id)}
                  article={article}
                  onPress={() => navigateToArticle(article)}
                />
              ))}
            </View>
          ) : (
            <Text className="py-4 text-center text-sm" style={{ color: TEXT_MUTED }}>
              No featured articles for this location yet. Browse all stories below.
            </Text>
          )}
          <View className={articles.length > 0 ? 'mt-5 items-center' : 'mt-2 items-center'}>
            <Button
              variant="primary"
              onPress={viewAllArticles}
              className="w-full max-w-sm"
            >
              View Articles
            </Button>
          </View>
        </>
      )}
    </HomeSectionCard>
  )
}
