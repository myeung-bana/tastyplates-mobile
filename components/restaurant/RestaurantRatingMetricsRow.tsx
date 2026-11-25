import { ScrollView, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { BRAND_PRIMARY, TEXT_MUTED, TEXT_TERTIARY } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import type { RestaurantScores } from '@/services/readingService'

export type RestaurantRatingMetricsRowProps = {
  /** From `restaurants-v2/get-restaurant-scores`; null while loading or for an unlisted place. */
  scores: RestaurantScores | null
  /** Overall to show when there are no scores yet (unlisted place: its public rating). */
  fallbackOverall?: { avg: number | null; count: number } | null
  isAuthenticated: boolean
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
 * Ratings side-scroll (restaurant detail): Overall · the palate score the backend picked for this
 * viewer ("Your Score · Korean" / "East Asian Score") · Authentic · Shared. Every number and label
 * comes from the backend; this only lays them out.
 */
export function RestaurantRatingMetricsRow({
  scores,
  fallbackOverall = null,
  isAuthenticated,
}: RestaurantRatingMetricsRowProps): JSX.Element {
  const min = scores?.min_reviews ?? 3
  const overallAvg = scores?.overall.avg ?? fallbackOverall?.avg ?? null
  const overallCount = scores?.overall.review_count ?? fallbackOverall?.count ?? 0
  const palate = scores?.palate ?? null
  const shared = scores?.shared ?? null

  const palateSubtitle = palate
    ? palate.unlocked
      ? palate.caption
      : `Needs ${min} reviews from your palate`
    : isAuthenticated
      ? 'Set your palates to unlock'
      : 'Sign in to see your score'

  const sharedSubtitle = shared
    ? shared.unlocked
      ? shared.caption
      : `Needs ${min} reviews from your palate`
    : 'Sign in to see shared score'

  return (
    <View style={{ paddingVertical: 22, gap: 12 }}>
      <Text
        accessibilityRole="header"
        style={{
          paddingHorizontal: 4,
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 6 }}
      >
        <MetricColumn
          title="Overall Score"
          value={formatRating(overallAvg)}
          count={formatCount(overallCount)}
          subtitle="All reviews"
        />
        <MetricColumn
          title={palate?.label ?? 'Your Score'}
          value={palate?.unlocked ? formatRating(palate.avg) : null}
          count={palate?.unlocked ? formatCount(palate.review_count) : undefined}
          subtitle={palateSubtitle}
          locked={!palate?.unlocked}
        />
        <MetricColumn
          title="Authentic Score"
          value={formatRating(scores?.authentic.avg)}
          count={formatCount(scores?.authentic.review_count ?? 0)}
          subtitle="Reviewers who grew up with it"
        />
        <MetricColumn
          title="Shared Score"
          value={shared?.unlocked ? formatRating(shared.avg) : null}
          count={shared?.unlocked ? formatCount(shared.review_count) : undefined}
          subtitle={sharedSubtitle}
          locked={!shared?.unlocked}
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
