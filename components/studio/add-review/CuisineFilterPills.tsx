import { Image, Pressable, ScrollView, Text, View } from 'react-native'

import { QUICK_FINDS } from '@/constants/quickFinds'
import { getCuisineIconSource } from '@/lib/cuisineIconAssets'

const ACTIVE = '#ff7c0a'
const INACTIVE_BORDER = '#e5e7eb'

type Props = {
  activeCuisineFilter: string | null
  onSelect: (slug: string | null) => void
}

export function CuisineFilterPills({ activeCuisineFilter, onSelect }: Props): JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        alignItems: 'center',
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => onSelect(null)}
        className="flex-row items-center rounded-[50px] border-2 px-4 py-2 max-w-[100px] max-h-[32px]"
        style={{
          backgroundColor: activeCuisineFilter === null ? ACTIVE : '#ffffff',
          borderColor: activeCuisineFilter === null ? ACTIVE : INACTIVE_BORDER,
        }}
      >
        <Text
          className="font-neusans text-sm"
          style={{ color: activeCuisineFilter === null ? '#ffffff' : '#31343F', textAlign: 'center' }}
        >
          All
        </Text>
      </Pressable>

      {QUICK_FINDS.map((item) => {
        const active = activeCuisineFilter === item.slug
        const iconSource = getCuisineIconSource(item.iconFile)
        return (
          <Pressable
            key={item.slug}
            accessibilityRole="button"
            onPress={() => onSelect(active ? null : item.slug)}
            className="flex-row items-center gap-2 rounded-[50px] border-2 px-4 py-2 max-w-[100px] max-h-[32px]"
            style={{
              backgroundColor: active ? ACTIVE : '#ffffff',
              borderColor: active ? ACTIVE : INACTIVE_BORDER,
            }}
          >
            <Text className="font-neusans text-sm" style={{ color: active ? '#ffffff' : '#31343F' }}>
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
