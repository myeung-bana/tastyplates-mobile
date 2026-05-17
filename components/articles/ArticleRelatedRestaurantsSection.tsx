import { Pressable, Text, Image, View } from 'react-native'
import { router } from 'expo-router'

import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { SCREEN_RESTAURANT_DETAIL, SCREEN_RESTAURANTS } from '@/constants/screens'
import { useHaptic } from '@/hooks/useHaptic'
import type { ArticleRestaurantSectionItem } from '@/services/articleDetailService'

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80'

export interface ArticleRelatedRestaurantsSectionProps {
  /** Enriched associations with slugs — single column, §6 ordering. */
  items: ArticleRestaurantSectionItem[]
  /**
   * When enrichment failed but `article_restaurant_associations.length > 0`,
   * show fallback CTA (`articlev2.md` §5 State B).
   */
  fallbackAssociationCount?: number
}

/**
 * Restaurants linked to this article (`article_restaurant_associations`).
 * Layout + copy from `documentation/articlev2.md` §6; colors from `design_system.md` §2.4 / §5.3 Card.
 */
export function ArticleRelatedRestaurantsSection({
  items,
  fallbackAssociationCount = 0,
}: ArticleRelatedRestaurantsSectionProps) {
  const hapticLight = useHaptic('light')

  const showFallbackOnly = items.length === 0 && fallbackAssociationCount > 0

  if (items.length === 0 && !showFallbackOnly) return null

  return (
    <View
      className="mt-10 w-full px-5 pt-8 pb-2"
      style={{ borderTopWidth: 1, borderTopColor: BORDER_SUBTLE }}
    >
      {showFallbackOnly ? (
        <>
          <Text
            className="mb-2 text-center text-lg font-semibold"
            style={{ color: TEXT_HEADING }}
          >
            Restaurants in this story
          </Text>
          <Text className="mb-3 text-center text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
            This article covers {fallbackAssociationCount}{' '}
            {fallbackAssociationCount === 1 ? 'place' : 'places'} on TastyPlates.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore restaurants"
            onPress={() => {
              hapticLight()
              router.push(SCREEN_RESTAURANTS)
            }}
            className="items-center py-2 active:opacity-80"
          >
            <Text className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
              Explore restaurants →
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text
            className="mb-2 text-center text-lg font-semibold leading-snug"
            style={{ color: TEXT_HEADING }}
          >
            Restaurants in this article
          </Text>
          <Text className="mb-6 text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
            Places we mention in this story — tap through for full listings, photos, and reviews.
          </Text>
          <View style={{ gap: 16 }}>
            {items.map((r) => {
              const uri = (r.imageUrl?.trim() || DEFAULT_IMAGE).trim()

              const openRestaurant = () => {
                if (!r.slug?.trim()) return
                hapticLight()
                router.push({
                  pathname: SCREEN_RESTAURANT_DETAIL,
                  params: { slug: r.slug.trim() },
                })
              }

              return (
                <Pressable
                  key={r.associationId}
                  accessibilityRole="button"
                  accessibilityLabel={r.title}
                  onPress={openRestaurant}
                  disabled={!r.slug?.trim()}
                  className="rounded-2xl border bg-white p-4 active:opacity-90"
                  style={{ borderColor: BORDER_SUBTLE }}
                >
                  <View
                    className="mb-4 w-full overflow-hidden rounded-xl bg-gray-100"
                    style={{ aspectRatio: 16 / 9 }}
                  >
                    <Image
                      accessibilityIgnoresInvertColors
                      source={{ uri }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </View>
                  <View>
                    <Text
                      className="mb-1 text-lg font-semibold leading-snug"
                      style={{ color: TEXT_HEADING }}
                      numberOfLines={2}
                    >
                      {r.title}
                    </Text>
                    {r.description ? (
                      <Text
                        className="mb-2 text-sm leading-relaxed"
                        style={{ color: TEXT_BODY }}
                        numberOfLines={3}
                      >
                        {r.description}
                      </Text>
                    ) : null}
                    {r.addressLine ? (
                      <Text className="text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
                        {r.addressLine}
                      </Text>
                    ) : null}
                    {r.slug?.trim() ? (
                      <Text className="mt-3 text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                        View restaurant →
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              )
            })}
          </View>
        </>
      )}
    </View>
  )
}
