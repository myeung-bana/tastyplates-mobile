# my_restaurant_list.md (v1) — My Restaurant Lists: Spotify-Style Curated Lists

> **Scope:** This document defines the complete backend (Nhost Functions), database migration, Hasura metadata, and mobile frontend for the user-curated restaurant list feature. It is grounded in the existing `recommended_restaurant_lists` / `recommended_restaurant_list_items` schema visible in Hasura, the confirmed `hasuraAdmin` / `requireAuth` / `ok` / `fail` patterns from `tastyplates-nhost`, and the established `RestaurantV2` shape from `tastyplates-v2`.

---

## 1. Data Model — What Already Exists vs What Needs Adding

### What Hasura already has (from the provided query)

```sql
-- Exists — but was originally for editorial/admin use only
recommended_restaurant_lists (
  id SERIAL PK,
  uuid UUID,           -- ← may not exist yet — see Migration §2
  slug VARCHAR(100) UNIQUE,
  title VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  owner_id ???,        -- ← visible in Hasura query but NOT in migration SQL
  share_token ???,     -- ← visible in Hasura query but NOT in migration SQL
  created_at, updated_at
)

recommended_restaurant_list_items (
  id SERIAL PK,
  list_id INTEGER FK → recommended_restaurant_lists(id),
  city_location_id INTEGER FK → restaurant_locations(id),
  restaurant_uuid UUID,    -- ← visible in Hasura query, NOT in migration SQL
  google_place_id TEXT,    -- ← visible in Hasura query, NOT in migration SQL
  sort_order INTEGER DEFAULT 0,
  created_at
)
```

> **Critical observation:** `owner_id`, `share_token`, `uuid` on the list table and `restaurant_uuid`, `google_place_id` on the items table appear in the live Hasura schema but are absent from `recommended_restaurants_schema.sql`. This means they were added via the Console without a corresponding migration. The migration in §2 adds them idempotently (`ADD COLUMN IF NOT EXISTS`).

### The dual-restaurant problem

Every list item belongs to one of two states:

| State | `restaurant_uuid` | `google_place_id` | Display source |
|-------|------------------|------------------|---------------|
| **Linked** — restaurant exists in TastyPlates DB | `non-null` UUID | may also be present | Fetch from `restaurants` table via `restaurant_uuid` |
| **Google-only** — not in TastyPlates DB | `null` | `non-null` | Fetch from `google_place_cache` or live Google Places API |

A single item can have both columns set (added via Google Places, later matched to a listing). The resolver always prefers `restaurant_uuid` when present.

---

## 2. Database Migration

```sql
-- my_restaurant_lists_migration.sql
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards)
-- Run via: Nhost Dashboard → SQL Editor

-- ── List table: add owner, uuid, share_token ──────────────────────

ALTER TABLE recommended_restaurant_lists
  ADD COLUMN IF NOT EXISTS uuid         UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS owner_id     UUID,   -- FK to auth.users.id (Nhost)
  ADD COLUMN IF NOT EXISTS share_token  TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS visibility   TEXT NOT NULL DEFAULT 'private'
                                        CHECK (visibility IN ('private', 'public'));

-- Indexes for owner and share_token lookups
CREATE INDEX IF NOT EXISTS idx_rrl_owner_id
  ON recommended_restaurant_lists (owner_id);

CREATE INDEX IF NOT EXISTS idx_rrl_share_token
  ON recommended_restaurant_lists (share_token)
  WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rrl_uuid
  ON recommended_restaurant_lists (uuid);

CREATE INDEX IF NOT EXISTS idx_rrl_public_active
  ON recommended_restaurant_lists (visibility, is_active, display_order)
  WHERE visibility = 'public' AND is_active = true;

-- ── List items table: add restaurant_uuid and google_place_id ─────

ALTER TABLE recommended_restaurant_list_items
  ADD COLUMN IF NOT EXISTS restaurant_uuid  UUID,     -- FK to restaurants.uuid
  ADD COLUMN IF NOT EXISTS google_place_id  TEXT;     -- Google Places place_id

-- Remove the old required city_location_id FK constraint if user-created lists
-- are not city-scoped (editorial lists still use it, user lists may not).
-- The column remains but is now nullable for user-created items.
ALTER TABLE recommended_restaurant_list_items
  ALTER COLUMN city_location_id DROP NOT NULL;

-- Enforce: every item must have at least one of restaurant_uuid or google_place_id
ALTER TABLE recommended_restaurant_list_items
  DROP CONSTRAINT IF EXISTS chk_list_item_has_restaurant,
  ADD CONSTRAINT chk_list_item_has_restaurant
    CHECK (restaurant_uuid IS NOT NULL OR google_place_id IS NOT NULL);

-- Unique: a restaurant (by uuid) can only appear once per list
CREATE UNIQUE INDEX IF NOT EXISTS idx_rrl_items_unique_uuid
  ON recommended_restaurant_list_items (list_id, restaurant_uuid)
  WHERE restaurant_uuid IS NOT NULL;

-- Unique: a Google place can only appear once per list
CREATE UNIQUE INDEX IF NOT EXISTS idx_rrl_items_unique_gplace
  ON recommended_restaurant_list_items (list_id, google_place_id)
  WHERE google_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rrl_items_restaurant_uuid
  ON recommended_restaurant_list_items (restaurant_uuid)
  WHERE restaurant_uuid IS NOT NULL;

-- ── Verification ─────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '✅  my_restaurant_lists_migration complete';
  RAISE NOTICE '  recommended_restaurant_lists: uuid, owner_id, share_token, visibility added';
  RAISE NOTICE '  recommended_restaurant_list_items: restaurant_uuid, google_place_id added';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Track new columns in Hasura Console → export metadata → push to Git';
END $$;

-- ── Rollback (uncomment to undo) ─────────────────────────────────

-- ALTER TABLE recommended_restaurant_lists
--   DROP COLUMN IF EXISTS uuid,
--   DROP COLUMN IF EXISTS owner_id,
--   DROP COLUMN IF EXISTS share_token,
--   DROP COLUMN IF EXISTS visibility;
-- ALTER TABLE recommended_restaurant_list_items
--   DROP COLUMN IF EXISTS restaurant_uuid,
--   DROP COLUMN IF EXISTS google_place_id;
```

---

## 3. Hasura Permissions (add to metadata YAML)

**`public_recommended_restaurant_lists.yaml` — user role permissions:**

```yaml
select_permissions:
  - role: user
    permission:
      # Own lists (any visibility) + public lists from others
      filter:
        _or:
          - owner_id: { _eq: X-Hasura-User-Id }
          - visibility: { _eq: public }
      columns:
        - id, uuid, slug, title, description, visibility
        - is_active, display_order, owner_id, share_token
        - created_at, updated_at

insert_permissions:
  - role: user
    permission:
      check: { owner_id: { _eq: X-Hasura-User-Id } }
      set:
        owner_id: X-Hasura-User-Id
        uuid: gen_random_uuid()
        share_token: encode(gen_random_bytes(16), 'hex')
      columns:
        - title, description, visibility, is_active, slug

update_permissions:
  - role: user
    permission:
      filter: { owner_id: { _eq: X-Hasura-User-Id } }
      columns:
        - title, description, visibility, is_active, updated_at

delete_permissions:
  - role: user
    permission:
      filter: { owner_id: { _eq: X-Hasura-User-Id } }

# Anonymous: read public lists only
select_permissions:
  - role: anonymous
    permission:
      filter: { visibility: { _eq: public }, is_active: { _eq: true } }
      columns:
        - id, uuid, slug, title, description, owner_id, created_at
```

**`public_recommended_restaurant_list_items.yaml` — user role permissions:**

```yaml
select_permissions:
  - role: user
    permission:
      # Can see items in lists they own or lists that are public
      filter:
        list:
          _or:
            - owner_id: { _eq: X-Hasura-User-Id }
            - visibility: { _eq: public }
      columns: '*'

insert_permissions:
  - role: user
    permission:
      # Can only add to lists they own — enforced via list ownership check in function
      check: {}
      columns:
        - list_id, restaurant_uuid, google_place_id, city_location_id, sort_order

delete_permissions:
  - role: user
    permission:
      filter:
        list:
          owner_id: { _eq: X-Hasura-User-Id }
```

---

## 4. Nhost Functions

All functions follow the exact pattern from `tastyplates-nhost`: `hasuraAdmin` (or `hasuraQuery`) for DB operations, `requireAuth` + `getUserId` for identity, `ok` / `fail` for the response envelope.

### Function directory structure

```
functions/
  restaurant-lists/
    get-my-lists.ts          ← GET /v1/restaurant-lists/get-my-lists
    create-list.ts           ← POST /v1/restaurant-lists/create-list
    update-list.ts           ← PATCH /v1/restaurant-lists/update-list
    delete-list.ts           ← DELETE /v1/restaurant-lists/delete-list
    get-list-by-slug.ts      ← GET /v1/restaurant-lists/get-list-by-slug?slug=...
    get-list-by-share-token.ts ← GET /v1/restaurant-lists/get-list-by-share-token?token=...
    add-item.ts              ← POST /v1/restaurant-lists/add-item
    remove-item.ts           ← DELETE /v1/restaurant-lists/remove-item
    reorder-items.ts         ← PATCH /v1/restaurant-lists/reorder-items
    get-public-lists.ts      ← GET /v1/restaurant-lists/get-public-lists
```

---

### 4.1 `get-my-lists.ts`

**GET** `/v1/restaurant-lists/get-my-lists`
Auth: Required. Returns all lists owned by the authenticated user including item count and cover image (first item's image).

```typescript
import type { Request, Response } from 'express'
import { hasuraAdmin } from '../_lib/hasura'
import { requireAuth, getUserId } from '../_lib/auth'
import { ok, fail } from '../_lib/respond'

const GET_MY_LISTS = `
  query GetMyLists($ownerId: uuid!) {
    recommended_restaurant_lists(
      where: { owner_id: { _eq: $ownerId } }
      order_by: { updated_at: desc }
    ) {
      id uuid slug title description visibility is_active
      share_token created_at updated_at
      items: recommended_restaurant_list_items_aggregate {
        aggregate { count }
      }
      first_item: recommended_restaurant_list_items(
        order_by: { sort_order: asc }
        limit: 1
      ) {
        restaurant_uuid google_place_id
        restaurant {
          featured_image_url title
        }
      }
    }
  }
`

export default async (req: Request, res: Response): Promise<void> => {
  const payload = await requireAuth(req, res)
  if (!payload) return
  const ownerId = getUserId(payload)

  try {
    const data = await hasuraAdmin<{ recommended_restaurant_lists: unknown[] }>(
      GET_MY_LISTS, { ownerId }
    )
    ok(res, data.recommended_restaurant_lists ?? [])
  } catch (e) {
    fail(res, 'Failed to fetch lists', 500)
  }
}
```

---

### 4.2 `create-list.ts`

**POST** `/v1/restaurant-lists/create-list`
Body: `{ title: string, description?: string, visibility?: 'private' | 'public' }`
Auth: Required.

```typescript
const CREATE_LIST = `
  mutation CreateList($ownerId: uuid!, $slug: String!, $title: String!,
                      $description: String, $visibility: String!) {
    insert_recommended_restaurant_lists_one(object: {
      owner_id: $ownerId
      slug: $slug
      title: $title
      description: $description
      visibility: $visibility
      is_active: true
    }) {
      id uuid slug title description visibility share_token created_at updated_at
    }
  }
`

// slug is auto-generated: slugify(title) + '-' + nanoid(6)
// e.g. "best-ramen-spots-x3f9a2"
// Enforce: title 1–100 chars, description 0–500 chars
```

---

### 4.3 `update-list.ts`

**PATCH** `/v1/restaurant-lists/update-list`
Body: `{ uuid: string, title?: string, description?: string, visibility?: 'private' | 'public' }`
Auth: Required. Only the owner can update.

```typescript
const UPDATE_LIST = `
  mutation UpdateList($uuid: uuid!, $ownerId: uuid!, $set: recommended_restaurant_lists_set_input!) {
    update_recommended_restaurant_lists(
      where: { uuid: { _eq: $uuid }, owner_id: { _eq: $ownerId } }
      _set: $set
    ) {
      affected_rows
      returning { id uuid slug title description visibility updated_at }
    }
  }
`
// Returns fail(res, 'List not found or unauthorized', 404) if affected_rows === 0
```

---

### 4.4 `delete-list.ts`

**DELETE** `/v1/restaurant-lists/delete-list`
Body: `{ uuid: string }`
Auth: Required. Cascades to all items via FK.

```typescript
const DELETE_LIST = `
  mutation DeleteList($uuid: uuid!, $ownerId: uuid!) {
    delete_recommended_restaurant_lists(
      where: { uuid: { _eq: $uuid }, owner_id: { _eq: $ownerId } }
    ) { affected_rows }
  }
`
// Returns fail(res, 'List not found or unauthorized', 404) if affected_rows === 0
```

---

### 4.5 `add-item.ts`

**POST** `/v1/restaurant-lists/add-item`
Body: `{ list_uuid: string, restaurant_uuid?: string, google_place_id?: string, sort_order?: number }`
Auth: Required.

This function handles the dual-restaurant problem: it accepts either a `restaurant_uuid` (linked listing) or a `google_place_id` (Google-only place), or both. It validates ownership of the list, checks for duplicates, and inserts.

```typescript
const VERIFY_LIST_OWNERSHIP = `
  query VerifyOwnership($listUuid: uuid!, $ownerId: uuid!) {
    recommended_restaurant_lists(
      where: { uuid: { _eq: $listUuid }, owner_id: { _eq: $ownerId } }
      limit: 1
    ) { id }
  }
`

const CHECK_ITEM_EXISTS = `
  query CheckItemExists($listId: Int!, $restaurantUuid: uuid, $googlePlaceId: String) {
    recommended_restaurant_list_items(
      where: {
        list_id: { _eq: $listId }
        _or: [
          { restaurant_uuid: { _eq: $restaurantUuid } }
          { google_place_id: { _eq: $googlePlaceId } }
        ]
      }
      limit: 1
    ) { id }
  }
`

const ADD_ITEM = `
  mutation AddItem($listId: Int!, $restaurantUuid: uuid, $googlePlaceId: String,
                   $sortOrder: Int!) {
    insert_recommended_restaurant_list_items_one(object: {
      list_id: $listId
      restaurant_uuid: $restaurantUuid
      google_place_id: $googlePlaceId
      sort_order: $sortOrder
    }) {
      id list_id restaurant_uuid google_place_id sort_order created_at
    }
  }
`

// Logic:
// 1. requireAuth
// 2. Validate: must have restaurant_uuid OR google_place_id (not both null)
// 3. Verify list ownership
// 4. Check duplicate → fail(res, 'Restaurant already in list', 409)
// 5. Get max sort_order for the list → new item appends at max + 1
// 6. Insert and return new item
```

---

### 4.6 `remove-item.ts`

**DELETE** `/v1/restaurant-lists/remove-item`
Body: `{ list_uuid: string, item_id: number }`
Auth: Required. Only list owner can remove.

```typescript
const REMOVE_ITEM = `
  mutation RemoveItem($itemId: Int!, $listId: Int!, $ownerId: uuid!) {
    delete_recommended_restaurant_list_items(
      where: {
        id: { _eq: $itemId }
        list_id: { _eq: $listId }
        list: { owner_id: { _eq: $ownerId } }
      }
    ) { affected_rows }
  }
`
// Returns fail(res, 'Item not found or unauthorized', 404) if affected_rows === 0
```

---

### 4.7 `get-list-by-slug.ts`

**GET** `/v1/restaurant-lists/get-list-by-slug?slug=best-ramen-spots-x3f9a2`
Auth: Optional. Returns public lists to anyone; private lists only to the owner.

```typescript
const GET_LIST_BY_SLUG = `
  query GetListBySlug($slug: String!, $requesterId: uuid) {
    recommended_restaurant_lists(
      where: {
        slug: { _eq: $slug }
        _or: [
          { owner_id: { _eq: $requesterId } }
          { visibility: { _eq: "public" } }
        ]
      }
      limit: 1
    ) {
      id uuid slug title description visibility is_active
      owner_id share_token created_at updated_at
      owner_profile: owner { displayName avatarUrl }
      items: recommended_restaurant_list_items(order_by: { sort_order: asc }) {
        id list_id sort_order restaurant_uuid google_place_id created_at
        restaurant {
          id uuid title slug featured_image_url listing_street
          average_rating ratings_count
          address { city country_short }
          cuisines { name slug }
        }
      }
    }
  }
`
// When restaurant_uuid is null, item.restaurant is null.
// The function enriches google_place_id items from google_place_cache:
//   SELECT * FROM google_place_cache WHERE google_place_id = ANY($googlePlaceIds)
// Merges into response as item.google_place { name, address, image_url, ... }
```

---

### 4.8 `get-list-by-share-token.ts`

**GET** `/v1/restaurant-lists/get-list-by-share-token?token=abc123def456...`
Auth: None required — share token is the auth mechanism.

Same query shape as `get-list-by-slug` but filters on `share_token` and does not require a `requesterId`. Always returns the list regardless of `visibility`.

---

### 4.9 `reorder-items.ts`

**PATCH** `/v1/restaurant-lists/reorder-items`
Body: `{ list_uuid: string, items: Array<{ id: number, sort_order: number }> }`
Auth: Required. Bulk-updates `sort_order` for all items in one transaction.

```typescript
// Executes N individual update mutations in a single Hasura request
// using mutation aliases: item_0: update_..., item_1: update_..., etc.
// Verifies list ownership once before the bulk update.
// Returns: { reordered: N }
```

---

### 4.10 `get-public-lists.ts`

**GET** `/v1/restaurant-lists/get-public-lists?limit=20&offset=0`
Auth: None required. Returns public lists from all users, sorted by most recently updated.

```typescript
const GET_PUBLIC_LISTS = `
  query GetPublicLists($limit: Int!, $offset: Int!) {
    recommended_restaurant_lists(
      where: { visibility: { _eq: "public" }, is_active: { _eq: true } }
      order_by: { updated_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id uuid slug title description owner_id created_at updated_at
      owner_profile: owner { displayName avatarUrl }
      items_count: recommended_restaurant_list_items_aggregate {
        aggregate { count }
      }
      first_item: recommended_restaurant_list_items(
        order_by: { sort_order: asc }
        limit: 1
      ) {
        restaurant { featured_image_url title }
        google_place_id
      }
    }
  }
`
```

---

## 5. Mobile Frontend — All Screens

### 5.1 Screen map

| Screen | Expo Router path | Auth | Description |
|--------|-----------------|------|-------------|
| My Lists home | `/studio/my-lists` | Required | List of user's own curated lists |
| Create / Edit list | `/studio/my-lists/create` | Required | Name + description + visibility |
| List detail (own) | `/studio/my-lists/[uuid]` | Required | Items, reorder, share, edit |
| List detail (shared) | `/lists/[slug]` | Optional | Public/share-token view |
| Browse public lists | `/lists` | Optional | Community lists |
| Add restaurant to list | `/studio/my-lists/[uuid]/add` | Required | Search + nearby |

---

### 5.2 My Lists home (`/studio/my-lists`)

**Shell:** `SafeAreaView className="flex-1 bg-white"`. Stack header: `"My Lists"` with a `+` icon button (top-right, `FiPlus size={22} color="#ff7c0a"`) that navigates to `/studio/my-lists/create`.

**Loading:** Spotify-style list skeleton — 5 rows, each `72px` tall (`flex-row items-center px-4 py-3 gap-3`): `56×56 rounded-xl bg-gray-200 animate-pulse` cover block, `flex-1 gap-2` with `h-4 w-2/3 rounded bg-gray-200` and `h-3 w-1/3 rounded bg-gray-200`. Same sync-pulse Reanimated pattern as the To-Dine/Check-ins list (see `my_lists.md`).

**Live list:** `FlashList data={lists} estimatedItemSize={72}`. Each list renders as a `Swipeable` row. The visible row is a `Pressable flex-row items-center px-4 py-3 gap-3 bg-white border-b border-gray-50` that navigates to `/studio/my-lists/${list.uuid}`:

- **Cover tile** `56×56 rounded-xl overflow-hidden flex-shrink-0`: If the list has items, show the first item's restaurant `featured_image_url` or `google_place_cache.primary_photo_url`. If the list is empty, show a `bg-gray-100 items-center justify-center` placeholder with `FiList size={24} color="#9ca3af"`.
- **Info block** `flex-1 min-w-0 gap-0.5`:
  - List title: `font-neusans text-[15px] font-medium text-[#31343F]` numberOfLines=1.
  - Item count + visibility: `font-neusans text-[13px] text-[#6b7280]` → `"{n} places · {visibility === 'public' ? 'Public' : 'Private'}"`.
- **Right:** `FiChevronRight size={14} color="#e5e7eb"`.

**Swipe-to-delete (right action):** Same pattern as To-Dine/Check-ins — `80px` `bg-red-500` panel with `FiTrash2 size={22} color="white"` and `"Delete"` label. Tap: `haptic('warning')` → optimistic remove from local state → call `DELETE /v1/restaurant-lists/delete-list { uuid: list.uuid }` → on failure: revert + `customToast.error('Failed to delete list. Please try again.')`.

**Empty state:** `FiList size={32} color="#ff7c0a"` in a `w-16 h-16 rounded-full bg-orange-50` circle, heading `"No Lists Yet"` in `font-neusans text-lg font-medium text-gray-900 text-center mb-2`, subtext `"Create your first restaurant list"` in `font-neusans text-sm text-gray-500 text-center mb-6`, `Button variant="primary" label="Create a List" onPress={() => router.push('/studio/my-lists/create')}`.

---

### 5.3 Create / Edit list (`/studio/my-lists/create` and `/studio/my-lists/[uuid]/edit`)

**Shell:** `KeyboardAvoidingView`. Single `ScrollView`. Stack title: `"New List"` (create) or `"Edit List"` (edit).

**Fields:**

- **List name**: Label `"List Name"` in `font-neusans text-sm text-[#374151] mb-2`. `TextInput border border-[#797979] rounded-[10px] px-4 py-3 text-base text-[#31343F]` `style={{ fontSize: 16 }}` `maxLength={100}` `placeholder="e.g. Best Ramen Spots"`. Character counter `{title.length}/100` right-aligned. Required — empty submit shows `"List name is required."` in `text-xs text-red-600 mt-1`.
- **Description** (optional): Label `"Description"` with `"(optional)"` in `text-xs text-[#9ca3af]`. `TextInput multiline numberOfLines={3} maxLength={500}` same border/radius style `minHeight: 80 textAlignVertical="top"`. Counter `{description.length}/500`.
- **Visibility toggle**: Label `"Who can see this list?"` in `font-neusans text-sm text-[#374151] mb-3`. Two pill options in a `flex-row gap-3`: `"Private"` (`FiLock size={14}`) and `"Public"` (`FiGlobe size={14}`). Active: `bg-[#31343F] text-white border-[#31343F]` — using dark charcoal (not orange) to signal a settings-level choice rather than an action. Inactive: `bg-white border-[#e5e7eb] text-[#31343F]`. Both pills: `flex-row items-center gap-2 px-4 py-2.5 rounded-[50px] border-2 font-neusans text-sm`.

**Fixed footer:** `Button variant="primary" className="w-full" label={isEdit ? "Save Changes" : "Create List"}`. On submit: `POST /v1/restaurant-lists/create-list` or `PATCH /v1/restaurant-lists/update-list`. On success: `router.replace('/studio/my-lists/${newList.uuid}')` (create) or `router.back()` (edit).

---

### 5.4 List detail — own list (`/studio/my-lists/[uuid]`)

**Shell:** `SafeAreaView className="flex-1 bg-white"`. Stack header: list title truncated, with three icon buttons right: `FiUserPlus` (share), `FiEdit2` (edit → `/studio/my-lists/${uuid}/edit`), overflow menu (`FiMoreVertical` → bottom sheet with Delete option).

**Header block** (`px-4 pt-4 pb-3 border-b border-gray-100`):
- List title: `font-neusans text-xl font-medium text-[#31343F]` (full, not truncated).
- Description: `font-neusans text-sm text-[#6b7280] mt-1` numberOfLines=2.
- Meta row: `font-neusans text-xs text-[#9ca3af] mt-2` → `"{n} places · {visibility} · Updated {formatDistanceToNow(updated_at)}"`.
- **Share button row**: `flex-row gap-2 mt-3`. Button 1: `"Share Link"` with `FiShare2 size={16}` in `flex-row items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-[50px] font-neusans text-sm` — taps `Share.share({ url: 'https://tastyplates.co/lists/${slug}' })`. Button 2 (if `visibility === 'private'`): `"Make Public"` in same style — taps `PATCH update-list { visibility: 'public' }` with optimistic update.

**Add restaurant CTA** (`px-4 py-3 border-b border-gray-100`): Full-width `Button variant="primary" label="+ Add Restaurant" onPress={() => router.push('/studio/my-lists/${uuid}/add')}`.

**Items list:** `FlashList data={items} estimatedItemSize={72}`. Skeleton loading: same 5-row Spotify pattern. Each item is a `Swipeable` wrapping a `Pressable` row:

- **Cover** `56×56 rounded-xl overflow-hidden`:
  - If `item.restaurant` (linked): `Image source={{ uri: item.restaurant.featured_image_url || DEFAULT_RESTAURANT_IMAGE }} contentFit="cover"`.
  - If `item.google_place` (Google-only): `Image source={{ uri: item.google_place.primary_photo_url || DEFAULT_RESTAURANT_IMAGE }} contentFit="cover"`.
- **Info block** `flex-1 min-w-0`:
  - Name: `font-neusans text-[15px] font-medium text-[#31343F]` numberOfLines=1 — `item.restaurant?.title ?? item.google_place?.name`.
  - Address: `font-neusans text-[13px] text-[#6b7280]` numberOfLines=1 — `item.restaurant?.listing_street ?? item.google_place?.address`.
  - **"Not on TastyPlates"** badge (Google-only items only): `px-2 py-0.5 bg-gray-100 rounded-full` with `font-neusans text-[10px] text-[#9ca3af]` label `"Google Places"`. This distinguishes Google-only items visually — they can still be tapped but open an external Google Maps link instead of the TastyPlates detail page.
  - Cuisine pills (linked items only): same `restaurant-card__cuisine-pill` style from `_restaurant-card.scss` — `bg-[#ff7c0a] text-white text-[10px] rounded-full px-2 py-0.5`.
- **Right:** `FiChevronRight size={14} color="#e5e7eb"`.

Row tap behaviour:
- Linked item (`restaurant_uuid` present) → `haptic('light')` → `router.push('/restaurants/${item.restaurant.slug}')`.
- Google-only item → `haptic('light')` → `Linking.openURL('https://www.google.com/maps/place/?q=place_id:${item.google_place_id}')`.

**Swipe-to-delete (right action):** Same `80px bg-red-500` panel with `FiTrash2 size={22} color="white"` + `"Remove"` label. Tap: `haptic('warning')` → optimistic remove → `DELETE /v1/restaurant-lists/remove-item { list_uuid, item_id }` → revert on failure.

**Empty state (own list, no items yet):** `FiSearch size={28} color="#ff7c0a"` in `w-16 h-16 rounded-full bg-orange-50`, heading `"Nothing in this list yet"`, subtext `"Start adding restaurants to build your list"`, `Button variant="primary" label="Add Restaurants"`.

---

### 5.5 Add restaurant to list (`/studio/my-lists/[uuid]/add`)

Full-screen search + nearby screen. Identical UX to the restaurant search in Screen 1 of Create Review (`/studio/add-review`) — same search bar, same cuisine filter pills, same nearby `FlashList`, same Autocomplete debounce, same `getAutocompletePredictions` REST call with `selectedLocation.coordinates` bias.

The only difference: tapping a row here calls `POST /v1/restaurant-lists/add-item { list_uuid, restaurant_uuid OR google_place_id }` instead of navigating to the review form.

On success: `haptic('success')` + `customToast.success('"${name}" added to ${listTitle}')` + `router.back()` to return to the list detail.

On `409 Conflict` (already in list): `haptic('warning')` + `customToast.error('Already in this list')`.

---

### 5.6 Browse public lists (`/lists`)

**Shell:** `SafeAreaView className="flex-1 bg-white"`. Stack title `"Community Lists"`. Search input in header filters by list title client-side.

**Loading:** Same Spotify skeleton rows — 8 rows, 72px each.

**Live list:** `FlashList` with `estimatedItemSize={80}`. Each public list row:
- **Cover** `56×56 rounded-xl` — first item's restaurant image or Google Places photo. Fallback: `bg-gray-100` with `FiList size={20} color="#9ca3af"`.
- **Info block**:
  - Title: `font-neusans text-[15px] font-medium text-[#31343F]`.
  - Owner name: `font-neusans text-[13px] text-[#6b7280]` → `"by {ownerProfile.displayName}"`.
  - Count: `font-neusans text-[11px] text-[#9ca3af]` → `"{n} places"`.
- **Right:** `FiChevronRight size={14} color="#e5e7eb"`.
- Taps to `/lists/${list.slug}`.

---

### 5.7 Shared / public list view (`/lists/[slug]`)

Same layout as §5.4 (own list detail) with these differences:
- **No** Add Restaurant, Edit, or Delete controls.
- **No** swipe-to-delete on rows.
- **Header** shows `"by {ownerProfile.displayName}"` with their `32×32px rounded-full` avatar beside the list title.
- **Follow/Save list** button in header: `"Save List"` with `FiBookmark size={16}` — saves a reference to the list in the user's profile (future feature flag; render as disabled with `"Coming Soon"` tooltip for v1).
- If accessed via a `?token=<shareToken>` query param and the list is private, the function resolves it via `get-list-by-share-token` — the screen shows a `"🔒 Shared with you"` pill beside the title.

---

## 6. Type Definitions

```ts
// types/restaurantList.ts

export interface RestaurantList {
  id: number
  uuid: string
  slug: string
  title: string
  description: string | null
  visibility: 'private' | 'public'
  is_active: boolean
  owner_id: string
  share_token: string
  created_at: string
  updated_at: string
  // Aggregated fields from function
  items_count: number
  cover_image_url: string | null
  owner_profile?: { displayName: string; avatarUrl: string | null }
}

export interface RestaurantListItem {
  id: number
  list_id: number
  sort_order: number
  restaurant_uuid: string | null
  google_place_id: string | null
  created_at: string
  // Resolved — one of these will be non-null
  restaurant: {
    id: number; uuid: string; title: string; slug: string
    featured_image_url: string | null; listing_street: string | null
    average_rating: number; ratings_count: number
    address: { city: string; country_short: string } | null
    cuisines: Array<{ name: string; slug: string }>
  } | null
  google_place: {
    name: string; address: string | null
    primary_photo_url: string | null
    google_rating: number | null
  } | null
}

// Utility: determine if an item has a TastyPlates detail page
export const isLinkedItem = (item: RestaurantListItem): boolean =>
  item.restaurant_uuid !== null && item.restaurant !== null

// Utility: get display name regardless of item type
export const getItemName = (item: RestaurantListItem): string =>
  item.restaurant?.title ?? item.google_place?.name ?? 'Unknown Restaurant'

// Utility: get display address regardless of item type
export const getItemAddress = (item: RestaurantListItem): string | null =>
  item.restaurant?.listing_street ??
  item.google_place?.address ??
  null
```

---

## 7. Haptic Map

| Interaction | Preset |
|-------------|--------|
| Tap list row | `light` |
| Tap restaurant item row | `light` |
| Create list (submit) | `success` |
| Save list edits | `success` |
| Add restaurant to list (success) | `success` |
| Already in list (409) | `warning` |
| Swipe to delete (open) | *(implicit gesture)* |
| Tap delete action (list) | `warning` |
| Tap delete action (item) | `warning` |
| Share list | `light` |
| Toggle visibility | `selection` |
| Tab switch | `selection` |