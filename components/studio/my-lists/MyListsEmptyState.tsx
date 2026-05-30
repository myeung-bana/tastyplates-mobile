import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { AppIcon } from '@/components/ui/AppIcon'

import { Button } from '@/components/ui/Button'
import type { MyListsTab } from '@/components/studio/my-lists/MyListsTabBar'

interface Props {
  tab: MyListsTab
}

export function MyListsEmptyState({ tab }: Props): JSX.Element {
  const isToDine = tab === 'todine'

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-orange-50">
        <AppIcon
          name={isToDine ? 'bookmark' : 'map-pin'}
          size="xl"
          color="#ff7c0a"
        />
      </View>
      <Text className="mb-2 text-center font-neusans text-lg font-medium text-gray-900">
        {isToDine ? 'No Restaurants Found' : 'No Check-ins Found'}
      </Text>
      <Text className="mb-6 text-center font-neusans text-sm text-gray-500">
        {isToDine
          ? 'No restaurants added to the To-Dine list yet.'
          : 'No check-ins have been made yet.'}
      </Text>
      <Button
        variant="primary"
        onPress={() => router.push('/(tabs)/restaurants')}
      >
        Explore Restaurants
      </Button>
    </View>
  )
}
