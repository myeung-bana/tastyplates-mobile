# Architecture — Tastyplates Mobile

## System overview

`tastyplates-mobile` is a **React Native (Expo) application** that runs natively on Android and iOS from a single TypeScript codebase.

There is no server-side rendering, no Next.js App Router, no BFF API layer, and no Capacitor WebView. This is a genuine native app that talks directly to Nhost.

```text
Android / iOS device
  └─ Expo (React Native) — tastyplates-mobile
       ├─ Nhost Auth      (JWT sessions, token storage via SecureStore)
       ├─ Nhost GraphQL   (primary CRUD via Apollo Client)
       └─ Nhost Storage   (photo uploads from device)
```

---

## Tech stack

| Layer | Library / Tool |
|-------|---------------|
| **Runtime** | Expo SDK 54, React Native 0.81, New Architecture (Fabric + TurboModules) |
| **Language** | TypeScript (`strict: true`) |
| **Routing** | Expo Router v4 (file-based, stack + tabs) |
| **UI components** | Gluestack UI v3 + NativeWind v4 (Tailwind CSS utility classes) |
| **Animations** | React Native Reanimated 4 (UI-thread, 60fps) |
| **Gestures** | React Native Gesture Handler |
| **Lists** | FlashList v2 (Shopify, replaces FlatList) |
| **Auth** | `@nhost/react-native` — JWT sessions, token refresh, SecureStore |
| **GraphQL client** | Apollo Client 3 + `@nhost/apollo` (auth header injection) |
| **State** | Zustand (lightweight global state) |
| **Forms** | React Hook Form + Zod |
| **Build** | EAS Build (cloud, no local Xcode / Android Studio required) |
| **Deployment** | EAS Submit → Play Store (Android first), App Store (iOS later) |

---

## Repository layout

```
app/                          # Expo Router screens (file-based routing)
  (tabs)/                     # Bottom tab navigator
    index.tsx                 # Home feed
    restaurants.tsx           # Restaurant discovery
    following.tsx             # Following feed (auth required)
    studio.tsx                # TastyStudio dashboard (auth required)
    profile.tsx               # Own profile (auth required)
  restaurants/
    [slug].tsx                # Restaurant detail
    cuisines/[slug].tsx       # Cuisine-filtered browse
  reviews/
    viewer.tsx                # Full-screen immersive review viewer
  studio/
    add-review/
      index.tsx               # Step 1: search for restaurant
      [slug].tsx              # Step 2: write + upload photos
      create.tsx              # Create new restaurant listing
      success.tsx             # Post-submission confirmation
    review-listing.tsx        # All creator reviews (published + drafts)
    edit-review/[id].tsx      # Edit existing review
  listing/
    explanation.tsx
    step-1.tsx
    step-2.tsx
    draft.tsx
  profile/
    index.tsx                 # Own profile (redirects to (tabs)/profile)
    edit.tsx                  # Edit profile
    [username].tsx            # Public profile (read-only)
  settings/
    index.tsx
    account-security/
      profile.tsx
      password.tsx
    general/language.tsx
    support/about.tsx
  login.tsx
  register.tsx
  user-verification.tsx
  onboarding.tsx
  forgot-password.tsx
  reset-password.tsx          # Deep-link target from Nhost email
  hashtag/[hashtag].tsx
  privacy-policy.tsx
  cookie-policy.tsx
  terms-of-service.tsx
  content-guidelines.tsx
  _layout.tsx                 # Root layout — providers, global nav setup

components/
  ui/                         # Base UI primitives (Gluestack + custom)
  layout/                     # BottomNav, TopBar, SafeAreaWrapper
  auth/                       # Auth guards, redirect wrappers
  review/                     # ReviewCard, ReviewViewer, LikeButton, etc.
  restaurant/                 # RestaurantCard, RestaurantHeader, etc.
  studio/                     # TastyStudio-specific shared components
  feed/                       # FeedList, FeedItem, InfiniteScrollTrigger
  profile/                    # ProfileHeader, ReviewGrid, etc.

hooks/
  useSession.ts               # Canonical auth access — always use this
  useReviewLike.ts            # Like toggle with optimistic update
  useHaptic.ts                # Haptic feedback (Expo Haptics)
  usePagination.ts            # Cursor-based pagination helper
  useNhostSession.ts          # Nhost-specific session + profile hydration

lib/
  nhost.ts                    # Nhost client (mobile SDK, SecureStore)
  apollo.ts                   # Apollo Client instance wired with Nhost auth
  utils.ts                    # cn(), formatLikeCount(), generateProfileUrl(), etc.
  cursor-pagination.ts        # encodeReviewCursor / decodeReviewCursor

graphql/
  queries/                    # Apollo gql query constants by resource
    reviewQueries.ts
    restaurantQueries.ts
    userQueries.ts
  mutations/                  # Apollo gql mutation constants by resource
    reviewMutations.ts
    restaurantMutations.ts
    userMutations.ts

services/
  reviewService.ts            # Apollo mutation wrappers (toggleLike, createReview, etc.)
  restaurantService.ts
  userService.ts
  uploadService.ts            # Nhost Storage upload helpers

contexts/
  UploadContext.tsx           # Global upload progress state

constants/
  screens.ts                  # All screen path constants (never hardcode strings)
  featureFlags.ts

types/
  graphql.ts                  # GraphQL response types
  index.ts                    # Shared domain types

interfaces/
  restaurant.ts
  review.ts
  user.ts
```

---

## Authentication architecture

### Client auth

The Nhost client is initialized in `lib/nhost.ts` using `@nhost/react-native`, which uses Expo SecureStore for token persistence.

```typescript
import { NhostClient } from '@nhost/react-native';
import * as SecureStore from 'expo-secure-store';

export const nhost = new NhostClient({
  subdomain: process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN!,
  region: process.env.EXPO_PUBLIC_NHOST_REGION!,
  clientStorageType: 'expo-secure-store',
  clientStorage: SecureStore,
});
```

### Session model

Always use `hooks/useSession.ts` as the unified auth interface in components:

- `useSession()` returns `{ user, authUser, loading, error }`
- `useAuth()` returns `{ isAuthenticated, user, authUser, loading }` — use for simple auth guards

Never call `nhost.auth.*` directly from feature components. All auth access goes through `useSession`.

### Apollo Client + Nhost auth

Apollo Client is configured in `lib/apollo.ts` using `@nhost/apollo`, which automatically injects the Nhost JWT as the `Authorization` header on every request and handles token refresh.

```typescript
import { NhostApolloProvider } from '@nhost/react-apollo';

// In root _layout.tsx:
<NhostProvider nhost={nhost}>
  <NhostApolloProvider nhost={nhost}>
    <Slot />
  </NhostApolloProvider>
</NhostProvider>
```

### Auth flow wiring

Auth guarding and redirects are handled at the layout level, not in individual screens:

- Root `_layout.tsx` wraps everything in `NhostProvider` + `NhostApolloProvider`
- Protected routes check `useAuth().isAuthenticated` and redirect to `/login` if false
- Post-login redirect: `useSession` detects unverified email → `/user-verification`; incomplete onboarding → `/onboarding`

### Password reset (deep link)

- User requests reset → Nhost sends email with link to `tastyplates://reset-password?token=...`
- Expo Router handles the deep link, `/reset-password` screen extracts the token, Nhost exchanges it for a session, UI calls `changePassword`.

---

## Data access

### Nhost GraphQL (direct, with user JWT)

All CRUD operations go through Apollo Client directly to Nhost's Hasura GraphQL endpoint. There is no BFF or server middleware — the JWT permissions defined in Hasura control what each user can read and write.

```typescript
// Example query in a component
const { data, loading } = useQuery(GET_RESTAURANT_REVIEWS, {
  variables: { slug, limit: 16 },
});
```

### Nhost Storage (uploads)

Photo uploads go from the device directly to Nhost Storage via the Nhost React Native SDK. The app never streams files through a proxy server.

```typescript
import { useNhostClient } from '@nhost/react-native';

const nhost = useNhostClient();
const { fileMetadata, error } = await nhost.storage.upload({ file });
```

Progress is tracked via the upload context (`contexts/UploadContext.tsx`) and displayed as a single fixed progress bar — not stacked toasts.

---

## Navigation architecture

Navigation is file-based via Expo Router v4. The root layout defines the shell:

- **Bottom tab navigator** (`(tabs)/`) — Home, Restaurants, Following, Studio, Profile
- **Stack navigators** inside each tab for drill-down screens (restaurant detail, review viewer, profile, etc.)
- **Modal stacks** for auth flows (login, register, forgot password)
- **Deep links** handled by Expo Router's built-in linking config (password reset, notification taps)

All screen path strings live in `constants/screens.ts`. Never hardcode path strings in components.

---

## Performance architecture

### Lists

- Use `FlashList` from `@shopify/flash-list` everywhere. Never use `FlatList` or `ScrollView` for long lists.
- **Cursor pagination** is the default for all infinite-scroll feeds. Page size: `limit=16` for feeds, `limit=8` initial for grids.
- `IntersectionObserver`-equivalent: use `onEndReached` + `onEndReachedThreshold` on FlashList to trigger load-more.

### Animations and interactions

- All animated values use Reanimated 4 `useSharedValue` / `useAnimatedStyle` — runs on UI thread, never JS thread.
- Gesture interactions use Gesture Handler — native recognition, no JS roundtrip.
- Optimistic updates are mandatory for likes, comments, follow toggles. Never block the UI waiting for a server response.

### Batch queries, not N+1

- Never loop over a result set and fire a query per item.
- Use batch GraphQL queries (e.g., restaurants by UUIDs, authors with reviews) to fetch related data in one call.
- Feed queries must return denormalized author + restaurant data in a single response.

---

## Build targets

### Android (primary)

```bash
# Development build (installs on device/emulator)
eas build --platform android --profile development

# Preview APK (internal testing)
eas build --platform android --profile preview

# Production AAB (Play Store)
eas build --platform android --profile production
```

### iOS (second phase)

```bash
eas build --platform ios --profile production
```

No local Android Studio or Xcode installation is required for EAS cloud builds.

---

## Configuration

### Environment variables (`.env`)

All public env vars are prefixed `EXPO_PUBLIC_`:

```env
EXPO_PUBLIC_NHOST_SUBDOMAIN=your-subdomain
EXPO_PUBLIC_NHOST_REGION=your-region
EXPO_PUBLIC_SITE_URL=https://tastyplates.com
```

No secret keys are bundled in the app binary.

### Tailwind / NativeWind

`tailwind.config.ts` uses the NativeWind preset. Brand tokens:

- Primary: `#ff7c0a`
- Font: `neusans` (loaded via `expo-font`)
- All conditional class merging uses `cn(...inputs)` from `lib/utils.ts`

### TypeScript

`tsconfig.json` strict mode with `@/*` path alias pointing to the repo root.