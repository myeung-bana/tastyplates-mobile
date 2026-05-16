import { useEffect, useState, useCallback } from 'react'
import { View, Text, Pressable, Image, ActivityIndicator, Linking } from 'react-native'
import { fetchArticles, type ArticleApi } from '@/lib/homeContentApi'
import { getWebOrigin } from '@/lib/webAssets'
import { BRAND_PRIMARY } from '@/constants/brand'

const DEFAULT_LOCATION_SLUG = process.env.EXPO_PUBLIC_DEFAULT_LOCATION_SLUG ?? 'tokyo'

/**
 * Article cards (location-scoped), same REST contract as web when `EXPO_PUBLIC_WEB_API_URL` is set.
 */
export function HomeArticlesSection() {
  const [articles, setArticles] = useState<ArticleApi[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchArticles(DEFAULT_LOCATION_SLUG, 8)
    setArticles(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!loading && articles.length === 0) return null

  const origin = getWebOrigin()

  const openArticle = (a: ArticleApi) => {
    if (!origin) return
    const path = a.slug?.trim()
      ? `/articles/${encodeURIComponent(a.slug.trim())}`
      : `/article/${encodeURIComponent(String(a.id))}`
    void Linking.openURL(`${origin}${path}`)
  }

  const openAll = () => {
    if (!origin) return
    void Linking.openURL(`${origin}/articles`)
  }

  return (
    <View className="mt-2 w-full bg-gray-50 py-6">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <Text className="text-lg font-semibold text-gray-900">Articles</Text>
        {origin ? (
          <Pressable onPress={openAll} hitSlop={8}>
            <Text className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
              See all
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View className="py-12">
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      ) : (
        <View className="gap-4 px-4">
          {articles.map((article) => (
            <Pressable
              key={String(article.id)}
              onPress={() => openArticle(article)}
              disabled={!origin}
              className="overflow-hidden rounded-2xl bg-white active:opacity-90"
            >
              <View className="aspect-video w-full overflow-hidden bg-gray-200">
                <Image
                  source={{
                    uri:
                      article.cover_image_url?.trim() ||
                      'https://images.unsplash.com/photo-1493770348161-369fae157b4b?w=800&q=80',
                  }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
                {article.category ? (
                  <View className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold capitalize" style={{ color: BRAND_PRIMARY }}>
                      {article.category}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View className="p-3">
                <Text className="text-base font-semibold leading-snug text-gray-800" numberOfLines={2}>
                  {article.title}
                </Text>
                <Text className="mt-1 text-xs text-gray-400">
                  {article.reading_time_minutes != null ? `${article.reading_time_minutes} min read` : ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}
