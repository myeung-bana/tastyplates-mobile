# Product Plan — Tastyplates Mobile

## Versioning model

This file is the **version-controlled roadmap** for the Tastyplates mobile app.

- **App version**: `tastyplates-mobile/package.json` `version`
- **API contract**: Nhost GraphQL schema is managed by the `tastyplates-nhost` project. Treat schema changes as a versioned dependency.

---

## Current state (today)

### What is being built

A React Native (Expo) mobile app targeting Android first. The app is a genuine native frontend — no WebView, no Capacitor, no BFF. It communicates directly with Nhost for:

- Authentication (JWT sessions via `@nhost/react-native`)
- Data (GraphQL via Apollo Client + `@nhost/apollo`)
- File storage (photos via Nhost Storage)

### Tech stack locked in

| Layer | Choice |
|-------|--------|
| Runtime | Expo SDK 54, RN 0.81, New Architecture |
| Routing | Expo Router v4 |
| UI | Gluestack UI v3 + NativeWind v4 |
| Animations | Reanimated 4 + Gesture Handler |
| Lists | FlashList v2 |
| Auth | `@nhost/react-native` |
| GraphQL | Apollo Client 3 + `@nhost/apollo` |
| Build | EAS Build (cloud) |

### Platform delivery order

1. **Android** — primary build target. All features are built and validated on Android first.
2. **iOS** — second phase. The same codebase targets iOS once the Android build is stable and in the Play Store.

---

## Roadmap

### Phase 1 — Foundation (now)

Get the project scaffolded, all providers wired, and the critical auth + discovery path working end-to-end on Android.

- [ ] Expo project initialized with Expo Router v4, New Architecture enabled
- [ ] Gluestack UI v3 + NativeWind v4 installed and verified working
- [ ] Nhost client configured (`@nhost/react-native` with SecureStore token persistence)
- [ ] Apollo Client wired with `@nhost/apollo` for automatic JWT injection
- [ ] Root layout providers in place (`NhostProvider`, `NhostApolloProvider`)
- [ ] Bottom tab navigator scaffold (Home, Restaurants, Following, Studio, Profile)
- [ ] Auth screens: Login, Register, User Verification, Onboarding
- [ ] Password reset deep-link handling via Expo Router
- [ ] Auth guard pattern implemented at layout level (not per-screen)
- [ ] `constants/screens.ts` seeded with all route constants
- [ ] `useSession` / `useAuth` hooks implemented and connected to Nhost
- [ ] EAS Build configured for Android development + preview profiles

### Phase 2 — Core discovery and feeds

The home feed and restaurant discovery flow — the first thing a user experiences.

- [ ] Home feed screen — cursor-paginated review feed with FlashList
- [ ] Restaurant discovery screen — filter by city, cuisine, palate, rating
- [ ] Restaurant detail screen — photos, address, reviews list
- [ ] Full-screen immersive review viewer — swipeable, photo-forward, Reanimated-driven
- [ ] `useReviewLike` hook — optimistic like toggle, revert on error
- [ ] Following feed — reviews from followed users only (auth required)
- [ ] Hashtag feed screen
- [ ] Cuisine browse screen

### Phase 3 — Social graph and profiles

- [ ] Own profile screen — reviews, wishlists, check-ins, followers, following
- [ ] Edit profile screen — display name, bio, avatar upload to Nhost Storage
- [ ] Public profile screen — read-only, follow/unfollow action
- [ ] Follow / unfollow — optimistic toggle, synced with GraphQL mutation
- [ ] Suggested users to follow — palate-matched recommendations

### Phase 4 — TastyStudio (creator flow)

The end-to-end review creation experience.

- [ ] Studio dashboard — activity overview, quick actions
- [ ] Add review step 1 — restaurant search
- [ ] Add review step 2 — write review, set rating, attach photos
- [ ] Photo upload to Nhost Storage — single progress bar UX (no stacked toasts)
- [ ] Review submitted confirmation screen
- [ ] Review listing — published + drafts, edit + delete
- [ ] Edit review screen
- [ ] Restaurant listing flow (if restaurant doesn't exist) — explanation → step 1 → step 2

### Phase 5 — Settings, legal, and polish

- [ ] Settings screens (profile, password, language, about)
- [ ] Legal screens (privacy policy, terms, cookie policy, content guidelines)
- [ ] Haptic feedback via `expo-haptics` on key interactions (likes, follows, CTAs)
- [ ] Empty states and error states for all screens
- [ ] Offline graceful degradation (Apollo cache reads when no connectivity)
- [ ] App icon, splash screen, and store assets
- [ ] EAS Build production profile for Play Store `.aab`
- [ ] Play Store internal test track submission

### Phase 6 — iOS

- [ ] iOS build profile in EAS
- [ ] Deep link URL scheme configured for iOS (`tastyplates://`)
- [ ] TestFlight internal distribution
- [ ] App Store submission

---

## De-risking notes

### Gluestack UI v3 + Expo SDK 54

Gluestack UI v3 announced full Expo SDK 54 support in September 2025. If you hit overlay component issues (Modal, Drawer, Toast) on a fresh install, check that `react-native-safe-area-context` is `>= 5.4.0` and that the Reanimated Babel plugin references `react-native-worklets/plugin` (not the old `react-native-reanimated/plugin`).

### Nhost React Native SDK

Use `@nhost/react-native` (not `@nhost/nextjs` or `@nhost/react`) — the mobile SDK handles SecureStore token persistence and token refresh correctly on device. The web SDK will not work in a React Native environment.

### New Architecture (Fabric)

All libraries must be New Architecture compatible. Verify any new dependency against the React Native New Architecture compatibility list before adding it. Legacy bridge-only libraries will not work on Expo SDK 54 with New Architecture enabled.

### Android-first decisions

- Test on a real Android device via Expo Go or a development build — do not rely solely on the emulator for animation and gesture testing.
- Use `eas build --platform android --profile development` to install a development client on device.
- Android-specific layout concerns (status bar, back button behavior, edge-to-edge display) must be handled before iOS work begins.

---

## What is explicitly out of scope for this repo

- Any server-side logic, API routes, or middleware — this is a frontend-only mobile app
- Web or desktop builds from this codebase — the web version remains a separate Next.js project
- The Nhost/Hasura schema and migrations — managed by the `tastyplates-nhost` project
- Any Firebase integration — Nhost is the only auth and data provider
- AdSense or web advertising integrations
- PWA or Capacitor builds — those belong to the web project