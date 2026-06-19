import { PillTabBar } from '@/components/ui/PillTabBar'

export type ReviewListingFilter = 'all' | 'draft' | 'live'

const TABS = [
  { key: 'all' as const, label: 'All' },
  { key: 'draft' as const, label: 'Drafts' },
  { key: 'live' as const, label: 'Live' },
]

interface Props {
  active: ReviewListingFilter
  onChange: (filter: ReviewListingFilter) => void
}

export function ReviewListingFilterChips({ active, onChange }: Props): JSX.Element {
  return (
    <PillTabBar
      className="mt-4"
      tabs={TABS}
      activeTab={active}
      onTabChange={onChange}
    />
  )
}
