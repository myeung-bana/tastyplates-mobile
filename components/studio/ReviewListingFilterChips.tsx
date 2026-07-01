import { PillTabBar } from '@/components/ui/PillTabBar'

export type ReviewListingFilter = 'live' | 'draft'

const TABS = [
  { key: 'live' as const, label: 'Live' },
  { key: 'draft' as const, label: 'Drafts' },
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
