import type { FollowingFeedActivity } from '@/services/followingFeedService'

export type ActivityTimeBucket = 'today' | 'yesterday' | 'last7days' | 'older'

export type ActivityFeedSection = {
  key: ActivityTimeBucket | 'earlier' | 'latest'
  title: string
  data: FollowingFeedActivity[]
}

/** When Today and Yesterday are empty, show this many items under "Latest". */
export const LATEST_FALLBACK_COUNT = 5

/** Older-than-7-days items shown before "Show earlier activity" is tapped. */
export const EARLIER_PREVIEW_COUNT = 5

const BUCKET_LABELS: Record<ActivityTimeBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 Days',
  older: 'Earlier',
}

const RECENT_BUCKETS: ActivityTimeBucket[] = ['today', 'yesterday', 'last7days']

export function activityRowKey(activity: FollowingFeedActivity): string {
  return `${activity.type}:${activity.id}`
}

/** ISO timestamp used for grouping (check-ins use checked_in_at). */
export function getActivityTimestamp(activity: FollowingFeedActivity): string {
  if (activity.type === 'checkin') return activity.checked_in_at
  return activity.created_at
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Calendar-day buckets in the viewer's local timezone. */
export function getActivityTimeBucket(iso: string, now = new Date()): ActivityTimeBucket {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 'older'

  const todayStart = startOfLocalDay(now)
  const thenStart = startOfLocalDay(then)
  const dayDiff = Math.floor((todayStart - thenStart) / 86_400_000)

  if (dayDiff <= 0) return 'today'
  if (dayDiff === 1) return 'yesterday'
  if (dayDiff < 7) return 'last7days'
  return 'older'
}

function groupIntoBuckets(activities: FollowingFeedActivity[]): Record<ActivityTimeBucket, FollowingFeedActivity[]> {
  const buckets: Record<ActivityTimeBucket, FollowingFeedActivity[]> = {
    today: [],
    yesterday: [],
    last7days: [],
    older: [],
  }

  for (const activity of activities) {
    const bucket = getActivityTimeBucket(getActivityTimestamp(activity))
    buckets[bucket].push(activity)
  }

  return buckets
}

export function hasOlderActivities(activities: FollowingFeedActivity[]): boolean {
  return activities.some(
    (activity) => getActivityTimeBucket(getActivityTimestamp(activity)) === 'older',
  )
}

export function getOlderActivities(activities: FollowingFeedActivity[]): FollowingFeedActivity[] {
  return activities.filter(
    (activity) => getActivityTimeBucket(getActivityTimestamp(activity)) === 'older',
  )
}

/** True when more older items exist than the default preview (or another page is available). */
export function shouldShowEarlierActivityCta(
  activities: FollowingFeedActivity[],
  expandedOlder: boolean,
  hasMore: boolean,
): boolean {
  if (expandedOlder) return false
  const olderCount = getOlderActivities(activities).length
  return olderCount > EARLIER_PREVIEW_COUNT || hasMore
}

export function buildActivityFeedSections(
  activities: FollowingFeedActivity[],
  expandedOlder: boolean,
): ActivityFeedSection[] {
  const grouped = groupIntoBuckets(activities)
  const sections: ActivityFeedSection[] = []
  const hasTodayOrYesterday = grouped.today.length > 0 || grouped.yesterday.length > 0

  if (hasTodayOrYesterday) {
    for (const bucket of RECENT_BUCKETS) {
      if (grouped[bucket].length > 0) {
        sections.push({
          key: bucket,
          title: BUCKET_LABELS[bucket],
          data: grouped[bucket],
        })
      }
    }
  } else {
    const nonOlder = activities.filter(
      (activity) => getActivityTimeBucket(getActivityTimestamp(activity)) !== 'older',
    )
    const latest = nonOlder.slice(0, LATEST_FALLBACK_COUNT)
    const remainder = nonOlder.slice(LATEST_FALLBACK_COUNT)

    if (latest.length > 0) {
      sections.push({
        key: 'latest',
        title: 'Latest',
        data: latest,
      })
    }
    if (remainder.length > 0) {
      sections.push({
        key: 'last7days',
        title: BUCKET_LABELS.last7days,
        data: remainder,
      })
    }
  }

  if (grouped.older.length > 0) {
    const earlierData = expandedOlder
      ? grouped.older
      : grouped.older.slice(0, EARLIER_PREVIEW_COUNT)

    if (earlierData.length > 0) {
      sections.push({
        key: 'earlier',
        title: BUCKET_LABELS.older,
        data: earlierData,
      })
    }
  }

  return sections
}

export function mergeFollowingActivities(
  prev: FollowingFeedActivity[],
  next: FollowingFeedActivity[],
): FollowingFeedActivity[] {
  if (next.length === 0) return prev
  const seen = new Set(prev.map(activityRowKey))
  const fresh = next.filter((activity) => !seen.has(activityRowKey(activity)))
  return fresh.length === 0 ? prev : [...prev, ...fresh]
}
