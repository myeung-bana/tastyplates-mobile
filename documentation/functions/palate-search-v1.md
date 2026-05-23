# palate-search-v1 — Palate & keyword restaurant search (mobile)

> **Purpose:** Recover web-equivalent restaurant discovery search on React Native: cuisine/palate picker, keyword listing search, filtered results on the Restaurants tab, and palate-aware **Search score** on list cards and detail pages.

---

## 1. Web source map

| Web file | Role |
|----------|------|
| `tastyplates-v2-1/src/components/Hero.tsx` | Home hero: cuisine vs keyword modes, palate modal, navigates to `/restaurants` with query params |
| `tastyplates-v2-1/src/components/navigation/NavbarSearchBar.tsx` | Syncs navbar with `?palate=` |
| `tastyplates-v2-1/src/components/Restaurant/RatingSection.tsx` | Overall / Search / Authentic / Shared metrics; Search visible when signed in or `?palate=` active |
| `tastyplates-v2-1/src/components/Restaurant/RestaurantCard.tsx` | Browse card; reads `palate` from URL for contextual ratings |
| `tastyplates-v2-1/src/app/api/v1/restaurants-v2/get-restaurants/route.ts` | List API: `search`, `palate_slugs` |
| `tastyplates-v2-1/src/app/api/v1/restaurants-v2/get-preference-stats/route.ts` | Per-cuisine preference averages (`restaurant_cuisine_rating_summary`) |

---

## 2. Mobile component map

| Component | Path | Role |
|-----------|------|------|
| `PalateSearchBar` | `components/search/PalateSearchBar.tsx` | Shared search UI (cuisine / keyword toggle) |
| `PalateFilterChips` | `components/search/PalateFilterChips.tsx` | Active `palate` + `search`/`listing` chips on Restaurants tab |
| `PalatePickerPanel` | `components/search/PalatePickerPanel.tsx` | Region + cuisine pills inside bottom sheet |
| `SearchCuisinesSheetProvider` | `contexts/SearchCuisinesSheetContext.tsx` | Global palate picker sheet; floating **Search** + **Reset** footer |
| `HomeHero` | `components/home/HomeHero.tsx` | Home entry; uses `PalateSearchBar` |
| Restaurants tab | `app/(tabs)/restaurants/index.tsx` | List + filters + `get-restaurants` |
| `RestaurantBrowseCard` | `components/restaurant/RestaurantBrowseCard.tsx` | List/carousel tile; optional Search score line |
| `RestaurantDetailSummary` | `components/restaurant/RestaurantDetailSummary.tsx` | Card-style header block on detail |
| `RestaurantRatingMetricsRow` | `components/restaurant/RestaurantRatingMetricsRow.tsx` | Four-metric horizontal row (web `RatingSection`) |
| `preferenceStatsService` | `services/preferenceStatsService.ts` | `get-preference-stats` client |
| `usePalatePreferenceStats` | `hooks/usePalatePreferenceStats.ts` | Batch map for list + single lookup |

---

## 3. URL & API contract

### 3.1 Route params (Expo Router → Restaurants tab)

| Param | Mode | Maps to API |
|-------|------|-------------|
| `palate` | Cuisine | `palate_slugs` (single slug or region key from `palateOptions`) |
| `search` | Cuisine + text | `search` (title / slug / street) |
| `listing` | Keyword | merged into `search` on the list screen |

### 3.2 Detail route

| Param | Example | Use |
|-------|---------|-----|
| `slug` | `some-restaurant` | `get-restaurant-by-id` |
| `palate` | `japanese` | Search score context + `get-preference-stats?palate_slug=japanese` |

List → detail navigation **must** forward `palate` when the user arrived from a filtered browse.

### 3.3 Nhost functions

| Path | Query | Response |
|------|-------|----------|
| `restaurants-v2/get-restaurants` | `search`, `palate_slugs`, `location_key`, `limit`, `cursor` | `{ restaurants, meta }` |
| `restaurants-v2/get-preference-stats` | `palate_slug` or `palate_id` | Array of `{ restaurant_id, preference_rating_avg, preference_review_count }` |
| `restaurants-v2/get-rating-summary` | `uuid` | Overall + authentic aggregates |

### 3.4 Palate keys

- **Cuisine slugs:** `japanese`, `korean`, … (from `constants/palateOptions.ts` children)
- **Region keys:** `East Asian`, `South Asian`, … (region `key` on parent nodes)
- Labels for UI: `lib/palateLabels.ts` → `labelForPalateKey()`

---

## 4. Entry points

| Entry | Behavior |
|-------|----------|
| **Home hero** | `PalateSearchBar` → sheet (cuisine) or keyword field → `router.push` Restaurants with params |
| **Top nav search icon** | `openSearchCuisines()` → sheet → tap floating **Search** → Restaurants with `palate` |
| **Quick finds** | `router.push({ palate: slug })` (unchanged) |
| **Restaurants tab** | Inline `PalateSearchBar` + `PalateFilterChips`; edits params in place |

---

## 5. Search score rules (detail + list)

Mirror web `RatingSection.tsx`:

| Metric | Source | Visible when |
|--------|--------|--------------|
| Overall | `get-rating-summary` | Always |
| Search | `get-preference-stats` for active `palate_slug`, row matching `restaurant.id` | Signed in **or** `palate` query present |
| Authentic | `get-rating-summary` | Always |
| Shared | (future) | Signed in only; v1 shows lock when logged out |

**Context banner** on detail when `palate` set: “Showing scores for {label}”.

---

## 6. Verification checklist

- [ ] Home: cuisine mode → pick Japanese → Restaurants list filtered; chip shows “Japanese”
- [ ] Home: keyword mode → “ramen” → list uses `listing`/`search`
- [ ] Top nav search icon opens sheet; Done navigates with `palate`
- [ ] Quick find → Restaurants with `palate`; open detail → `palate` preserved; Search score visible
- [ ] Signed out + `?palate=japanese` on detail → Search score visible; Shared locked
- [ ] Signed in, no `palate` on detail → Search score locked; Shared locked (v1)
- [ ] Clear chips on Restaurants tab removes params and refetches

---

## 7. Out of scope (v1)

- Full web `Filter2` (price, sort, badges)
- Multi-select palates in URL (web supports comma-separated; mobile v1 single `palate`)
