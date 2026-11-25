import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { ReadingPending } from '@/components/reading/ReadingPending'
import { ReadingError, ReadingResult } from '@/components/reading/ReadingResult'
import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'
import { SCREEN_RESTAURANT_REVIEWS, SCREEN_STUDIO_ADD_REVIEW_WRITE } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useHideTabBarWhileFocused } from '@/hooks/useHideTabBarWhileFocused'
import { useRestaurantEngagement } from '@/hooks/useRestaurantEngagement'
import { coerceResumeHref, pushLoginScreen } from '@/lib/authRoutes'
import { firstSegmentParam } from '@/lib/routeParams'
import { shareRestaurantListing } from '@/lib/shareRestaurantListing'
import {
  getTodaysReading,
  type Reading,
  type ReadingContent,
  type ReadingFacts,
  ReadingRefusedError,
  type ReadingStatus,
  sendReadingFeedback,
  startReading,
} from '@/services/readingService'
import { toast } from '@/utils/toast'

const POLL_MS = 1200
const SLOW_AFTER_MS = 25_000

type Phase =
  | { kind: 'loading' }
  | { kind: 'pending'; status: ReadingStatus | null }
  | { kind: 'result'; reading: Reading & { facts: ReadingFacts; content: ReadingContent } }
  | { kind: 'error'; facts: ReadingFacts | null }

const isReady = (r: Reading | null): r is Reading & { facts: ReadingFacts; content: ReadingContent } =>
  Boolean(r && r.status === 'ready' && r.facts && r.content)

/**
 * Personalised reading (full-screen modal over restaurant detail). Opens today's reading when it's
 * cached, otherwise starts the job and follows its status. Closing leaves the job running on the
 * server — the restaurant's card then shows "View your reading".
 */
export default function ReadingScreen(): JSX.Element {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  useHideTabBarWhileFocused()
  const params = useLocalSearchParams<{ uuid: string; title?: string; slug?: string; image?: string }>()
  const uuid = firstSegmentParam(params.uuid)
  const title = firstSegmentParam(params.title) || 'this restaurant'
  const slug = firstSegmentParam(params.slug)
  const image = firstSegmentParam(params.image) || null

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [slow, setSlow] = useState(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slowRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aliveRef = useRef(true)

  const engagement = useRestaurantEngagement(slug, title)

  const stopTimers = useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current)
    if (slowRef.current) clearTimeout(slowRef.current)
    pollRef.current = null
    slowRef.current = null
  }, [])

  const poll = useCallback(async () => {
    if (!aliveRef.current) return
    try {
      const reading = await getTodaysReading(uuid)
      if (!aliveRef.current) return
      if (isReady(reading)) {
        stopTimers()
        setPhase({ kind: 'result', reading })
        return
      }
      if (reading?.status === 'failed') {
        stopTimers()
        setPhase({ kind: 'error', facts: reading.facts })
        return
      }
      setPhase({ kind: 'pending', status: reading?.status ?? 'gathering' })
    } catch {
      // Transient — keep polling; the 25s notice covers a stuck job.
    }
    pollRef.current = setTimeout(() => void poll(), POLL_MS)
  }, [stopTimers, uuid])

  const begin = useCallback(
    async (restart: boolean) => {
      stopTimers()
      setSlow(false)
      setPhase({ kind: 'pending', status: null })
      slowRef.current = setTimeout(() => aliveRef.current && setSlow(true), SLOW_AFTER_MS)

      if (restart) {
        // The request stays open for the whole job; we follow progress by polling instead.
        startReading(uuid).catch((e) => {
          if (!aliveRef.current) return
          if (e instanceof ReadingRefusedError) {
            stopTimers()
            toast.error(e.message)
            router.back()
          }
        })
      }
      pollRef.current = setTimeout(() => void poll(), restart ? 600 : 0)
    },
    [poll, router, stopTimers, uuid],
  )

  // First look: show today's reading if it's cached or running; otherwise start one.
  useEffect(() => {
    aliveRef.current = true
    if (!uuid) {
      router.back()
      return
    }
    if (!isAuthenticated) {
      pushLoginScreen(router, { resume: coerceResumeHref(`/restaurants/${slug}`) })
      return
    }
    void (async () => {
      try {
        const reading = await getTodaysReading(uuid)
        if (!aliveRef.current) return
        if (isReady(reading)) setPhase({ kind: 'result', reading })
        else if (reading && reading.status !== 'failed') void begin(false)
        else void begin(true)
      } catch {
        if (aliveRef.current) void begin(true)
      }
    })()
    return () => {
      aliveRef.current = false
      stopTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid])

  const close = () => {
    stopTimers()
    if (router.canGoBack()) router.back()
  }

  const writeReview = () => {
    if (!slug) return
    router.push({ pathname: SCREEN_STUDIO_ADD_REVIEW_WRITE, params: { slug } })
  }

  return (
    <View style={{ flex: 1 }}>
      {phase.kind === 'loading' ? (
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: TEXT_HEADING }}>
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      ) : phase.kind === 'pending' ? (
        <ReadingPending title={title} image={image} status={phase.status} slow={slow} onClose={close} onRetry={() => void begin(true)} />
      ) : phase.kind === 'error' ? (
        <ReadingError facts={phase.facts} onRetry={() => void begin(true)} onClose={close} />
      ) : (
        <ReadingResult
          reading={phase.reading}
          saved={engagement.saved}
          saveBusy={engagement.busy}
          onToggleSave={() => void engagement.toggleSave()}
          onShare={() => void shareRestaurantListing({ title, slug })}
          onWriteReview={writeReview}
          onOpenThemeReviews={(theme) =>
            router.push({
              pathname: SCREEN_RESTAURANT_REVIEWS,
              params: {
                restaurant_uuid: uuid,
                restaurant_title: title,
                restaurant_slug: slug,
                review_ids: theme.review_ids.join(','),
                filter_label: theme.label,
              },
            })
          }
          onFeedback={(value) => void sendReadingFeedback(phase.reading.id, value).catch(() => undefined)}
          onClose={close}
        />
      )}
    </View>
  )
}
