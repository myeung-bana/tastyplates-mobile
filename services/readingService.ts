import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

/**
 * Personalised reading + restaurant detail scores. Every number comes from the backend
 * (`restaurants-v2/get-restaurant-scores`, `readings/*`); the app only displays it.
 * Mirrors `tastyplates-nhost/functions/_lib/restaurantScores.ts` and `restaurantReading.ts`.
 */

// ─── Detail scores ───────────────────────────────────────────────────────────

export type ScoreCard = { avg: number | null; review_count: number; unlocked: boolean }

export type RestaurantScores = {
  min_reviews: number
  overall: ScoreCard
  /** e.g. "Your Score · Korean" or "East Asian Score". Null for guests / no palates. */
  palate: (ScoreCard & { kind: 'palate' | 'region' | 'group'; label: string; caption: string }) | null
  authentic: ScoreCard
  /** Null for guests. */
  shared: (ScoreCard & { caption: string }) | null
}

export async function getRestaurantScores(uuid: string): Promise<RestaurantScores> {
  const envelope = await tastyplatesFetch<RestaurantScores>(
    `restaurants-v2/get-restaurant-scores?uuid=${encodeURIComponent(uuid)}`,
    { withAuth: 'optional' },
  )
  return unwrapEnvelope(envelope)
}

// ─── Reading ─────────────────────────────────────────────────────────────────

export type ReadingCardState = 'guest' | 'no_palates' | 'not_enough' | 'daily_limit' | 'ready' | 'pending' | 'default'

export type ReadingState = {
  state: ReadingCardState
  reading_id: string | null
  updated_at: string | null
  circles_review_count: number
  min_reviews: number
}

export type ReadingStatus = 'gathering' | 'grouping' | 'writing' | 'ready' | 'failed'

export type ReadingMember = { slug: string; name: string; avg: number | null; review_count: number }

export type ReadingGroup = {
  slug: string
  name: string
  avg: number | null
  review_count: number
  unlocked: boolean
  why: string | null
  members: ReadingMember[]
}

export type ReadingFacts = {
  restaurant: { uuid: string; title: string; cuisine: string | null }
  based_on: number
  overall: { avg: number | null; review_count: number }
  circles: { avg: number | null; review_count: number; native_count: number; unlocked: boolean }
  min_reviews: number
  fit: { band: 'strong' | 'good' | 'mixed' | 'weak'; label: string } | null
  confidence: { level: 'high' | 'medium' | 'low'; label: string }
  your_groups: ReadingGroup[]
  other_groups: ReadingGroup[]
  palate_names: string[]
}

export type ReadingTheme = {
  label: string
  detail: string
  quote: string | null
  sentiment: 'positive' | 'mixed'
  review_count: number
  review_ids: string[]
}

export type ReadingContent = {
  headline: string
  summary: string
  agree: string
  group_takeaways: Record<string, string>
  themes: ReadingTheme[]
}

export type Reading = {
  id: string
  restaurant_uuid: string
  status: ReadingStatus
  facts: ReadingFacts | null
  content: ReadingContent | null
  error: string | null
  feedback: 1 | -1 | null
  updated_at: string
}

/** Device offset so "today" is the viewer's day (see `localDay` on the backend). */
const tz = () => new Date().getTimezoneOffset()

export async function getReadingState(restaurantUuid: string): Promise<ReadingState> {
  const envelope = await tastyplatesFetch<ReadingState>(
    `readings/get-reading-state?restaurant_uuid=${encodeURIComponent(restaurantUuid)}&tz=${tz()}`,
    { withAuth: 'optional' },
  )
  return unwrapEnvelope(envelope)
}

/** Thrown when the backend refuses to start (state changed since the card loaded — reload it). */
export class ReadingRefusedError extends Error {}

/** `tastyplatesFetch` reports HTTP failures as "HTTP <status>: <message>". */
function httpStatusOf(error: string): number | null {
  const m = /^HTTP (\d{3})/.exec(error)
  return m ? Number(m[1]) : null
}

function stripHttpPrefix(error: string): string {
  return error.replace(/^HTTP \d{3}:\s*/, '')
}

/**
 * Starts (or reuses) today's reading. The request stays open for the whole job, so callers don't
 * wait on it for progress — poll {@link getTodaysReading} instead.
 */
export async function startReading(restaurantUuid: string): Promise<{ reading_id: string }> {
  const envelope = await tastyplatesFetch<{ reading_id: string }>('readings/start-reading', {
    method: 'POST',
    withAuth: true,
    body: JSON.stringify({ restaurant_uuid: restaurantUuid, tz: tz() }),
  })
  if (!envelope.ok) {
    const message = stripHttpPrefix(envelope.error ?? 'Could not start your reading')
    if (httpStatusOf(envelope.error) === 409) throw new ReadingRefusedError(message)
    throw new Error(message)
  }
  return envelope.data
}

/** Today's reading for a restaurant, or null while the job hasn't created it yet. */
export async function getTodaysReading(restaurantUuid: string): Promise<Reading | null> {
  const envelope = await tastyplatesFetch<Reading>(
    `readings/get-reading?restaurant_uuid=${encodeURIComponent(restaurantUuid)}&tz=${tz()}`,
    { withAuth: true },
  )
  if (!envelope.ok) {
    if (httpStatusOf(envelope.error) === 404) return null
    throw new Error(stripHttpPrefix(envelope.error ?? 'Could not load your reading'))
  }
  return envelope.data
}

export async function sendReadingFeedback(id: string, value: 1 | -1 | null): Promise<void> {
  const envelope = await tastyplatesFetch<{ id: string }>('readings/reading-feedback', {
    method: 'POST',
    withAuth: true,
    body: JSON.stringify({ id, value }),
  })
  unwrapEnvelope(envelope)
}
