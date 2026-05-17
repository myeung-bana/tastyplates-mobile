import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import RenderHTML from 'react-native-render-html'
import { useLocalSearchParams } from 'expo-router'

import { ArticleRelatedRestaurantsSection } from '@/components/articles/ArticleRelatedRestaurantsSection'
import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { getMarketingWebOrigin } from '@/lib/webAssets'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import {
  fetchArticleByPkId,
  fetchArticleBySlug,
  mapArticleAssociationsToSectionItems,
  type ArticleDetail,
} from '@/services/articleDetailService'

const DEFAULT_HERO =
  'https://images.unsplash.com/photo-1493770348161-369fae157b4b?w=1200&q=80'

/** Dynamic segment: URL slug **or** numeric string → `get-article-by-id`. */
export default function ArticleDetailScreen() {
  const { slug: slugParam } = useLocalSearchParams<{ slug?: string | string[] }>()
  const segment = useMemo(() => {
    const raw = slugParam === undefined ? '' : Array.isArray(slugParam) ? slugParam[0] : slugParam
    return decodeURIComponent(typeof raw === 'string' ? raw.trim() : '').trim()
  }, [slugParam])

  const isNumericId = /^\d+$/.test(segment)

  const { width: windowW } = useWindowDimensions()
  const contentWidth = Math.max(280, windowW - 40)

  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(Boolean(segment))
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!segment) {
      setLoading(false)
      setError('Missing article link')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const row = isNumericId
        ? await fetchArticleByPkId(parseInt(segment, 10))
        : await fetchArticleBySlug(segment)
      setArticle(row)
    } catch (e) {
      setArticle(null)
      setError(e instanceof Error ? e.message : 'Could not load article')
    } finally {
      setLoading(false)
    }
  }, [segment, isNumericId])

  useEffect(() => {
    void load()
  }, [load])

  const htmlBody = useMemo(() => {
    const raw = article?.content?.trim()
    if (raw) return raw
    const ex = article?.excerpt?.trim()
    if (ex) return `<p>${stripHtml(ex)}</p>`
    return '<p></p>'
  }, [article])

  const articleRestaurantSectionItems = useMemo(
    () => mapArticleAssociationsToSectionItems(article?.article_restaurant_associations),
    [article?.article_restaurant_associations],
  )

  const associationCountRaw = article?.article_restaurant_associations?.length ?? 0

  const tagsStyles = useMemo(
    () => ({
      body: {
        color: TEXT_BODY,
        fontSize: 16,
        lineHeight: 26,
      },
      p: {
        marginTop: 0,
        marginBottom: 14,
        color: TEXT_BODY,
        fontSize: 16,
        lineHeight: 26,
      },
      h1: {
        color: TEXT_HEADING,
        fontSize: 22,
        fontWeight: '600' as const,
        marginBottom: 12,
        marginTop: 8,
      },
      h2: {
        color: TEXT_HEADING,
        fontSize: 20,
        fontWeight: '600' as const,
        marginBottom: 10,
        marginTop: 16,
      },
      h3: {
        color: TEXT_HEADING,
        fontSize: 18,
        fontWeight: '600' as const,
        marginBottom: 8,
        marginTop: 12,
      },
      li: {
        color: TEXT_BODY,
        marginBottom: 6,
      },
      a: {
        color: BRAND_PRIMARY,
        textDecorationLine: 'underline' as const,
      },
      blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: BORDER_SUBTLE,
        paddingLeft: 12,
        marginVertical: 12,
        fontStyle: 'italic' as const,
        color: TEXT_MUTED,
      },
    }),
    [],
  )

  const renderersProps = useMemo(
    () => ({
      a: {
        onPress(_e: unknown, href: string) {
          if (href) void Linking.openURL(href)
        },
      },
    }),
    [],
  )

  const marketingOrigin = getMarketingWebOrigin()
  const openOnWeb = () => {
    if (!article || !marketingOrigin) return
    const path = article.slug?.trim()
      ? `/articles/${encodeURIComponent(article.slug.trim())}`
      : `/article/${encodeURIComponent(String(article.id))}`
    void Linking.openURL(`${marketingOrigin}${path}`)
  }

  const openWebFromSegment = () => {
    if (!marketingOrigin || !segment) return
    const path = isNumericId
      ? `/article/${encodeURIComponent(segment)}`
      : `/articles/${encodeURIComponent(segment)}`
    void Linking.openURL(`${marketingOrigin}${path}`)
  }

  if (!segment) {
    return (
      <View className="flex-1 bg-white">
        <ReviewDetailTopNav title="Article" />
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: TEXT_MUTED }}>Invalid article link.</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      <ReviewDetailTopNav title="Article" />

      {loading ? (
        <View className="flex-1 items-center justify-center pt-8">
          <ActivityIndicator color={BRAND_PRIMARY} size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base leading-relaxed" style={{ color: TEXT_MUTED }}>
            {error}
          </Text>
          {marketingOrigin ? (
            <Text
              className="mt-4 text-center text-sm underline"
              style={{ color: BRAND_PRIMARY }}
              onPress={openWebFromSegment}
            >
              Try opening on the website
            </Text>
          ) : null}
        </View>
      ) : article ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="aspect-[16/9] w-full overflow-hidden bg-gray-100">
            <Image
              accessibilityIgnoresInvertColors
              source={{
                uri: article.featured_image_url?.trim() || DEFAULT_HERO,
              }}
              className="h-full w-full"
              resizeMode="cover"
            />
          </View>

          <View className="border-b px-5 py-5" style={{ borderBottomColor: BORDER_SUBTLE }}>
            {article.category ? (
              <Text
                className="mb-2 self-start rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: BRAND_PRIMARY, backgroundColor: '#fef7f0' }}
              >
                {article.category}
              </Text>
            ) : null}
            <Text
              className="text-2xl font-semibold leading-tight"
              style={{ color: TEXT_HEADING }}
            >
              {article.title}
            </Text>
            <Text className="mt-2 text-sm" style={{ color: TEXT_MUTED }}>
              {article.reading_time_minutes != null
                ? `${article.reading_time_minutes} min read`
                : ''}
              {article.published_at
                ? `${article.reading_time_minutes != null ? ' · ' : ''}${new Date(
                    article.published_at,
                  ).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}`
                : ''}
            </Text>
            {article.author_profile?.displayName ? (
              <Text className="mt-3 text-sm" style={{ color: TEXT_BODY }}>
                By {article.author_profile.displayName.trim()}
              </Text>
            ) : null}
          </View>

          <View className="px-5 pt-4">
            <RenderHTML
              contentWidth={contentWidth}
              source={{ html: htmlBody }}
              tagsStyles={tagsStyles}
              renderersProps={renderersProps}
              defaultTextProps={{ selectable: true }}
            />
          </View>

          <ArticleRelatedRestaurantsSection
            items={articleRestaurantSectionItems}
            fallbackAssociationCount={associationCountRaw}
          />

          {marketingOrigin ? (
            <View className="mt-2 items-center px-5 pb-6">
              <Text
                className="text-sm underline"
                style={{ color: TEXT_MUTED }}
                onPress={openOnWeb}
              >
                View on website
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  )
}
