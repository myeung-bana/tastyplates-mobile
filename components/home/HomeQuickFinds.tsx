import { Pressable, Text, View, useWindowDimensions } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { CuisineGlyph } from '@/components/brand/CuisineGlyph'
import { HomeSectionCard } from '@/components/home/HomeSectionCard'
import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'
import { HOME_QUICK_FINDS } from '@/constants/quickFinds'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import { FONT } from '@/constants/typography'

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
        {HOME_QUICK_FINDS.map((item) => {
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
                <CuisineGlyph slug={item.slug} size={26} color={BRAND_PRIMARY} />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
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
