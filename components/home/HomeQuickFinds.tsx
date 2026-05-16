import { View, Text, Pressable, Image, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { QUICK_FINDS } from '@/constants/quickFinds'
import { getCuisineIconSource } from '@/lib/cuisineIconAssets'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import { BRAND_PRIMARY } from '@/constants/brand'

const COLS = 4
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
    <View className="mt-6 w-full px-4">
      <View className="rounded-2xl bg-white p-3 shadow-sm shadow-black/5">
        <Text className="text-base font-semibold text-gray-900">Quick finds</Text>
        <View
          className="mt-3 flex-row flex-wrap"
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
                <View
                  className="overflow-hidden rounded-md bg-gray-50"
                  style={{
                    width: ICON_SIZE,
                    height: ICON_SIZE,
                    borderWidth: 1,
                    borderColor: '#f3f4f6',
                  }}
                >
                  {localSource ? (
                    <Image source={localSource} className="h-full w-full" resizeMode="contain" />
                  ) : (
                    <View className="h-full w-full items-center justify-center" style={{ backgroundColor: `${BRAND_PRIMARY}18` }}>
                      <Ionicons name="fast-food-outline" size={14} color={BRAND_PRIMARY} />
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
      </View>
    </View>
  )
}
