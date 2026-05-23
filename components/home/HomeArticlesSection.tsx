import { useEffect, useState, useCallback } from 'react'
import { View, Text, Pressable, Image, ActivityIndicator, Linking } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { fetchArticles, type ArticleApi } from '@/lib/homeContentApi'
import { getMarketingWebOrigin } from '@/lib/webAssets'
import { SCREEN_ARTICLE_DETAIL } from '@/constants/screens'
import { ArticleCategoryTag } from '@/components/articles/ArticleCategoryTag'
import { BORDER_SUBTLE, BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
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

  if (!loading && articles.length === 0) return null

  const origin = getMarketingWebOrigin()

  const navigateToArticle = (a: ArticleApi) => {
    const segment = a.slug?.trim() || String(a.id)
    router.push({
      pathname: SCREEN_ARTICLE_DETAIL,
      params: { slug: segment },
    })
  }

  const openAll = () => {
    if (!origin) return
    void Haptics.selectionAsync()
    void Linking.openURL(`${origin}/articles`)
  }

  return (
    <HomeSectionCard
      title="Articles"
      headerRight={
        origin ? (
          <Pressable onPress={openAll} hitSlop={8} accessibilityRole="button">
            <Text className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
              See all
            </Text>
          </Pressable>
        ) : null
      }
      className="pb-8"
    >
      {loading ? (
        <View className="items-center py-12">
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      ) : (
        <View className="gap-4">
          {articles.map((article) => (
            <Pressable
              key={String(article.id)}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                navigateToArticle(article)
              }}
              accessibilityRole="button"
              accessibilityLabel={article.title}
              className="overflow-hidden rounded-2xl border bg-white active:opacity-90"
              style={{ borderColor: BORDER_SUBTLE }}
            >
              <View className="aspect-video w-full overflow-hidden bg-gray-100">
                <Image
                  source={{
                    uri:
                      article.cover_image_url?.trim() ||
                      'https://images.unsplash.com/photo-1493770348161-369fae157b4b?w=800&q=80',
                  }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
                <ArticleCategoryTag
                  category={article.category}
                  variant="overlay"
                  className="absolute bottom-2 left-2"
                />
              </View>
              <View className="p-3">
                <Text
                  className="text-base font-semibold leading-snug"
                  style={{ color: TEXT_HEADING }}
                  numberOfLines={2}
                >
                  {article.title}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
                  {article.reading_time_minutes != null
                    ? `${article.reading_time_minutes} min read`
                    : ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </HomeSectionCard>
  )
}
