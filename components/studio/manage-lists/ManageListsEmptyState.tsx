import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { AppIcon } from '@/components/ui/AppIcon'

import { Button } from '@/components/ui/Button'
import { SCREEN_STUDIO_MANAGE_LISTS_CREATE } from '@/constants/screens'
import { castHref } from '@/lib/routeParams'
import type { ManageListsTab } from '@/components/studio/manage-lists/ManageListsTabBar'

interface Props {
  tab: ManageListsTab
  /** When true, user has no lists at all — show the primary onboarding empty state. */
  noListsAtAll?: boolean
}

function emptyCopy(tab: ManageListsTab, noListsAtAll: boolean): { title: string; subtitle: string } {
  if (noListsAtAll) {
    return {
      title: 'No Lists Yet',
      subtitle: 'Create your first restaurant playlist',
    }
  }
  if (tab === 'all') {
    return {
      title: 'No Lists Yet',
      subtitle: 'Create your first restaurant playlist',
    }
  }
  if (tab === 'public') {
    return {
      title: 'No Public Lists',
      subtitle: 'Lists you mark as public will appear here.',
    }
  }
  return {
    title: 'No Private Lists',
    subtitle: 'Lists you mark as private will appear here.',
  }
}

export function ManageListsEmptyState({ tab, noListsAtAll = false }: Props): JSX.Element {
  const { title, subtitle } = emptyCopy(tab, noListsAtAll)

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-orange-50">
        <AppIcon name="image" size={28} color="#ff7c0a" />
      </View>
      <Text className="mb-2 text-center font-neusans text-lg font-medium text-gray-900">
        {title}
      </Text>
      <Text className="mb-6 text-center font-neusans text-sm text-gray-500">
        {subtitle}
      </Text>
      <Button
        variant="primary"
        onPress={() => router.push(castHref(SCREEN_STUDIO_MANAGE_LISTS_CREATE))}
      >
        Create a List
      </Button>
    </View>
  )
}
