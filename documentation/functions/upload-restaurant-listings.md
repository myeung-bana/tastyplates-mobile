# Restaurant Listing Upload — Image and Cache Fixes

**Scope:** `tastyplates-admin-mcp` · `tasty-business-portal` · `tastyplates-nhost` · `tastyplates-mobile`  
**Status:** fixes below are not built yet. Each one is written against the function that already exists.

The database stores a URL, not the file. `restaurants.featured_image_url` is what Explore, restaurant detail, and the admin page render.

---

## 1. What is broken

### 1.1 `create_restaurant_from_place` saves a live Google photo URL, including the API key

The MCP route is only a wrapper:

`tasty-business-portal/src/app/api/mcp/create-restaurant-from-place/route.ts`  
→ `src/lib/mcp/handlers/create-restaurant-from-place.ts`  
→ `createRestaurantFromPlace` in `src/lib/admin-handlers/restaurants.ts`

That function loads Place Details and, unless `import_featured_image` is false, sets:

```ts
featured_image_url: details.photo_urls[0]
```

`photo_urls` is built in `src/lib/google-places-server.ts` as:

`https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=...&key=...`

That string is inserted on the restaurant row. The photo reference can expire, the Maps API key is then readable by every client, and the bytes stay on Google as a JPEG.

The handler already calls `cacheInvalidateTags(['restaurants:list'])` after a successful create. It does not upload anything.

### 1.2 `create_restaurant` stores the URL it is given

`tastyplates-admin-mcp/src/tools/restaurants.ts` sends `featured_image_url` to `POST /api/mcp/create-restaurant`. `createRestaurant` in the same admin handler copies that string onto the row.

A scraped `https://lh3.googleusercontent.com/grass-cs/...` link is stored as-is. There is no MCP tool that calls the upload API first.

### 1.3 Listing cache exists on the portal. The mobile app does not use it

`tasty-business-portal/src/lib/redis.ts` is the Upstash client. `src/lib/redis-cache.ts` is the helper (`cacheGet`, `cacheSet`, `cacheInvalidateTags`). It is already used by:

| Portal route | TTL | Tag |
|---|---|---|
| `GET /api/v1/restaurants-v2/get-restaurants` | 60 seconds | `restaurants:list` |
| `GET /api/v1/restaurants-v2/get-restaurant-by-id` | 120 seconds | `restaurant:detail` |

`tastyplates-mobile` does not call those routes. Explore uses `restaurants-v2/get-restaurants` and detail uses `restaurants-v2/get-restaurant-by-id`, both Nhost Functions, through `tastyplatesFetch`. Those functions have no Redis client. Nhost has no `functions/_lib/redis.ts`.

Restaurant cards use React Native `Image`, not `expo-image`. A stable URL can be reused by that image cache. A Google URL that changes cannot.

### 1.4 Two uploaders already exist, and they write to different buckets

| Path | Used by | Stored URL |
|---|---|---|
| `uploadImageBuffer` in `src/lib/upload-image-server.ts` | Admin edit screen, `POST /api/v1/upload/image`, `POST /api/v1/upload/from-url` | S3 `uploads/by-hash/{sha256}.webp` |
| `ingestGooglePlacePhoto` in `tastyplates-nhost/functions/_lib/ingestGooglePlacePhoto.ts` | Nhost `restaurants-v2/create-restaurant` when only `google_photo_reference` is sent, and `admin/backfill-featured-images` | Nhost Storage |

Portal listings, including MCP creates, should use the S3 uploader. That is the URL the admin editor already saves. The Nhost uploader is the one the mobile “review a Google place” flow uses, and if ingest fails it falls back to the keyed Google photo URL.

`needsFeaturedImageBackfill` only treats an empty or placeholder URL as missing. A row that already contains `maps.googleapis.com` or `lh3.googleusercontent.com` is skipped by `admin/backfill-featured-images`.

---

## 2. The upload step to reuse

`POST /api/v1/upload/from-url` already does the durable copy:

1. Accepts an `https://` URL
2. Downloads it (the route does not add its own auth check)
3. Passes the buffer to `uploadImageBuffer`
4. Rejects non-images and files over 10 MB
5. Resizes inside 1600×1600 and encodes JPEG, PNG, and WebP as WebP quality 75
6. Writes `uploads/by-hash/{sha256}.webp`, or skips the write when that key exists
7. Inserts `media_assets` and invalidates `media_assets:list`
8. Returns `{ success, fileUrl, filePath, sha256 }`

`fileUrl` is `https://{S3_BUCKET_DOMAIN}/uploads/by-hash/{sha256}.webp`. That is the value to store in `featured_image_url`.

Do not have a server handler `fetch` its own `/api/v1/upload/from-url`. Call `uploadImageBuffer` in process, the same way that route does after the download.

The admin edit screen already does the browser version of this: `uploadGooglePlacePhoto` in `src/lib/google-places-utils.ts` posts the Places photo URL to `/api/v1/upload/from-url` and stores `fileUrl`.

---

## 3. Fixes

### Fix 1 — Portal: ingest the place photo inside `createRestaurantFromPlace`

**File:** `tasty-business-portal/src/lib/admin-handlers/restaurants.ts`  
**Leave the route wrapper as it is.** `handleCreateRestaurantFromPlace` already invalidates `restaurants:list`.

In `createRestaurantFromPlace`, stop assigning `details.photo_urls[0]`.

When `import_featured_image` is not false and the place has a photo reference:

1. Build the Places photo URL only as a download source. Do not put it on the restaurant.
2. `fetch` that URL on the server.
3. Pass the buffer to `uploadImageBuffer`, same limits and WebP output as `/api/v1/upload/from-url`.
4. Save the returned `fileUrl`.
5. If the download or upload fails, save no featured image. Do not fall back to the Google URL.

`import_featured_image: false` stays as it is: no featured image. An empty URL is already what the app treats as missing.

### Fix 2 — MCP tool that returns an S3 URL before `create_restaurant`

The agent cannot call `/api/v1/upload/from-url` today. MCP tools only talk to `/api/mcp/*` through `PortalClient` (`tastyplates-admin-mcp/src/client.ts`), using `TASTYPLATES_API_URL`.

Add the tool the same way `search_places` is added:

- Register it from `tastyplates-admin-mcp/src/index.ts`
- `client.post('/api/mcp/upload-image-from-url', { url, filename })`
- New portal route `src/app/api/mcp/upload-image-from-url/route.ts`, behind the same MCP auth as `create-restaurant`
- Handler body matches `src/app/api/v1/upload/from-url/route.ts`: HTTPS only, download, `uploadImageBuffer`, return `fileUrl`

Then the agent calls `upload_image_from_url` and passes `fileUrl` into the existing `create_restaurant` `featured_image_url` field. `createRestaurant` already stores that field unchanged, so no second write path is required.

`create_restaurant_from_place` does not need this tool once Fix 1 runs inside the handler.

### Fix 3 — Do not add a second cache in Nhost for this

There is no `functions/restaurants-v2/get-restaurant.ts`, and Nhost Functions do not import Upstash.

The cache that matches this repo is the portal helper already in use:

- list reads: 60 seconds, tag `restaurants:list`
- one restaurant: 120 seconds, tag `restaurant:detail`
- creates invalidate `restaurants:list`
- `PUT /api/v1/restaurants-v2/update-restaurant` and the MCP update route invalidate `restaurants:list` and `restaurant:detail`

That cache does not change Explore or restaurant detail in `tastyplates-mobile`, because those screens call the Nhost functions. After Fix 1, the image URL no longer changes, so React Native `Image` can keep the bytes for that URL. Caching the listing JSON on the Nhost functions would be a new Redis client in `tastyplates-nhost`, not an extension of `functions/_lib/redis.ts`.

Do not add a 6-hour `listing:v1:` key. It would not be invalidated by `cacheInvalidateTags`.

### Fix 4 — Rewrite rows that already store a Google URL, using the S3 uploader

**Existing job:** `tastyplates-nhost/functions/admin/backfill-featured-images.ts`

It selects restaurants with a `google_place_id` whose featured image is null, empty, or a `tastyplates_placeholder` URL. It then calls `fetchGooglePlacePhotoReference` and `ingestGooglePlacePhoto`, which writes **Nhost Storage**, not S3. It does not see rows whose `featured_image_url` is already a Google link. `resolveGoogleFeaturedImageUrl` can also write the keyed Google URL back if Nhost ingest fails. This job should not be the repair for portal rows.

Repair those rows with the same uploader as Fix 1 (`uploadImageBuffer`), so old and new MCP listings share one URL shape.

For each restaurant whose `featured_image_url` contains `maps.googleapis.com` or `lh3.googleusercontent.com` and that still has a `google_place_id`:

1. Fetch a fresh photo reference with the same Place Details call the portal already uses. Do not download the stored URL. It contains the old API key and may already be dead.
2. Download that photo and pass the buffer to `uploadImageBuffer`.
3. Set `featured_image_url` to `fileUrl`.
4. Invalidate `restaurants:list` and `restaurant:detail` with `cacheInvalidateTags`.

Put this next to the portal create handler, or behind an `/api/mcp/*` route like the other admin jobs. Running the existing Nhost backfill instead would replace the Google URL with an Nhost Storage URL, which is a different host from the admin editor and from Fix 1.

Also stop the Nhost fallback in `resolveGoogleFeaturedImageUrl` from returning `buildGooglePlacePhotoUrl` when ingest fails. That is the same keyed URL. Return null instead, matching Fix 1.

---

## 4. What each client receives after the fixes

| Before | After |
|---|---|
| `maps.googleapis.com/maps/api/place/photo?...&key=...` | `https://{S3_BUCKET_DOMAIN}/uploads/by-hash/{sha256}.webp` |
| Scraped `lh3.googleusercontent.com/...` saved by `create_restaurant` | Same S3 URL, if the agent called `upload_image_from_url` first |
| JPEG from Google, size chosen by the photo URL | WebP, max 1600×1600, quality 75 |
| API key in the row | No credentials in the URL |
| Portal list/detail cache (60s / 120s) | Unchanged. Mobile still reads Nhost Functions |
| Mobile `Image` pointed at a rotating Google URL | Mobile `Image` pointed at a stable S3 URL |

---

## 5. Order

1. Fix 1 in `createRestaurantFromPlace`, then deploy the portal. New place imports stop writing Google URLs.
2. Fix 2: portal route, then the MCP tool. Rebuild `tastyplates-admin-mcp` and restart the client.
3. Fix 4 once, for rows already saved. Invalidate the existing portal cache tags after the writes.
4. Leave Nhost listing reads uncached. Change `resolveGoogleFeaturedImageUrl` so a failed ingest does not save a Google URL.

Fix 1 is enough to stop new `create_restaurant_from_place` rows from storing the live link. Fix 2 is only for scraped URLs passed into `create_restaurant`.
