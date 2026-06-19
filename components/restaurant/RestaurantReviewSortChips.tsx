import { PillTabBar } from '@/components/ui/PillTabBar'

export type RestaurantReviewSortFilter = 'all' | 'asc' | 'desc' | 'highest'

const TABS = [
  { key: 'all' as const, label: 'All' },
  { key: 'asc' as const, label: 'Oldest first', icon: 'arrow-up' as const, iconOnly: true },
  { key: 'desc' as const, label: 'Newest first', icon: 'arrow-down' as const, iconOnly: true },
  { key: 'highest' as const, label: 'Highest Rated' },
]

type Props = {
  active: RestaurantReviewSortFilter
  onChange: (filter: RestaurantReviewSortFilter) => void
}

/** Sort tabs for the restaurant reviews list. */
export function RestaurantReviewSortChips({ active, onChange }: Props): JSX.Element {
  return <PillTabBar tabs={TABS} activeTab={active} onTabChange={onChange} />
}
