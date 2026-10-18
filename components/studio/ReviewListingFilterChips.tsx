import { PillTabBar } from '@/components/ui/PillTabBar'

export type ReviewListingFilter = 'all' | 'live' | 'draft'

/** All · Published · Drafts (design W5). */
const TABS = [
  { key: 'all' as const, label: 'All' },
  { key: 'live' as const, label: 'Published' },
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
