import { Pressable, ScrollView, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import {
  BRAND_PRIMARY,
  BRAND_PRIMARY_TINT,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
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
  /** Arrived with a cuisine filter: banner "Showing scores for X" + Clear (design S5). */
  filterLabel?: string | null
  onClearFilter?: () => void
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
  filterLabel = null,
  onClearFilter,
}: RestaurantRatingMetricsRowProps): JSX.Element {
  const searchUnlocked =
    searchUnlockedProp ?? (searchMode === 'cuisine_filter' || searchMode === 'personalised')

  const searchTitle =
    searchMode === 'group' && searchGroupName
      ? `${searchGroupName} Score`
      : isPersonalised
        ? filterLabel
          ? `Your Score · ${filterLabel}`
          : 'Your Score'
        : filterLabel
          ? `${filterLabel} Score`
          : 'Search Score'

  const trustReviewerLabel =
    trustSet.length > 0 ? trustSet.map((slug) => labelForPalateKey(slug)).join(' & ') : null

  const searchSubtitle =
    searchMode === 'group'
      ? searchUnlocked
        ? `From ${searchGroupName ?? 'your group'} palates`
        : isAuthenticated
          ? 'Needs 3 reviews from your group'
          : 'Sign in to see your score'
      : searchMode === 'none'
        ? isAuthenticated
          ? 'Set your palate to unlock'
          : 'Sign in to see your score'
        : isPersonalised && trustReviewerLabel
          ? `From ${trustReviewerLabel} palates`
          : !isAuthenticated
            ? 'Reviewers with this cuisine'
            : 'How much we think you’d like it'

  const sharedSubtitle = sharedUnlocked
    ? 'People who share your palate'
    : isAuthenticated
      ? 'Needs 3 reviews from your palate'
      : 'Sign in to see shared score'

  return (
    <View style={{ paddingVertical: embedded ? 22 : 16, gap: 12 }}>
      <Text
        accessibilityRole="header"
        style={{
          paddingHorizontal: embedded ? 4 : 20,
          fontFamily: FONT.heading,
          fontSize: 11,
          lineHeight: 14,
          letterSpacing: 2.2,
          textTransform: 'uppercase',
          color: TEXT_MUTED,
        }}
      >
        Ratings
      </Text>
      {filterLabel ? (
        <View
          className="flex-row items-center justify-between"
          style={{
            marginHorizontal: embedded ? 0 : 20,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#FFE2C7',
            backgroundColor: BRAND_PRIMARY_TINT,
            paddingVertical: 9,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_HEADING }}>
            Showing scores for <Text style={{ fontFamily: FONT.bodySemibold }}>{filterLabel}</Text>
          </Text>
          {onClearFilter ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear cuisine filter" onPress={onClearFilter} hitSlop={8}>
              <Text style={{ fontFamily: FONT.body, fontSize: 12, color: BRAND_PRIMARY }}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: embedded ? -16 : 0 }}
        contentContainerStyle={{ paddingHorizontal: 6 }}
      >
        <MetricColumn
          title="Overall Score"
          value={formatRating(overallAvg)}
          count={formatCount(overallCount)}
          subtitle="All reviews + Google"
        />
        <MetricColumn
          title={searchTitle}
          value={searchUnlocked ? formatRating(searchAvg) : null}
          count={searchUnlocked ? formatCount(searchCount) : undefined}
          subtitle={searchSubtitle}
          locked={!searchUnlocked}
        />
        <MetricColumn
          title="Authentic Score"
          value={formatRating(authenticAvg)}
          count={formatCount(authenticCount)}
          subtitle="Reviewers who grew up with it"
        />
        <MetricColumn
          title="Shared Score"
          value={sharedUnlocked ? formatRating(sharedAvg) : null}
          count={sharedUnlocked ? formatCount(sharedCount) : undefined}
          subtitle={sharedSubtitle}
          locked={!sharedUnlocked}
          last
        />
      </ScrollView>
    </View>
  )
}

const COUNT_BADGE_HEIGHT = 20

/** Review count chip beside a score — peach circle, pill for longer counts. */
function CountBadge({ count }: { count: string }): JSX.Element {
  return (
    <View
      style={{
        backgroundColor: '#FFE2C7',
        height: COUNT_BADGE_HEIGHT,
        minWidth: COUNT_BADGE_HEIGHT,
        paddingHorizontal: count.length > 2 ? 6 : 0,
        borderRadius: COUNT_BADGE_HEIGHT / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 10, color: '#5A2700' }}>{count}</Text>
    </View>
  )
}

/** One score column (design S5): label, big orange score + count, one-line explainer. */
function MetricColumn({
  title,
  value,
  count,
  subtitle,
  locked = false,
  last = false,
}: {
  title: string
  value: string | null
  count?: string
  subtitle: string
  locked?: boolean
  last?: boolean
}): JSX.Element {
  return (
    <View
      accessible
      accessibilityLabel={`${title}: ${locked ? 'locked' : (value ?? 'no score')}. ${subtitle}`}
      style={{
        minWidth: 132,
        maxWidth: 170,
        paddingHorizontal: 14,
        gap: 6,
        borderRightWidth: last ? 0 : 1,
        borderRightColor: '#CACACA',
      }}
    >
      <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
        {title}
      </Text>
      {locked ? (
        <View style={{ height: 32, justifyContent: 'center' }}>
          <AppIcon name="lock" size={20} color={TEXT_TERTIARY} />
        </View>
      ) : (
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Text style={{ fontFamily: FONT.heading, fontSize: 28, lineHeight: 32, color: BRAND_PRIMARY }}>
            {value ?? '—'}
          </Text>
          {count != null && count !== '0' ? <CountBadge count={count} /> : null}
        </View>
      )}
      <Text style={{ fontFamily: FONT.body, fontSize: 11, lineHeight: 15, color: TEXT_MUTED }}>{subtitle}</Text>
    </View>
  )
}
