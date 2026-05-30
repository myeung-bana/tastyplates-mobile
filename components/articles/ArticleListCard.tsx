import { Image, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { ArticleCategoryTag } from '@/components/articles/ArticleCategoryTag'
import { BORDER_SUBTLE, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import type { ArticleApi } from '@/lib/homeContentApi'

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1493770348161-369fae157b4b?w=800&q=80'

type ArticleListCardProps = {
  article: ArticleApi
  onPress: () => void
}

export function ArticleListCard({ article, onPress }: ArticleListCardProps): JSX.Element {
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
          className="text-base font-semibold leading-snug"
          style={{ color: TEXT_HEADING }}
          numberOfLines={2}
        >
          {article.title}
        </Text>
        {article.reading_time_minutes != null ? (
          <Text className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
            {`${article.reading_time_minutes} min read`}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}
