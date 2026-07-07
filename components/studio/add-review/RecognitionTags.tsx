import { Pressable, Text, View } from 'react-native'

import { RECOGNITION_TAGS } from '@/constants/images'

type Props = {
  selected: string[]
  onToggle: (name: string) => void
}

export function RecognitionTags({ selected, onToggle }: Props): JSX.Element {
  return (
    <View className="px-4 pb-4">
      <Text className="mb-3 font-neusans text-sm text-[#374151]">
        How would you recognise your experience?
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {RECOGNITION_TAGS.map(({ name, Icon }) => {
          const isSelected = selected.includes(name)
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onToggle(name)}
              className={`flex-row items-center gap-2 rounded-[50px] border px-4 py-2 active:opacity-90 ${
                isSelected ? 'border-[#ff7c0a] bg-orange-50' : 'border-gray-300 bg-white'
              }`}
            >
              <Icon width={24} height={24} />
              <Text className="font-neusans text-sm text-[#31343F]">{name}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
