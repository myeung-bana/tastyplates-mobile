import { Image, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { ArticleCategoryTag } from '@/components/articles/ArticleCategoryTag'
import { BORDER_SUBTLE, SURFACE_FOG, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import type { ArticleApi } from '@/lib/homeContentApi'

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1493770348161-369fae157b4b?w=800&q=80'

type ArticleListCardProps = {
  article: ArticleApi
  onPress: () => void
  /** `row` — 112×84 thumb + eyebrow + title (Home, design H1). `card` — full-width cover. */
  variant?: 'card' | 'row'
}

export function ArticleListCard({ article, onPress, variant = 'card' }: ArticleListCardProps): JSX.Element {
  if (variant === 'row') {
    return (
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onPress()
        }}
        accessibilityRole="button"
        accessibilityLabel={article.title}
        className="flex-row items-center active:opacity-80"
        style={{ gap: 12 }}
      >
        <Image
          source={{ uri: article.cover_image_url?.trim() || DEFAULT_COVER }}
          style={{ width: 112, height: 84, borderRadius: 12, backgroundColor: SURFACE_FOG }}
          resizeMode="cover"
        />
        <View style={{ flex: 1, gap: 6 }}>
          {article.category ? (
            <Text
              numberOfLines={1}
              style={{ fontFamily: FONT.heading, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: TEXT_MUTED }}
            >
              {article.category}
            </Text>
          ) : null}
          <Text numberOfLines={3} style={{ fontFamily: FONT.headingMedium, fontSize: 16, lineHeight: 20, color: TEXT_HEADING }}>
            {article.title}
          </Text>
        </View>
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress()
      }}
      accessibilityRole="button"
      accessibilityLabel={article.title}
      className="overflow-hidden rounded-2xl border bg-white active:opacity-90"
      style={{ borderColor: BORDER_SUBTLE }}
    >
      <View className="aspect-video w-full overflow-hidden bg-gray-100">
        <Image
          source={{ uri: article.cover_image_url?.trim() || DEFAULT_COVER }}
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
          className="text-base leading-snug font-body-semibold"
          style={{ color: TEXT_HEADING }}
          numberOfLines={2}
        >
          {article.title}
        </Text>
        {article.reading_time_minutes != null ? (
          <Text className="mt-1 text-xs font-body" style={{ color: TEXT_MUTED }}>
            {`${article.reading_time_minutes} min read`}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}
