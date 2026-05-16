# `src/components` reference

This document describes the **structure** of the Next.js UI layer under `tastyplates-v2-1/src/components/` and what each module is responsible for showing or doing. Paths below are relative to `src/components/` unless noted.

**Inventory:** 183 `.ts` / `.tsx` files (excluding `*.backup` artifacts). The tree mixes **route-level sections** (hero, articles), **feature domains** (Restaurant, Profile, review), **app chrome** (layout, auth), and **shared primitives** (`ui/`).

**Naming note:** `review/` holds **feed, cards, and full-screen review viewers**. `reviews/` (plural) holds **restaurant search / match / guidelines** helpers used heavily in review authoring and listing flows.

---

## Top-level files (no subfolder)

| File | Purpose |
|------|--------|
| `Discover.tsx` | Homepage closing section: welcome copy, “Mobile App · Coming Soon” badge, phone mock image. |
| `FilterSidebar.tsx` | Static sidebar filter **layout** (price, cuisine-style groupings in markup); visual shell for filter UX. |
| `FollowContext.tsx` | React context provider for follow relationships (state + actions consumed by profile / social UI). |
| `Hero.tsx` | Landing hero: headline, cuisine vs keyword search, palate modal, navigation to `/restaurants` with query params, `Toast`. |

---

## `Articles/`

| File | Purpose |
|------|--------|
| `Articles.tsx` | Location-scoped article grid; fetches `/api/v1/articles/get-articles`, skeletons, `SeeAllButton` to `/articles`. |
| `ArticleCard.tsx` | Linked card: cover image (16:9 or 4:3), category pill, title, reading time. |
| `ArticleDetail.tsx` | Article detail page composition (body layout, metadata, related content wiring). |
| `ArticleRelatedRestaurantsSection.tsx` | Section listing restaurants associated with an article. |

---

## `FeaturedRestaurants/`

| File | Purpose |
|------|--------|
| `FeaturedRestaurants.tsx` | Splide carousel of API-driven featured venues; cards link to `/restaurants/[slug]` with image + address. |

---

## `QuickFinds/`

| File | Purpose |
|------|--------|
| `QuickFinds.tsx` | Grid of cuisine shortcuts linking to `/restaurants?palate=<slug>`. |
| `quickFindsConfig.ts` | Data: slug, label, icon filename under `public/icons/cuisines/`. |

---

## `Filter/`

| File | Purpose |
|------|--------|
| `Filter.tsx` | Rich filter panel: cuisines, palates, price, rating, badges, sort; uses `CategoryService` / `PalatesService`, popovers and modals. |
| `Filter2.tsx` | Primary restaurant-list filter sheet: sliders icon, sort, `CuisineFilter`, palate-aware sort options, haptics. |
| `CuisineFilter.tsx` | Cuisine selection UI used inside `Filter2`. |
| `CuisinePillSelector.tsx` | Compact pill-based cuisine multi-select pattern. |

---

## `Profile/`

| File | Purpose |
|------|--------|
| `Profile.tsx` | Profile page shell: tabs, header, routing between reviews / listings / wishlists / check-ins. |
| `ProfileHeader.tsx` | Avatar, display name, stats, follow actions, bio area. |
| `Form.tsx` | Profile edit form fields and submit behavior. |
| `EthnicPalatePicker.tsx` | Palate preference picker for profile onboarding / settings. |
| `ReviewsTab.tsx` | User’s reviews list / grid for profile. |
| `ListingsTab.tsx` | User’s restaurant listings tab. |
| `WishlistsTab.tsx` | Saved restaurants / wishlist tab. |
| `CheckinsTab.tsx` | Check-in history tab. |
| `FollowersModal.tsx` | Modal listing followers. |
| `FollowingModal.tsx` | Modal listing accounts the user follows. |

---

## `Restaurant/`

High-level **restaurant discovery** and **detail** experiences. `Restaurant.tsx` is the **browse / search results** page implementation (grid, `Filter2`, URL query sync, suggested rows, breadcrumbs)—despite the name, it is not the single-restaurant detail route component.

### Root of `Restaurant/`

| File | Purpose |
|------|--------|
| `Restaurant.tsx` | Restaurant listing page: infinite or paginated fetch, skeleton cards, filters from URL, `SuggestedRestaurants`, `Breadcrumb`. |
| `RestaurantCard.tsx` | Grid card: image, rating, price, palates, link to detail. |
| `ImageGallery.tsx` | Image gallery for venue media. |
| `RatingSection.tsx` | Aggregate rating display block. |
| `SuggestedRestaurants.tsx` | “You may also like” style row/collection. |
| `RecentlyVisitedRestaurants.tsx` | Renders recently viewed venues for quick return navigation. |
| `CommunityRecognitionSection.tsx` | Highlights / recognitions from the community for a venue. |
| `CheckInRestaurantButton.tsx` | Check-in CTA with server integration. |
| `RestaurantReviews.tsx` | Reviews list section for a restaurant page. |
| `RestaurantReviewsMobile.tsx` | Mobile-optimized reviews layout / interactions. |
| `RestaurantReviewsModal.tsx` | Modal wrapper for browsing reviews. |
| `RestaurantReviewsViewerModal.tsx` | Full viewer experience for review media from restaurant context. |
| `RestaurantCommentsQuickView.tsx` | Compact thread or comment preview for a restaurant. |

### `Restaurant/Details/`

| File | Purpose |
|------|--------|
| `RestaurantHeader.tsx` | Title, hero, key meta on detail page. |
| `RestaurantDescription.tsx` | Long-form description copy. |
| `RestaurantDetailsSection.tsx` | Composed details column (aggregates subsections). |
| `RestaurantLocationSection.tsx` | Address + area context. |
| `RestaurantMap.tsx` | Map embed / map library integration. |
| `RestaurantQuickActions.tsx` | Save, share, directions-style actions. |
| `SaveRestaurantButton.tsx` | Wishlist / save toggle. |
| `OpeningHoursDisplay.tsx` | Parsed weekly hours UI. |
| `Photos.tsx` | Photo grid / lead media for detail. |
| `PhotoSlider.tsx` | Carousel variant for photos. |

### `Restaurant/Listing/`

Owner-facing **listing** and draft-review flows.

| File | Purpose |
|------|--------|
| `Listing.tsx` | Listing management shell / router for listing states. |
| `ListingForm.tsx` | Create/edit listing form. |
| `ListingExplanation.tsx` | Onboarding copy for what a listing is. |
| `ListingCard.tsx` | Published listing summary card. |
| `ListingDraft.tsx` | Draft listing container. |
| `ListingCardDraft.tsx` | Draft card UI. |
| `AddListing.tsx` / `AddListingClient.tsx` | Server vs client split for add-listing entry. |
| `DraftReviewCard.tsx` | Card for a review still in draft. |
| `PublishedReviewCard.tsx` | Card for a published review attached to a listing. |

### `Restaurant/Review/`

| File | Purpose |
|------|--------|
| `ReviewSubmission.tsx` | Compose / display review submission flow section. |
| `ReviewSubmissionCreate.tsx` | Create path for a new review submission. |
| `EditReviewSubmission.tsx` | Edit existing submission. |
| `Rating.tsx` | Star (or similar) rating input / display. |
| `RestaurantReviewHeader.tsx` | Header for a single review within restaurant context. |

---

## `review/` (singular — feeds & viewers)

| File | Purpose |
|------|--------|
| `ClientOnlyReviews.tsx` | `dynamic(..., { ssr: false })` wrapper around `Reviews` with loading skeleton. |
| `Reviews.tsx` | Trending vs For You tabs, `ReviewCard2` grid, `ReviewScreen` / `ReviewScreenDesktop`. |
| `ReviewCard.tsx` | Legacy or alternate review card layout. |
| `ReviewCard2.tsx` | Grid-optimized card: imagery, hashtags, auth gates, opens viewer. |
| `ReviewBlock.tsx` | Rich review body block (text + media composition). |
| `ReviewModal.tsx` | Modal presentation for a review. |
| `ReviewScreen.tsx` | Mobile full-screen swipe viewer for reviews. |
| `ReviewScreenDesktop.tsx` | Desktop viewer with keyboard / layout affordances. |
| `FollowingReviews.tsx` | Following-only review list (used where a dedicated following feed is needed). |
| `CommentsBottomSheet.tsx` | Bottom sheet UI for review comments. |
| `ReplyItem.tsx` | Single reply row in a thread. |
| `ReviewEngagementAuthModal.tsx` | Auth prompt when liking / engaging without session. |

---

## `reviews/` (plural — restaurant match & search)

| File | Purpose |
|------|--------|
| `RestaurantSearch.tsx` | Search field + results for attaching a restaurant to a review. |
| `RestaurantSearchSheet.tsx` | Sheet / drawer variant of restaurant search. |
| `RestaurantMatchDialog.tsx` | Dialog to confirm or pick among restaurant matches. |
| `RestaurantMatchInline.tsx` | Inline match suggestion strip. |
| `ContentGuidelinesReminder.tsx` | Reminder modal or banner for review content rules. |

---

## `auth/`

| File | Purpose |
|------|--------|
| `NhostProviderWrapper.tsx` / `NhostProviderWrapperDynamic.tsx` | SSR-safe vs dynamic Nhost client provider wiring. |
| `SessionWrapper.tsx` | Session lifecycle wrapper around children. |
| `AuthModalWrapper.tsx` | Global sign-in modal controller (`useAuthModal`). |
| `SigninModal.tsx` / `SignupModal.tsx` | Credential and registration modals. |
| `OAuthCallbackHandler.tsx` | Processes OAuth return URLs. |
| `VerificationRedirect.tsx` | Email verification routing. |
| `OnboardingRedirect.tsx` | Post-signup onboarding gate. |
| `UpdatePasswordForm.tsx` / `UpdatePasswordDynamic.tsx` | Password reset / update forms and dynamic import variant. |

---

## `layout/`

Application **chrome**: navigation, footers, PWA, legal, and homepage suspense fallback.

| File | Purpose |
|------|--------|
| `RootAppChrome.tsx` | Root shell: providers (`Nhost`, `Location`, `Follow`, `Upload`, `Language`), `Toaster`, structured data scripts, `BottomNav`, `MobileTopBar`, `PwaInstallBanner`, `CookieConsentAndAdSense`, native handlers, `ConditionalFooter`. |
| `Navbar.tsx` | Top navigation; landing-page transparent mode; profile menu; modals. |
| `BottomNav.tsx` | Mobile bottom tab bar. |
| `MobileTopBar.tsx` | Compact top region for mobile layouts. |
| `MobileMenu.tsx` | Hamburger / drawer menu. |
| `Footer.tsx` | Site footer links and branding. |
| `ConditionalFooter.tsx` | Hides or swaps footer based on route rules. |
| `HomePageLoadingFallback.tsx` | Full-screen spinner used by homepage `Suspense`. |
| `CookieConsentAndAdSense.tsx` | Consent banner and ad script gating. |
| `PwaInstallBanner.tsx` | Add-to-homescreen / install prompt. |
| `PwaBrandSplash.tsx` | Branded splash for PWA load. |
| `PullToRefreshWrapper.tsx` | Touch pull-to-refresh gesture wrapper (mobile web / native webview). |
| `MobileLegalStrip.tsx` | Compact legal links for small screens. |
| `SearchMenu.tsx` | Search entry overlay tied to nav. |
| `SidebarHeader.tsx` | Header slot for sidebar layouts (e.g. settings / studio). |

---

## `navigation/`

| File | Purpose |
|------|--------|
| `LocationButton.tsx` | Opens location picker; supports transparent style on landing nav. |
| `LocationModal.tsx` | Modal location picker UI. |
| `LocationBottomSheet.tsx` | Sheet-based location picker. |
| `NavbarSearchBar.tsx` | Search input embedded in the navbar when enabled. |

---

## `common/`

Cross-feature utilities and small patterns.

| File | Purpose |
|------|--------|
| `Breadcrumb.tsx` | Hierarchical trail links. |
| `Pagination.tsx` | Page number controls. |
| `LoadingSpinner.tsx` | Generic spinner. |
| `InactivityLogout.tsx` | Signs out after idle timeout. |
| `ModalPopup.tsx` / `ModalPopup2.tsx` | Legacy or alternate modal shells. |
| `CustomDatepicker.tsx` | Date selection widget. |
| `PhotoCropModal.tsx` | Image crop UI for uploads. |
| `SuggestedUsers.tsx` | User recommendation list (avatars + follow). |

---

## `dashboard/`

| File | Purpose |
|------|--------|
| `DashboardSidebar.tsx` | Sidebar navigation for dashboard-style routes. |

---

## `Settings/`

| File | Purpose |
|------|--------|
| `SettingsLayout.tsx` | Two-column settings shell. |
| `Settings.tsx` | Settings categories and panels router. |
| `SettingsCategory.tsx` | Single category row / section. |
| `SettingsAuthGuard.tsx` | Redirects or blocks unauthenticated access to settings. |

---

## `onboarding/`

| File | Purpose |
|------|--------|
| `OnboardingStepOne.tsx` / `OnboardingStepTwo.tsx` | Sequential onboarding screens. |
| `OnboardingStepIndicator.tsx` | Progress dots or step numbers. |

---

## `tastystudio/`

| File | Purpose |
|------|--------|
| `TastyStudioSidebar.tsx` | Sidebar for TastyStudio area. |
| `ProfileSummary.tsx` | Condensed profile stats / identity for studio context. |

---

## `seo/`

| File | Purpose |
|------|--------|
| `StructuredData.tsx` | Injects JSON-LD `<script>` for WebSite, Restaurant, Article, BreadcrumbList, or Organization (uses `generateStructuredData`). |

---

## `native/`

Web-to-native bridge helpers (Capacitor-style app shell).

| File | Purpose |
|------|--------|
| `PushHandler.tsx` | Push notification registration / handling. |
| `DeepLinkHandler.tsx` | Opens in-app routes from external URLs. |
| `BackButtonHandler.tsx` | Android hardware back integration. |

---

## `uptime/`

| File | Purpose |
|------|--------|
| `UptimeRefreshButton.tsx` | Simple refresh control for the `/uptime` monitoring page (paired with middleware that strips heavy chrome). |

---

## `ui/` — shared design system & primitives

**Barrel:** `ui/index.ts` re-exports selected primitives for shorter imports.

### Root of `ui/`

| File | Purpose |
|------|--------|
| `button.tsx` | Button variants (shadcn-style). |
| `card.tsx` | Card container primitive. |
| `input.tsx` | Text input primitive. |
| `follow-button.tsx` | Follow / unfollow control styling. |
| `SeeAllButton.tsx` | “See all” link button (inline vs block). |
| `GooglePlacesAutocomplete.tsx` | Places-powered address or venue autocomplete. |
| `UploadProgressBar.tsx` | Upload percentage UI. |

### `ui/BottomSheet/`

| File | Purpose |
|------|--------|
| `BottomSheet.tsx` | Generic bottom sheet wrapper. |
| `ReviewBottomSheet.tsx` | Sheet tuned for review actions or preview. |

### `ui/Dropdown/`, `ui/Popover/`

| File | Purpose |
|------|--------|
| `Dropdown/Dropdown.tsx` | Dropdown menu primitive. |
| `Popover/Popover.tsx` | Anchored popover (used in navbar and filters). |

### `ui/Modal/`

| File | Purpose |
|------|--------|
| `Modal.tsx` | Base modal shell. |
| `ForgotPasswordModal.tsx` / `ForgotPassLinkModal.tsx` | Password recovery flows. |
| `PasswordUpdatedModal.tsx` | Success confirmation after password change. |
| `ReviewModal.tsx` | Modal framing for review content. |

### `ui/Select/`

| File | Purpose |
|------|--------|
| `Select.tsx` | Single-select control. |
| `Dropdown.tsx` | Select-adjacent dropdown implementation. |
| `CustomOption.tsx` / `CustomMultipleSelect.tsx` | Custom-styled option rendering and multi-select. |

### `ui/Skeleton/`

| File | Purpose |
|------|--------|
| `ArticleCardSkeleton.tsx` | Article card placeholder. |
| `ProfileHeaderSkeleton.tsx` | Profile header placeholder. |
| `RestaurantCardSkeleton.tsx` / `RestaurantDetailSkeleton.tsx` | Listing and detail placeholders. |
| `ReviewCardSkeleton.tsx` / `ReviewCardSkeleton2.tsx` | Review grid placeholders (two layouts). |
| `ReviewBlockSkeleton.tsx` / `ReviewSubmissionSkeleton.tsx` | Review content / form skeletons. |
| `ReplySkeleton.tsx` / `UserListItemSkeleton.tsx` | Comment reply and user row placeholders. |
| `SkeletonCard.tsx` / `SkeletonListingCard.tsx` | Generic card shells. |
| `index.ts` | Skeleton barrel exports. |

### `ui/TabContentGrid/`

| File | Purpose |
|------|--------|
| `TabContentGrid.tsx` | Tabbed content grid layout. |
| `VirtualizedTabContentGrid.tsx` | Virtualized variant for long lists. |

### Other `ui/` subfolders

| Path | Purpose |
|------|--------|
| `EmptyState/EmptyState.tsx` | Illustration + message empty state. |
| `HashtagDisplay/HashtagDisplay.tsx` | Renders clickable hashtag chips. |
| `HashtagInput/HashtagInput.tsx` | Tag entry with validation UX. |
| `Image/FallbackImage.tsx` | Image with broken-src fallback types. |
| `ImageUploadDropzone/ImageUploadDropzone.tsx` | Drag-and-drop file picker for images. |
| `LoadingSpinner/LoadingSpinner.tsx` | Alternate spinner implementation. |
| `Options/SelectOptions.tsx` | Options list helper for selects. |
| `PalateTags/PalateTags.tsx` | Palate tag chips for reviews / filters. |
| `Toast/Toast.tsx` | Inline toast notification (used by Hero). |
| `WishlistButton/` (`WishlistButton.tsx`, `CircleWishlistButton.tsx`, `PillWishlistButton.tsx`, `index.ts`) | Save-to-wishlist affordances in different shapes. |

---

## Related files outside this folder

- **Contexts** such as `LocationContext` live under `src/contexts/` but are consumed by `Articles`, `Restaurant.tsx`, and nav components.
- **Styles** for many components live under `src/styles/components/` and `src/styles/pages/` (imported from TSX files).

For **homepage-only** wiring, see `documentation/homepage.md`.
