import { ScrollView, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'
import { labelForPalateKey } from '@/lib/palateLabels'
import type { SearchScoreMode } from '@/hooks/useRestaurantScores'

export type RestaurantRatingMetricsRowProps = {
  overallAvg: number | null
  overallCount: number
  authenticAvg: number | null
  authenticCount: number
  searchAvg: number | null
  searchCount: number
  searchMode?: SearchScoreMode
  searchGroupName?: string | null
  searchUnlocked?: boolean
  isAuthenticated: boolean
  isPersonalised: boolean
  trustSet: string[]
  sharedAvg: number | null
  sharedCount: number
  sharedUnlocked: boolean
  /** When true, omit outer border — parent provides the white card shell. */
  embedded?: boolean
}

function formatRating(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n) || n <= 0) return '—'
  return n.toFixed(1)
}

function formatCount(count: number): string {
  if (count >= 1000) return `${Math.floor(count / 1000)}k`
  return String(count)
}

/**
 * Horizontal rating metrics — web `RatingSection` parity.
 */
export function RestaurantRatingMetricsRow({
  overallAvg,
  overallCount,
  authenticAvg,
  authenticCount,
  searchAvg,
  searchCount,
  searchMode = 'none',
  searchGroupName = null,
  searchUnlocked: searchUnlockedProp,
  isAuthenticated,
  isPersonalised,
  trustSet,
  sharedAvg,
  sharedCount,
  sharedUnlocked,
  embedded = false,
}: RestaurantRatingMetricsRowProps): JSX.Element {
  const searchUnlocked =
    searchUnlockedProp ?? (searchMode === 'cuisine_filter' || searchMode === 'personalised')

  const searchTitle =
    searchMode === 'group' && searchGroupName
      ? `${searchGroupName} Score`
      : isPersonalised
        ? 'Your Score'
        : 'Search Score'

  const trustReviewerLabel =
    trustSet.length > 0 ? trustSet.map((slug) => labelForPalateKey(slug)).join(' & ') : null

  const searchSubtitle =
    searchMode === 'group'
      ? searchUnlocked
        ? `Avg. from ${searchGroupName ?? 'your group'}\nreviewers`
        : isAuthenticated
          ? 'Not enough reviews\nfor your group'
          : 'Sign in to see\nyour score'
      : searchMode === 'none'
        ? isAuthenticated
          ? 'Set your palate\nto unlock'
          : 'Sign in to see\nyour score'
        : isPersonalised && trustReviewerLabel
          ? `Rated by ${trustReviewerLabel}\nreviewers`
          : !isAuthenticated
            ? 'Avg. from reviewers\nwith this cuisine'
            : "How much we'd\nthink you'd like"

  const sharedSubtitle = sharedUnlocked
    ? 'What shared\npreference users think'
    : isAuthenticated
      ? 'Not enough reviews\nfrom your palate'
      : 'Sign in to see\nshared score'

  return (
    <View className={embedded ? 'py-6' : 'border-t px-0 py-4'} style={embedded ? undefined : { borderTopColor: '#e5e7eb' }}>
      <Text className={`mb-4 font-neusans text-lg ${embedded ? 'px-6' : 'mb-3 px-4 text-base font-normal'}`} style={{ color: TEXT_HEADING }}>
        Ratings
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: embedded ? 24 : 16, gap: 0 }}
      >
        <MetricColumn
          title="Overall Score"
          value={formatRating(overallAvg)}
          count={formatCount(overallCount)}
          subtitle={'What platform\nusers think'}
        />
        <Divider />
        <MetricColumn
          title={searchTitle}
          value={searchUnlocked ? formatRating(searchAvg) : null}
          count={searchUnlocked ? formatCount(searchCount) : undefined}
          subtitle={searchSubtitle}
          locked={!searchUnlocked}
        />
        <Divider />
        <MetricColumn
          title="Authentic Score"
          value={formatRating(authenticAvg)}
          count={formatCount(authenticCount)}
          subtitle={'How authentic\nthis restaurant is'}
        />
        <Divider />
        <MetricColumn
          title="Shared Score"
          value={sharedUnlocked ? formatRating(sharedAvg) : null}
          count={sharedUnlocked ? formatCount(sharedCount) : undefined}
          subtitle={sharedSubtitle}
          locked={!sharedUnlocked}
        />
      </ScrollView>
    </View>
  )
}

function Divider(): JSX.Element {
  return <View className="mx-2 w-px self-stretch bg-[#CACACA]" style={{ minHeight: 72 }} />
}

const COUNT_BADGE_HEIGHT = 20

/** Orange review-count chip — circle for 1 digit, pill for longer counts. */
function CountBadge({ count }: { count: string }): JSX.Element {
  const len = count.length
  const paddingHorizontal = len <= 1 ? 0 : Math.min(12, 4 + len * 0.75)
  const minWidth = len <= 1 ? COUNT_BADGE_HEIGHT : undefined

  return (
    <View
      style={{
        backgroundColor: BRAND_PRIMARY,
        height: COUNT_BADGE_HEIGHT,
        minWidth,
        paddingHorizontal,
        borderRadius: COUNT_BADGE_HEIGHT / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text className="font-neusans text-[10px] font-bold leading-none text-white">{count}</Text>
    </View>
  )
}

function countBadgeTrailingSpace(count: string): number {
  const len = count.length
  if (len <= 1) return 18
  return 14 + len * 8
}

function MetricColumn({
  title,
  value,
  count,
  subtitle,
  locked = false,
}: {
  title: string
  value: string | null
  count?: string
  subtitle: string
  locked?: boolean
}): JSX.Element {
  return (
    <View className="min-w-[132px] items-center px-1 py-1">
      <Text className="mb-0.5 text-center font-neusans text-sm font-semibold text-gray-800">
        {title}
      </Text>
      <View className="mb-1 items-center">
        {locked ? (
          <AppIcon name="lock" size={24} color="#9ca3af" />
        ) : (
          <View
            className="relative mb-1"
            style={{ paddingRight: count != null ? countBadgeTrailingSpace(count) : 0 }}
          >
            <Text className="font-neusans text-2xl font-bold text-gray-800">{value ?? '—'}</Text>
            {count != null ? (
              <View className="absolute -bottom-0.5 right-0">
                <CountBadge count={count} />
              </View>
            ) : null}
          </View>
        )}
      </View>
      <Text className="text-center font-neusans text-[11px] leading-tight text-gray-500">{subtitle}</Text>
    </View>
  )
}
