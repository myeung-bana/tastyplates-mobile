import { PillTabBar } from '@/components/ui/PillTabBar'

export type ManageListsTab = 'all' | 'public' | 'private'

interface Props {
  activeTab: ManageListsTab
  onTabChange: (tab: ManageListsTab) => void
}

const TABS = [
  { key: 'all' as const, label: 'All' },
  { key: 'public' as const, label: 'Public' },
  { key: 'private' as const, label: 'Private' },
]

export function ManageListsTabBar({ activeTab, onTabChange }: Props): JSX.Element {
  return <PillTabBar tabs={TABS} activeTab={activeTab} onTabChange={onTabChange} />
}
