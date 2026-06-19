import { PillTabBar } from '@/components/ui/PillTabBar'

export type ProfileContentTab = 'me' | 'reviews' | 'lists'

type Props = {
  activeTab: ProfileContentTab
  onTabChange: (tab: ProfileContentTab) => void
}

const TABS = [
  { key: 'me' as const, label: 'Me' },
  { key: 'reviews' as const, label: 'Reviews' },
  { key: 'lists' as const, label: 'Lists' },
]

export function ProfileContentTabBar({ activeTab, onTabChange }: Props): JSX.Element {
  return <PillTabBar tabs={TABS} activeTab={activeTab} onTabChange={onTabChange} />
}
