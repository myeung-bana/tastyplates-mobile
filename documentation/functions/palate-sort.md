# palate-sort.md — Palate Sort: User Journey & Restaurant Ranking

> **Purpose:** Recover and implement **Palate Sort** on mobile — the product behavior from `tastyplates-v2-1` where a user selects a **palate** (cuisine identity or regional group) and sees restaurants **ranked by ratings from reviewers who share that palate**, not merely filtered by restaurant taxonomy.
>
> **Related docs:** [`palate-search-v1.md`](./palate-search-v1.md) (picker + URL params), [`search-enhancement-pt2.md`](./search-enhancement-pt2.md) (full-screen search overlay), [`PRD.md`](../PRD.md) (product vision, Journey 2).
>
> **Web source of truth:** `tastyplates-v2-1/src/components/Restaurant/Restaurant.tsx`, `Filter/Filter2.tsx`, `get-preference-stats/route.ts`, `utils/reviewUtils.ts`.

---

## 1. Product definition

### What Palate Sort is

**Palate Sort** answers: *“Among restaurants in my city, which ones do people **like me** (or people who identify with **this cuisine palate**) rate highest?”*

It is **not** the same as:

| Mechanism | What it does | Example |
|-----------|--------------|---------|
| **Palate filter** (`palate_slugs` on `get-restaurants`) | Restricts listing to restaurants whose **taxonomy** JSONB contains a cuisine slug | “Only show Japanese-tagged restaurants” |
| **Overall rating sort** (`order_by=rating_desc`) | Orders by aggregate stars from **all** reviewers | “Highest rated overall” |
| **Smart sort** (`order_by=smart`) | Bayesian-weighted **authentic** score from `restaurant_rating_summary` | Platform editorial quality signal |
| **Palate Sort** (`PALATE_CONTEXT`) | Keeps the city listing broad, then **re-ranks** by average stars from reviewers whose **profile palates** overlap the selected palate | “Korean palate match” — Korean-identifying reviewers’ scores first |

The PRD describes this as **palate-based ranking**:

> Restaurants reviewed by users who share your palate preferences surface first, with ratings calculated specifically from those matching reviewers. If no palate match exists, restaurants fall back to overall quality ranking.

### Naming in code (web)

| UI label | Sort key | When active |
|----------|----------|-------------|
| **Palate match** | `PALATE_CONTEXT` | `?palate=` present on `/restaurants` (auto-selected) |
| **My Preference** | `MY_PREFERENCE` | Signed-in user; uses **profile** `palates` (hidden in sort UI today) |
| **Highest Rated** | `DESC` | Default when no `?palate=` |
| **Smart Sort** | `SMART` | Authentic weighted (hidden in sort UI today) |

There is **no** symbol named `palate_sort` in code — recover **Palate Sort** as `PALATE_CONTEXT` + `get-preference-stats` + client re-order.

---

## 2. Core user journeys

### Journey A — Guest discovers by palate (homepage → ranked list)

```
Home
  └─ User taps search bar OR Quick Find (e.g. Korean)
       └─ SearchOverlay / PalatePickerScrollPanel
            └─ User selects palate pill (cuisine or “All {Region}”)
                 └─ Navigate to Restaurants tab with ?palate=korean
                      └─ List loads for selected city (geo radius)
                      └─ Fetch preference stats for palate slug set
                      └─ Client re-sorts: Palate match avg ↓, count ↓, overall rating ↓
                      └─ Subtitle: “Sorted by Korean match”
                      └─ User taps card → /restaurants/[slug]?palate=korean
                           └─ Detail shows Search score from matching reviewers
```

**Key experience goal:** Browse and read before sign-up; Search score visible when `?palate=` is set even when logged out (web `RatingSection`).

### Journey B — Signed-in user with profile palates (onboarding → personalized browse)

```
Onboarding step 2 / Profile edit
  └─ User selects up to 2 ethnic palates → saved to user_profiles.palates
       └─ (Future) My Preference sort uses same stats pipeline with profile slugs
       └─ (Future) Suggested users via palate similarity hook
```

On web, `MY_PREFERENCE` is implemented but **hidden** in `Filter2` (`HIDDEN_SORT_KEYS`). Palate Sort recovery on mobile should prioritize **`PALATE_CONTEXT`** first.

### Journey C — Keyword + palate combined

```
SearchOverlay
  └─ User types “ramen” AND/OR selects Japanese palate
       └─ Restaurants tab: ?listing=ramen&palate=japanese
            └─ Text search via hybridSearch / get-restaurants search param
            └─ Palate Sort still applies when palate param present
            └─ Google merge suppressed when palate active (mobile today)
```

### Journey D — Restaurant detail (context preserved)

```
Restaurants list (?palate=korean)
  └─ Tap restaurant card
       └─ Detail: ?slug=…&palate=korean
            └─ RestaurantRatingMetricsRow shows:
                 • Overall — all reviewers
                 • Search — reviewers matching active palate
                 • Authentic — cuisine-authenticity signal
            └─ Banner: “Showing scores for Korean”
```

**Rule:** List → detail navigation **must** forward `palate` whenever the user arrived from a palate-sorted browse.

---

## 3. Palate selection UX (entry points)

### Web entry points (reference)

| Surface | File | Behavior |
|---------|------|----------|
| Hero “Discover by Palate” | `Hero.tsx` | Modal picker → `/restaurants?palate=<key>` |
| Navbar search | `NavbarSearchBar.tsx` | Syncs picker with URL `?palate=` |
| Quick Finds | `QuickFinds.tsx` | Direct links `?palate=japanese`, etc. |
| Onboarding | `OnboardingStepOne.tsx` | Profile palates (not URL sort) |

### Mobile entry points (today)

| Surface | File | Navigates with |
|---------|------|----------------|
| Home search overlay | `SearchOverlay.tsx` + `PalatePickerScrollPanel.tsx` | `palate` + optional `listing` |
| Quick Finds | `HomeQuickFinds.tsx` | `palate: slug` |
| Palate filter chips | `PalateFilterChips.tsx` | Clear `palate` / search params |
| Restaurants tab | `app/(tabs)/restaurants/index.tsx` | Reads `palate`, `search`, `listing` |

### Palate taxonomy

Defined in `constants/palateOptions.ts` (mobile) / `formOptions` + `REGIONAL_PALATE_GROUPS` (web).

| Type | Example key | Used for |
|------|-------------|----------|
| **Cuisine slug** | `japanese`, `korean`, `indian` | Single-cuisine Palate Sort + filter |
| **Region key** | `East Asian`, `South Asian` | Expands to child cuisine slugs for stats + sort |

**Region expansion (web — required for mobile recovery):**

```
"East Asian" → ["chinese", "japanese", "korean", "taiwanese"]
```

Web: `expandRegionsToPalates()` in `Restaurant.tsx` + `REGIONAL_PALATE_GROUPS` in `constants/utils.ts`.  
Mobile: **not implemented** — raw region keys passed to `palate_slugs` today (bug).

Labels: `lib/palateLabels.ts` → `labelForPalateKey()`.

---

## 4. Two URL concepts (critical distinction)

Web documents two separate query concepts on `/restaurants`:

| Param | Role | Affects listing filter? | Affects sort / Search score? |
|-------|------|-------------------------|------------------------------|
| `?palate=` / `?ethnic=` (legacy) | **Search Score / Palate Sort context** | **No** — does not narrow the list by itself | **Yes** — enables `PALATE_CONTEXT` sort + detail Search score |
| `?cuisine=` / `?palates=` (legacy) | **Listing cuisine filter** | **Yes** — restricts restaurant taxonomy | No (unless combined with `?palate=`) |

**Mobile v1 simplified this:** `?palate=` maps to `palate_slugs` on `get-restaurants`, which **filters** restaurant `palates` JSONB. That is **narrower** than web Palate Sort and produces a different list.

**Recovery target:** Align mobile with web:

1. **Sort context** — `?palate=` drives preference stats + client re-rank (and detail Search score).
2. **Optional filter** — separate param or explicit filter chip if we want cuisine-only listings.

---

## 5. Data model — where palates live

| Store | Field | Format | Used for |
|-------|-------|--------|----------|
| `user_profiles.palates` | Reviewer identity | `["korean","japanese"]` or `[{slug,name}]` | **Primary** match in `get-preference-stats` (web); My Preference sort |
| `restaurant_reviews.palates` | Snapshot at review time | JSONB array | Fallback if author profile missing |
| `restaurants.palates` / `cuisines` | Restaurant taxonomy | JSONB | Authentic score; **filter** via `palate_slugs` |
| `restaurant_rating_summary` | Precomputed aggregates | numeric columns | Overall + authentic (SMART sort) |
| `restaurant_cuisine_rating_summary` | Per-cuisine preference table | avg + count per restaurant × cuisine | **Nhost mobile API today** (different from web live aggregation) |

### Reviewer match rule (listing sort — web `get-preference-stats`)

For each review (up to 5,000 top-level, non-deleted):

1. Resolve reviewer palates: `AuthorProfile.palates` first, else `review.palates`.
2. Normalize to lowercase slug strings.
3. **Match:** `reviewerPalates.some(p => requestedPalateSet.has(p))` — **exact slug membership**.
4. Aggregate per `restaurant_uuid`: `avg = sum(ratings) / count`.

### Search score (detail page — web `reviewUtils.ts`)

`calculateSearchScoreForRestaurant()` filters reviews with `hasMatchingPalates()` — **fuzzy** substring/includes matching (slightly looser than listing API).

**Known inconsistency:** Listing sort uses exact slug match; detail Search score uses fuzzy match. Mobile recovery should document which to standardize on (recommend: **exact slug** everywhere, matching `get-preference-stats`).

---

## 6. Sorting algorithm (Palate Sort / `PALATE_CONTEXT`)

### Pipeline overview

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Fetch base restaurant page                                   │
│    GET get-restaurants (city geo, limit, cursor)                │
│    order_by = smart (base order before client re-rank)          │
├─────────────────────────────────────────────────────────────────┤
│ 2. Expand ?palate= to slug set                                   │
│    korean → [korean]                                            │
│    East Asian → [chinese, japanese, korean, taiwanese]          │
├─────────────────────────────────────────────────────────────────┤
│ 3. Fetch preference stats                                       │
│    GET get-preference-stats?palates=korean,japanese,...         │
│    → { [restaurant_uuid]: { avg, count } }                      │
├─────────────────────────────────────────────────────────────────┤
│ 4. Enrich each row: searchPalateStats = stats[id] ?? {0, 0}    │
├─────────────────────────────────────────────────────────────────┤
│ 5. Client sort (PALATE_CONTEXT comparator)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Comparator (priority order)

From `Restaurant.tsx` → `sortRestaurants()`:

| Priority | Field | Direction | Notes |
|----------|-------|-----------|-------|
| 1 | `searchPalateStats.avg` | Descending | Missing → `-1` (sinks to bottom) |
| 2 | `searchPalateStats.count` | Descending | Tie-break: more matching reviews rank higher |
| 3 | `restaurant.rating` | Descending | Only if diff > 0.01 |
| 4 | `restaurant.ratingsCount` | Descending | Final tie-break |

Restaurants with **zero matching reviews** get `{ avg: 0, count: 0 }` and appear **after** those with matches. PRD mentions fallback to overall quality — in code, unmatched rows sink via comparator step 3–4 only when tied at 0/0 among themselves.

### Auto-sort when palate is active

When `?palate=` is present, web auto-sets `sortOption = PALATE_CONTEXT` and `Filter2` shows **“Palate Match - {name}”**.

### Other sort modes (context)

| Sort | Server | Client |
|------|--------|--------|
| `DESC` / `ASC` / `NEWEST` | `order_by` on API | No-op (pre-sorted) |
| `SMART` | `authentic_rating_weighted` | No-op |
| `PALATE_CONTEXT` | `order_by=smart` as base | **Full re-rank** |
| `MY_PREFERENCE` | `order_by=smart` as base | Same comparator, stats from **user profile** palates |

---

## 7. API contracts

### 7.1 Web — `GET /api/v1/restaurants-v2/get-preference-stats`

**Query:** `palates=korean,japanese` (comma-separated slugs, lowercase)

**Response:**

```json
{
  "success": true,
  "data": {
    "<restaurant_uuid>": { "avg": 4.25, "count": 8 }
  }
}
```

**Implementation:** Live aggregation from `restaurant_reviews` + `AuthorProfile.palates`. Redis-cached (~600s). Cap: 5,000 reviews.

**File:** `tastyplates-v2-1/src/app/api/v1/restaurants-v2/get-preference-stats/route.ts`

### 7.2 Mobile / Nhost — `restaurants-v2/get-preference-stats` (today)

**Query:** `palate_slug=japanese` OR `palate_id=<int>`

**Response:** Array of rows from `restaurant_cuisine_rating_summary`:

```json
{
  "ok": true,
  "data": [
    {
      "restaurant_id": 123,
      "cuisine_id": 4,
      "preference_rating_avg": 4.2,
      "preference_review_count": 15
    }
  ]
}
```

**File:** `tastyplates-nhost/functions/restaurants-v2/get-preference-stats.ts`

**Gap:** This reads a **precomputed summary table by cuisine**, not live reviewer-profile matching. Mobile `preferenceStatsService.ts` and `usePalatePreferenceStats` use this endpoint. **Palate Sort recovery requires either:**

- **Option A (parity):** Add Nhost function matching web logic (`palates=` comma param, review aggregation), or proxy to web BFF.
- **Option B (interim):** Use summary table but document semantic difference (cuisine-level, not reviewer-identity).

### 7.3 Restaurant listing — `get-restaurants`

| Param | Web | Mobile today |
|-------|-----|--------------|
| `palate_slugs` | Optional cuisine filter | Sent when `?palate=` — **filters** listing |
| `order_by` | `smart`, `rating_desc`, etc. | Supported in service; **not passed from UI** |
| `search` | Title/street | Yes |
| `latitude`, `longitude`, `radius_km` | City scope | Yes (50 km) |

**File (mobile client):** `services/restaurantsV2Service.ts`  
**File (Nhost):** `tastyplates-nhost/functions/restaurants-v2/get-restaurants.ts`

---

## 8. UI surfaces & copy

### Restaurants list (browse)

| Element | Web | Mobile target |
|---------|-----|---------------|
| Sort pill | `Filter2` — “Palate Match - Korean” | Subtitle under header: “Sorted by Korean match” (`index.tsx` — **copy exists, sort missing**) |
| Card rating | Overall + optional Search score line | Add Search score when `?palate=` (design_system §5) |
| Active filter chips | Cuisine filters separate | `PalateFilterChips` — palate + search |
| Empty state | No matches in city | Existing empty copy |

### Restaurant detail

| Metric | Source | Visible when |
|--------|--------|--------------|
| **Overall** | `get-rating-summary` | Always |
| **Search** | Preference stats for `palate_slug` | Signed in **or** `?palate=` present |
| **Authentic** | `get-rating-summary` | Always |
| **Shared** | (future) | Signed in |

**Mobile files:** `RestaurantRatingMetricsRow.tsx`, `app/(tabs)/restaurants/[slug].tsx`

### Search score subtitles (web reference)

| State | Copy |
|-------|------|
| Guest + `?palate=` | “Avg. from reviewers with this palate” |
| Signed in | “How much we think you'd like” |
| No palate, guest | “Sign in to see your score” (locked) |

---

## 9. Mobile implementation map

### Already built (shell)

| Piece | Path | Status |
|-------|------|--------|
| Palate picker UI | `PalatePickerScrollPanel.tsx` | Done |
| Route param `?palate=` | `restaurants/index.tsx` | Done |
| Filter chips | `PalateFilterChips.tsx` | Done |
| Detail Search score | `[slug].tsx` + `preferenceStatsService.ts` | Done (summary table API) |
| Batch stats hook | `usePalatePreferenceStats.ts` | **Exists, unused on list** |
| Hybrid search + palate | `hybridSearch.ts` | Done (TP-only when palate set) |
| Misleading subtitle | `index.tsx` ~L367 | Says “Sorted by … match” without sorting |

### Missing for true Palate Sort

| # | Task | Notes |
|---|------|-------|
| 1 | **Region → slug expansion** | Port `expandRegionsToPalates` / mirror `palateOptions` children |
| 2 | **Fetch preference stats on list** | Wire `usePalatePreferenceStats` or batch call when `palate` active |
| 3 | **Client re-sort** | Port `sortRestaurants` comparator; attach stats to `RestaurantSearchResult` rows |
| 4 | **Align API semantics** | Prefer web-style `palates=` aggregation on Nhost (or document interim summary table) |
| 5 | **Separate filter vs sort** | Stop using `palate_slugs` as sole behavior for `?palate=` if web parity required |
| 6 | **Search score on list cards** | `RestaurantBrowseCard` line when stats loaded |
| 7 | **UUID vs numeric id** | Web stats keyed by `restaurant_uuid`; mobile rows use `uuid` / `id` — map consistently |
| 8 | **MY_PREFERENCE** (phase 2) | Use `user.palates` from session when sort UI added |

### Suggested mobile data flow (target)

```typescript
// Pseudocode — restaurants/index.tsx

const palateSlugs = expandPalateParamToSlugs(palate) // ["korean"] or region children

const { data: restaurants } = await fetchRestaurants({ geo, search, /* no palate_slugs if sort-only */ })

const statsMap = await getPreferenceStatsForPalates(palateSlugs) // web-parity API

const enriched = restaurants.map(r => ({
  ...r,
  searchPalateStats: statsMap.get(r.uuid) ?? { avg: 0, count: 0 },
}))

const sorted = sortByPalateMatch(enriched) // comparator from §6
```

---

## 10. Edge cases & rules

| Case | Behavior |
|------|----------|
| `?palate=all` or empty | No Palate Sort; `isNoPalateFilter()` returns true |
| Region selected (“All East Asian”) | Expand to all child slugs for stats **and** show region label in UI |
| Restaurant with no matching reviews | `avg: 0, count: 0` — ranks below matched restaurants |
| Pagination / load more | Re-sort **current page** only on web; full parity may require stats for all visible UUIDs before sort |
| Google results in hybrid search | Suppressed when palate active (`restaurantSearchMerge.ts`) |
| TP restaurant without coords | Still sortable by palate stats; map pin may be omitted |
| Cache staleness | Web caches preference stats ~10 min; show pull-to-refresh on mobile |

---

## 11. Verification checklist (mobile recovery)

### Palate Sort (list)

- [ ] Select **Korean** from Quick Finds → list order changes vs no palate (not just filtered subset)
- [ ] Subtitle shows “Sorted by Korean match” **and** order reflects matching-reviewer averages
- [ ] Select **East Asian** region → stats use all child cuisines; label shows region name
- [ ] Restaurant with many Korean-reviewer ratings ranks above higher overall-rated restaurant with zero Korean reviewers
- [ ] Clear palate chip → returns to default order (created_at or rating per product choice)

### Search score continuity

- [ ] List → detail preserves `?palate=`
- [ ] Detail Search score matches list Search score line (same slug, same restaurant)
- [ ] Guest + `?palate=` → Search score visible without sign-in

### Regression

- [ ] Keyword search `?listing=ramen` still works with and without `?palate=`
- [ ] Map + bottom sheet unchanged when no palate param
- [ ] Location change refetches and re-sorts for new city

---

## 12. File reference

### Web (`tastyplates-v2-1`)

| Role | Path |
|------|------|
| Listing orchestration + sort | `src/components/Restaurant/Restaurant.tsx` |
| Sort / filter UI | `src/components/Filter/Filter2.tsx` |
| Preference stats API | `src/app/api/v1/restaurants-v2/get-preference-stats/route.ts` |
| Detail rating math | `src/utils/reviewUtils.ts` |
| Palate matching utils | `src/utils/palateUtils.ts` |
| URL palate parsing | `src/lib/palateSlug.ts` |
| Region groups | `src/constants/utils.ts` (`REGIONAL_PALATE_GROUPS`) |
| Detail metrics UI | `src/components/Restaurant/RatingSection.tsx` |
| Browse card | `src/components/Restaurant/RestaurantCard.tsx` |
| User similarity (unused UI) | `src/hooks/useSimilarPalates.ts` |

### Mobile (`tastyplates-mobile`)

| Role | Path |
|------|------|
| Restaurants browse | `app/(tabs)/restaurants/index.tsx` |
| Restaurant detail | `app/(tabs)/restaurants/[slug].tsx` |
| Palate picker | `components/search/PalatePickerScrollPanel.tsx` |
| Search overlay | `components/search/SearchOverlay.tsx` |
| Quick finds | `components/home/HomeQuickFinds.tsx` |
| Preference stats client | `services/preferenceStatsService.ts` |
| Batch hook (unwired) | `hooks/usePalatePreferenceStats.ts` |
| Palate labels | `lib/palateLabels.ts` |
| Palate filter helper | `lib/palateSearch.ts` |
| Taxonomy | `constants/palateOptions.ts` |
| v1 search doc | `documentation/functions/palate-search-v1.md` |

### Backend (Nhost)

| Role | Path |
|------|------|
| List restaurants | `functions/restaurants-v2/get-restaurants.ts` |
| Preference stats (mobile) | `functions/restaurants-v2/get-preference-stats.ts` |
| Rating summary | `functions/restaurants-v2/get-rating-summary.ts` |

---

## 13. Phased recovery plan

### Phase 1 — Palate Sort MVP (list re-rank)

1. Add `expandPalateParamToSlugs()` in `lib/palateSearch.ts` (or `lib/palateSlug.ts`).
2. Wire `usePalatePreferenceStats` on `restaurants/index.tsx` when `palate` set.
3. Implement `sortRestaurantsByPalateMatch()` with web comparator.
4. Map stats to rows by `uuid` / `id`.
5. Manual QA with Journey A checklist.

### Phase 2 — API parity

1. Extend Nhost `get-preference-stats` to accept `palates=` and aggregate from reviews (web logic), **or** sync `restaurant_cuisine_rating_summary` rebuild to match.
2. Deprecate semantic mismatch between list and detail.

### Phase 3 — UI polish

1. Search score on `RestaurantBrowseCard` when palate active.
2. Optional sort sheet (port `Filter2` subset: Palate match / Highest rated).
3. `MY_PREFERENCE` for signed-in users.

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| **Palate** | User-selected cuisine identity (e.g. Korean) or regional group (e.g. East Asian) |
| **Palate Sort** | Product name for `PALATE_CONTEXT` ranking |
| **Search score** | Average rating from reviewers matching the active palate context |
| **Palate match** | UI label for Palate Sort when `?palate=` is active |
| **Preference stats** | `{ avg, count }` per restaurant for a palate slug set |
| **Authentic score** | How well reviewers with matching palates rate restaurant’s declared cuisines |
