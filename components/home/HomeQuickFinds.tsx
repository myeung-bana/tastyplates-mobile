import { View, Text, Pressable, Image, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import { HomeSectionCard } from '@/components/home/HomeSectionCard'
import { QUICK_FINDS } from '@/constants/quickFinds'
import { getCuisineIconSource } from '@/lib/cuisineIconAssets'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import { BRAND_PRIMARY } from '@/constants/brand'
import { AppIcon } from '@/components/ui/AppIcon'

/** 10 cuisines → 5 per row × 2 rows */
const COLS = 5
/** Outer `px-4` (32) + card horizontal `p-3` (24) */
const HORIZONTAL_GUTTER = 16 * 2 + 12 * 2
const COLUMN_GAP = 8
const ROW_GAP = 10
const ICON_SIZE = 50

/**
 * Cuisine shortcuts → Restaurants tab with `palate` param (aligned with web Quick Finds).
 * Icons load from bundled `assets/icons/cuisines/*.png`.
 */
export function HomeQuickFinds() {
  const { width: screenW } = useWindowDimensions()
  const innerWidth = Math.max(0, screenW - HORIZONTAL_GUTTER)
  const cellWidth = Math.floor((innerWidth - COLUMN_GAP * (COLS - 1)) / COLS)

  return (
    <HomeSectionCard title="Quick finds" shadowed={false}>
      <View
        className="flex-row flex-wrap"
        style={{ columnGap: COLUMN_GAP, rowGap: ROW_GAP }}
      >
          {QUICK_FINDS.map((item) => {
            const localSource = getCuisineIconSource(item.iconFile)
            return (
              <Pressable
                key={item.slug}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() =>
                  router.push({
                    pathname: SCREEN_RESTAURANTS,
                    params: { palate: item.slug },
                  })
                }
                style={{ width: cellWidth }}
                className="items-center active:opacity-80"
              >
                <View style={{ width: ICON_SIZE, height: ICON_SIZE }}>
                  {localSource ? (
                    <Image source={localSource} className="h-full w-full" resizeMode="contain" />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <AppIcon name="coffee" size={14} color={BRAND_PRIMARY} />
                    </View>
                  )}
                </View>
                <Text
                  className="mt-1 w-full text-center font-medium leading-tight text-gray-700"
                  style={{ fontSize: 9, lineHeight: 11 }}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </Pressable>
            )
          })}
      </View>
    </HomeSectionCard>
  )
}
