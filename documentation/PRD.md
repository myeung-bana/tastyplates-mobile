# Product Requirements Document — Tastyplates Mobile

---

## What is Tastyplates?

Tastyplates is a **restaurant discovery and review platform** built for people who genuinely care about food.

It is not a generic listing directory. It is not a map app with star ratings bolted on. It is a place where food lovers can document their dining experiences, share them with people who share their taste, and discover restaurants through the lens of people whose palates actually match their own.

The core premise is simple: **the best restaurant recommendation is one that comes from someone who eats like you do.**

Tastyplates is designed to feel social and personal — more like a feed of stories from people you follow than a spreadsheet of restaurant data. The experience should feel closer to scrolling through a beautifully curated photo feed than flipping through a review aggregator.

The mobile app is a **React Native (Expo) application** targeting Android first, then iOS. It is a fully native frontend that communicates directly with Nhost (GraphQL + Auth + Storage) — there is no Next.js layer, no BFF, and no server-side rendering involved.

---

## Who is this for?

### The everyday food lover

Someone who wants to find a great place to eat in their city — not the most-reviewed or the most-talked-about, but the place that a person with their exact taste profile would genuinely love. They browse by cuisine, by vibe, by location. They look at what people who share their palate are saying. They save places they want to try and check in when they've been.

### The food creator / documenter

Someone who photographs their food, writes thoughtful reviews, and wants their content to live somewhere more meaningful than a buried Google review. **TastyStudio** is built specifically for them — a dedicated space to manage, publish, and track their reviews in a creator-friendly environment.

### The social diner

Someone who follows friends, tastemakers, and food personalities whose judgment they trust. They browse a **following feed** of recent reviews from the people they follow. They interact — they like reviews, leave comments, discover new places through the people they already know.

---

## What does the experience actually feel like?

### Discovery should feel effortless

When you open Tastyplates, you should land somewhere that immediately makes sense for where you are. The restaurants shown are relevant to your city, sorted by what matters — not just raw review counts, but quality signals that account for your palate preferences.

Browsing should feel smooth. Infinite scroll that doesn't stutter. Filters that respond instantly. Search that rewards intent, not just keyword matching. On mobile, this means 60fps scrolling, gesture-native interactions, and transitions that feel like the platform — not a web view.

### Reviews should feel human

A Tastyplates review is not a form you fill out. It is a moment you document. You pick a restaurant, write what you experienced, rate it, and attach photos. It lives on your profile and shows up in the feeds of people who follow you.

Reading reviews should feel like reading short stories, not data entries. The review viewer is designed to be immersive — full-screen, swipeable, photo-forward. On native mobile, swipe gestures are first-class, not approximations.

### Interactions should feel instant

Liking a review, leaving a comment, following someone — these need to feel immediate. There should be no moment where you tap and wait and wonder if it registered. The app responds first (optimistic update), then confirms with Nhost GraphQL in the background. If something goes wrong, it gracefully reverts and tells you.

### Uploading photos should be painless

The most common friction point in review apps is the photo upload. Tastyplates handles this with a single smooth progress experience — one progress bar, no stacked notifications, no mystery about whether your upload succeeded. Photos are uploaded to Nhost Storage and the app shows clear feedback throughout.

---

## What Tastyplates is NOT

**It is not a booking platform.** There are no reservation flows, no OpenTable integrations, no seating availability. We help you decide *where* to go.

**It is not a price comparison or deal site.** There are no discount coupons, no promotions, no cashback mechanics.

**It is not a data aggregator.** Restaurants are discovered and reviewed by real users.

**It is not a business management tool.** Restaurant owners don't have dashboards, don't respond to reviews, and don't manage their listings through Tastyplates.

**It is not a social network in the broad sense.** There are no DMs, no stories, no status updates. The social layer exists purely to make discovery more personal.

**It is not a web app or PWA.** The mobile app is a genuine React Native application compiled to native Android (and later iOS) binaries. There is no Capacitor wrapper, no WebView, no static export.

---

## Core product flows

### Signing in and getting started

A user creates an account with their email and password, or signs in with Google OAuth. Once they verify their email, they go through a short onboarding flow — the most important part of which is selecting their **palates** (the cuisine types they gravitate toward). This is the foundation of personalized discovery. After onboarding, they land on the main experience.

Auth is handled entirely by Nhost Auth (JWT sessions). The `@nhost/react-native` SDK manages token storage and refresh natively on device.

### Discovering restaurants

The Restaurants tab is the primary discovery surface. Users can:

- Browse restaurants for their selected city
- Filter by cuisine type, price range, or minimum rating
- Sort by overall quality, by palate match, or manually by rating
- See curated sections like "Recommended for you" (city-scoped editorial picks) and "Featured restaurants" (home tab highlight)

The most interesting behavior is **palate-based ranking**: restaurants reviewed by users who share your palate preferences surface first, with ratings calculated specifically from those matching reviewers.

### Restaurant detail (`/restaurants/[slug]`)

Tapping a restaurant from the **Restaurants** list (or elsewhere) opens a **stack** screen (`app/restaurants/_layout.tsx` + `[slug].tsx`) with a native header and back affordance.

- **Data:** Restaurant row via `restaurants-v2/get-restaurant-by-id?slug=…`; aggregate **overall / authentic** ratings via `restaurants-v2/get-rating-summary?uuid=…`; review previews via `restaurant-reviews/get-reviews-by-restaurant`. Pull-to-refresh reloads the same bundle.
- **Layout (recovery doc §4):** Paging **image carousel** (4:3, brand orange active dots per `restaurant.md`), **header** (title, share, palate/category/price pills, star row, address), **quick actions** — primary pill **Write a review** → Studio (`/studio/add-review/[slug]`), **Save** / **Check-in** use `restaurant-users/toggle-favorite` and `toggle-checkin` (requires sign-in; otherwise routes to login). **Ratings** — horizontal metric cards (Overall, Authentic). **Reviews** — horizontal preview cards and **View all** → `/reviews/viewer` with `restaurant_uuid` (viewer UI still evolving). **Location** — static map tile + link to Google Maps directions when lat/lng exist; phone `tel:`; optional hours string from JSON. **About** — text from `content` (HTML stripped). **Menu** — opens `menu_url` when HTTP(S).
- **Visual system:** Typography and colors follow `documentation/design_system.md` via `constants/brand` (e.g. `#31343F`, `#494D5D`, `#e5e7eb` borders, `#ff7c0a` CTAs, `#f59e0b` stars). Structural detail is specified in `documentation/restaurant.md` §4.
- **Deferred / not yet in native:** Full-screen image lightbox, embedded `MapView`, community-recognition badge aggregates (§4.7), and FlashList-based review rails can be layered on later.

### Reading and engaging with reviews

Reviews are the heart of the product. From a restaurant screen or the home feed, users can:

- View reviews in a full-screen immersive viewer (native swipe gestures, Reanimated-driven transitions)
- Like a review (instant, optimistic — the count updates before the GraphQL mutation confirms)
- Leave a comment or reply to an existing comment
- Follow the reviewer to see their future reviews in their feed

The **home feed** shows a mix of recent reviews. The **following feed** shows only reviews from people the user follows.

### Writing and publishing a review

From TastyStudio, a creator can:

- Search for a restaurant and attach their review to it
- Write their experience, rate the food, and upload photos
- Manage their draft and published reviews in a dedicated listing
- Edit or delete existing reviews

Photo uploads go directly to Nhost Storage with a single progress bar surface — no stacked toasts, no ambiguity.

### Saving and tracking

Users can save restaurants to a **wishlist** (places they want to try) and log **check-ins** (places they've actually been). Both are accessible from their profile tab.

### Profile tab (signed-in)

The **`/(tabs)/profile`** screen is the signed-in member hub. It implements:

- **Identity card** — Avatar (remote URL from Hasura when present, otherwise initials on a neutral surface), display name, bio from `users.metadata.bio`, and **palate pills** from `metadata.palates` using the same selected-state styling as cuisine/palate selectors in `design_system.md` (brand orange border, warm tint).
- **Activity metrics** — Counts for **reviews**, **wishlist**, **check-ins**, **followers**, and **following**. Data is loaded via Nhost HTTP functions (`restaurant-users/get-followers-count`, `get-following-count`, `get-reviews`, `get-wishlist`, `get-checkins`) with bearer auth where required; see `documentation/api_guide.md` §8.6. Users can **pull to refresh** to reload metrics.
- **Actions** — Rows for **Edit profile** (`/profile/edit`), **Settings** (`/settings`), **My reviews** (`/studio/review-listing`), and **Following feed** (`/(tabs)/following`). Visual design (cards, borders, typography colors, press feedback) follows `documentation/design_system.md`; detailed layout and data mapping are specified in `documentation/profile.md`.

**Signed-out:** Same tab shows short explanatory copy and a **Sign in** CTA that opens the full **`/login`** stack screen (pill switch **Log in** / **Sign up**); **`resume`** returns the user here after verification and onboarding (`lib/authRoutes.ts`).

### Social graph

Users can follow other users. Following someone means their reviews appear in your following feed. Tastyplates surfaces **suggested users** to follow — people whose palates likely overlap with yours.

---

## Platform

The mobile app targets:

- **Android** — primary, delivered first via EAS Build (`.aab` / `.apk`)
- **iOS** — second phase, same codebase, built with the same Expo + EAS pipeline

There is no web target from this codebase. The web version of Tastyplates remains a separate Next.js project. This repo is **mobile-only**.

---

## What success looks like for users

- A new user completes onboarding and immediately sees restaurants that feel relevant to them
- A food creator publishes a review in under two minutes with photos, and it looks great
- A diner finds a restaurant they've never heard of through the following feed, visits it, and posts their own review
- Someone opens Tastyplates on their phone in a new city and within 30 seconds has a shortlist of places to eat that actually match their taste

---

## Out of scope (by design)

- Restaurant management features for business owners
- Real-time features (live like counts, live comments) — the current model is optimistic/near-real-time, not WebSocket-driven
- Booking or reservation integrations
- User-to-user messaging
- A web or desktop build from this codebase
- Any server-side rendering, API routes, or BFF logic — all data access goes directly to Nhost

---

## Screen structure and screen map

Every screen in the app exists for a specific reason. Below is the full map of screens, grouped by the area of the product they belong to. Routes are expressed as Expo Router file-based paths.

---

### Public / entry point (no auth required)

| Screen | Route | What it does |
|--------|-------|--------------|
| **Home** | `/(tabs)/` | The landing experience. Shows the main review feed and featured/recommended restaurants. No sign-in required to browse. |
| **Restaurants** | `/(tabs)/restaurants` | The main discovery screen. Browse, filter, and sort restaurants by location, cuisine, palate match, and rating. |
| **Restaurant detail** | `/restaurants/[slug]` | **Implemented:** Stack screen with carousel, header, quick actions (review / save / check-in), rating cards, review previews, location + about + menu. See **Restaurant detail** under Core product flows and `documentation/restaurant.md` §4. |
| **Cuisine browse** | `/restaurants/cuisines/[slug]` | Filtered restaurant view for a specific cuisine type. |
| **Hashtag feed** | `/hashtag/[hashtag]` | Reviews tagged with a specific hashtag. |
| **Review viewer** | `/reviews/viewer` | Full-screen immersive review viewer, opened from cards in the feed or restaurant screen. Swipeable, photo-forward. |

---

### Authentication

| Screen | Route | What it does |
|--------|-------|--------------|
| **Login** | `/login` | Email/password sign-in or Google OAuth. |
| **Register** | `/register` | Create a new account with email/password or Google. |
| **User verification** | `/user-verification` | Shown after sign-up when email has not yet been verified. User can resend the verification email from here. |
| **Onboarding** | `/onboarding` | Shown after email verification. The user sets up their profile and selects their palate preferences. Required before accessing the full app. |
| **Forgot password** | `/forgot-password` | User enters their email to receive a reset link. |
| **Reset password** | `/reset-password` | User lands here from the email deep link and sets a new password. Nhost handles the token exchange. |

---

### Authenticated feed and social

| Screen | Route | What it does |
|--------|-------|--------------|
| **Following feed** | `/(tabs)/following` | Reviews from people the current user follows — the most personal, curated view of new content. |

---

### User profile

| Screen | Route | What it does |
|--------|-------|--------------|
| **Own profile** | `/(tabs)/profile` | **Implemented:** identity (avatar, name, bio, palates), live activity counts (reviews, wishlist, check-ins, followers, following via Nhost functions), and shortcuts to edit profile, settings, studio review list, and following feed. Signed-out: login sheet. Full spec: `documentation/profile.md`. |
| **Edit own profile** | `/profile/edit` | Edit display name, bio, profile photo, and palate preferences. |
| **Public profile** | `/profile/[username]` | Another user's public profile — same layout, viewed in read-only mode with follow/unfollow action. |

---

### TastyStudio — creator hub

TastyStudio is the dedicated section for users who create reviews. It uses a bottom-tab entry point on mobile, with a stack navigator inside.

| Screen | Route | What it does |
|--------|-------|--------------|
| **Studio dashboard** | `/(tabs)/studio` | Overview of the creator's activity — review count, recent posts, quick actions. |
| **Add review (search)** | `/studio/add-review` | Step 1 of creating a review — search for and select the restaurant. |
| **Add review (write)** | `/studio/add-review/[slug]` | Step 2 — write the review, rate the experience, and attach photos. |
| **Add review (create new)** | `/studio/add-review/create` | Alternative entry if the restaurant doesn't exist yet — create the listing. |
| **Review submitted** | `/studio/add-review/success` | Confirmation screen shown after a review is published. |
| **Review listing** | `/studio/review-listing` | All of the creator's reviews — published and drafts — with edit and delete options. |
| **Edit review** | `/studio/edit-review/[id]` | Edit an already-published or draft review. |

---

### Restaurant listing (add a restaurant)

| Screen | Route | What it does |
|--------|-------|--------------|
| **Listing explanation** | `/listing/explanation` | Explains what it means to add a restaurant listing and what information is needed. |
| **Listing step 1** | `/listing/step-1` | Core restaurant information — name, address, cuisine, photos. |
| **Listing step 2** | `/listing/step-2` | Additional details and confirmation before submission. |
| **Listing draft** | `/listing/draft` | Saved drafts for restaurant listings that haven't been submitted yet. |

---

### Settings

| Screen | Route | What it does |
|--------|-------|--------------|
| **Settings home** | `/settings` | Top-level settings categories. |
| **Profile settings** | `/settings/account-security/profile` | Update email, birthdate, gender. |
| **Password settings** | `/settings/account-security/password` | Change password or request a reset email. |
| **Language settings** | `/settings/general/language` | Set the app's preferred display language. |
| **About** | `/settings/support/about` | App version and basic info. |

---

### Legal and transparency

| Screen | Route | What it does |
|--------|-------|--------------|
| **Privacy policy** | `/privacy-policy` | How user data is collected and used. |
| **Cookie policy** | `/cookie-policy` | Cookie and tracking disclosure. |
| **Terms of service** | `/terms-of-service` | The terms users agree to when creating an account. |
| **Content guidelines** | `/content-guidelines` | What is and isn't acceptable in reviews, photos, and comments. |

---

## User journeys

These are the four primary paths a user takes through the product.

---

### Journey 1 — The new user (first launch to first review read)

```
Home tab
  └─ Sees the review feed and restaurant highlights
       └─ Taps a review card
            └─ /reviews/viewer  (immersive viewer, no sign-in required)
                 └─ Decides to explore further
                      └─ Restaurants tab
                           └─ Taps a restaurant
                                └─ /restaurants/[slug]
                                     └─ Wants to save or like → prompted to sign in
                                          └─ /login  →  /register  →  /user-verification
                                               └─ /onboarding  (set palates)
                                                    └─ Back to Restaurants tab
                                                         (now sees palate-ranked results)
```

**Key experience goal:** The user should be able to browse and read reviews before they ever touch a sign-up form. The wall comes only when they want to participate.

---

### Journey 2 — The returning diner (opens app → finds somewhere to eat)

```
Home tab
  └─ Scans the feed for inspiration
       OR
  └─ Restaurants tab
       └─ Selects city/location
            └─ Applies cuisine filter or palate sort
                 └─ Browses restaurant cards
                      └─ /restaurants/[slug]
                           └─ Reads reviews in the full-screen viewer
                                └─ Saves to wishlist
                                     └─ OR follows the reviewer
                                          └─ /profile/[username]
                                               └─ Follows → now sees their reviews in Following tab
```

**Key experience goal:** Going from "I want food" to "I know where I'm going" in under 60 seconds.

---

### Journey 3 — The food creator (visited somewhere → publishes a review)

```
Studio tab  (or bottom nav → Studio)
  └─ /studio/add-review
       └─ Searches for the restaurant
            └─ Restaurant found → /studio/add-review/[slug]
                 └─ Writes review text, sets rating, attaches photos
                      └─ Photos upload to Nhost Storage with progress bar
                           └─ Submits
                                └─ /studio/add-review/success
                                     └─ Review appears in their profile + home feed
                                          └─ Visible to followers in Following tab
```

**Key experience goal:** Publishing a review — including photos — should take less than 2 minutes and feel effortless.

If the restaurant doesn't exist yet:
```
/studio/add-review
  └─ Restaurant not found in search
       └─ /listing/explanation  →  /listing/step-1  →  /listing/step-2
            └─ Restaurant added to the database
                 └─ Back to /studio/add-review/[new-slug]
                      └─ Continues with review creation
```

---

### Journey 4 — The social browser (catching up with the feed)

```
Following tab
  └─ Scrolls through reviews from followed users (cursor-paginated, infinite scroll)
       └─ Likes a review → heart updates instantly (optimistic)
            └─ Taps a review card
                 └─ /reviews/viewer
                      └─ Reads full review + comments
                           └─ Leaves a comment
                                └─ Sees the reviewer's profile
                                     └─ /profile/[username]
                                          └─ Views their other reviews
                                               └─ Discovers a restaurant they haven't seen before
                                                    └─ /restaurants/[slug]
```

**Key experience goal:** The following feed should feel alive and personal. Every interaction should be instant.

---

## Non-functional requirements

- **Security** — No Nhost admin secrets or sensitive credentials are ever bundled in the app binary. User identity is always derived from the active Nhost JWT session, never from user-supplied parameters.
- **Performance** — Feeds must scroll at 60fps. FlashList is used for all list rendering. Reanimated drives all animated interactions. The first meaningful content should appear fast.
- **Reliability** — If a GraphQL mutation fails, the optimistic update must revert cleanly and the user must be informed. No silent failures.
- **Consistency** — The UI must feel like one product. Components, spacing, colors, and interactions follow the conventions in `AI_Rules.md`. The brand primary color is `#ff7c0a`.
- **Offline behavior** — Apollo Client's in-memory cache provides a reasonable read-only experience when connectivity is lost. Writes are queued and retried where practical.