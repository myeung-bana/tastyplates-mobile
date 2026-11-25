import { useCallback, useEffect, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { usePathname, useRouter } from 'expo-router'

import { AUTH_WALL } from '@/constants/authWalls'
import { SCREEN_RESTAURANT_DETAIL, SCREEN_STUDIO_MY_LISTS } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { coerceResumeHref, pushLoginScreen } from '@/lib/authRoutes'
import type { PlacesDetailsResult } from '@/lib/googlePlaces'
import { createRestaurantFromPlace } from '@/services/createRestaurantFromPlace'
import {
  getCheckinStatus,
  getFavoriteStatus,
  toggleCheckinBySlug,
  toggleFavoriteBySlug,
} from '@/services/restaurantEngagementService'
import { toast } from '@/utils/toast'

export type RestaurantEngagement = {
  saved: boolean
  checkedIn: boolean
  busy: boolean
  toggleSave: () => Promise<void>
  toggleCheckin: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Save (To-Dine) and Check-in for one restaurant (design S5 / M2): sign-in wall for guests, then
 * toggle with the existing toasts and their "View" action.
 *
 * `unlistedPlace` — a Google place with no Tastyplates row yet: the first Save / Check-in creates
 * the restaurant, then opens its page (one template for every restaurant).
 */
export function useRestaurantEngagement(
  slug: string,
  title: string,
  unlistedPlace?: PlacesDetailsResult | null,
): RestaurantEngagement {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [saved, setSaved] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!slug.trim() || !isAuthenticated) {
      setSaved(false)
      setCheckedIn(false)
      return
    }
    try {
      const [f, c] = await Promise.all([getFavoriteStatus(slug), getCheckinStatus(slug)])
      setSaved(f === 'saved')
      setCheckedIn(c === 'checkedin')
    } catch {
      // Keep the last known state.
    }
  }, [isAuthenticated, slug])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** The slug to act on — creates the restaurant first for an unlisted Google place. */
  const resolveSlug = useCallback(async (): Promise<{ slug: string; created: boolean } | null> => {
    if (slug.trim()) return { slug, created: false }
    if (!unlistedPlace) return null
    const created = await createRestaurantFromPlace(unlistedPlace)
    return { slug: created.slug, created: true }
  }, [slug, unlistedPlace])

  const run = useCallback(
    async (kind: 'save' | 'checkin') => {
      if (!isAuthenticated) {
        void Haptics.selectionAsync()
        pushLoginScreen(router, { resume: coerceResumeHref(pathname), wall: AUTH_WALL.saveCheckin })
        return
      }
      setBusy(true)
      void Haptics.selectionAsync()
      try {
        const target = await resolveSlug()
        if (!target) return
        if (kind === 'save') {
          const status = await toggleFavoriteBySlug(target.slug)
          setSaved(status === 'saved')
          toast.action(status === 'saved' ? 'Saved to To-Dine' : 'Removed from To-Dine', {
            label: 'View',
            onPress: () => router.push({ pathname: SCREEN_STUDIO_MY_LISTS, params: { tab: 'todine' } }),
          })
        } else {
          const status = await toggleCheckinBySlug(target.slug)
          setCheckedIn(status === 'checkedin')
          if (status === 'checkedin') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          toast.action(status === 'checkedin' ? `Checked in at ${title}` : 'Check-in removed', {
            label: 'View',
            onPress: () => router.push({ pathname: SCREEN_STUDIO_MY_LISTS, params: { tab: 'checkins' } }),
          })
        }
        // The place now has a Tastyplates page — continue there.
        if (target.created) router.replace({ pathname: SCREEN_RESTAURANT_DETAIL, params: { slug: target.slug } })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Something went wrong. Try again.')
        await refresh()
      } finally {
        setBusy(false)
      }
    },
    [isAuthenticated, pathname, refresh, resolveSlug, router, title],
  )

  return {
    saved,
    checkedIn,
    busy,
    toggleSave: () => run('save'),
    toggleCheckin: () => run('checkin'),
    refresh,
  }
}
