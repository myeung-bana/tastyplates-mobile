import { PillTabBar } from '@/components/ui/PillTabBar'

export type MyListsTab = 'todine' | 'checkins'

interface Props {
  activeTab: MyListsTab
  onTabChange: (tab: MyListsTab) => void
}

const TABS = [
  { key: 'todine' as const, label: 'To-Dine' },
  { key: 'checkins' as const, label: 'Check-ins' },
]

export function MyListsTabBar({ activeTab, onTabChange }: Props): JSX.Element {
  return <PillTabBar tabs={TABS} activeTab={activeTab} onTabChange={onTabChange} />
}
