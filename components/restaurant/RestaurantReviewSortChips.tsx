import { PillTabBar } from '@/components/ui/PillTabBar'

export type RestaurantReviewSortFilter = 'all' | 'asc' | 'desc' | 'highest'

/** Sort: All · Oldest · Newest · Highest rated (design R1). */
const TABS = [
  { key: 'all' as const, label: 'All' },
  { key: 'asc' as const, label: 'Oldest' },
  { key: 'desc' as const, label: 'Newest' },
  { key: 'highest' as const, label: 'Highest rated' },
]

type Props = {
  active: RestaurantReviewSortFilter
  onChange: (filter: RestaurantReviewSortFilter) => void
}

/** Sort tabs for the restaurant reviews list. */
export function RestaurantReviewSortChips({ active, onChange }: Props): JSX.Element {
  return <PillTabBar tabs={TABS} activeTab={active} onTabChange={onChange} />
}
