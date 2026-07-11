import { Image, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { AppIcon } from '@/components/ui/AppIcon'
import { QUICK_FINDS } from '@/constants/quickFinds'
import { BRAND_PRIMARY } from '@/constants/brand'
import { getCuisineIconSource } from '@/lib/cuisineIconAssets'

type Props = {
  label: string
  slug: string
  onPress: () => void
}

export function CuisineSearchShortcutRow({ label, slug, onPress }: Props): JSX.Element {
  const quickFind = QUICK_FINDS.find((item) => item.slug === slug)
  const iconSource = quickFind ? getCuisineIconSource(quickFind.iconFile) : null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Browse ${label} restaurants by cuisine`}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      className="mx-4 mb-1 flex-row items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-3 active:opacity-90"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
        {iconSource ? (
          <Image source={iconSource} style={{ width: 32, height: 32 }} resizeMode="contain" />
        ) : (
          <AppIcon name="compass" size={20} color={BRAND_PRIMARY} />
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-neusans text-[15px] font-semibold text-[#31343F]" numberOfLines={1}>
          {label}
        </Text>
        <Text className="mt-0.5 font-neusans text-xs text-gray-500">Search by cuisine</Text>
      </View>
      <AppIcon name="chevron-right" size={18} color="#9ca3af" />
    </Pressable>
  )
}
