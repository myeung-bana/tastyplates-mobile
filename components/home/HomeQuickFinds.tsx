import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { HomeSectionCard } from '@/components/home/HomeSectionCard'
import { AppIcon } from '@/components/ui/AppIcon'
import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'
import { QUICK_FINDS } from '@/constants/quickFinds'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { getCuisineIconSource } from '@/lib/cuisineIconAssets'

/** 10 cuisines → two rows of five. */
const COLS = 5
const GUTTER = 20
const COLUMN_GAP = 8
const CIRCLE = 56

/** Quick finds (design H1): each opens Explore filtered to that cuisine. */
export function HomeQuickFinds() {
  const { width } = useWindowDimensions()
  const cell = Math.floor((width - GUTTER * 2 - COLUMN_GAP * (COLS - 1)) / COLS)

  return (
    <HomeSectionCard title="Quick finds">
      <View className="flex-row flex-wrap" style={{ columnGap: COLUMN_GAP, rowGap: 14 }}>
        {QUICK_FINDS.map((item) => {
          const icon = getCuisineIconSource(item.iconFile)
          return (
            <Pressable
              key={item.slug}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} restaurants`}
              onPress={() => {
                void Haptics.selectionAsync()
                router.push({ pathname: SCREEN_RESTAURANTS, params: { cuisine: item.slug } })
              }}
              style={{ width: cell, gap: 8 }}
              className="items-center active:opacity-80"
            >
              <View
                className="items-center justify-center"
                style={{
                  width: CIRCLE,
                  height: CIRCLE,
                  borderRadius: CIRCLE / 2,
                  borderWidth: 1.5,
                  borderColor: '#FFC999',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {icon ? (
                  <Image source={icon} style={{ width: 34, height: 34 }} resizeMode="contain" />
                ) : (
                  <AppIcon name="coffee" size={18} color={BRAND_PRIMARY} />
                )}
              </View>
              <Text
                numberOfLines={2}
                className="text-center"
                style={{ fontFamily: FONT.headingMedium, fontSize: 12, lineHeight: 14, color: TEXT_HEADING }}
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
