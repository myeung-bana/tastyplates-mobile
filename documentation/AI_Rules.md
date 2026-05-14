# AI Rules — Tastyplates Mobile

This file is the **single source of truth** for how this codebase must be developed.

Every rule below is grounded in what is **actually implemented** in the codebase today.
If any other document — old or new — conflicts with this file, **this file wins**.

---

## 1. Project invariants (non-negotiable)

- **Expo Router v4** is the routing model. All screens live in `app/`.
- **TypeScript everywhere.** `strict: true` is enabled. Do not introduce `any` to suppress errors — define the type properly.
- **No secrets in the app binary.** No admin credentials, no server-only tokens, and no sensitive keys may be included in the Expo build. Only `EXPO_PUBLIC_*` env vars are accessible in the app.
- **No BFF layer, no API routes, no server-side rendering.** This is a mobile-only frontend. All data access goes directly to Nhost (GraphQL + Auth + Storage). There are no Next.js route handlers, no Express servers, and no proxy endpoints in this repo.
- **Nhost is the only auth provider.** There is no Firebase, no legacy fallback, no feature flag for an alternative auth path.
- **React Native New Architecture is required.** Fabric + TurboModules are on by default (Expo SDK 54). Do not introduce any library that is incompatible with the New Architecture.

---

## 2. Directory layout (enforced)

```
app/                          # Expo Router screens (file-based routing)
  (tabs)/                     # Bottom tab navigator root
  _layout.tsx                 # Root layout — providers, global setup

components/
  ui/                         # Base UI primitives (Gluestack + custom)
  layout/                     # BottomNav, TopBar, SafeAreaWrapper
  auth/                       # Auth guards, redirect wrappers
  review/                     # ReviewCard, ReviewViewer, LikeButton, etc.
  restaurant/                 # RestaurantCard, RestaurantHeader, etc.
  studio/                     # TastyStudio-specific shared components
  feed/                       # FeedList, FeedItem, InfiniteScrollTrigger
  profile/                    # ProfileHeader, ReviewGrid, etc.

hooks/                        # Custom hooks
lib/                          # Shared utilities (nhost.ts, apollo.ts, utils.ts, etc.)
graphql/
  queries/                    # Apollo gql query constants by resource
  mutations/                  # Apollo gql mutation constants by resource
services/                     # Apollo mutation wrappers and upload helpers
contexts/                     # React context providers (UploadContext, etc.)
constants/                    # Screen paths (screens.ts), feature flags
types/                        # Shared TypeScript interfaces
interfaces/                   # Domain interfaces (restaurant, review, user)
```

### Colocated screen components

Screen-specific components go in `_components/` next to the screen file:

```
app/studio/add-review/
  _components/
    ReviewFormClient.tsx
  [slug].tsx
```

---

## 3. Authentication (non-negotiable)

### Client-side session

- **Always use `hooks/useSession.ts`** for component-level auth access. Never call `nhost.auth.*` directly in a feature component.
- `useSession()` returns `{ user, authUser, loading, error }`.
- `useAuth()` returns `{ isAuthenticated, user, authUser, loading }` — use for simple auth guards.

### Getting an access token in client code

- Use `getAccessToken()` from `hooks/useSession.ts`. Never call `nhost.auth.getAccessToken()` directly from feature components.

### Identity rule

All auth-derived identity must come from the active Nhost session. Never derive user identity from a user-supplied parameter, route param, or form field.

### Auth provider wiring

The root `app/_layout.tsx` wraps everything in:

```tsx
<NhostProvider nhost={nhost}>
  <NhostApolloProvider nhost={nhost}>
    <Slot />
  </NhostApolloProvider>
</NhostProvider>
```

This must never be removed or moved to a child layout.

---

## 4. Data access rules

All data access goes directly to Nhost. There are no server-side API routes in this codebase.

### Nhost GraphQL (Apollo Client)

- Use Apollo Client (`lib/apollo.ts`) for all GraphQL queries and mutations.
- Apollo is pre-wired with `@nhost/apollo` — the Nhost JWT is injected automatically on every request.
- Store all query and mutation strings in `graphql/queries/{resource}Queries.ts` and `graphql/mutations/{resource}Mutations.ts`.
- Use `gql` tagged template literals for all query strings (Apollo requires this for the client — unlike server-side Hasura calls in the web project).
- Minimise fields in queries — only request fields the consumer actually uses.

```typescript
// graphql/queries/reviewQueries.ts
import { gql } from '@apollo/client';

export const GET_RESTAURANT_REVIEWS = gql`
  query GetRestaurantReviews($slug: String!, $limit: Int!, $cursor: timestamptz) {
    reviews(
      where: { restaurant: { slug: { _eq: $slug } }, created_at: { _lt: $cursor } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      body
      rating
      created_at
      author { id username display_name avatar_url }
      photos { url }
    }
  }
`;
```

### Service layer

Every resource consumed from the UI needs a service wrapper in `services/{resource}Service.ts` for mutations and imperative operations. Components never call Apollo mutations directly — they go through the service.

```typescript
// services/reviewService.ts
import { apolloClient } from '@/lib/apollo';
import { TOGGLE_LIKE } from '@/graphql/mutations/reviewMutations';

class ReviewService {
  async toggleLike(reviewId: string, userId: string) {
    const { data } = await apolloClient.mutate({
      mutation: TOGGLE_LIKE,
      variables: { review_id: reviewId, user_id: userId },
    });
    return data;
  }
}
export const reviewService = new ReviewService();
```

### Nhost Storage (uploads)

Photo uploads go from the device directly to Nhost Storage via the Nhost React Native SDK. Never buffer through a proxy.

```typescript
const { fileMetadata, error } = await nhost.storage.upload({ file });
```

Use `contexts/UploadContext.tsx` for global upload progress state. Display a **single fixed progress bar** — not stacked toasts.

---

## 5. GraphQL patterns

### Cursor pagination (preferred for feeds)

- Cursors encode `{ created_at, id }` as a base64url JSON string using `encodeReviewCursor` / `decodeReviewCursor` from `lib/cursor-pagination.ts`.
- Apollo queries for feeds use `fetchMore` to append next pages.
- Every paginated response must include a `cursor` and `hasMore` signal.
- DB indexes required: `(created_at DESC, id DESC)` on `restaurant_reviews`.

### Page size defaults

- Feeds: `limit=16` default, cap at `100`.
- Grid views: `limit=8` initial, `limit=16` load-more.
- Never load unbounded lists.

### Batch queries, not N+1

- Never loop over a result set and fire a query per item.
- Use batch queries (e.g., restaurants by UUIDs) to fetch related data in one call.
- Feed queries must return denormalized author + restaurant data in a single response.

---

## 6. Component rules

### Placement

| What | Where |
|------|-------|
| Base UI primitives (Button, Input, Card, etc.) | `components/ui/` |
| Layout chrome (BottomNav, TopBar) | `components/layout/` |
| Reusable feature components | `components/<feature>/` |
| Screen-specific components | `app/**/_components/` |
| TastyStudio shared components | `components/studio/` |

### Styling

- Use **NativeWind (Tailwind) utility classes** exclusively via `className`. No inline `style={{}}` except for dynamic values that cannot be expressed as Tailwind classes (e.g., animated transforms from Reanimated).
- Use `cn(...inputs)` from `lib/utils.ts` for all conditional class merging — never string concatenation.
- Brand primary color: `#ff7c0a`. Use for active states, CTAs.
- Font: `neusans` for TastyStudio screens and where brand typography is required.

### Server vs client components

This is a React Native app — there are no Server Components, no `"use client"` directives, and no SSR. All components are client components by definition.

---

## 7. Animation and gesture rules

- **All animations use Reanimated 4.** Use `useSharedValue`, `useAnimatedStyle`, and `withSpring` / `withTiming`. Never use `Animated` from React Native core for non-trivial animations.
- **All gesture handling uses Gesture Handler.** Use `GestureDetector` with the Gesture API. Never use the `PanResponder` API.
- **Optimistic updates are mandatory** for likes, comments, follow toggles. The UI must update before the GraphQL mutation resolves. If the mutation fails, the update must revert cleanly.
- The `useReviewLike` hook is the canonical implementation of optimistic like logic — do not reimplement inline.

---

## 8. Hooks and state

### Session hooks (canonical)

| Hook | Use for |
|------|---------|
| `useSession()` | App-level auth state in any component |
| `useAuth()` | Simple `isAuthenticated` check |
| `useNhostSession()` | Direct Nhost auth + profile hydration (avoid in feature components) |

### Like interactions (canonical — non-negotiable)

Always use `useReviewLike` from `hooks/useReviewLike.ts`. Do not implement inline like logic in components.

The hook provides:
- `isLiked`, `likesCount` — display state
- `toggleLike()` — fires optimistic update, locks while in-flight, reverts on error
- `isLoading` — brief cooldown lock (220 ms) to prevent double-tap chaos
- `onConfirm` callback — lets the parent list sync the updated state after server confirmation

**Rules:**
- Never call the like mutation directly from a component.
- Never refetch the entire feed after a like toggle — patch only the affected item.

### Global state

Use Zustand for global state that must be shared across screens (e.g., upload progress, notification badge counts). Do not reach for Zustand for local component state — `useState` is correct for that.

### Navigation (canonical)

Always use constants from `constants/screens.ts` for internal routes. Never hardcode path strings in components.

```typescript
// ✅
import { STUDIO_ADD_REVIEW } from '@/constants/screens';
router.push(STUDIO_ADD_REVIEW);

// ❌
router.push('/studio/add-review');
```

---

## 9. Toast and feedback notifications

Use the app's notification utility (`utils/toast.ts`) wrapping a React Native-compatible toast library. Do not call the library directly from feature components.

```typescript
import customToast from '@/utils/toast';

customToast.success('Review published!');
customToast.error('Something went wrong');
customToast.loading('Uploading...');
```

**Rules:**
- **No success toasts for micro-interactions** (likes, bookmarks, toggles). These must be silent or optimistic-only.
- Reserve success toasts for user-initiated operations with meaningful outcomes (review published, profile saved, etc.).
- Reserve error toasts for failures the user needs to act on.
- **One toast at a time** for long-running operations (uploads). Use `UploadContext` and the progress bar — not stacked toasts.

---

## 10. Upload and image handling

- Photos are uploaded from the device directly to **Nhost Storage** using the Nhost React Native SDK.
- Use `contexts/UploadContext.tsx` for global upload progress state.
- The upload UX must be a **single fixed progress bar** (not multiple toast notifications) while files are uploading.
- After upload, store the returned Nhost Storage file URL in the review mutation — never store raw device paths.

---

## 11. Lists and scroll performance

- **Always use `FlashList`** from `@shopify/flash-list` for all lists. Never use `FlatList` or `ScrollView` for lists that can grow.
- Set `estimatedItemSize` on every FlashList instance — measure a representative item and use that value.
- Use `onEndReached` + `onEndReachedThreshold={0.5}` to trigger cursor-paginated load-more.
- Do not use list virtualization libraries beyond FlashList — it handles this internally.

---

## 12. TypeScript patterns

### Interfaces and types

- Define domain interfaces in `interfaces/` (restaurant, review, user).
- Define GraphQL response types in `types/graphql.ts` or co-located with the query.
- Use `interface` for objects, `type` for unions and utility types.

### Utility functions (canonical, in `lib/utils.ts`)

| Function | Purpose |
|----------|---------|
| `cn(...inputs)` | Conditional NativeWind/Tailwind class merging |
| `formatLikeCount(n)` | 1234 → `1.2k`, 1234567 → `1.2M` |
| `generateProfileUrl(id, username?)` | Canonical profile path builder |
| `parseProfileUrl(param)` | Profile path parser |
| `validateUsername(username)` | Username policy enforcement |
| `generateDefaultUsername()` | Secure random `user_xxxxxxxx` generation |
| `formatDate(str)` / `formatDateT(str)` | Date string → `DD/MM/YYYY` |

Do not reinvent these in components — import from `@/lib/utils`.

### No magic `any`

If a GraphQL response type is unknown, define an explicit interface. Using `any` to silence a TS error is a red flag.

---

## 13. Performance rules

### Feed rendering

- **Cursor pagination** is the default for infinite-scroll feeds.
- **FlashList** is mandatory for all scrollable lists.
- Never fire a query per list item — use batch queries.
- Defer non-critical work (follow-status checks, image preloads) until after first paint.

### Interaction latency

- Likes: optimistic update is mandatory (see `useReviewLike`).
- Comments: show a temporary "pending" entry immediately on submit; replace with server response on success.
- Do not block the UI waiting for a write to confirm before updating visual state.

### Animation budget

- Reanimated 4 runs on the UI thread — use it for any animation that runs during interaction or scroll.
- Never run layout calculations or style computations on the JS thread inside an animation.

---

## 14. Address formatting (restaurants)

Always use this priority order:

1. `googleMapUrl.streetAddress` (full string from Google Places)
2. Composed from `googleMapUrl` components (`streetNumber streetName, city, stateShort, countryShort, postCode`)
3. `listingStreet` (plain text fallback)
4. `"No address available"`

The canonical utility: `getBestAddress(googleMapUrl, listingStreet)` in `utils/addressUtils.ts`.

---

## 15. What to treat as outdated

Do not follow guidance from these legacy concepts:

- Anything referencing Next.js, App Router, API routes, or server components — this is a React Native app.
- Any reference to a BFF (`/api/v1/...`) — all data access goes directly to Nhost.
- Firebase auth — there is no Firebase in this codebase.
- Capacitor or WebView-based native wrappers — this is a genuine React Native app.
- Upstash Redis — there is no server-side caching layer in the mobile app.
- `NEXT_PUBLIC_*` env vars — use `EXPO_PUBLIC_*` instead.
- `next/navigation`, `useRouter` from Next.js — use `expo-router`'s `useRouter`.

---

## 16. Making changes — workflow checklist

When adding or modifying a feature:

1. **Screen** — add/modify in `app/{route}/`.
2. **GraphQL query/mutation** — add to `graphql/queries/` or `graphql/mutations/`.
3. **Service layer** — expose via `services/{resource}Service.ts`.
4. **Hook/state** — if the interaction affects shared state (likes, follow, upload), update or use the canonical hook.
5. **Constants** — add any new screen routes to `constants/screens.ts`.
6. **TypeScript** — run `yarn type-check` and fix all new errors before committing.
7. **Android build** — run `eas build --platform android --profile development` to verify the build is clean before submitting for review.