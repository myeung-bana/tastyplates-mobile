import { View } from 'react-native'

import { PillTabBar } from '@/components/ui/PillTabBar'

export type ProfileConnectionsTab = 'followers' | 'following'

type Props = {
  activeTab: ProfileConnectionsTab
  onTabChange: (tab: ProfileConnectionsTab) => void
}

const TABS = [
  { key: 'followers' as const, label: 'Followers' },
  { key: 'following' as const, label: 'Following' },
]

/** Centered profile-style pill tabs for followers / following lists. */
export function ProfileConnectionsTabBar({ activeTab, onTabChange }: Props): JSX.Element {
  return (
    <View className="items-center px-4 pb-3 pt-2">
      <PillTabBar tabs={TABS} activeTab={activeTab} onTabChange={onTabChange} />
    </View>
  )
}
