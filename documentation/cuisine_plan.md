# cuisine-search-plan.md — Search by Cuisine: Non-Logged-In vs Logged-In Experience

> **Grounded in:** Full source of `constants/palateOptions.ts`, `constants/quickFinds.ts`, `lib/palateSearch.ts`, `services/restaurantsV2Service.ts`, `functions/restaurants-v2/get-restaurants.ts`, and `functions/restaurants-v2/get-preference-stats.ts` — all read in full.

---

## 1. What Changes, What Stays, What Is Renamed

| Element | Current | New |
|---------|---------|-----|
| Label "Search by Palate" | Used in overlay and picker | Renamed to **"Search by Cuisine"** everywhere |
| Cuisine taxonomy data (`palateOptions`) | Unchanged | Unchanged — same slugs, same region hierarchy |
| `quickFinds` slugs | Unchanged | Unchanged |
| `get-restaurants.ts` `cuisine_slugs` param | Already exists | Used as the primary filter — no backend change |
| `get-preference-stats.ts` `palates` param | Used for palate sort | Used for **logged-in personalised ranking** |
| `?palate=` URL param (sort context) | Confusing — same name as user palate | Renamed to **`?cuisine=`** (filter) — see §3 |
| Sort order (non-logged-in) | `order_by=rating_desc` | `order_by=rating_desc` — **unchanged** |
| Sort order (logged-in, cuisine selected) | Palate-context sort | **Parent-taxonomy sibling sort** — new (§5) |

---

## 2. The Core Concept — Two Ranking Modes for the Same Filter

When a user taps **"Japanese"** in the cuisine picker, the restaurant list is filtered the same way in both modes:

```
cuisine_slugs=japanese → get-restaurants returns restaurants WHERE cuisines CONTAINS { slug: 'japanese' }
```

**The result set is identical.** What differs is how those results are **ranked**:

```
Non-Logged-In:
  order_by = rating_desc
  → Highest average_rating first, then ratings_count desc
  → Simple, honest, universal

Logged-In (user has palate: e.g. ["korean", "chinese"]):
  cuisine selected: "japanese"
  parent region of "japanese": "East Asian"
  siblings of "japanese" in "East Asian": ["korean", "chinese", "taiwanese"]
  user's palate intersects siblings: ["korean", "chinese"]  ← the "trust set"
  → get-preference-stats(palates=["korean","chinese"])
  → rank by: preference_rating_avg (from trust set) DESC → ratings_count DESC → average_rating DESC
  → Restaurants most loved by Korean + Chinese palate reviewers appear first
  → "If people who love Korean and Chinese food also love this Japanese restaurant, you will too"
```

This is the **palate-informed cuisine ranking**. The filter is cuisine-based (intuitive to the user). The ranking is personalised (meaningful to the app's value proposition). The user sees "Japanese restaurants" — they don't need to know the ranking is personalised.

---

## 3. Terminology and URL Changes

### Rename `?palate=` to `?cuisine=`

The current `?palate=` URL param is confusing because it overlaps with the concept of "your palate" (your personal cuisine identity). In the new model:

| Param | Meaning | Who sets it |
|-------|---------|------------|
| `?cuisine=japanese` | User selected Japanese in the picker | Search overlay / Quick Finds |
| `?cuisine=East Asian` | User selected the "East Asian" region pill | Region pill in picker |

The internal function params (`palate_slugs`, `cuisine_slugs`) on the backend are **not changed** — only the client-side URL param name changes.

### What to update

```
lib/palateSearch.ts:
  isNoPalateFilter()      → keep, rename to isNoCuisineFilter()
  expandPalateParamToSlugs() → keep, rename to expandCuisineParamToSlugs()
  isPalateSortActive()    → replaced by shouldUsePersonalisedRanking() (§5)

components/search/PalatePickerScrollPanel.tsx:
  Section header:  "Search by Palate"  → "Search by Cuisine"
  All "palate" labels in UI            → "cuisine"

components/search/SearchOverlay.tsx:
  "Search by Palate" heading → "Search by Cuisine"

constants/tabBar, screens, navigation:
  Any "palate" UI label      → "cuisine"
  router.push params:
    { palate: cuisineKey }   → { cuisine: cuisineKey }
```

---

## 4. Non-Logged-In Flow — Cuisine Filter + Rating Sort

### What happens

1. User opens search overlay (not logged in)
2. Sees `"Search by Cuisine"` section with all `palateOptions` regions and pills
3. Taps **"Japanese"**
4. Overlay calls `router.push({ pathname: '/(tabs)/restaurants', params: { cuisine: 'japanese' } })`
5. Restaurants screen reads `params.cuisine = 'japanese'`
6. Calls `getRestaurants({ cuisineSlugs: ['japanese'], order_by: 'rating_desc', locationKey })`
7. Backend: `WHERE cuisines CONTAINS { slug: 'japanese' } ORDER BY average_rating DESC`
8. Result: Japanese restaurants, highest rated first

### What the filter strip shows

```
[Japanese ×]   [Sort: Highest Rated]
```

No personalisation messaging — clean and honest.

### Code path (restaurants screen)

```ts
// app/(tabs)/restaurants/index.tsx

const { cuisine, search: searchParam } = useLocalSearchParams<{
  cuisine?: string
  search?: string
}>()

// Expand region key to child slugs if needed
const cuisineSlugs = useMemo(() => {
  if (!cuisine || isNoCuisineFilter(cuisine)) return undefined
  return expandCuisineParamToSlugs(cuisine)  // renamed from expandPalateParamToSlugs
}, [cuisine])

// Non-logged-in: always rating_desc
const orderBy = 'rating_desc'

// Fetch
const { data } = await getRestaurants({
  cuisineSlugs,
  order_by: orderBy,
  locationKey,
})
```

---

## 5. Logged-In Flow — Cuisine Filter + Palate-Informed Ranking

### The algorithm

```
Input:
  selected_cuisine = "japanese"
  user_palate      = ["korean", "chinese"]   ← from user's profile

Step 1 — Find parent region of selected cuisine
  "japanese" → parent = "East Asian"
  siblings of "japanese" in "East Asian" = ["korean", "chinese", "taiwanese"]

Step 2 — Intersect user's palate with siblings
  trust_set = siblings ∩ user_palate = ["korean", "chinese"]
  (if trust_set is empty → fall back to non-logged-in rating_desc)

Step 3 — Fetch preference stats for trust_set
  GET /restaurants-v2/get-preference-stats?palates=korean,chinese
  → Map<restaurant_id, { preference_rating_avg, preference_review_count }>

Step 4 — Fetch restaurants (cuisine-filtered, no server sort needed)
  GET /restaurants-v2/get-restaurants?cuisine_slugs=japanese&order_by=rating_desc

Step 5 — Client-side re-rank
  For each restaurant, attach trust_set preference stats
  Sort by:
    1. preference_rating_avg DESC  (how much East Asian palate users love it)
    2. preference_review_count DESC (how many of them rated it)
    3. average_rating DESC          (overall fallback)
    4. ratings_count DESC           (volume fallback)
```

### Why siblings, not just the user's own palate?

If the user's palate is `["korean"]` and they browse "Japanese", there may be zero `preference_rating_avg` data because Korean-palate reviewers haven't reviewed many Japanese restaurants. Using the full **parent-taxonomy sibling group** ("East Asian") gives a much larger trust set and produces meaningful rankings. The intersection step ensures only the user's actual palate cuisines are used — not the entire East Asian group.

### New utility — `lib/cuisineTaxonomy.ts`

```ts
// lib/cuisineTaxonomy.ts
// Pure utility. No network calls. Derived from palateOptions.

import { palateOptions } from '@/constants/palateOptions'
import type { PalateRegion } from '@/constants/palateOptions'

/** Map: cuisine slug → parent PalateRegion */
const CUISINE_TO_REGION = new Map<string, PalateRegion>()
for (const region of palateOptions) {
  for (const child of region.children) {
    CUISINE_TO_REGION.set(child.key, region)
  }
}

/**
 * Find the parent region for a cuisine slug.
 * e.g. 'japanese' → { key: 'East Asian', children: [...] }
 */
export function getParentRegion(cuisineSlug: string): PalateRegion | null {
  return CUISINE_TO_REGION.get(cuisineSlug) ?? null
}

/**
 * Given a selected cuisine and the user's palate, compute the trust set:
 * siblings of the selected cuisine (in the same region) that intersect with the user's palate.
 *
 * e.g. selected = 'japanese', userPalate = ['korean', 'chinese']
 *   → region siblings = ['korean', 'chinese', 'taiwanese']
 *   → trust set = ['korean', 'chinese']   ← the intersection
 */
export function computeTrustSet(
  selectedCuisine: string,
  userPalate: string[],
): string[] {
  const region = getParentRegion(selectedCuisine)
  if (!region) return []

  const siblings = region.children
    .map(c => c.key)
    .filter(key => key !== selectedCuisine)  // exclude the cuisine itself

  const userPalateSet = new Set(userPalate.map(p => p.toLowerCase()))
  return siblings.filter(s => userPalateSet.has(s.toLowerCase()))
}

/**
 * Check if personalised ranking is possible.
 * Returns false if:
 *   - user is not logged in
 *   - user has no palate set
 *   - selected cuisine has no parent region
 *   - trust set is empty (user's palate doesn't intersect siblings)
 */
export function canPersonaliseRanking(
  selectedCuisine: string | null | undefined,
  userPalate: string[] | null | undefined,
): boolean {
  if (!selectedCuisine || !userPalate?.length) return false
  const trustSet = computeTrustSet(selectedCuisine, userPalate)
  return trustSet.length > 0
}
```

### New hook — `hooks/usePersonalisedRestaurants.ts`

```ts
// hooks/usePersonalisedRestaurants.ts

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getRestaurants, type RestaurantListRow } from '@/services/restaurantsV2Service'
import { getPreferenceStats, type PreferenceStatMap } from '@/services/preferenceStatsService'
import { computeTrustSet, canPersonaliseRanking } from '@/lib/cuisineTaxonomy'
import { expandCuisineParamToSlugs, isNoCuisineFilter } from '@/lib/palateSearch'
import { useAuth } from '@/hooks/useAuth'
import { useUserPalate } from '@/hooks/useUserPalate'

interface Params {
  cuisineParam: string | null | undefined  // e.g. "japanese" or "East Asian"
  locationKey: string
  limit?: number
}

interface Result {
  restaurants: RestaurantListRow[]
  loading: boolean
  hasMore: boolean
  isPersonalised: boolean     // true when palate-informed ranking is active
  trustSet: string[]          // the sibling cuisines used for ranking
  loadMore: () => void
  refresh: () => void
}

export function usePersonalisedRestaurants({
  cuisineParam,
  locationKey,
  limit = 24,
}: Params): Result {
  const { isAuthenticated } = useAuth()
  const { palate: userPalate } = useUserPalate()  // string[] from user profile

  const [restaurants, setRestaurants] = useState<RestaurantListRow[]>([])
  const [prefStats, setPrefStats] = useState<PreferenceStatMap>({})
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const cursorRef = useRef<string | null>(null)

  // Expand cuisine param to slugs (e.g. "East Asian" → ["japanese","korean",...])
  const cuisineSlugs = useMemo(
    () => (cuisineParam && !isNoCuisineFilter(cuisineParam)
      ? expandCuisineParamToSlugs(cuisineParam)
      : undefined),
    [cuisineParam],
  )

  // Single selected cuisine key (first expanded slug or the param itself)
  const singleCuisine = cuisineSlugs?.length === 1 ? cuisineSlugs[0] : null

  // Compute trust set for personalised ranking
  const trustSet = useMemo(() => {
    if (!isAuthenticated || !singleCuisine || !userPalate?.length) return []
    return computeTrustSet(singleCuisine, userPalate)
  }, [isAuthenticated, singleCuisine, userPalate])

  const isPersonalised = trustSet.length > 0

  // Fetch restaurants + preference stats
  const fetchPage = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const [resResult, statsResult] = await Promise.allSettled([
        getRestaurants({
          cuisineSlugs,
          // Server sort: rating_desc as base (personalised re-rank happens client-side)
          order_by: 'rating_desc',
          locationKey,
          limit,
          cursor: reset ? null : cursorRef.current,
        }),
        // Only fetch preference stats when we can personalise
        isPersonalised
          ? getPreferenceStats({ palates: trustSet })
          : Promise.resolve(null),
      ])

      const rows = resResult.status === 'fulfilled' ? resResult.value.restaurants : []
      const meta = resResult.status === 'fulfilled' ? resResult.value.meta : null
      const stats = statsResult.status === 'fulfilled' ? (statsResult.value ?? {}) : {}

      if (meta) {
        cursorRef.current = meta.cursor
        setHasMore(meta.hasMore)
      }
      if (stats) setPrefStats(prev => reset ? stats : { ...prev, ...stats })

      setRestaurants(prev => reset ? rows : [...prev, ...rows])
    } finally {
      setLoading(false)
    }
  }, [cuisineSlugs, locationKey, limit, isPersonalised, trustSet])

  useEffect(() => {
    cursorRef.current = null
    setRestaurants([])
    void fetchPage(true)
  }, [fetchPage])

  // Client-side personalised re-rank
  const rankedRestaurants = useMemo(() => {
    if (!isPersonalised || Object.keys(prefStats).length === 0) return restaurants

    return [...restaurants].sort((a, b) => {
      const aStats = prefStats[a.id] ?? { avg: -1, count: 0 }
      const bStats = prefStats[b.id] ?? { avg: -1, count: 0 }

      // 1. Preference avg DESC
      if (Math.abs(aStats.avg - bStats.avg) > 0.01) return bStats.avg - aStats.avg
      // 2. Preference count DESC
      if (aStats.count !== bStats.count) return bStats.count - aStats.count
      // 3. Overall rating DESC
      const aRating = a.average_rating ?? 0
      const bRating = b.average_rating ?? 0
      if (Math.abs(aRating - bRating) > 0.01) return bRating - aRating
      // 4. Total reviews DESC
      return (b.ratings_count ?? 0) - (a.ratings_count ?? 0)
    })
  }, [restaurants, prefStats, isPersonalised])

  return {
    restaurants: rankedRestaurants,
    loading,
    hasMore,
    isPersonalised,
    trustSet,
    loadMore: () => { if (hasMore && !loading) void fetchPage(false) },
    refresh: () => {
      cursorRef.current = null
      void fetchPage(true)
    },
  }
}
```

---

## 6. New User Palate Hook — `hooks/useUserPalate.ts`

```ts
// hooks/useUserPalate.ts
// Reads the logged-in user's palate from their profile.
// Returns an array of cuisine slugs e.g. ['korean', 'chinese']

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getUserProfile } from '@/services/userProfileService'

export function useUserPalate(): { palate: string[] | null; loading: boolean } {
  const { isAuthenticated, user } = useAuth()
  const [palate, setPalate] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setPalate(null)
      return
    }
    setLoading(true)
    getUserProfile(user.id)
      .then(profile => {
        // profile.palates is string[] stored in user_profiles.palates JSONB
        setPalate(Array.isArray(profile?.palates) ? profile.palates : [])
      })
      .catch(() => setPalate([]))
      .finally(() => setLoading(false))
  }, [isAuthenticated, user?.id])

  return { palate, loading }
}
```

---

## 7. Personalisation Disclosure — What the User Sees

The personalisation is silent by default — the user sees "Japanese restaurants" filtered and ranked, without a technical explanation. A subtle contextual label appears in the filter strip only when personalisation is active:

### Filter strip — non-logged-in

```
[🇯🇵 Japanese ×]   Sort: Highest Rated
```

### Filter strip — logged-in, personalised

```
[🇯🇵 Japanese ×]   ✦ Ranked for your palate
```

The `✦ Ranked for your palate` label is a small `text-[11px] text-[#ff7c0a]` line that appears below the filter chip row when `isPersonalised === true`. It communicates the value without requiring the user to understand how it works.

```tsx
// In restaurants screen filter strip:
{isPersonalised && (
  <Text style={{
    fontFamily: 'Neusans', fontSize: 11, color: '#ff7c0a',
    marginTop: 3, paddingHorizontal: 16,
  }}>
    ✦ Ranked for your palate — based on {trustSet.map(capitalise).join(' & ')} reviewers
  </Text>
)}
```

Example text: `"✦ Ranked for your palate — based on Korean & Chinese reviewers"`

---

## 8. Region Pill Behaviour

When the user selects the **"East Asian"** region pill (not a specific cuisine):

```
Non-Logged-In:
  cuisine_slugs = ['japanese','korean','chinese','taiwanese']
  order_by = rating_desc
  Filter strip: [East Asian ×]  Sort: Highest Rated

Logged-In (palate: ['korean']):
  cuisine_slugs = ['japanese','korean','chinese','taiwanese']
  trust_set = userPalate ∩ ['japanese','chinese','taiwanese'] = []
  ← user's palate (korean) IS in the region but there are no siblings to intersect
     because the user IS korean and we include all siblings
  trustSet = ['korean']  ← include user's own palate when no other sibling matches
  Personalised: true — rank by how Korean-palate reviewers rated all East Asian restaurants
```

Edge case rule: when the user selects their **own cuisine's parent region**, the trust set falls back to including the user's own palate slugs as the ranking criterion.

```ts
// lib/cuisineTaxonomy.ts — update computeTrustSet for region selection:

export function computeTrustSetForRegion(
  regionKey: string,
  userPalate: string[],
): string[] {
  const region = palateOptions.find(r => r.key === regionKey)
  if (!region) return []

  const userPalateSet = new Set(userPalate.map(p => p.toLowerCase()))
  const intersection = region.children
    .map(c => c.key)
    .filter(key => userPalateSet.has(key))

  return intersection  // empty → fall back to rating_desc
}
```

---

## 9. What Changes Across Every File

### Rename only (no logic change)

| File | Current string | New string |
|------|---------------|-----------|
| `components/search/SearchOverlay.tsx` | `"Search by Palate"` | `"Search by Cuisine"` |
| `components/search/PalatePickerScrollPanel.tsx` | `"Search by Palate"` | `"Search by Cuisine"` |
| `components/search/PalatePickerPanel.tsx` | `"Search by Palate"` | `"Search by Cuisine"` |
| All section headers in search UI | `"SEARCH BY PALATE"` | `"SEARCH BY CUISINE"` |
| `router.push` params | `{ palate: key }` | `{ cuisine: key }` |
| `useLocalSearchParams` reads | `params.palate` | `params.cuisine` |
| `lib/palateSearch.ts` exported functions | `isNoPalateFilter` | `isNoCuisineFilter` |
| `lib/palateSearch.ts` exported functions | `expandPalateParamToSlugs` | `expandCuisineParamToSlugs` |

### New files

| File | Purpose |
|------|---------|
| `lib/cuisineTaxonomy.ts` | `getParentRegion`, `computeTrustSet`, `computeTrustSetForRegion`, `canPersonaliseRanking` |
| `hooks/usePersonalisedRestaurants.ts` | Unified hook: cuisine filter + conditional personalised ranking |
| `hooks/useUserPalate.ts` | Reads logged-in user's palate from `user_profiles.palates` |

### Updated files

| File | Change |
|------|--------|
| `app/(tabs)/restaurants/index.tsx` | Replace raw `getRestaurants` call with `usePersonalisedRestaurants` hook; add personalisation label to filter strip |
| `components/search/SearchOverlay.tsx` | `router.push` param: `palate` → `cuisine` |
| `components/search/PalatePickerScrollPanel.tsx` | Label rename only |
| `lib/palateSearch.ts` | Add aliases for renamed functions; keep old names as `@deprecated` for 1 release |
| `constants/quickFinds.ts` | No change — slugs are correct |
| `constants/palateOptions.ts` | No change — taxonomy is correct |

### No-change files

| File | Why unchanged |
|------|--------------|
| `functions/restaurants-v2/get-restaurants.ts` | Already accepts `cuisine_slugs` param correctly |
| `functions/restaurants-v2/get-preference-stats.ts` | Already accepts `palates` param correctly |
| `services/restaurantsV2Service.ts` | `cuisineSlugs` param already exists and is named correctly |
| `constants/palateOptions.ts` | Taxonomy is correct — region keys and cuisine keys unchanged |

---

## 10. Before vs After — Side by Side

### Non-Logged-In: taps "Japanese"

**Before:**
```
URL param:     ?palate=japanese
Label shown:   "Search by Palate"
Sort:          PALATE_CONTEXT (confusing — what palate? user has none)
Filter strip:  [Palate Match – Japanese ×]
```

**After:**
```
URL param:     ?cuisine=japanese
Label shown:   "Search by Cuisine"
Sort:          rating_desc (highest rated first — clear and honest)
Filter strip:  [🇯🇵 Japanese ×]   Sort: Highest Rated
```

---

### Logged-In (palate: Korean + Chinese): taps "Japanese"

**Before:**
```
URL param:     ?palate=japanese
Sort:          PALATE_CONTEXT using "japanese" as the palate slug
               → fetches preference stats for Japanese-palate reviewers
               → ranks by how Japanese-palate users rated restaurants
               (wrong — the user IS Korean/Chinese, not Japanese)
```

**After:**
```
URL param:     ?cuisine=japanese
Trust set:     user is [korean, chinese]
               japanese parent = East Asian
               siblings = [korean, chinese, taiwanese]
               intersection = [korean, chinese]  ← trust set
Sort:          preference_rating_avg (from Korean + Chinese reviewers) DESC
Filter strip:  [🇯🇵 Japanese ×]  ✦ Ranked for your palate
Disclosure:    "✦ Ranked for your palate — based on Korean & Chinese reviewers"
```

---

### Logged-In (palate: Japanese): taps "Japanese"

**Before:**
```
PALATE_CONTEXT with japanese slugs
→ ranks by Japanese-palate reviewers (correct by accident)
```

**After:**
```
Trust set:     user is [japanese]
               siblings of japanese = [korean, chinese, taiwanese]
               intersection with user palate = []  ← empty (user IS japanese)
               Fallback rule: trust_set = ['japanese']  ← use own palate
Sort:          preference_rating_avg (from Japanese reviewers) DESC
```

This edge case — when the user selects their own cuisine — produces the same result as before but through a deliberate, documented rule instead of accident.

---

## 11. How This Changes the Restaurant Detail Score Panel

### 11.1 The four scores — what they are and where they come from

Every restaurant detail screen shows up to four scores. They come from two different data sources:

| Score | Source table / endpoint | What it measures |
|-------|------------------------|-----------------|
| **Overall Score** | `restaurant_rating_summary.overall_rating_avg` | Average of all approved reviews for this restaurant |
| **Authentic Score** | `restaurant_rating_summary.authentic_rating_weighted` | Weighted average using only reviews from users whose `AuthorProfile.palates` matches a cuisine in the restaurant's own `palates` field — "people who actually eat this type of food" |
| **Search Score** | `get-preference-stats?palates=<trust_set>` → `{ avg, count }` per `restaurant_uuid` | Average rating from reviewers whose profile palate matches the currently active trust set (set dynamically per user and per selected cuisine) |
| **Shared Score** | Part of `restaurant_rating_summary` or a future community field | How reviewers who share the exact same regional palate as you rate this restaurant (currently not fully implemented — see §11.5) |

### 11.2 What changes with the new cuisine search system

Under the current system, **Search Score** is calculated using the `?palate=` URL param passed to `get-preference-stats`. That param is the cuisine the user browsed *to* — e.g., `palate=japanese`. So the Search Score currently shows "how Japanese-palate reviewers rate this restaurant" — which is unintentional and wrong when the user browsing is Korean/Chinese.

Under the new system, **Search Score uses the trust set**, not the browsed cuisine:

```
Old: Search Score = avg rating from reviewers with palate: ['japanese']
                    (the cuisine being browsed)

New: Search Score = avg rating from reviewers with palate: ['korean', 'chinese']
                    (the user's actual palate siblings in the parent region)
```

This makes Search Score answer a different, more useful question:

> **"How do people with a similar palate to yours rate this restaurant?"**

Instead of the old question:

> "How do Japanese-palate reviewers rate this restaurant?" ← wrong when you're Korean

---

### 11.3 How each score is computed — exact algorithm

#### Overall Score
```
Source:   restaurant_rating_summary.overall_rating_avg
Filter:   ALL non-deleted top-level reviews for this restaurant
Formula:  SUM(rating) / COUNT(reviews)
Display:  always shown, no auth required
Lock:     never locked
```

#### Authentic Score
```
Source:   restaurant_rating_summary.authentic_rating_weighted
Filter:   reviews WHERE reviewer's AuthorProfile.palates
          INTERSECTS restaurant.palates (cuisines the restaurant serves)
          i.e., Korean-palate reviewer rating a Korean restaurant = authentic
          Korean-palate reviewer rating an Italian restaurant = NOT authentic
Formula:  weighted average (more reviews = higher confidence weight)
Display:  always shown, no auth required
Lock:     never locked
```

#### Search Score — current (broken for cross-cuisine search)
```
Source:   GET /api/v1/restaurants-v2/get-preference-stats?palates=<cuisine_browsed>
          e.g. palates=japanese  ← the cuisine the user searched
Filter:   reviews WHERE reviewer.AuthorProfile.palates CONTAINS 'japanese'
Formula:  SUM(rating) / COUNT(matching_reviews)  per restaurant_uuid
Display:  shown when ?palate= is set in the URL
Lock:     locked behind auth in web (isAuthenticated || palateUrlActive)
```

#### Search Score — new (personalised for logged-in users)
```
Source:   GET /restaurants-v2/get-preference-stats?palates=<trust_set>
          e.g. palates=korean,chinese  ← the user's palate siblings in the parent region
Filter:   reviews WHERE reviewer.AuthorProfile.palates
          INTERSECTS {korean, chinese}  ← the trust set, NOT the browsed cuisine
Formula:  SUM(rating) / COUNT(matching_reviews)  per restaurant_uuid
Display:  shown when user is logged in AND a cuisine is selected
Lock:     shown to logged-in users; shown to guests only if they browsed by cuisine
Label:    changed from "Search Score" → "Your Score" for logged-in users
          kept as "Search Score" for non-logged-in users
```

---

### 11.4 The `get-preference-stats` call — what changes

The call site in the mobile restaurant detail screen changes from:

```ts
// Old — uses the cuisine the user browsed as the palate context
const cuisineParam = searchParams.get('palate')   // e.g. 'japanese'
const stats = await getPreferenceStats({ palates: [cuisineParam] })
// → stats[restaurant.uuid] = how Japanese-palate reviewers rate this restaurant
```

To:

```ts
// New — uses the trust set computed from user's palate + browsed cuisine
const cuisineParam = searchParams.get('cuisine')  // e.g. 'japanese'
const { palate: userPalate } = useUserPalate()
const trustSet = isAuthenticated && userPalate?.length
  ? computeTrustSet(cuisineParam, userPalate)   // e.g. ['korean', 'chinese']
  : [cuisineParam]                              // fallback: just the browsed cuisine (guest)

const stats = await getPreferenceStats({ palates: trustSet })
// → stats[restaurant.uuid] = how Korean+Chinese reviewers rate this restaurant
```

No backend change is needed — `get-preference-stats` already accepts a comma-separated `palates` list and computes the aggregate correctly.

---

### 11.5 Score visibility matrix — what each user sees

| Score | Non-logged-in (no cuisine selected) | Non-logged-in (cuisine selected) | Logged-in (no cuisine selected) | Logged-in (cuisine selected) |
|-------|-------------------------------------|----------------------------------|---------------------------------|------------------------------|
| **Overall Score** | ✅ Shown | ✅ Shown | ✅ Shown | ✅ Shown |
| **Authentic Score** | ✅ Shown | ✅ Shown | ✅ Shown | ✅ Shown |
| **Search Score** | 🔒 Locked ("Sign in") | ✅ Shown (by browsed cuisine) | 🔒 Locked ("Browse by cuisine") | ✅ Shown (by trust set) |
| **Your Score** (personalised label) | — | — | — | ✅ Shown instead of "Search Score" |

**Lock states:**
- `Search Score` locked for non-logged-in with no cuisine → show `FiLock` icon + `"Sign in to see your score"`
- `Search Score` locked for logged-in with no cuisine → show `FiLock` icon + `"Browse by cuisine to unlock"`
- `Search Score` visible for non-logged-in with cuisine → shown as generic "Search Score" using the browsed cuisine as the palate
- `Search Score` visible for logged-in with cuisine → shown as "Your Score" using the trust set

---

### 11.6 Label and disclosure changes in the detail screen

The score panel UI needs two changes:

**Score label — logged-in with trust set active:**

```tsx
// Old label (same regardless of auth/context):
<Text>Search Score</Text>

// New label — conditional:
<Text>
  {isAuthenticated && trustSet.length > 0 ? 'Your Score' : 'Search Score'}
</Text>

// New subtitle — conditional:
<Text>
  {isAuthenticated && trustSet.length > 0
    ? `Rated by ${trustSet.map(capitalise).join(' & ')} reviewers`
    : isAuthenticated
      ? 'Browse by cuisine to personalise'
      : 'How much we think you\'d like this'
  }
</Text>
```

**Score value — what is displayed:**
```tsx
// Search Score / Your Score value:
const searchScore = stats[restaurant.uuid]?.avg ?? null
const searchCount = stats[restaurant.uuid]?.count ?? 0

// Display:
// If null → locked state (show FiLock)
// If 0 reviews → "—" (not enough data)
// If ≥ 1 review → score.toFixed(1)

// Count badge:
// "(3 reviewers)" — phrased as "reviewers" not "reviews" for personalised score
// "(3 reviews)" — for non-personalised Search Score
```

---

### 11.7 What "Shared Score" means and how it differs

The web codebase has a field called `authentic_rating_weighted` in `restaurant_rating_summary`. This is sometimes surfaced under different names depending on the context. The distinction between the four scores is:

| Score | Trust group | Size of group |
|-------|------------|---------------|
| Overall | All reviewers | Largest (100%) |
| Authentic | Reviewers whose palate matches the restaurant's own cuisine(s) | Medium |
| Search Score (new) | Reviewers whose palate is in the same parent region as you | Smaller |
| Shared Score (proposed) | Reviewers whose palate is **exactly** your palate slugs | Smallest / most personal |

"Shared Score" would be `get-preference-stats?palates=<exact_user_palate>` — e.g., just `korean` if the user's palate is Korean. This gives the tightest possible match. It is the most personalised but has the fewest reviews available, so it should only be shown when `count >= 3` to avoid single-reviewer bias.

```ts
// Shared Score: only the user's exact palate
const sharedTrustSet = userPalate  // exactly ['korean'] — no siblings

// Search Score / Your Score: sibling cuisines from the parent region
const yourTrustSet = computeTrustSet(selectedCuisine, userPalate)
// e.g. ['korean', 'chinese'] — broader, more data
```

For v1 of this feature, implement **Your Score** (trust set from siblings). Shared Score can be added as a fourth panel card when the data density is sufficient.

---

### 11.8 Data fetch changes on the restaurant detail screen

```ts
// hooks/useRestaurantScores.ts (mobile)

export function useRestaurantScores(restaurantUuid: string, selectedCuisine: string | null) {
  const { isAuthenticated } = useAuth()
  const { palate: userPalate } = useUserPalate()

  // Trust set for Search/Your Score
  const trustSet = useMemo(() => {
    if (!selectedCuisine || isNoCuisineFilter(selectedCuisine)) {
      // No cuisine selected — for guests show nothing, for logged-in show their own palate
      return isAuthenticated && userPalate?.length ? userPalate : []
    }
    if (isAuthenticated && userPalate?.length) {
      // Logged-in + cuisine selected → sibling trust set
      return computeTrustSet(selectedCuisine, userPalate)
    }
    // Guest + cuisine selected → use browsed cuisine as the palate (legacy behaviour)
    return expandCuisineParamToSlugs(selectedCuisine)
  }, [selectedCuisine, isAuthenticated, userPalate])

  const isPersonalised = isAuthenticated && trustSet.length > 0 &&
    trustSet[0] !== selectedCuisine  // trust set differs from browsed cuisine

  // Fetch both scores in parallel
  const [ratingResult, statsResult] = await Promise.allSettled([
    getRatingSummary(restaurantUuid),     // overall + authentic
    trustSet.length > 0
      ? getPreferenceStats({ palates: trustSet })  // search / your score
      : Promise.resolve(null),
  ])

  return {
    overall:         ratingResult?.overall_rating_avg,
    overallCount:    ratingResult?.overall_review_count,
    authentic:       ratingResult?.authentic_rating_weighted,
    authenticCount:  ratingResult?.authentic_review_count,
    searchScore:     statsResult?.[restaurantUuid]?.avg ?? null,
    searchCount:     statsResult?.[restaurantUuid]?.count ?? 0,
    isPersonalised,
    trustSet,
    scoreLabel:      isPersonalised ? 'Your Score' : 'Search Score',
    scoreSubtitle:   isPersonalised
      ? `Rated by ${trustSet.map(capitalise).join(' & ')} reviewers`
      : isAuthenticated
        ? 'Browse by cuisine to personalise'
        : 'How much we think you\'d like this',
  }
}
```

---

## 12. Implementation Order

| Step | File(s) | Type | Risk |
|------|---------|------|------|
| 1 | `lib/cuisineTaxonomy.ts` | New file | Zero — pure function |
| 2 | `hooks/useUserPalate.ts` | New file | Low — read-only profile fetch |
| 3 | `lib/palateSearch.ts` | Rename + deprecate | Low — add aliases |
| 4 | `hooks/usePersonalisedRestaurants.ts` | New hook | Medium — replaces data fetching |
| 5 | `app/(tabs)/restaurants/index.tsx` | Update | Medium — switch to new hook |
| 6 | `components/search/SearchOverlay.tsx` | Label + param rename | Low |
| 7 | `components/search/PalatePickerScrollPanel.tsx` | Label rename | Zero |
| 8 | `app/(tabs)/restaurants/index.tsx` | Add personalisation label | Low |
| 9 | `hooks/useRestaurantScores.ts` | New hook | Low — read-only, replaces inline score fetching |
| 10 | Restaurant detail score panel | Update labels, trust set logic, lock states | Medium |
| 11 | QA: non-logged-in cuisine filter + score panel | Test | — |
| 12 | QA: logged-in personalised ranking + "Your Score" label | Test with known palate profile | — |