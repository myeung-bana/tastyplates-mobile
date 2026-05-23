# auth-review-migration.md — Mobile Recovery Plan: Reviews, Auth & Onboarding

> **Purpose:** This document maps the homepage review feed, following feed, full-screen review viewer, authentication wall, login/registration, and onboarding flow from `tastyplates-v2` to their React Native (Expo) equivalents. All visual language from `design.md` is preserved. A `DEV_MODE` flag (`.env`: `DEV_MODE=true`) unlocks skip buttons across the entire auth flow for rapid development iteration.

---

## Table of Contents

1. [Review Feed — Home Tab](#1-review-feed--home-tab)
2. [Review Card (ReviewCard2 recovery)](#2-review-card-reviewcard2-recovery)
3. [Full-Screen Review Viewer](#3-full-screen-review-viewer)
4. [Following Feed](#4-following-feed)
5. [Authentication Wall](#5-authentication-wall)
6. [Auth Flow — Login Screen](#6-auth-flow--login-screen)
7. [Auth Flow — Register Screen](#7-auth-flow--register-screen)
8. [Auth Flow — Email Verification](#8-auth-flow--email-verification)
9. [Onboarding — Step 1 (Profile & Palates)](#9-onboarding--step-1-profile--palates)
10. [Onboarding — Step 2 (Photo & Bio)](#10-onboarding--step-2-photo--bio)
11. [DEV_MODE Skip System](#11-devmode-skip-system)
12. [Logic & API Preservation](#12-logic--api-preservation)
13. [Screen Map](#13-screen-map)
14. [Component Checklist](#14-component-checklist)
15. [Haptic Map](#15-haptic-map)

---

## 1. Review Feed — Home Tab

### Web architecture

```
app/page.tsx
  └─ <ClientOnlyReviews />              ← dynamic import, SSR disabled
       └─ Reviews.tsx                   ← orchestrator with two tabs
            ├─ Tab: "Trending"          ← 8 most recent reviews (reviewV2Service.getAllReviews)
            ├─ Tab: "For You"           ← reviews from followed users (useFollowingReviewsGraphQL)
            ├─ ReviewCard2              ← grid card (image-forward, 4.5:6 ratio)
            └─ ReviewScreen / ReviewScreenDesktop  ← full-screen viewer on tap
```

**Tabs:**
- `Trending` — shows 8 reviews fixed, no pagination. Fetches regardless of auth.
- `For You` — requires auth. If user taps and is unauthenticated → triggers `showSignin()`.

**Skeleton loading state (web):**
```tsx
// While loading: 2-col grid (mobile), 4-col (desktop) of ReviewCardSkeleton
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
  {Array.from({ length: 4 }, (_, i) => <ReviewCardSkeleton key={i} />)}
</div>
```

**Tab bar design (web):**
```tsx
// Pill-style tab switcher — rounded-full bg-gray-100 container
<div className="inline-flex rounded-full bg-gray-100 p-1">
  <div className="px-4 py-2 text-sm font-neusans font-normal rounded-full bg-white text-[#ff7c0a] shadow-sm">
    Trending
  </div>
  <div className="px-4 py-2 text-sm font-neusans font-normal rounded-full text-gray-600">
    For You
  </div>
</div>
```

### Mobile recovery

```tsx
// app/(tabs)/index.tsx (Home screen)

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<'trending' | 'foryou'>('trending');
  const { user } = useAuth();
  const { showSignin } = useAuthModal();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const { reviews: trending, loading: trendingLoading } = useTrendingReviews();
  const { reviews: forYou, loading: forYouLoading, hasMore, loadMore } = useFollowingReviewsGraphQL(
    activeTab === 'foryou'
  );

  const currentReviews = activeTab === 'trending' ? trending : forYou;
  const loading = activeTab === 'trending' ? trendingLoading : forYouLoading;

  const handleTabPress = (tab: 'trending' | 'foryou') => {
    haptic('selection');
    if (tab === 'foryou' && !user) {
      showSignin(); // triggers auth wall
      return;
    }
    setViewerOpen(false);
    setActiveTab(tab);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Hero banner (above the feed) */}
      <HeroBanner />

      {/* Tab switcher — pill style */}
      <View className="items-center py-3 bg-white">
        <View className="flex-row bg-gray-100 rounded-full p-1">
          {(['trending', 'foryou'] as const).map(tab => (
            <Pressable
              key={tab}
              onPress={() => handleTabPress(tab)}
              className={`px-5 py-2 rounded-full ${
                activeTab === tab
                  ? 'bg-white shadow-sm'
                  : ''
              }`}
            >
              <Text className={`text-sm font-neusans ${
                activeTab === tab ? 'text-[#ff7c0a]' : 'text-gray-600'
              }`}>
                {tab === 'trending' ? 'Trending' : 'For You'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Review grid */}
      {loading && currentReviews.length === 0 ? (
        <ReviewGridSkeleton />
      ) : (
        <FlashList
          data={currentReviews}
          numColumns={2}
          estimatedItemSize={320}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item, index }) => (
            <ReviewCard2
              data={item}
              reviewIndex={index}
              onOpenViewer={i => { setViewerIndex(i); setViewerOpen(true); }}
            />
          )}
          onEndReached={activeTab === 'foryou' ? loadMore : undefined}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Full-screen viewer modal */}
      <ReviewViewerModal
        reviews={currentReviews}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </SafeAreaView>
  );
}
```

**Design tokens (tab switcher):**
```
Container:    bg-gray-100, rounded-full, p-1
Active tab:   bg-white shadow-sm rounded-full, text-[#ff7c0a]
Inactive tab: transparent, text-gray-600
Font:         font-neusans, text-sm (14px)
```

---

## 2. Review Card (ReviewCard2 recovery)

### Web card structure (`ReviewCard2.tsx`)

```
┌─────────────────────────────┐
│  [Image 4.5:6 aspect ratio] │  ← rounded-2xl (16px), hover scale 1.05
│                             │
│                             │
│                             │
├─────────────────────────────┤
│  [Avatar 32px] @username  ★4.5 │
│  Review title (1 line)      │
│  Review body (2 lines)      │
│  [#hashtag] [#hashtag]      │
└─────────────────────────────┘
```

**Key specs from code:**
- Image: `aspect-[4.5/6]` (portrait), `rounded-2xl`, `overflow-hidden`, hover scale `1.05` transition `200ms`
- Avatar: `w-8 h-8` (32px), `rounded-full`
- Username: `text-[12px]` mobile / `text-xs` desktop, `font-medium text-[#31343F]`
- Rating: `text-[12px]` `font-medium text-[#31343F]`, star icon `w-3 h-3` mobile / `w-4 h-4` desktop
- Review title + body: `text-xs`/`text-sm`, muted
- Auth wall: unauthenticated taps on avatar/username → open sign-in modal

### Mobile recovery (`ReviewCard2.tsx` for RN)

```tsx
// components/review/ReviewCard2.tsx

const ReviewCard2 = ({ data, reviewIndex, onOpenViewer }) => {
  const { user } = useAuth();
  const { showSignin } = useAuthModal();
  const { trigger: haptic } = useHaptic();
  const columnWidth = (SCREEN_WIDTH - 36) / 2; // 12px padding each side + 12px gap

  const handleCardPress = () => {
    haptic('light');
    onOpenViewer?.(reviewIndex ?? 0);
  };

  const handleUserPress = () => {
    haptic('selection');
    if (!user) { showSignin(); return; }
    router.push(generateProfileUrl(data.author?.node?.databaseId, data.author?.node?.username));
  };

  const imageUri =
    Array.isArray(data.reviewImages) && data.reviewImages.length > 0
      ? data.reviewImages[0]?.sourceUrl
      : DEFAULT_REVIEW_IMAGE;

  return (
    <View style={{ width: columnWidth }} className="font-neusans">

      {/* Image — 4.5:6 portrait aspect */}
      <Pressable onPress={handleCardPress}>
        <View
          className="rounded-2xl overflow-hidden mb-2"
          style={{ aspectRatio: 4.5 / 6 }}
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        </View>
      </Pressable>

      {/* Content below image */}
      <View className="px-0.5">

        {/* User row */}
        <View className="flex-row items-center gap-2 mb-1">
          <Pressable onPress={handleUserPress}>
            <Image
              source={{ uri: data.userAvatar || DEFAULT_USER_ICON }}
              style={{ width: 28, height: 28, borderRadius: 14 }}
              contentFit="cover"
            />
          </Pressable>
          <Pressable onPress={handleUserPress} className="flex-1 min-w-0">
            <Text
              className="text-[12px] font-medium text-[#31343F] font-neusans"
              numberOfLines={1}
            >
              {data.author?.name || data.author?.node?.name || 'Unknown'}
            </Text>
          </Pressable>
          {/* Star rating */}
          <View className="flex-row items-center gap-0.5 ml-auto">
            <Image source={STAR_FILLED} style={{ width: 12, height: 12 }} />
            <Text className="text-[12px] font-medium text-[#31343F] font-neusans">
              {data.reviewStars}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text
          className="text-[12px] font-neusans text-[#31343F] mb-0.5"
          numberOfLines={1}
        >
          {capitalizeWords(stripTags(data.reviewMainTitle || ''))}
        </Text>

        {/* Body */}
        <Text
          className="text-[12px] font-neusans text-[#494D5D] leading-[1.4]"
          numberOfLines={2}
        >
          {capitalizeWords(stripTags(data.content || ''))}
        </Text>

      </View>
    </View>
  );
};
```

**Grid layout:**
```tsx
// 2-column grid — 12px horizontal padding each side, 12px gap between columns
<FlashList
  numColumns={2}
  estimatedItemSize={320}
  contentContainerStyle={{ paddingHorizontal: 12 }}
  ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
  // No column separator — gap achieved via card width calculation
/>
```

### Skeleton card (mobile)

```tsx
// ReviewCardSkeleton.tsx (mobile)
const ReviewCardSkeleton = ({ width }) => (
  <View style={{ width }} className="font-neusans">
    {/* Image placeholder */}
    <View
      className="rounded-2xl bg-gray-200 mb-2 animate-pulse"
      style={{ aspectRatio: 4.5 / 6 }}
    />
    {/* User row skeleton */}
    <View className="flex-row items-center gap-2 mb-1">
      <View className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
      <View className="h-3 w-20 rounded bg-gray-200 animate-pulse flex-1" />
      <View className="h-3 w-8 rounded bg-gray-200 animate-pulse" />
    </View>
    {/* Text skeleton */}
    <View className="h-3 w-full rounded bg-gray-200 animate-pulse mb-1" />
    <View className="h-3 w-3/4 rounded bg-gray-200 animate-pulse" />
  </View>
);

// Grid skeleton wrapper
const ReviewGridSkeleton = () => {
  const columnWidth = (SCREEN_WIDTH - 36) / 2;
  return (
    <View className="flex-row flex-wrap px-3 gap-3 mt-2">
      {Array.from({ length: 6 }, (_, i) => (
        <ReviewCardSkeleton key={i} width={columnWidth} />
      ))}
    </View>
  );
};
```

---

## 3. Full-Screen Review Viewer

### Web architecture

**Mobile web (`ReviewScreen.tsx`):**
- `position: fixed`, covers 100dvh
- Vertically scroll-snapped (`scroll-snap-type: y mandatory`)
- Each review: `scroll-snap-align: start`
- Image section: `65vh` tall, `object-fit: cover`
- Content section: `35vh` min-height, white bg, slides up from bottom
- Like + comment buttons overlaid on image
- Author follow button in content section
- Comments rendered as a bottom sheet (`CommentsBottomSheet`)

**Desktop web (`ReviewScreenDesktop.tsx`):**
- Two-column: image on left (via scroll/wheel), comments panel fixed right
- `@react-spring/web` for spring animation on index change
- `@use-gesture/react` for wheel gesture capture

### Mobile recovery — Native Review Viewer

The web's scroll-snap vertical viewer maps directly to a native `FlatList` with `pagingEnabled` — the canonical mobile approach.

```tsx
// components/review/ReviewViewerModal.tsx

const ReviewViewerModal = ({ reviews, initialIndex, isOpen, onClose, onLoadMore, hasNextPage }) => {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const { trigger: haptic } = useHaptic();

  // Scroll to initial index on open
  useEffect(() => {
    if (isOpen && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
    }
  }, [isOpen, initialIndex]);

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        {/* Close button — top left, matches web z-10001 */}
        <Pressable
          onPress={() => { haptic('light'); onClose(); }}
          className="absolute top-safe left-4 z-50 w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
        >
          <FiX size={20} color="white" />
        </Pressable>

        <FlatList
          ref={flatListRef}
          data={reviews}
          keyExtractor={r => r.id || String(r.databaseId)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          onMomentumScrollEnd={e => {
            const index = Math.round(e.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
            setActiveIndex(index);
          }}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item, index }) => (
            <ReviewPost review={item} isActive={index === activeIndex} />
          )}
          getItemLayout={(_, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
        />
      </View>
    </Modal>
  );
};
```

### Review post layout (inside viewer)

```tsx
// ReviewPost.tsx — single full-screen review
// Matches web: 65vh image + 35vh content

const ReviewPost = ({ review, isActive }) => {
  const [liked, setLiked] = useState(review.userLiked ?? false);
  const [likesCount, setLikesCount] = useState(review.commentLikes ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const { user } = useAuth();
  const { showEngagementModal } = useEngagementAuth();
  const { trigger: haptic } = useHaptic();

  const handleLike = () => {
    if (!user) { showEngagementModal(review); return; }
    haptic(liked ? 'light' : 'success');
    // optimistic update
    setLiked(prev => !prev);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
    toggleLike(review.id);
  };

  return (
    <View style={{ height: SCREEN_HEIGHT }}>

      {/* IMAGE SECTION — 65% of screen */}
      <View style={{ height: SCREEN_HEIGHT * 0.65, position: 'relative' }}>
        <Image
          source={{ uri: review.reviewImages?.[0]?.sourceUrl || DEFAULT_REVIEW_IMAGE }}
          style={{ width: SCREEN_WIDTH, height: '100%' }}
          contentFit="cover"
        />

        {/* Like + comment buttons — right side overlay */}
        <View className="absolute right-4 bottom-6 gap-4">
          <Pressable onPress={handleLike} className="items-center">
            {liked
              ? <AiFillHeart size={28} color="#ff7c0a" />
              : <FiHeart size={28} color="white" />
            }
            <Text className="text-white text-xs mt-1 font-neusans">
              {formatLikeCount(likesCount)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { haptic('light'); setCommentsOpen(true); }}
            className="items-center"
          >
            <FiMessageCircle size={28} color="white" />
            <Text className="text-white text-xs mt-1 font-neusans">
              {review.repliesCount ?? 0}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* CONTENT SECTION — 35% of screen, white */}
      <View
        className="flex-1 bg-white px-5 pt-4"
        style={{ paddingBottom: Math.max(16, SAFE_AREA_BOTTOM) }}
      >
        {/* Author row */}
        <View className="flex-row items-center gap-3 mb-3">
          <Pressable onPress={() => router.push(authorProfileHref)}>
            <Image
              source={{ uri: review.userAvatar || DEFAULT_USER_ICON }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              contentFit="cover"
            />
          </Pressable>
          <View className="flex-1">
            <Text className="font-neusans text-sm font-medium text-[#31343F]">
              {review.author?.name || review.author?.node?.name}
            </Text>
            <Text className="font-neusans text-xs text-[#6b7280]">
              {review.restaurantName}
            </Text>
          </View>
          <FollowButton
            isFollowing={isFollowing}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            compact
          />
        </View>

        {/* Rating + date */}
        <View className="flex-row items-center gap-2 mb-2">
          <Image source={STAR_FILLED} style={{ width: 14, height: 14 }} />
          <Text className="font-neusans text-sm text-[#31343F]">{review.reviewStars}</Text>
          <Text className="font-neusans text-xs text-[#9ca3af]">·</Text>
          <Text className="font-neusans text-xs text-[#6b7280]">
            {formatDistanceToNow(new Date(review.date))} ago
          </Text>
        </View>

        {/* Review text */}
        <Text
          className="font-neusans text-sm text-[#494D5D] leading-[1.5]"
          numberOfLines={3}
        >
          {capitalizeWords(stripTags(review.content || ''))}
        </Text>

        {/* Palate tags */}
        <PalateTags palates={review.palates} />
      </View>

      {/* Comments bottom sheet */}
      <CommentsBottomSheet
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        reviewId={review.id}
        databaseId={review.databaseId}
      />
    </View>
  );
};
```

**Design tokens from `_review-screen.scss`:**
```
Viewer background:    #000 (full bleed)
Image section:        65vh / 65dvh height
Content section:      flex-1 (35%), bg-white, px-5 py-4
Close button:         40×40px circle, rgba(0,0,0,0.5), backdrop-blur, top-safe left-4
Like button:          active #ff7c0a (AiFillHeart), inactive white (FiHeart)
Comment button:       white FiMessageCircle
Right action gutter:  absolute right-4 bottom-6, gap-4 between items
Author avatar:        40×40px circle (slightly larger than card's 32px)
Font throughout:      font-neusans
```

### Engagement auth modal (mobile)

When an unauthenticated user taps Like or Comment, `ReviewEngagementAuthModal` shows. On mobile this becomes a bottom sheet.

```tsx
// ReviewEngagementAuthModal.tsx (mobile)
// Web: fixed overlay z-10100, max-w-[360px] card, black/70 backdrop-blur

const ReviewEngagementAuthModal = ({
  isOpen, onClose, username, avatarUrl, onSignUp, onLogIn
}) => (
  <BottomSheet isOpen={isOpen} onClose={onClose} snapPoints={['45%']}>
    <View className="items-center px-6 pt-2 pb-8">
      {/* Author avatar — 88×88px circle, ring-2 */}
      <View className="w-[88px] h-[88px] rounded-full overflow-hidden ring-2 ring-gray-100 mb-4">
        <Image source={{ uri: avatarUrl }} style={{ width: 88, height: 88 }} contentFit="cover" />
      </View>

      <Text className="font-neusans text-base text-[#31343F] text-center mb-1">
        Like or comment on
      </Text>
      <Text className="font-neusans text-base font-medium text-[#31343F] text-center mb-6">
        @{username}'s review
      </Text>

      <Button variant="primary" className="w-full mb-3" onPress={onSignUp}>
        Sign Up
      </Button>
      <Button variant="secondary" className="w-full" onPress={onLogIn}>
        Log In
      </Button>
    </View>
  </BottomSheet>
);
```

---

## 4. Following Feed

### Web architecture (`app/following/page.tsx`)

States:
1. **Unauthenticated** → full-screen prompt with "Sign In" CTA
2. **Loading** → 10-skeleton grid
3. **Below threshold** → gate screen (need to follow ≥ 10 users)
4. **Has feed** → infinite-scroll grid of `ReviewCard2` cards, `useInfiniteScroll` hook

**Gate design:**
```tsx
// Orange circle bg with FiUsers icon, threshold message
<div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-6">
  <FiUsers className="h-10 w-10 text-[#ff7c0a]" />
</div>
<h2>Follow 10 users to unlock this feed</h2>
<p>You're following <span className="text-[#ff7c0a]">{count}</span> of 10 users</p>
```

### Mobile recovery (`/(tabs)/following`)

```tsx
// app/(tabs)/following.tsx

export default function FollowingScreen() {
  const { user, nhostUser, loading: sessionLoading } = useNhostSession();
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const { reviews, loading, initialLoading, hasMore, loadMore } =
    useFollowingReviewsGraphQL();

  // — State 1: Unauthenticated —
  if (!nhostUser && !sessionLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <FiUsers size={64} color="#d1d5db" />
        <Text className="font-neusans text-2xl text-[#31343F] text-center mt-6 mb-3">
          Sign in to see your following feed
        </Text>
        <Text className="font-neusans text-base text-[#6b7280] text-center mb-8">
          Follow other food lovers to see their latest reviews
        </Text>
        <Button variant="primary" className="w-full" onPress={() => router.push('/login')}>
          Sign In
        </Button>
      </View>
    );
  }

  // — State 2: Loading skeleton —
  if (initialLoading || (nhostUser && followingCount === null)) {
    return <ReviewGridSkeleton count={10} />;
  }

  // — State 3: Below threshold gate (< 10 following) —
  if (followingCount !== null && followingCount < 10) {
    return (
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
        <Text className="font-neusans text-2xl text-[#31343F] mb-2">Following</Text>
        <Text className="font-neusans text-sm text-[#6b7280] mb-8">
          Discover the latest reviews from food lovers you follow
        </Text>
        <View className="items-center">
          <View className="w-20 h-20 rounded-full bg-orange-100 items-center justify-center mb-6">
            <FiUsers size={40} color="#ff7c0a" />
          </View>
          <Text className="font-neusans text-xl text-[#31343F] text-center mb-3 font-medium">
            Follow 10 users to unlock this feed
          </Text>
          <Text className="font-neusans text-base text-[#6b7280] text-center mb-4">
            You're following{' '}
            <Text className="text-[#ff7c0a]">{followingCount}</Text>
            {' '}of 10 users
          </Text>
          <Button variant="primary" onPress={() => router.push('/restaurants')}>
            Explore Restaurants
          </Button>
        </View>
      </ScrollView>
    );
  }

  // — State 4: Feed —
  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-2">
        <Text className="font-neusans text-2xl text-[#31343F]">Following</Text>
        <Text className="font-neusans text-sm text-[#6b7280]">
          Latest reviews from people you follow
        </Text>
      </View>
      <FlashList
        data={reviews}
        numColumns={2}
        estimatedItemSize={320}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8 }}
        renderItem={({ item, index }) => (
          <ReviewCard2
            data={item}
            reviewIndex={index}
            onOpenViewer={i => { setViewerIndex(i); setViewerOpen(true); }}
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ReviewGridSkeleton count={4} /> : null}
      />
      <ReviewViewerModal
        reviews={reviews as GraphQLReview[]}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onLoadMore={loadMore}
        hasNextPage={hasMore}
      />
    </View>
  );
}
```

---

## 5. Authentication Wall

### Web pattern

On web, auth walls appear as slide-up sheet modals (`review-modal-overlay--auth-sheet`):
- Mobile web: full-height sheet (`min-height: 100dvh`), slides up from bottom (`translateY(100%) → 0`)
- Desktop web: centered modal (`max-w-[488px]`, `rounded-3xl`)
- Transition: `0.38s cubic-bezier(0.32, 0.72, 0, 1)` for the panel, `0.28s ease-out` for the overlay opacity

### Mobile recovery — Unified Auth Modal

On native mobile, the web's slide-up sheet becomes the **auth navigation stack**. Rather than separate sign-in and sign-up modals, all auth flows go through a single `/login` screen with tab switching between login and register.

```tsx
// contexts/AuthModalContext.tsx

interface AuthModalContextType {
  showSignin: () => void;
  showSignup: () => void;
  dismiss: () => void;
}

export const AuthModalProvider = ({ children }) => {
  const router = useRouter();

  const showSignin = () => router.push('/login?mode=signin');
  const showSignup = () => router.push('/login?mode=signup');
  const dismiss  = () => router.back();

  return (
    <AuthModalContext.Provider value={{ showSignin, showSignup, dismiss }}>
      {children}
    </AuthModalContext.Provider>
  );
};
```

This means: any component that previously called `setShowSignin(true)` or `setShowSignup(true)` now calls `showSignin()` or `showSignup()` from context → pushes to the `/login` screen.

---

## 6. Auth Flow — Login Screen

### Web layout (`src/pages/Login/Login.tsx` + `_auth.scss`)

```
┌─────────────────────────────────┐
│  [TastyPlates logo]             │
│  "Welcome back"      (24px)     │
│  "Sign in to your account"      │
│─────────────────────────────────│
│  [Continue with Google]  [FcGoogle icon]  │
│                                 │
│        or                       │
│                                 │
│  Email                          │
│  [_____________________]  (input: 1px solid #797979, radius 10px) │
│  Password                       │
│  [___________________] [👁]    │
│                  Forgot password?│
│─────────────────────────────────│
│  [Log In]  (full width, #ff7c0a bg, 50px radius)  │
│─────────────────────────────────│
│  Don't have an account?  Sign Up │
└─────────────────────────────────┘
```

**Auth SCSS key tokens:**
```scss
.auth {
  background-color: #FCFCFC;
  border-radius: 1.5rem;
  max-width: 30.5rem;              /* 488px — matches modal max-width */

  &__header { font-size: 1.5rem; font-weight: 400; color: #31343F; margin-bottom: 40px; }
  &__input {
    border: 1px solid #797979;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    font-size: 1rem;                /* 16px — prevents iOS zoom */
    color: #31343F;
    &:focus { border-color: #31343F; background: #F1F1F1; }
    &::placeholder { color: #797979; }
  }
  &__or { font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: #9ca3af; }
  &__link { color: #494D5D; font-size: 0.875rem; text-decoration: none; }
}
```

### Mobile recovery (`/login.tsx`)

```tsx
// app/login.tsx

const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export default function LoginScreen() {
  const { params } = useLocalSearchParams<{ mode: 'signin' | 'signup' }>();
  const [mode, setMode] = useState<'signin' | 'signup'>(params?.mode ?? 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const { trigger: haptic } = useHaptic();

  const handleGoogleSignIn = async () => {
    haptic('success');
    await nhostAuthService.signInWithGoogle();
  };

  const handleSubmit = async () => {
    haptic('success');
    setEmailError(''); setPasswordError(''); setMessage(null);
    if (!validateEmail(email)) { setEmailError(emailRequired); return; }
    if (!password) { setPasswordError(passwordRequired); return; }

    setIsLoading(true);
    try {
      const result = await nhostAuthService.signInWithEmailAndPassword({ email, password });
      if (result.error) {
        setMessage({ text: loginFailed, type: 'error' });
      } else {
        router.replace('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#FCFCFC]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View className="items-center mb-8">
          <Image source={TASTYPLATES_LOGO_COLOUR} style={{ height: 28, width: 120 }} contentFit="contain" />
        </View>

        {/* Tab switcher (Login / Register) */}
        <View className="flex-row bg-gray-100 rounded-full p-1 mb-8">
          {(['signin', 'signup'] as const).map(m => (
            <Pressable
              key={m}
              onPress={() => { haptic('selection'); setMode(m); }}
              className={`flex-1 py-2.5 rounded-full items-center ${
                mode === m ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text className={`font-neusans text-sm ${
                mode === m ? 'text-[#ff7c0a]' : 'text-[#6b7280]'
              }`}>
                {m === 'signin' ? 'Log In' : 'Sign Up'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Header */}
        <Text className="font-neusans text-2xl text-[#31343F] text-center mb-10">
          {mode === 'signin' ? 'Welcome back' : 'Create an account'}
        </Text>

        {/* Google OAuth */}
        <Pressable
          onPress={handleGoogleSignIn}
          className="flex-row items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 rounded-[50px] mb-4"
        >
          <FcGoogle size={20} />
          <Text className="font-neusans text-sm text-[#31343F]">
            Continue with Google
          </Text>
        </Pressable>

        {/* OR divider */}
        <Text className="font-neusans text-xs text-[#9ca3af] text-center tracking-[0.08em] uppercase py-3 mb-2">
          or
        </Text>

        {/* Error / success message */}
        {message && (
          <View className={`px-4 py-3 rounded-xl mb-4 ${
            message.type === 'error' ? 'bg-red-50' : 'bg-green-50'
          }`}>
            <Text className={`text-sm font-neusans ${
              message.type === 'error' ? 'text-red-700' : 'text-green-700'
            }`}>
              {message.text}
            </Text>
          </View>
        )}

        {/* Email */}
        <View className="mb-4">
          <Text className="font-neusans text-sm text-[#374151] mb-2">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email Address"
            placeholderTextColor="#797979"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-[#797979] rounded-[10px] px-4 py-3 text-base text-[#31343F] bg-white"
            style={{ fontSize: 16 }} // 16px prevents iOS zoom
          />
          {emailError ? (
            <Text className="text-xs text-red-600 mt-1 font-neusans">{emailError}</Text>
          ) : null}
        </View>

        {/* Password */}
        <View className="mb-2">
          <Text className="font-neusans text-sm text-[#374151] mb-2">Password</Text>
          <View className="relative">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#797979"
              secureTextEntry={!showPassword}
              className="border border-[#797979] rounded-[10px] px-4 py-3 text-base text-[#31343F] bg-white pr-12"
              style={{ fontSize: 16 }}
            />
            <Pressable
              onPress={() => setShowPassword(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              {showPassword
                ? <FiEyeOff size={20} color="#9ca3af" />
                : <FiEye size={20} color="#9ca3af" />
              }
            </Pressable>
          </View>
          {passwordError ? (
            <Text className="text-xs text-red-600 mt-1 font-neusans">{passwordError}</Text>
          ) : null}
        </View>

        {/* Forgot password — only in signin mode */}
        {mode === 'signin' && (
          <Pressable
            onPress={() => router.push('/forgot-password')}
            className="self-end mb-6"
          >
            <Text className="font-neusans text-sm text-[#494D5D]">Forgot password?</Text>
          </Pressable>
        )}

        {/* Submit */}
        <Button
          variant="primary"
          className="w-full mt-2"
          onPress={mode === 'signin' ? handleSubmit : handleRegisterSubmit}
          disabled={isLoading}
        >
          {isLoading ? <Spinner /> : (mode === 'signin' ? 'Log In' : 'Sign Up')}
        </Button>

        {/* DEV_MODE skip button */}
        {DEV_MODE && (
          <Pressable
            onPress={() => router.replace('/')}
            className="mt-6 items-center py-2"
          >
            <Text className="font-neusans text-xs text-[#9ca3af] border border-dashed border-gray-300 px-4 py-2 rounded-full">
              ⚡ DEV: Skip auth → Home
            </Text>
          </Pressable>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

**Input field design tokens (from `_auth.scss`):**
```
border:           1px solid #797979
border-radius:    10px
padding:          0.75rem 1rem (12px 16px)
font-size:        16px (minimum — prevents iOS Safari zoom)
color:            #31343F
focus border:     #31343F
focus bg:         #F1F1F1
placeholder:      #797979
```

---

## 7. Auth Flow — Register Screen

The Register screen shares the same `/login` screen with `mode='signup'`, switching the form. When `mode === 'signup'`:

- Email, Password, Confirm Password fields
- Password minimum length validation (`minimumPassword` constant)
- On success → push `/user-verification`

```tsx
// Additional fields when mode === 'signup'
<View className="mb-4">
  <Text className="font-neusans text-sm text-[#374151] mb-2">Confirm Password</Text>
  <View className="relative">
    <TextInput
      value={confirmPassword}
      onChangeText={setConfirmPassword}
      placeholder="••••••••"
      placeholderTextColor="#797979"
      secureTextEntry={!showConfirmPassword}
      className="border border-[#797979] rounded-[10px] px-4 py-3 text-base text-[#31343F] pr-12"
      style={{ fontSize: 16 }}
    />
    <Pressable onPress={() => setShowConfirmPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2">
      {showConfirmPassword ? <FiEyeOff size={20} color="#9ca3af" /> : <FiEye size={20} color="#9ca3af" />}
    </Pressable>
  </View>
  {confirmPasswordError ? (
    <Text className="text-xs text-red-600 mt-1 font-neusans">{confirmPasswordError}</Text>
  ) : null}
</View>

{/* Terms — from web Register.tsx */}
<Text className="font-neusans text-sm text-[#374151] text-center mt-3">
  By signing up you agree to our{' '}
  <Text
    className="underline text-[#374151]"
    onPress={() => router.push('/terms-of-service')}
  >
    Terms of Service
  </Text>
  {' '}and{' '}
  <Text
    className="underline text-[#374151]"
    onPress={() => router.push('/privacy-policy')}
  >
    Privacy Policy
  </Text>
</Text>
```

**Register flow logic (preserved):**
```ts
// Validation sequence from Register.tsx
1. email validation → validEmail()
2. password.length >= minimumPassword
3. password === confirmPassword
4. checkEmailExists() → API call to verify email isn't taken
5. nhostAuthService.signUpWithEmailAndPassword({ email, password })
6. On success → router.push('/user-verification')
7. On error → setError(emailOccurredError)
```

---

## 8. Auth Flow — Email Verification

### Web (`/user-verification`)

Shows after registration. User sees a message to check their inbox. "Resend email" button available.

### Mobile recovery (`/user-verification.tsx`)

```tsx
// app/user-verification.tsx

const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export default function UserVerificationScreen() {
  const { nhostUser } = useNhostSession();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await nhostAuthService.sendVerificationEmail({ email: nhostUser?.email ?? '' });
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FCFCFC] px-8 justify-center">
      {/* Logo */}
      <View className="items-center mb-8">
        <Image source={TASTYPLATES_LOGO_COLOUR} style={{ height: 28, width: 120 }} contentFit="contain" />
      </View>

      {/* Email icon */}
      <View className="w-20 h-20 rounded-full bg-orange-100 items-center justify-center mx-auto mb-6">
        <Text style={{ fontSize: 36 }}>📧</Text>
      </View>

      <Text className="font-neusans text-2xl text-[#31343F] text-center mb-3">
        Verify your email
      </Text>
      <Text className="font-neusans text-sm text-[#6b7280] text-center mb-8">
        We sent a verification link to{'\n'}
        <Text className="text-[#31343F] font-medium">{nhostUser?.email}</Text>
      </Text>

      <Pressable onPress={handleResend} disabled={resending || resent}>
        <Text className={`font-neusans text-sm text-center ${
          resent ? 'text-green-600' : 'text-[#494D5D]'
        }`}>
          {resent ? '✓ Email sent!' : resending ? 'Sending...' : "Didn't receive it? Resend"}
        </Text>
      </Pressable>

      {/* DEV_MODE skip */}
      {DEV_MODE && (
        <Pressable
          onPress={() => router.push('/onboarding')}
          className="mt-8 items-center"
        >
          <Text className="font-neusans text-xs text-[#9ca3af] border border-dashed border-gray-300 px-4 py-2 rounded-full">
            ⚡ DEV: Skip verification → Onboarding
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
```

---

## 9. Onboarding — Step 1 (Profile & Palates)

### Web (`OnboardingStepOne.tsx`)

Fields:
- **Username** — validated with `validateUsername()` (min/max length, no spaces, no special chars at start/end, no consecutive specials)
- **Birthdate** — `CustomDatePicker`
- **Gender** — dropdown (`genderOptions`)
- **Pronoun** — dropdown (`pronounOptions`)
- **Palate selection** — multi-select of cuisine options fetched from API (`useCuisines()`)
- Step indicator at top

Step saves to `localStorage` under `REGISTRATION_KEY`.

### Mobile recovery (`/onboarding/step1.tsx`)

```tsx
// app/onboarding/step1.tsx

const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export default function OnboardingStep1() {
  const { user } = useNhostSession();
  const { cuisineOptions, loading: cuisinesLoading } = useCuisines();
  const [name, setName] = useState(generateDefaultUsername());
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [pronoun, setPronoun] = useState('');
  const [selectedPalates, setSelectedPalates] = useState<Set<string>>(new Set());
  const [usernameError, setUsernameError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    haptic('success');
    // Validate username
    const usernameValidation = validateUsername(name);
    if (usernameValidation) { setUsernameError(usernameValidation); return; }

    // Save to AsyncStorage (replaces localStorage)
    await AsyncStorage.setItem(REGISTRATION_KEY, JSON.stringify({
      username: name, birthdate, gender, pronoun,
      palates: Array.from(selectedPalates)
    }));
    router.push('/onboarding/step2');
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#FCFCFC]" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View className="items-center mb-6">
          <Image source={TASTYPLATES_LOGO_COLOUR} style={{ height: 24, width: 100 }} contentFit="contain" />
        </View>

        {/* Step indicator */}
        <OnboardingStepIndicator currentStep={1} totalSteps={2} />

        <Text className="font-neusans text-xl text-[#31343F] text-center mb-2 mt-6">
          Tell us about yourself
        </Text>
        <Text className="font-neusans text-sm text-[#6b7280] text-center mb-8">
          Help us personalise your experience
        </Text>

        {/* Username */}
        <View className="mb-5">
          <Text className="font-neusans text-sm text-[#374151] mb-2">Username</Text>
          <TextInput
            value={name}
            onChangeText={v => { setName(v); setUsernameError(''); }}
            placeholder="your_username"
            placeholderTextColor="#797979"
            autoCapitalize="none"
            className="border border-[#797979] rounded-[10px] px-4 py-3 text-base text-[#31343F]"
            style={{ fontSize: 16 }}
          />
          {usernameError ? (
            <Text className="text-xs text-red-600 mt-1 font-neusans">{usernameError}</Text>
          ) : null}
        </View>

        {/* Birthdate */}
        <View className="mb-5">
          <Text className="font-neusans text-sm text-[#374151] mb-2">Date of birth</Text>
          <DatePickerInput
            value={birthdate}
            onChange={setBirthdate}
            placeholder="DD/MM/YYYY"
          />
        </View>

        {/* Gender */}
        <View className="mb-5">
          <Text className="font-neusans text-sm text-[#374151] mb-2">Gender</Text>
          <SelectInput
            value={gender}
            options={genderOptions}
            onChange={setGender}
            placeholder="Select gender"
          />
        </View>

        {/* Pronoun */}
        <View className="mb-6">
          <Text className="font-neusans text-sm text-[#374151] mb-2">Pronoun (optional)</Text>
          <SelectInput
            value={pronoun}
            options={pronounOptions}
            onChange={setPronoun}
            placeholder="Select pronoun"
          />
        </View>

        {/* Palate selection */}
        <View className="mb-8">
          <Text className="font-neusans text-sm text-[#374151] mb-1">
            Your palate (choose up to {palateLimit})
          </Text>
          <Text className="font-neusans text-xs text-[#6b7280] mb-4">
            Select the cuisines you enjoy most
          </Text>
          {cuisinesLoading ? (
            <View className="flex-row flex-wrap gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <View key={i} className="h-9 w-24 rounded-full bg-gray-200 animate-pulse" />
              ))}
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {cuisineOptions.map(option => {
                const selected = selectedPalates.has(option.key as string);
                return (
                  <Pressable
                    key={option.key as string}
                    onPress={() => {
                      haptic('selection');
                      setSelectedPalates(prev => {
                        const next = new Set(prev);
                        if (selected) { next.delete(option.key as string); }
                        else if (next.size < palateLimit) { next.add(option.key as string); }
                        return next;
                      });
                    }}
                    className={`px-4 py-2 rounded-[50px] border-2 ${
                      selected
                        ? 'bg-[#ff7c0a] border-[#ff7c0a]'
                        : 'bg-white border-[#e5e7eb]'
                    }`}
                  >
                    <Text className={`font-neusans text-sm ${
                      selected ? 'text-white' : 'text-[#31343F]'
                    }`}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Next button */}
        <Button variant="primary" className="w-full" onPress={handleNext} disabled={isLoading}>
          {isLoading ? <Spinner /> : 'Continue'}
        </Button>

        {/* DEV_MODE skip */}
        {DEV_MODE && (
          <Pressable
            onPress={() => router.push('/onboarding/step2')}
            className="mt-4 items-center"
          >
            <Text className="font-neusans text-xs text-[#9ca3af] border border-dashed border-gray-300 px-4 py-2 rounded-full">
              ⚡ DEV: Skip step 1 → Step 2
            </Text>
          </Pressable>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

**Palate pill tokens (match web `_navbar.scss` pill):**
```
Selected:   bg-[#ff7c0a] border-[#ff7c0a] text-white
Unselected: bg-white border-[#e5e7eb] text-[#31343F]
Radius:     rounded-[50px] (pill)
Padding:    px-4 py-2
Font:       font-neusans text-sm
Transition: all 0.2s ease
```

---

## 10. Onboarding — Step 2 (Photo & Bio)

### Web (`OnboardingStepTwo.tsx`)

Fields:
- **Profile photo** — file input, uploads to `/api/v1/upload/image`, size limit check
- **About me** — text area, max `aboutMeMaxLimit` characters
- Submit → `restaurantUserService` update call → localStorage clear → router to home

### Mobile recovery (`/onboarding/step2.tsx`)

```tsx
// app/onboarding/step2.tsx

const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export default function OnboardingStep2() {
  const { user } = useNhostSession();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [aboutMe, setAboutMe] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const aboutMeMaxLimit = 200;

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    haptic('success');
    setIsLoading(true);
    try {
      const step1Data = JSON.parse(await AsyncStorage.getItem(REGISTRATION_KEY) ?? '{}');
      let profileImageUrl: string | undefined;

      // Upload to Nhost Storage (replaces /api/v1/upload/image)
      if (profileImage) {
        const { fileMetadata, error } = await nhost.storage.upload({
          file: { uri: profileImage, name: 'avatar.jpg', type: 'image/jpeg' }
        });
        if (error) throw error;
        profileImageUrl = nhost.storage.getPublicUrl({ fileId: fileMetadata.id });
      }

      // Update user profile via Nhost GraphQL
      await updateUserProfile({
        variables: {
          userId: user.user_id,
          username: step1Data.username,
          birthdate: step1Data.birthdate,
          gender: step1Data.gender,
          pronoun: step1Data.pronoun,
          palates: step1Data.palates,
          aboutMe,
          profileImage: profileImageUrl,
          onboardingComplete: true,
        }
      });

      await AsyncStorage.removeItem(REGISTRATION_KEY);
      router.replace('/');
    } catch (err) {
      toast.error('Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#FCFCFC]" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">

        <View className="items-center mb-6">
          <Image source={TASTYPLATES_LOGO_COLOUR} style={{ height: 24, width: 100 }} contentFit="contain" />
        </View>

        <OnboardingStepIndicator currentStep={2} totalSteps={2} />

        <Text className="font-neusans text-xl text-[#31343F] text-center mb-2 mt-6">
          Add a profile photo
        </Text>
        <Text className="font-neusans text-sm text-[#6b7280] text-center mb-8">
          Let others know who you are
        </Text>

        {/* Avatar picker — 120×120px circle */}
        <Pressable
          onPress={handlePickImage}
          className="self-center relative mb-8"
        >
          <View className="w-[120px] h-[120px] rounded-full bg-gray-100 overflow-hidden border-2 border-[#e5e7eb]">
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={{ width: 120, height: 120 }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text style={{ fontSize: 40 }}>📷</Text>
              </View>
            )}
          </View>
          {/* Camera badge */}
          <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#ff7c0a] items-center justify-center">
            <FiCamera size={16} color="white" />
          </View>
        </Pressable>

        {profileError && (
          <Text className="text-xs text-red-600 text-center mb-4 font-neusans">{profileError}</Text>
        )}

        {/* About me */}
        <View className="mb-8">
          <Text className="font-neusans text-sm text-[#374151] mb-2">About me (optional)</Text>
          <TextInput
            value={aboutMe}
            onChangeText={setAboutMe}
            placeholder="Tell the community about yourself and your food journey..."
            placeholderTextColor="#797979"
            multiline
            numberOfLines={4}
            maxLength={aboutMeMaxLimit}
            className="border border-[#797979] rounded-[10px] px-4 py-3 text-base text-[#31343F]"
            style={{ fontSize: 16, textAlignVertical: 'top', minHeight: 96 }}
          />
          <Text className="font-neusans text-xs text-[#9ca3af] text-right mt-1">
            {aboutMe.length}/{aboutMeMaxLimit}
          </Text>
        </View>

        <Button variant="primary" className="w-full" onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <Spinner /> : "Let's go!"}
        </Button>

        {/* DEV_MODE skip */}
        {DEV_MODE && (
          <Pressable
            onPress={() => router.replace('/')}
            className="mt-4 items-center"
          >
            <Text className="font-neusans text-xs text-[#9ca3af] border border-dashed border-gray-300 px-4 py-2 rounded-full">
              ⚡ DEV: Skip step 2 → Home
            </Text>
          </Pressable>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

---

## 11. DEV_MODE Skip System

### `.env` configuration

```env
# .env (root of mobile project)
EXPO_PUBLIC_DEV_MODE=true
```

> `EXPO_PUBLIC_` prefix makes the variable available at runtime in the Expo bundle. Never use `EXPO_PUBLIC_DEV_MODE=true` in a production build — set it to `false` or remove it.

### How it works

```ts
// lib/devMode.ts
export const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';
```

Import `DEV_MODE` wherever skip buttons are needed:

```tsx
import { DEV_MODE } from '@/lib/devMode';

// Inside any screen:
{DEV_MODE && (
  <Pressable
    onPress={() => router.replace('/next-screen')}
    className="mt-4 items-center"
  >
    <Text className="font-neusans text-xs text-[#9ca3af] border border-dashed border-gray-300 px-4 py-2 rounded-full">
      ⚡ DEV: Skip → [Next screen]
    </Text>
  </Pressable>
)}
```

### Skip button placement (all screens)

| Screen | Skip destination | Skip label |
|--------|-----------------|------------|
| `/login` (sign in) | `/(tabs)/` | `⚡ DEV: Skip auth → Home` |
| `/login` (sign up) | `/user-verification` | `⚡ DEV: Skip registration → Verify` |
| `/user-verification` | `/onboarding/step1` | `⚡ DEV: Skip verification → Onboarding` |
| `/onboarding/step1` | `/onboarding/step2` | `⚡ DEV: Skip step 1 → Step 2` |
| `/onboarding/step2` | `/(tabs)/` | `⚡ DEV: Skip step 2 → Home` |
| Review viewer (engagement auth modal) | *(dismiss modal)* | `⚡ DEV: Continue as guest` |

### Skip button design spec

```
Style:      dashed border, rounded-full
Color:      border-gray-300, text-[#9ca3af]  (visually distinct, unobtrusive)
Font:       font-neusans text-xs
Icon:       ⚡ prefix
Padding:    px-4 py-2
Margin:     mt-4 (below main CTA)
Visibility: only when DEV_MODE === true
```

> The skip buttons are intentionally styled to be non-prominent — they sit below the primary CTA and use a muted dashed appearance so they won't be accidentally included in screenshots or confused with real UI during demos.

---

## 12. Logic & API Preservation

### Review feed data fetching

| Web | Mobile |
|-----|--------|
| `reviewV2Service.getAllReviews({ limit: 8, userId })` | Direct Nhost GraphQL: `query GetTrendingReviews($limit: Int!, $userId: uuid)` |
| `useFollowingReviewsGraphQL()` hook | Port hook directly — already uses GraphQL, minimal changes |
| `useInfiniteScroll()` hook | Replace `IntersectionObserver` with `FlashList onEndReached` |

**Trending query (Nhost GraphQL):**
```graphql
query GetTrendingReviews($limit: Int!, $userId: uuid) {
  restaurant_reviews(
    where: { status: { _eq: "publish" }, parent_review_id: { _is_null: true } }
    order_by: { created_at: desc }
    limit: $limit
  ) {
    id databaseId: database_id
    content title: review_main_title
    rating: review_stars
    created_at published_at
    images: review_images { sourceUrl: source_url }
    author: author_details { node: { databaseId: database_id username name avatarUrl: avatar_url } }
    restaurant: restaurant_details { name slug }
    userLiked: user_liked(args: { user_id: $userId })
    commentLikes: likes_count
    repliesCount: replies_count
    palates
    hashtags
  }
}
```

### Like / comment mutations

| Web (via `/api/v1/`) | Mobile (Nhost GraphQL) |
|---------------------|----------------------|
| `reviewV2Service.toggleLike(reviewId, userId)` | `mutation ToggleLike($reviewId: uuid!, $userId: uuid!)` |
| `reviewV2Service.createComment(...)` | `mutation CreateComment($reviewId: uuid!, $userId: uuid!, $content: String!)` |
| `reviewV2Service.getComments(reviewId)` | `query GetComments($reviewId: uuid!)` |

### Auth service

```ts
// services/auth/nhostAuthService.ts — preserved, only Nhost calls
// No changes needed — nhostAuthService.signInWithEmailAndPassword, 
// signUpWithEmailAndPassword, signOut, sendVerificationEmail 
// all call Nhost SDK directly which works identically in React Native
```

### localStorage → AsyncStorage

All `localStorage` usage in the onboarding flow must be replaced with `AsyncStorage`:

```ts
// Replace:
localStorage.setItem(REGISTRATION_KEY, JSON.stringify(data));
localStorage.getItem(REGISTRATION_KEY);
localStorage.removeItem(REGISTRATION_KEY);

// With:
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem(REGISTRATION_KEY, JSON.stringify(data));
await AsyncStorage.getItem(REGISTRATION_KEY);
await AsyncStorage.removeItem(REGISTRATION_KEY);
```

### Image uploads → Nhost Storage

```ts
// Replace web /api/v1/upload/image with Nhost Storage SDK
const { fileMetadata, error } = await nhost.storage.upload({
  file: { uri: localUri, name: 'image.jpg', type: 'image/jpeg' }
});
const publicUrl = nhost.storage.getPublicUrl({ fileId: fileMetadata.id });
```

---

## 13. Screen Map

| Web route / component | Mobile screen | Expo Router path |
|----------------------|--------------|-----------------|
| Home page `<Reviews />` Trending tab | Home feed | `/(tabs)/` |
| Home page `<Reviews />` For You tab | Following (gated on home) | `/(tabs)/` (tab switch) |
| `/following` | Following screen | `/(tabs)/following` |
| `ReviewScreen` (mobile web) | `ReviewViewerModal` | Modal stack |
| `ReviewScreenDesktop` | N/A — desktop only | — |
| `SigninModal` (slide-up sheet) | Login screen | `/login?mode=signin` |
| `SignupModal` (slide-up sheet) | Login screen | `/login?mode=signup` |
| `/user-verification` | Verification screen | `/user-verification` |
| `/onboarding` step 1 | Onboarding step 1 | `/onboarding/step1` |
| `/onboarding` step 2 | Onboarding step 2 | `/onboarding/step2` |
| `ReviewEngagementAuthModal` (web portal) | `ReviewEngagementAuthModal` (bottom sheet) | inline in viewer |
| `ForgotPasswordModal` | Forgot password screen | `/forgot-password` |
| `ForgotPassLinkModal` | Forgot password confirmation | `/forgot-password/sent` |

---

## 14. Component Checklist

| Component | Source (web) | Mobile action |
|-----------|-------------|---------------|
| `Reviews.tsx` | `components/review/Reviews.tsx` | Port to `HomeScreen` with FlashList |
| `ReviewCard2.tsx` | `components/review/ReviewCard2.tsx` | Rewrite as RN Pressable, same 4.5:6 image |
| `ReviewCardSkeleton.tsx` | `components/ui/Skeleton/ReviewCardSkeleton.tsx` | Rewrite with animated pulse |
| `ReviewScreen.tsx` | `components/review/ReviewScreen.tsx` | `ReviewViewerModal` with paged FlatList |
| `ReviewPost` (single item) | Inside `ReviewScreen.tsx` | New `ReviewPost.tsx` component |
| `CommentsBottomSheet` | `components/review/CommentsBottomSheet.tsx` | Port as RN bottom sheet |
| `ReviewEngagementAuthModal` | `components/review/ReviewEngagementAuthModal.tsx` | Port as bottom sheet |
| `LoginPage` | `pages/Login/Login.tsx` | `LoginScreen` (`/login.tsx`) |
| `RegisterPage` | `pages/Register/Register.tsx` | Merged into `LoginScreen` (mode toggle) |
| `OnboardingStepOne` | `components/onboarding/OnboardingStepOne.tsx` | `/onboarding/step1.tsx` |
| `OnboardingStepTwo` | `components/onboarding/OnboardingStepTwo.tsx` | `/onboarding/step2.tsx` |
| `OnboardingStepIndicator` | `components/onboarding/OnboardingStepIndicator.tsx` | Port directly |
| `ForgotPasswordModal` | `components/ui/Modal/ForgotPasswordModal.tsx` | `/forgot-password.tsx` screen |
| `ForgotPassLinkModal` | `components/ui/Modal/ForgotPassLinkModal.tsx` | `/forgot-password/sent.tsx` screen |
| `useFollowingReviewsGraphQL` | `hooks/useFollowingReviewsGraphQL.ts` | Port directly (already GraphQL) |
| `useInfiniteScroll` | `hooks/useInfiniteScroll.ts` | Adapt to `FlashList onEndReached` pattern |
| `nhostAuthService` | `services/auth/nhostAuthService.ts` | Port directly (Nhost SDK works in RN) |

---

## 15. Haptic Map

| Interaction | Preset |
|-------------|--------|
| Tab switch (Trending ↔ For You) | `selection` |
| Tap review card | `light` |
| Tap like (adding) | `success` |
| Tap like (removing) | `light` |
| Tap comment button | `light` |
| Close review viewer | `light` |
| Submit login / register | `success` |
| Auth error | *(none — error message shown visually)* |
| Google OAuth tap | `success` |
| Tap follow (add) | `success` |
| Tap follow (remove) | `light` |
| Palate pill select | `selection` |
| Palate pill deselect | `selection` |
| Onboarding continue | `success` |
| Image picker open | `light` |
| DEV skip button | `light` |