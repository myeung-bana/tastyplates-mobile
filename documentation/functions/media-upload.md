# media_upload.md — Tastyplates Media Upload Guide

> **Scope:** This is the canonical reference for media uploads across `tastyplates-v2` (Next.js admin/web), `tastyplates-mobile` (React Native / Expo), and `tastyplates-nhost` (Nhost Functions). It covers both consumer paths — the React Native app and any Next.js admin surface — against the same Nhost Function backend and `public.media_assets` catalog table.

---

## Current State (as-built)

The mobile app (`tastyplates-mobile`) currently routes all uploads through `functions/upload/image.ts` in `tastyplates-nhost`. That function:

1. Authenticates the caller via JWT (`requireAuth`)
2. Parses the multipart body with `Busboy`
3. Converts the image to **AVIF** (fallback: **WebP**) using `sharp`
4. Uploads to **S3** via the AWS SDK (`PutObjectCommand`)
5. Returns `{ fileUrl, filePath }` wrapped in the `ok()` envelope

**The problem with the current S3 path:**

- The S3 bucket credentials (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`) are a separate infra dependency outside Nhost
- There is **no `media_assets` catalog table** — uploaded file URLs are stored directly on the entity (review, profile) with no dedup, no repair path, and no orphan detection
- `mime_type` is set by the client upload MIME — if wrong, it stays wrong
- There is no admin-side upload path in `tastyplates-v2`

**The target state (this guide):**

Replace S3 with **Nhost Storage** (`tasty-bucket`), add a `public.media_assets` catalog table for dedup and audit, and provide a single Nhost Function that both the mobile app and any Next.js admin surface call.

---

## Data Model — `public.media_assets`

```sql
-- nhost/migrations/default/<timestamp>_add_media_assets/up.sql

CREATE TABLE IF NOT EXISTS media_assets (
  id              BIGSERIAL     PRIMARY KEY,
  uuid            UUID          NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- Nhost Storage identity
  storage_file_id UUID          UNIQUE,   -- storage.files.id
  public_url      TEXT          NOT NULL, -- canonical URL stored on entities

  -- S3 path (still populated for any legacy rows, null for Nhost rows)
  s3_key          TEXT,
  s3_bucket       TEXT,

  -- Content identity
  sha256          TEXT,         -- hex SHA-256 of original bytes (for dedup)
  file_size       BIGINT,       -- original bytes before compression
  content_type    TEXT,         -- MIME as detected by hasura-storage
  original_name   TEXT,         -- client filename, stored for human reference

  -- Ownership
  uploaded_by     UUID,         -- auth.users.id (Nhost user id)

  -- Audit
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_sha256
  ON media_assets (sha256) WHERE sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_storage_file_id
  ON media_assets (storage_file_id) WHERE storage_file_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by
  ON media_assets (uploaded_by) WHERE uploaded_by IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**Column reference:**

| Column | Meaning |
|--------|---------|
| `uuid` | Public-safe identifier — use this in API responses and entity FKs |
| `storage_file_id` | Nhost Storage `storage.files.id` — source of truth for the file bytes |
| `public_url` | **Canonical URL** stored on reviews, profiles, restaurant listings |
| `sha256` | SHA-256 hex of original input bytes — used for dedup before upload |
| `content_type` | MIME detected by `hasura-storage` from file bytes (not client claim) |
| `uploaded_by` | The Nhost `auth.users.id` who uploaded the file |

**Invariant:** Every `media_assets` row with a `storage_file_id` must have a corresponding `storage.files` row in Nhost. Rows without `storage_file_id` are legacy S3 rows.

---

## Storage Backend

| Backend | Bucket | Env flag |
|---------|--------|----------|
| **Nhost Storage** (target) | `tasty-bucket` | `MEDIA_STORAGE_BACKEND=nhost` |
| **S3 / legacy** | `S3_BUCKET_NAME` | `MEDIA_STORAGE_BACKEND=s3` (existing rows only) |

---

## Upload Architecture — Two Clients, One Function

```
┌────────────────────────┐        ┌────────────────────────┐
│  React Native (Expo)   │        │  Next.js (tastyplates- │
│  tastyplates-mobile    │        │  v2 / admin surface)   │
│                        │        │                        │
│  uploadService.ts      │        │  /api/v1/upload/image  │
│  FormData + JWT Bearer │        │  FormData + session    │
└──────────┬─────────────┘        └──────────┬─────────────┘
           │  POST /v1/upload/image           │  POST /v1/upload/image
           │  (Nhost Functions URL)           │  (proxied via Next.js
           │  Authorization: Bearer <JWT>     │   → Functions URL)
           └─────────────┬────────────────────┘
                         ▼
           ┌─────────────────────────────┐
           │  functions/upload/image.ts  │
           │  (tastyplates-nhost)        │
           │                             │
           │  1. requireAuth (JWT)       │
           │  2. Busboy parse            │
           │  3. Sharp compress          │
           │  4. SHA-256 dedup check     │
           │  5. POST → Nhost Storage    │
           │     (tasty-bucket)          │
           │  6. Insert media_assets row │
           └─────────────────────────────┘
                         │
           ┌─────────────┴──────────────┐
           │                            │
           ▼                            ▼
  Nhost Storage                  Hasura GraphQL
  (tasty-bucket)                 (media_assets)
```

---

## Nhost Function — `functions/upload/image.ts` (updated)

Replace the existing S3 implementation with the following. The function now:

- Uploads to **Nhost Storage** (`tasty-bucket`) instead of S3
- Checks `media_assets` by SHA-256 before uploading (dedup)
- Inserts a `media_assets` catalog row after every successful upload
- Returns the same `{ fileUrl, filePath }` shape the mobile app already expects — **no changes required to `uploadService.ts`**

```typescript
// functions/upload/image.ts
import type { Request, Response } from 'express'
import { createHash } from 'node:crypto'
import process from 'node:process'
import Busboy from 'busboy'
import sharp from 'sharp'
import { requireAuth, getUserId } from '../_lib/auth'
import { ok, fail } from '../_lib/respond'
import { hasuraAdmin } from '../_lib/hasura'

// ── Config ────────────────────────────────────────────────────────────────

const STORAGE_BUCKET  = process.env.MEDIA_STORAGE_BUCKET ?? 'tasty-bucket'
const NHOST_SUBDOMAIN = process.env.NHOST_SUBDOMAIN!
const NHOST_REGION    = process.env.NHOST_REGION!
const ADMIN_SECRET    = process.env.HASURA_GRAPHQL_ADMIN_SECRET!
const MAX_WIDTH       = parseInt(process.env.IMAGE_MAX_WIDTH  ?? '1600', 10)
const MAX_HEIGHT      = parseInt(process.env.IMAGE_MAX_HEIGHT ?? '1600', 10)
const AVIF_QUALITY    = parseInt(process.env.IMAGE_AVIF_QUALITY ?? '60',  10)
const WEBP_QUALITY    = parseInt(process.env.IMAGE_WEBP_QUALITY ?? '75',  10)

// ── Helpers ───────────────────────────────────────────────────────────────

function storageBase(): string {
  return `https://${NHOST_SUBDOMAIN}.storage.${NHOST_REGION}.nhost.run`
}

/** Compute SHA-256 hex from a Buffer. */
function sha256hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

/** Build a multipart body from raw file bytes — mirrors hasura-storage's expectations. */
function buildMultipart(
  fileBytes: Buffer,
  contentType: string,
  filename: string,
  bucketId: string,
): { body: Buffer; boundary: string } {
  const boundary = `----TastyPlatesBoundary${Date.now().toString(16)}`
  const CRLF = '\r\n'

  const preamble = Buffer.from(
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="bucket-id"${CRLF}${CRLF}` +
    `${bucketId}${CRLF}` +
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}` +
    `Content-Type: ${contentType}${CRLF}${CRLF}`,
    'utf-8',
  )
  const epilogue = Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf-8')
  const body = Buffer.concat([preamble, fileBytes, epilogue])
  return { body, boundary }
}

/** Upload bytes to Nhost Storage. Returns the storage.files UUID. */
async function uploadToNhostStorage(
  fileBytes: Buffer,
  contentType: string,
  filename: string,
): Promise<{ fileId: string; publicUrl: string }> {
  const { body, boundary } = buildMultipart(fileBytes, contentType, filename, STORAGE_BUCKET)
  const url = `${storageBase()}/v1/files`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(body.byteLength),
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Storage upload failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const json = await res.json() as { id?: string; name?: string }
  const fileId = json.id
  if (!fileId) throw new Error('Storage returned no file ID')

  const publicUrl = `${storageBase()}/v1/files/${fileId}`
  return { fileId, publicUrl }
}

// ── GraphQL queries ───────────────────────────────────────────────────────

const DEDUP_QUERY = `
  query DedupCheck($sha256: String!) {
    media_assets(where: { sha256: { _eq: $sha256 } }, limit: 1) {
      uuid public_url storage_file_id
    }
  }
`

const INSERT_ASSET = `
  mutation InsertMediaAsset(
    $storageFileId: uuid!, $publicUrl: String!, $sha256: String,
    $fileSize: bigint, $contentType: String, $originalName: String, $uploadedBy: uuid!
  ) {
    insert_media_assets_one(object: {
      storage_file_id: $storageFileId
      public_url:      $publicUrl
      sha256:          $sha256
      file_size:       $fileSize
      content_type:    $contentType
      original_name:   $originalName
      uploaded_by:     $uploadedBy
    }) {
      uuid public_url storage_file_id
    }
  }
`

// ── Handler ───────────────────────────────────────────────────────────────

export default async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Auth
    const payload = await requireAuth(req, res)
    if (!payload) return
    const userId = getUserId(payload)

    // 2. Parse multipart
    const { buffer: originalBytes, mimetype: clientMime, filename } =
      await new Promise<{ buffer: Buffer; mimetype: string; filename: string }>((resolve, reject) => {
        const busboy = Busboy({ headers: req.headers })
        let resolved = false
        busboy.on('file', (_fieldname, stream, info) => {
          const chunks: Buffer[] = []
          stream.on('data', (chunk: Buffer) => chunks.push(chunk))
          stream.on('end', () => {
            if (!resolved) {
              resolved = true
              resolve({
                buffer: Buffer.concat(chunks),
                mimetype: info.mimeType,
                filename: info.filename ?? 'upload',
              })
            }
          })
          stream.on('error', reject)
        })
        busboy.on('error', reject)
        busboy.on('finish', () => { if (!resolved) reject(new Error('No file received')) })
        req.pipe(busboy)
      })

    // 3. Compress with Sharp (AVIF → WebP fallback)
    let uploadBuffer: Buffer
    let contentType: string
    let outputExt: string

    try {
      uploadBuffer = await sharp(originalBytes)
        .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
        .avif({ quality: AVIF_QUALITY })
        .toBuffer()
      contentType = 'image/avif'
      outputExt = 'avif'
    } catch {
      uploadBuffer = await sharp(originalBytes)
        .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer()
      contentType = 'image/webp'
      outputExt = 'webp'
    }

    const outputFilename = filename.replace(/\.[^.]+$/, '') + `.${outputExt}`

    // 4. SHA-256 dedup check (on compressed bytes)
    const hash = sha256hex(uploadBuffer)

    const dedupResult = await hasuraAdmin<{
      media_assets: Array<{ uuid: string; public_url: string; storage_file_id: string | null }>
    }>(DEDUP_QUERY, { sha256: hash })

    const existing = dedupResult.data?.media_assets?.[0]

    if (existing?.storage_file_id) {
      // Verify Storage file still exists
      const checkRes = await fetch(
        `${storageBase()}/v1/files/${existing.storage_file_id}/presignedurl`,
        { headers: { 'x-hasura-admin-secret': ADMIN_SECRET } },
      )
      if (checkRes.ok) {
        // Dedup hit — return existing URL
        return ok(res, {
          fileUrl:   existing.public_url,
          filePath:  `storage/${existing.storage_file_id}`,
          mediaUuid: existing.uuid,
          deduped:   true,
        })
      }
      // Storage file missing (orphan) — fall through to re-upload
    }

    // 5. Upload to Nhost Storage (tasty-bucket)
    const { fileId, publicUrl } = await uploadToNhostStorage(
      uploadBuffer,
      contentType,
      outputFilename,
    )

    // 6. Persist catalog row
    const insertResult = await hasuraAdmin<{
      insert_media_assets_one: { uuid: string; public_url: string }
    }>(INSERT_ASSET, {
      storageFileId: fileId,
      publicUrl,
      sha256:        hash,
      fileSize:      uploadBuffer.byteLength,
      contentType,
      originalName:  filename,
      uploadedBy:    userId,
    })

    const inserted = insertResult.data?.insert_media_assets_one
    if (!inserted) {
      throw new Error('Failed to save media catalog entry')
    }

    return ok(res, {
      fileUrl:   publicUrl,
      filePath:  `storage/${fileId}`,    // same shape as legacy S3 response
      mediaUuid: inserted.uuid,
      deduped:   false,
    })
  } catch (error) {
    console.error('[upload/image]', error)
    fail(res, error instanceof Error ? error.message : 'Internal server error', 500)
  }
}
```

---

## Hasura Metadata — `media_assets` permissions

Add to `nhost/metadata/databases/default/tables/public_media_assets.yaml`:

```yaml
table:
  name: media_assets
  schema: public

select_permissions:
  - role: user
    permission:
      # Users can only see their own uploaded assets
      filter:
        uploaded_by: { _eq: X-Hasura-User-Id }
      columns:
        - uuid
        - public_url
        - content_type
        - original_name
        - file_size
        - created_at

# No insert/update/delete for users — writes go through the Function only.
# Admin role uses admin secret (no permission needed).
```

Add to `nhost/metadata/databases/default/tables/tables.yaml`:

```yaml
- "!include public_media_assets.yaml"
```

---

## Environment Variables

### `tastyplates-nhost` — Nhost Dashboard → Settings → Secrets

| Variable | Value | Required |
|----------|-------|----------|
| `MEDIA_STORAGE_BUCKET` | `tasty-bucket` | ✅ |
| `HASURA_GRAPHQL_ADMIN_SECRET` | your admin secret | ✅ |
| `NHOST_SUBDOMAIN` | your project subdomain | ✅ |
| `NHOST_REGION` | e.g. `ap-southeast-1` | ✅ |
| `IMAGE_MAX_WIDTH` | `1600` (default) | optional |
| `IMAGE_MAX_HEIGHT` | `1600` (default) | optional |
| `IMAGE_AVIF_QUALITY` | `60` (default) | optional |
| `IMAGE_WEBP_QUALITY` | `75` (default) | optional |

> Remove `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_REGION`, `S3_BUCKET_DOMAIN` once all entities are migrated to Nhost Storage URLs. Keep them until then for legacy row compatibility.

### `tastyplates-mobile` — `.env`

```env
# Existing — no changes needed
EXPO_PUBLIC_NHOST_FUNCTIONS_URL=https://<subdomain>.functions.<region>.nhost.run/v1
```

`uploadService.ts` already calls `${base}/upload/image` with `Authorization: Bearer <JWT>`. **No changes are needed in the mobile codebase** — the function response shape (`{ fileUrl, filePath }`) is preserved exactly.

### `tastyplates-v2` (Next.js) — `.env.local`

```env
# Add for Next.js upload proxy (if building an admin surface)
NEXT_PUBLIC_NHOST_SUBDOMAIN=<your-subdomain>
NEXT_PUBLIC_NHOST_REGION=<your-region>
HASURA_GRAPHQL_ADMIN_SECRET=<your-admin-secret>
NHOST_STORAGE_BUCKET=tasty-bucket
NEXT_PUBLIC_FUNCTIONS_URL=https://<subdomain>.functions.<region>.nhost.run/v1
```

---

## React Native (Expo) — Mobile Upload Path

The mobile app's `uploadService.ts` is already correct for the new Nhost Storage backend. The full call chain:

```
User selects photo (ImagePicker)
  └─ expo-image-picker returns { uri, name, type }
        └─ uploadService.uploadImageToS3(file)
              └─ FormData: file field = { uri, name, type }
              └─ fetch POST ${FUNCTIONS_URL}/upload/image
                 Authorization: Bearer <JWT>
                    └─ function: requireAuth → busboy → sharp → dedup → Nhost Storage
                          └─ returns { ok: true, data: { fileUrl, filePath, mediaUuid, deduped } }
              └─ caller stores data.fileUrl on the entity (review image, profile pic, etc.)
```

### Using `UploadContext` for progress UI

`UploadContext` is the standard for all multi-file uploads (reviews). The sequence:

```tsx
import { useUpload } from '@/contexts/UploadContext'
import { uploadImageToS3 } from '@/services/uploadService'

const { startUpload, updateProgress, completeUpload, resetUpload } = useUpload()

const handleUpload = async (files: UploadableFile[]) => {
  startUpload(files.length)
  const urls: string[] = []

  for (let i = 0; i < files.length; i++) {
    const result = await uploadImageToS3(files[i])
    urls.push(result.fileUrl)
    updateProgress(i + 1, files.length)
  }

  completeUpload()
  return urls  // store these on the review mutation
}
```

`startUpload(n)` → `updateProgress(i+1, n)` per file → `completeUpload()`.
On any failure: call `resetUpload()` then show `customToast.error(...)`.

### Single-file upload (profile photo, restaurant listing image)

```tsx
import { uploadImageToS3 } from '@/services/uploadService'

const result = await uploadImageToS3({
  uri:  pickerResult.assets[0].uri,
  name: 'profile.jpg',
  type: 'image/jpeg',
})
// result.fileUrl → store in user_profiles.profile_image or restaurants.featured_image_url
```

No `UploadContext` needed for single-file uploads — just update local state directly.

---

## Next.js Admin — Upload Proxy

For any Next.js admin surface in `tastyplates-v2`, do **not** forward binary bytes through a serverless function if avoidable. The recommended pattern proxies the request directly to the Nhost Function, adding the admin secret:

```typescript
// src/app/api/v1/upload/image/route.ts  (Next.js App Router)

import { type NextRequest, NextResponse } from 'next/server'

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_FUNCTIONS_URL
const ADMIN_SECRET  = process.env.HASURA_GRAPHQL_ADMIN_SECRET

export const runtime = 'nodejs'  // required for binary body handling
export const maxDuration = 30

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!FUNCTIONS_URL || !ADMIN_SECRET) {
    return NextResponse.json({ ok: false, error: 'Upload not configured' }, { status: 503 })
  }

  // Verify session (check nhost_access_token cookie or Authorization header)
  const token =
    req.cookies.get('nhost_access_token')?.value ??
    req.headers.get('Authorization')?.replace('Bearer ', '') ??
    null

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Forward the multipart body directly to the Nhost Function
  // — no intermediate arrayBuffer() call to avoid memory pressure on large files
  const upstream = await fetch(`${FUNCTIONS_URL}/upload/image`, {
    method: 'POST',
    headers: {
      'Content-Type': req.headers.get('Content-Type') ?? 'multipart/form-data',
      'Authorization': `Bearer ${token}`,
    },
    body: req.body,
    // @ts-expect-error — Node.js fetch duplex required for streaming body
    duplex: 'half',
  })

  const json = await upstream.json()
  return NextResponse.json(json, { status: upstream.status })
}
```

**Admin client call (`src/lib/admin-api.ts`):**

```typescript
export interface UploadResult {
  fileUrl:   string
  filePath:  string
  mediaUuid: string
  deduped:   boolean
}

export async function uploadMediaAsset(file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)

  const res  = await fetch('/api/v1/upload/image', { method: 'POST', body: form })
  const json = await res.json() as { ok: boolean; data?: UploadResult; error?: string }

  if (!json.ok || !json.data) {
    throw new Error(json.error ?? 'Upload failed')
  }
  return json.data
}
```

---

## API Response Shape

`POST /v1/upload/image` (Nhost Function — same shape returned to all clients):

```json
{
  "ok": true,
  "data": {
    "fileUrl":   "https://<subdomain>.storage.<region>.nhost.run/v1/files/<uuid>",
    "filePath":  "storage/<uuid>",
    "mediaUuid": "<catalog-row-uuid>",
    "deduped":   false
  }
}
```

| Field | Meaning |
|-------|---------|
| `fileUrl` | **Store this** on the entity (review image, profile photo, restaurant listing) |
| `filePath` | `storage/<uuid>` — for reference; not needed for display |
| `mediaUuid` | `media_assets.uuid` — use as FK if your schema links entities to the catalog |
| `deduped` | `true` if identical file bytes were already in Storage — same `fileUrl` returned |

---

## Image Serving — Display URLs

After upload, `fileUrl` is the public Nhost Storage URL:

```
https://<subdomain>.storage.<region>.nhost.run/v1/files/<uuid>
```

**Bucket visibility:**
- If `tasty-bucket` has **public download** enabled → this URL works directly in `<Image>` without auth headers.
- If the bucket is **private** → image display requires a proxy that adds `x-hasura-admin-secret`. For the Next.js admin surface, add a display proxy route. For the mobile app, use the public bucket — review images and restaurant photos are public content.

**Recommended setting for Tastyplates:** Enable public download on `tasty-bucket` for the `media_assets` use case (review photos, restaurant images). User profile photos can be public as well — the URLs are opaque UUIDs, not guessable.

---

## Dedup and Repair Logic

```
Incoming upload
  │
  ▼
SHA-256 of compressed bytes
  │
  ├─ No existing row → upload to Storage → insert media_assets → return fileUrl
  │
  ├─ Row exists, storage_file_id present
  │     │
  │     ├─ Verify Storage file exists (HEAD presigned URL)
  │     │     ├─ File OK → return existing fileUrl (deduped: true)
  │     │     └─ File missing (orphan) → re-upload → update media_assets row
  │     └─ Return fileUrl
  │
  └─ Row exists, no storage_file_id (legacy S3 row)
        └─ Upload to Nhost Storage → update media_assets → return new Nhost fileUrl
```

---

## Migration — Existing S3 URLs

Entities currently storing S3 URLs (`https://s3.amazonaws.com/...` or custom S3 domain) need backfilling. Run as a one-time script via a Nhost Function:

```
POST /v1/admin/migrate-media
```

For each entity row:
1. Fetch the image bytes from the S3 URL
2. Upload to Nhost Storage via `uploadToNhostStorage()`
3. Insert a `media_assets` row with the new Nhost `public_url`
4. Update the entity row (`restaurant.featured_image_url`, `review_images[].source_url`, `user_profiles.profile_image`) to the new Nhost URL

Until migration is complete, both S3 and Nhost URLs coexist. The mobile app and web frontend must handle both URL shapes in `<Image>` `source` props.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `content_type = application/octet-stream` in `storage.files` | Corrupted bytes reaching hasura-storage | Verify `buildMultipart` boundary is correct; re-upload via updated function |
| `Upload failed (413)` | File exceeds Nhost Storage upload limit | Reduce `IMAGE_MAX_WIDTH` / `IMAGE_MAX_HEIGHT` or increase bucket limit in Dashboard |
| `deduped: true` but image 404 | Orphan UUID — Storage file deleted externally | Re-upload the same file — function repairs the row |
| `Failed to save media catalog entry` | Hasura admin secret wrong or `media_assets` table not tracked | Verify `HASURA_GRAPHQL_ADMIN_SECRET`; ensure `tables.yaml` includes `public_media_assets.yaml` |
| `field 'media_assets' not found in query_root` | Table not tracked in Hasura metadata | Add YAML + `tables.yaml` entry; push and redeploy |
| Mobile: `You must be signed in to upload images` | `getAccessToken()` called before session hydrates | Gate upload behind `useSession().isReady === true` |
| Mobile: `EXPO_PUBLIC_NHOST_FUNCTIONS_URL is not set` | Env var missing from `.env` | Add `EXPO_PUBLIC_NHOST_FUNCTIONS_URL` to `.env` |
| Next.js: `Upload not configured` (503) | `NEXT_PUBLIC_FUNCTIONS_URL` or `HASURA_GRAPHQL_ADMIN_SECRET` missing | Add to `.env.local` |

---

## Key Source Files

| Repo | File | Role |
|------|------|------|
| `tastyplates-nhost` | `functions/upload/image.ts` | **Upload handler** — auth, Busboy, Sharp, dedup, Nhost Storage POST, catalog insert |
| `tastyplates-nhost` | `functions/_lib/hasura.ts` | `hasuraAdmin()` query/mutation wrapper |
| `tastyplates-nhost` | `functions/_lib/auth.ts` | `requireAuth()` + `getUserId()` |
| `tastyplates-nhost` | `functions/_lib/respond.ts` | `ok()` + `fail()` envelope |
| `tastyplates-nhost` | `nhost/migrations/default/.../up.sql` | `media_assets` table DDL |
| `tastyplates-nhost` | `nhost/metadata/.../public_media_assets.yaml` | Hasura tracking + permissions |
| `tastyplates-mobile` | `services/uploadService.ts` | Mobile upload client — **no changes needed** |
| `tastyplates-mobile` | `contexts/UploadContext.tsx` | Progress state (start/update/complete/reset) |
| `tastyplates-v2` | `src/app/api/v1/upload/image/route.ts` | Next.js proxy to Nhost Function |
| `tastyplates-v2` | `src/lib/admin-api.ts` | Admin client upload helper |

---

## Deployment Checklist

- [ ] `MEDIA_STORAGE_BUCKET=tasty-bucket` set in Nhost Dashboard → Secrets
- [ ] `NHOST_SUBDOMAIN`, `NHOST_REGION`, `HASURA_GRAPHQL_ADMIN_SECRET` set in Nhost Dashboard
- [ ] `tasty-bucket` created in Nhost Dashboard → Storage → Buckets
- [ ] `tasty-bucket` public download enabled (for review photos + restaurant images)
- [ ] SQL migration run: `media_assets` table created with indexes
- [ ] `public_media_assets.yaml` added to `nhost/metadata/`
- [ ] `tables.yaml` updated with `!include public_media_assets.yaml`
- [ ] Metadata committed and deployed (`git push` → verify Nhost deploy log shows `Applying metadata...`)
- [ ] `functions/upload/image.ts` updated and deployed
- [ ] Mobile app: `EXPO_PUBLIC_NHOST_FUNCTIONS_URL` in `.env`
- [ ] Mobile app smoke test: upload a review photo → check `storage.files` in Nhost Dashboard → check `media_assets` row in Hasura
- [ ] Next.js (if applicable): `NEXT_PUBLIC_FUNCTIONS_URL` and `HASURA_GRAPHQL_ADMIN_SECRET` in `.env.local`
- [ ] Remove legacy S3 env vars after migration is confirmed complete