import { Text, View } from 'react-native'

import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { listDetailEmptySubtitle, listDetailEmptyTitle } from '@/constants/messages'

export interface ListDetailEmptyStateProps {
  onAddRestaurant?: () => void
  /** Viewer mode — no add CTA (e.g. someone else's public list). */
  readOnly?: boolean
}

export function ListDetailEmptyState({
  onAddRestaurant,
  readOnly = false,
}: ListDetailEmptyStateProps): JSX.Element {
  return (
    <View className="items-center px-8 py-10">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-orange-50">
        <AppIcon name="restaurant" size={28} color="#ff7c0a" />
      </View>
      <Text className="mb-2 text-center font-neusans text-base font-medium text-gray-900">
        {listDetailEmptyTitle}
      </Text>
      <Text className="mb-6 text-center font-neusans text-sm leading-relaxed text-gray-500">
        {readOnly ? 'This list is empty.' : listDetailEmptySubtitle}
      </Text>
      {!readOnly && onAddRestaurant ? (
        <Button variant="primary" onPress={onAddRestaurant}>
          Add Restaurants
        </Button>
      ) : null}
    </View>
  )
}
