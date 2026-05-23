import { ScrollView, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { isNoPalateFilter } from '@/lib/palateSearch'

export type RestaurantRatingMetricsRowProps = {
  overallAvg: number | null
  overallCount: number
  authenticAvg: number | null
  authenticCount: number
  searchAvg: number | null
  searchCount: number
  palateSlug: string | null | undefined
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
 * Horizontal rating metrics — web `RatingSection` parity.
 */
export function RestaurantRatingMetricsRow({
  overallAvg,
  overallCount,
  authenticAvg,
  authenticCount,
  searchAvg,
  searchCount,
  palateSlug,
  isAuthenticated,
}: RestaurantRatingMetricsRowProps): JSX.Element {
  const palateActive = !isNoPalateFilter(palateSlug)
  const showSearchValues = isAuthenticated || palateActive

  const searchSubtitle =
    showSearchValues && palateActive && !isAuthenticated
      ? 'Avg. from reviewers\nwith this palate'
      : showSearchValues
        ? "How much we'd\nthink you'd like"
        : 'Sign in to see\nyour score'

  const sharedUnlocked = isAuthenticated

  return (
    <View className="border-t px-0 py-4" style={{ borderTopColor: '#e5e7eb' }}>
      <Text className="mb-3 px-4 text-base font-normal" style={{ color: TEXT_HEADING }}>
        Ratings
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 0 }}
      >
        <MetricColumn
          title="Overall Score"
          value={formatRating(overallAvg)}
          count={formatCount(overallCount)}
          subtitle={'What platform\nusers think'}
        />
        <Divider />
        <MetricColumn
          title="Search Score"
          value={showSearchValues ? formatRating(searchAvg) : null}
          count={showSearchValues ? formatCount(searchCount) : undefined}
          subtitle={searchSubtitle}
          locked={!showSearchValues}
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
          value={sharedUnlocked ? '—' : null}
          count={sharedUnlocked ? '0' : undefined}
          subtitle={
            sharedUnlocked ? 'What shared\npreference users think' : 'Sign in to see\nshared score'
          }
          locked={!sharedUnlocked}
        />
      </ScrollView>
    </View>
  )
}

function Divider(): JSX.Element {
  return <View className="mx-2 w-px self-stretch bg-[#CACACA]" style={{ minHeight: 72 }} />
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
      <Text className="mb-0.5 text-center text-sm font-semibold" style={{ color: TEXT_HEADING }}>
        {title}
      </Text>
      <View className="items-center">
        <View className="relative mb-1 items-center justify-center" style={{ minHeight: 32 }}>
          {locked ? (
            <Ionicons name="lock-closed-outline" size={24} color="#9ca3af" />
          ) : (
            <>
              <Text className="text-2xl font-bold" style={{ color: TEXT_HEADING }}>
                {value ?? '—'}
              </Text>
              {count != null && value != null && value !== '—' ? (
                <View
                  className="absolute -bottom-0.5 -right-4 h-5 w-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                >
                  <Text className="text-[10px] font-bold text-white">{count}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
        <Text className="text-center text-[11px] leading-tight" style={{ color: TEXT_MUTED }}>
          {subtitle}
        </Text>
      </View>
    </View>
  )
}
