# profile.md — Mobile Recovery Plan: Profile Screen

> **Purpose:** This document maps every web layout section, component, and interaction from the `Profile` feature in `tastyplates-v2` to its React Native (Expo) equivalent. It is a recovery plan grounded directly in the source code — not a redesign. The visual language from `design.md` is preserved exactly. All logic is mapped 1:1 with only the structural changes required by native conventions.
>
> **Two distinct contexts are fully covered:**
> - **Own profile** — the logged-in user viewing their own profile (`isViewingOwnProfile === true`)
> - **Public profile** — any user viewing another person's profile (`isViewingOwnProfile === false`)

---

## 1. Web Architecture (as it actually exists)

```
app/profile/page.tsx
  └─ Auth guard → redirects to /profile/[username] using session username or UUID

app/profile/[username]/page.tsx
  └─ <Profile targetUserIdentifier={usernameOrUUID} />

components/Profile/Profile.tsx                  ← orchestrator; all state lives here
  ├─ useProfileData(identifier)                 ← resolves UUID, loads userData, isViewingOwnProfile
  ├─ useFollowData(userData.id)                 ← followers[], following[], follow/unfollow handlers
  ├─ useNhostSession()                          ← user, nhostUser, loading
  │
  ├─ ProfileHeader.tsx                          ← identity, stats, action buttons
  ├─ ProfileHeaderSkeleton.tsx                  ← shown while profileDataLoading && !userData
  │
  ├─ @heroui/tabs (Tabs + Tab)                  ← tab container — WEB ONLY, cannot port
  │    ├─ ReviewsTab.tsx                        ← always shown (own and public profiles)
  │    ├─ WishlistsTab.tsx                      ← own profile only (isViewingOwnProfile)
  │    └─ CheckinsTab.tsx                       ← own profile only (isViewingOwnProfile)
  │
  ├─ FollowersModal.tsx                         ← fixed-overlay, max-w-md, max-h-[80vh]
  └─ FollowingModal.tsx                         ← fixed-overlay, max-w-md, max-h-[80vh]

app/profile/edit/page.tsx
  └─ <Form />                                   ← edit profile form component
```

### What `useProfileData` returns

```ts
{
  userData,              // { id, username, profile_image, avatarUrl, about_me,
                         //   palates, created_at, onboarding_complete, ... }
  nameLoading,           // true while username/identity is fetching
  aboutMeLoading,        // true while bio is fetching
  palatesLoading,        // true while palates are fetching
  loading,               // overall loading flag
  isViewingOwnProfile,   // true if identifier matches session user UUID or Nhost id
  error,                 // string | null
  followersCount,        // number from API
  followingCount,        // number from API
  refreshCounts,         // () => Promise<void>
}
```

### Tab visibility rules (critical — from `Profile.tsx`)

```ts
// Tabs array is built conditionally in Profile.tsx
const tabs = [
  { id: 'reviews',   label: 'Reviews',      always: true },
  { id: 'wishlists', label: 'To-Dine List', ownProfileOnly: true },
  { id: 'checkins',  label: 'Check-ins',    ownProfileOnly: true },
];

// WishlistsTab and CheckinsTab are NEVER shown when isViewingOwnProfile === false.
// Only the Reviews tab is visible on public profiles.
```

### Data-fetch timing — lazy loading (from `Profile.tsx`)

```ts
// Wishlists: only fetched when (activeTab === 'wishlists') && isViewingOwnProfile && !wishlistFetched
// Checkins:  only fetched when (activeTab === 'checkins')  && isViewingOwnProfile && !checkinsFetched
// Reviews:   fetched immediately on mount inside ReviewsTab.tsx (not lazy)
```

---

## 2. Screen Map (Web → Mobile)

| Web | Mobile | Expo Router path | Notes |
|-----|--------|-----------------|-------|
| `/profile` (redirect) | Own profile tab | `/(tabs)/profile` | Reads `user.username` from session |
| `/profile/[username]` | Profile screen | `/profile/[username]` | Own or public depending on session |
| `FollowersModal` (overlay) | Followers screen | `/profile/[username]/followers` | Native stack push |
| `FollowingModal` (overlay) | Following screen | `/profile/[username]/following` | Native stack push |
| `/profile/edit` | Edit profile | `/profile/edit` | `<Form />` component |

> **Why overlays → screens:** The web modals are `fixed inset-0 z-50` overlays with internal scroll (`max-h-[80vh] overflow-y-auto`). On native, this pattern causes sheet-within-sheet conflicts. Full pushed screens are the correct native equivalent and provide native back navigation.

---

## 3. Own Profile vs. Public Profile — What Changes

| Feature | Own Profile | Public Profile |
|---------|-------------|----------------|
| Avatar tap | Navigate to `/profile/edit` | No action |
| Action buttons | "Edit Profile" + "Share Profile" | Follow/Unfollow only (if viewer is logged in) |
| "Edit Profile" style | `bg-[#31343F] text-white rounded-full` | Not rendered |
| "Share Profile" style | `bg-white border border-gray-300 rounded-full` | Not rendered |
| `FollowButton` | Not rendered | Rendered (notFollowing: `#ff7c0a`, following: `bg-white border-black`) |
| Reviews tab | ✅ Shown | ✅ Shown |
| To-Dine List tab | ✅ Shown | ❌ Hidden |
| Check-ins tab | ✅ Shown | ❌ Hidden |
| Wishlist / checkin data fetch | Triggered on tab activation | Never fetched |
| Welcome toast on mount | Shown if `WELCOME_KEY` in storage | Not shown |
| Stats (Posts / Followers / Following) | Shown for all | Shown for all |

---

## 4. ProfileHeader — Exact Layout Recovery

### Web layout (`ProfileHeader.tsx` — exact measurements)

```
┌─────────────────────────────────────────────┐  max-w-900px, pt-6 (pt-10 desktop)
│  Section 1 — Identity (centered)            │
│  ┌────────────────────────────────────────┐ │
│  │  [Avatar 96px mobile / 128px desktop]  │ │  rounded-full, object-cover
│  │  @username                             │ │  font-neusans text-lg md:text-2xl
│  │                                        │ │  font-semibold, leading-tight
│  │  Member since March 2024               │ │  text-xs md:text-sm, text-gray-400
│  │                                        │ │  font-neusans
│  │  [🇰🇷 Korean] [🇯🇵 Japanese] [🌏 Asian] │ │  bg-gray-100, py-0.5 px-2 md:py-1 md:px-2.5
│  │                                        │ │  rounded-full, text-xs md:text-sm
│  │                                        │ │  font-medium text-gray-700
│  │                                        │ │  flag: w-3 h-2 md:w-4 md:h-2.5
│  │  Bio text (whitespace-pre-line)        │ │  text-sm md:text-base text-gray-600
│  │                                        │ │  leading-relaxed max-w-sm md:max-w-lg
│  └────────────────────────────────────────┘ │
│─────────────────────────────────────────────│  border-t border-gray-100 (no explicit divider
│  Section 2 — Stats                          │  in web — uses pt-5/mb-5 spacing)
│  ┌────────────────────────────────────────┐ │  pt-5 md:pt-6, mb-5 md:mb-6
│  │   42        |   128       |   65       │ │  gap-10 mobile / gap-20 desktop
│  │   Posts     |  Followers  |  Following │ │  Followers + Following are tappable buttons
│  │             |  (button)   |  (button)  │ │  font-neusans font-semibold text-base md:text-xl
│  │             |             |            │ │  labels: text-xs md:text-sm text-gray-500
│  └────────────────────────────────────────┘ │
│─────────────────────────────────────────────│  pt-5 md:pt-6, mb-5 md:mb-6
│  Section 3 — Actions (centered)             │
│  ┌────────────────────────────────────────┐ │  flex-row items-center justify-center gap-3
│  │  OWN:    [Edit Profile] [Share Profile]│ │
│  │  PUBLIC: [Follow]  or  [Following]     │ │  FollowButton component
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Palate pills — exact rendering from `ProfileHeader.tsx`:**
```tsx
// Each palate is capitalised word-by-word then looked up in palateFlagMap
<span className="bg-gray-100 py-0.5 px-2 md:py-1 md:px-2.5 rounded-full
                 text-xs md:text-sm font-medium text-gray-700 flex items-center gap-1">
  <Image src={flagSrc} width={16} height={10}
         className="rounded object-cover w-3 h-2 md:w-4 md:h-2.5" />
  {capitalizedPalate}
</span>
// Note: palate pills use bg-gray-100 / text-gray-700 — NOT the orange palette
```

**Action buttons — exact rendering from `ProfileHeader.tsx`:**
```tsx
// OWN PROFILE:
<Link href="/profile/edit"
  className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3
             bg-[#31343F] text-white rounded-full font-neusans text-sm md:text-base
             hover:bg-[#454855] transition-colors">
  Edit Profile
</Link>
<button onClick={handleShareProfile}
  className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3
             bg-white border border-gray-300 rounded-full font-neusans font-semibold
             text-sm md:text-base hover:bg-gray-50 transition-colors">
  <FiShare2 className="w-4 h-4" /> Share Profile
</button>

// PUBLIC PROFILE (viewer is logged in):
<FollowButton isFollowing={isFollowing} isLoading={followLoading}
  onToggle={async (currently) => { ... }} size="default" />
```

**`FollowButton` states (from `follow-button.tsx`):**
```ts
// Not following: bg-[#ff7c0a] text-white border-[#ff7c0a] → label "Follow"
// Following:     bg-white text-black border border-black  → label "Following"
// Loading:       opacity-50 pointer-events-none, text changes to "Following..." / "Unfollowing..."
// All variants:  rounded-[50px], font-neusans, font-normal, px-4 py-2, text-xs, min-w-[80px]
// active:scale-95 on press
```

### Mobile recovery (`ProfileHeader.tsx` → RN)

```tsx
// components/profile/ProfileHeader.tsx

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userData, userReviewCount, followersCount, followingCount,
  followersLoading, followingLoading, isViewingOwnProfile,
  isFollowing, followLoading, nhostUser, currentUser,
  onShowFollowers, onShowFollowing, onFollow, onUnfollow,
}) => {
  const { trigger: haptic } = useHaptic();
  const router = useRouter();

  // Avatar priority — matches web exactly
  const avatarUri =
    (isViewingOwnProfile && nhostUser?.avatarUrl?.trim())
      ? nhostUser.avatarUrl
      : (userData?.avatarUrl as string)?.trim()
        ? (userData.avatarUrl as string)
        : getProfileImageUrl(userData?.profile_image) ?? DEFAULT_USER_ICON;

  const displayName   = (userData?.username as string) ?? '';
  const palatesArray  = getPalatesArray(userData?.palates);
  const memberSince   = formatMemberSince(userData?.created_at);
  const aboutMe       = userData?.about_me as string | undefined;

  const handleShare = async () => {
    haptic('light');
    const url = `https://tastyplates.com/profile/${displayName}`;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(url);
    } else {
      await Clipboard.setStringAsync(url);
      customToast.success('Profile link copied!');
    }
  };

  return (
    <View className="px-4 pt-6 pb-0">

      {/* ── Section 1: Identity (centered) ── */}
      <View className="items-center gap-2 mb-6">

        {/* Avatar — 96px, tappable only on own profile */}
        <Pressable
          onPress={isViewingOwnProfile ? () => router.push('/profile/edit') : undefined}
          className="mb-1"
        >
          <Image
            source={{ uri: avatarUri }}
            style={{ width: 96, height: 96, borderRadius: 48 }}
            contentFit="cover"
          />
        </Pressable>

        {/* Username */}
        <Text className="font-neusans text-lg font-semibold text-[#31343F] leading-tight">
          @{displayName}
        </Text>

        {/* Member since */}
        {memberSince ? (
          <Text className="font-neusans text-xs text-gray-400">{memberSince}</Text>
        ) : null}

        {/* Palate pills with flags — wrapping flex row */}
        {palatesArray.length > 0 && (
          <View className="flex-row flex-wrap justify-center gap-1.5 mt-1">
            {palatesArray.map((palate, index) => {
              const cap = capitalizeWords(palate);
              const flagSrc = palateFlagMap[cap.toLowerCase()];
              return (
                <View
                  key={index}
                  className="flex-row items-center gap-1 bg-gray-100 py-0.5 px-2 rounded-full"
                >
                  {flagSrc && (
                    <Image
                      source={flagSrc}
                      style={{ width: 12, height: 8, borderRadius: 1 }}
                      contentFit="cover"
                    />
                  )}
                  <Text className="font-neusans text-xs font-medium text-gray-700">
                    {cap}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Bio */}
        {aboutMe ? (
          <Text
            className="font-neusans text-sm text-gray-600 text-center leading-relaxed mt-1"
            style={{ maxWidth: 320 }}
          >
            {aboutMe}
          </Text>
        ) : null}
      </View>

      {/* ── Section 2: Stats row ── */}
      <View className="border-t border-gray-100 pt-5 mb-5">
        <View className="flex-row justify-center" style={{ gap: 40 }}>

          <View className="items-center gap-0.5">
            <Text className="font-neusans font-semibold text-base text-[#31343F]">
              {userReviewCount ?? 0}
            </Text>
            <Text className="font-neusans text-xs text-gray-500">Posts</Text>
          </View>

          <Pressable
            onPress={() => { haptic('selection'); onShowFollowers(); }}
            disabled={followersLoading}
            className="items-center gap-0.5"
            style={{ opacity: followersLoading ? 0.4 : 1 }}
          >
            <Text className="font-neusans font-semibold text-base text-[#31343F]">
              {followersLoading ? '—' : (followersCount ?? 0)}
            </Text>
            <Text className="font-neusans text-xs text-gray-500">Followers</Text>
          </Pressable>

          <Pressable
            onPress={() => { haptic('selection'); onShowFollowing(); }}
            disabled={followingLoading}
            className="items-center gap-0.5"
            style={{ opacity: followingLoading ? 0.4 : 1 }}
          >
            <Text className="font-neusans font-semibold text-base text-[#31343F]">
              {followingLoading ? '—' : (followingCount ?? 0)}
            </Text>
            <Text className="font-neusans text-xs text-gray-500">Following</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Section 3: Action buttons ── */}
      <View className="border-t border-gray-100 pt-5 mb-5">
        <View className="flex-row justify-center items-center gap-3">

          {isViewingOwnProfile && (
            <>
              <Pressable
                onPress={() => { haptic('light'); router.push('/profile/edit'); }}
                className="flex-row items-center gap-2 px-5 py-2.5 bg-[#31343F] rounded-full"
              >
                <Text className="font-neusans text-sm text-white">Edit Profile</Text>
              </Pressable>
              <Pressable
                onPress={handleShare}
                className="flex-row items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-full"
              >
                <FiShare2 size={16} color="#31343F" />
                <Text className="font-neusans text-sm font-semibold text-[#31343F]">
                  Share Profile
                </Text>
              </Pressable>
            </>
          )}

          {!isViewingOwnProfile && currentUser && (
            <FollowButton
              isFollowing={isFollowing}
              isLoading={followLoading}
              onToggle={async (currently) => {
                haptic(currently ? 'light' : 'success');
                if (currently) await onUnfollow(userData?.id as string);
                else await onFollow(userData?.id as string);
              }}
              size="default"
            />
          )}
        </View>
      </View>
    </View>
  );
};
```

**Design token reference:**

| Element | Value |
|---------|-------|
| Avatar | 96×96px circle, `contentFit="cover"` |
| Username | `font-neusans text-lg font-semibold text-[#31343F]` |
| Member since | `font-neusans text-xs text-gray-400` |
| Palate pill bg | `bg-gray-100` (not orange — matches web exactly) |
| Palate pill text | `font-neusans text-xs font-medium text-gray-700` |
| Palate flag | 12×8px, borderRadius 1, `contentFit="cover"` |
| Bio | `font-neusans text-sm text-gray-600 leading-relaxed` |
| Stat number | `font-neusans font-semibold text-base text-[#31343F]` |
| Stat label | `font-neusans text-xs text-gray-500` |
| Stat column gap | `40px` |
| Section dividers | `border-t border-gray-100`, `pt-5 mb-5` |
| "Edit Profile" | `bg-[#31343F] text-white rounded-full px-5 py-2.5` |
| "Share Profile" | `bg-white border border-gray-300 rounded-full px-5 py-2.5` |
| Follow (not following) | `bg-[#ff7c0a] text-white border-[#ff7c0a] rounded-[50px] px-4 py-2 text-xs min-w-[80px]` |
| Follow (following) | `bg-white text-black border border-black rounded-[50px] px-4 py-2 text-xs min-w-[80px]` |

---

## 5. Skeleton Loading State

**Web (`ProfileHeaderSkeleton.tsx`) — exact structure mirrored:**

```tsx
// components/profile/ProfileHeaderSkeleton.tsx

const ProfileHeaderSkeleton = () => (
  <View className="px-4 pt-6 pb-0">

    {/* Section 1 — Identity */}
    <View className="items-center gap-2 mb-6">
      <View className="w-24 h-24 rounded-full bg-gray-200 animate-pulse mb-1" />
      <View className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
      <View className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
      <View className="flex-row gap-1.5 justify-center mt-1">
        <View className="h-6 w-16 rounded-full bg-gray-200 animate-pulse" />
        <View className="h-6 w-20 rounded-full bg-gray-200 animate-pulse" />
        <View className="h-6 w-14 rounded-full bg-gray-200 animate-pulse" />
      </View>
      <View className="h-10 w-56 rounded bg-gray-200 animate-pulse mt-1" />
    </View>

    {/* Section 2 — Stats */}
    <View className="border-t border-gray-100 pt-5 mb-5">
      <View className="flex-row justify-center" style={{ gap: 40 }}>
        {[1, 2, 3].map(i => (
          <View key={i} className="items-center gap-1">
            <View className="h-5 w-8 rounded bg-gray-200 animate-pulse" />
            <View className="h-3.5 w-10 rounded bg-gray-200 animate-pulse" />
          </View>
        ))}
      </View>
    </View>

    {/* Section 3 — Actions */}
    <View className="border-t border-gray-100 pt-5 mb-5">
      <View className="flex-row justify-center items-center gap-3">
        <View className="h-10 w-32 rounded-full bg-gray-200 animate-pulse" />
        <View className="h-10 w-36 rounded-full bg-gray-200 animate-pulse" />
      </View>
    </View>
  </View>
);
```

---

## 6. Tab Bar

### Web tab styling (from `Profile.tsx` classNames)

```ts
// @heroui/tabs with variant="underlined"
cursor:     "w-full bg-[#31343F]"      // ← underline is #31343F (dark), NOT orange
tab:        "px-4 sm:px-6 py-3 h-[44px] font-neusans whitespace-nowrap"
tabContent: "group-data-[selected=true]:text-[#31343F]"  // active text also #31343F
// Inactive text defaults to muted gray
```

> ⚠️ **Critical:** The tab underline and active text are `#31343F` (dark charcoal) — not `#ff7c0a` orange. This is intentional. The pill-style tabs elsewhere (home feed, login) use orange. The profile tab bar uses the underlined variant with dark text.

### Mobile recovery (`ProfileTabs.tsx`)

```tsx
// components/profile/ProfileTabs.tsx

const ProfileTabs = ({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: Array<{ key: string; label: string }>;
  activeTab: string;
  onTabChange: (key: string) => void;
}) => {
  const { trigger: haptic } = useHaptic();

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 0 }}
      >
        <View className="flex-row">
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => { haptic('selection'); onTabChange(tab.key); }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  height: 44,
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Text
                  className="font-neusans whitespace-nowrap"
                  style={{
                    fontSize: 14,
                    color: active ? '#31343F' : '#9ca3af',
                  }}
                >
                  {tab.label}
                </Text>
                {/* Underline cursor — full tab width, #31343F */}
                {active && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      backgroundColor: '#31343F',
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
```

### Tab configuration per profile type

```tsx
// In ProfileScreen — mirror Profile.tsx exactly
const tabs = [
  { key: 'reviews',   label: 'Reviews' },
  ...(isViewingOwnProfile ? [
    { key: 'wishlists', label: 'To-Dine List' },
    { key: 'checkins',  label: 'Check-ins' },
  ] : []),
];
// Label text is exact: "To-Dine List" and "Check-ins" (not "Wishlists" or "Check Ins")
```

---

## 7. Reviews Tab

### Web (`ReviewsTab.tsx`) — key details

- Fetches via `restaurantUserService.getReviews({ user_id, limit: 50, offset, status: 'approved' })`
- UUID validated before fetch (`UUID_REGEX.test(userId)`)
- Raw API item → mapped to `ReviewV2` shape → `transformReviewV2ToReviewedDataProps()`
- Rendered via `TabContentGrid` with `gridClassName="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"`
- 8 skeleton cards while loading and `reviews.length === 0`
- On card tap → opens `ReviewScreen` (mobile web) or `ReviewScreenDesktop` (desktop)
- `onReviewCountChange` callback lifts count to the header stat

### Mobile recovery

```tsx
// components/profile/ReviewsTab.tsx
const LIMIT = 50;

const ReviewsTab = ({
  targetUserId,
  onReviewCountChange,
}: {
  targetUserId: string;
  onReviewCountChange?: (count: number) => void;
}) => {
  const [reviews, setReviews] = useState<ReviewedDataProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetch = useCallback(async (currentOffset = 0) => {
    if (!targetUserId || !UUID_REGEX.test(targetUserId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Replace with direct Nhost GraphQL in mobile (no /api/v1/)
      const { data, meta } = await fetchUserReviews({
        userId: targetUserId, limit: LIMIT, offset: currentOffset, status: 'approved',
      });
      const transformed = data.map(transformReviewV2ToReviewedDataProps);
      setReviews(prev =>
        currentOffset === 0
          ? transformed
          : [...new Map([...prev, ...transformed].map(r => [r.id, r])).values()]
      );
      onReviewCountChange?.(meta.total ?? 0);
      setOffset(currentOffset + transformed.length);
      setHasMore(meta.hasMore ?? false);
    } catch (e) {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, onReviewCountChange]);

  useEffect(() => {
    setReviews([]); setOffset(0); setHasMore(true);
    fetch(0);
    return () => setReviews([]);
  }, [targetUserId, fetch]);

  const reviewsAsGraphQL = reviews as unknown as GraphQLReview[];
  const columnWidth = (SCREEN_WIDTH - 48) / 2; // 16px padding each side + 16px gap

  if (loading && reviews.length === 0) {
    return (
      <View className="flex-row flex-wrap px-4 gap-4 mt-10">
        {Array.from({ length: 8 }, (_, i) => (
          <ReviewCardSkeleton2 key={`rs-${i}`} width={columnWidth} />
        ))}
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View className="items-center justify-center py-12 px-6">
        <Text className="font-neusans text-lg font-medium text-gray-900 mb-2">
          No Reviews Found
        </Text>
        <Text className="font-neusans text-sm text-gray-500 text-center">
          No reviews have been made yet.
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlashList
        data={reviews}
        numColumns={2}
        estimatedItemSize={320}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        renderItem={({ item, index }) => (
          <ReviewCard2
            data={item}
            reviews={reviewsAsGraphQL}
            reviewIndex={index}
            onOpenViewer={i => { setViewerIndex(i); setViewerOpen(true); }}
          />
        )}
        onEndReached={() => { if (hasMore && !loading) fetch(offset); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ReviewGridSkeleton count={4} /> : null}
      />
      <ReviewViewerModal
        reviews={reviewsAsGraphQL}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
};
```

---

## 8. To-Dine List Tab (Wishlists)

### Web (`WishlistsTab.tsx`) — key details

- Data is **passed in from the parent** (Profile.tsx), not fetched inside the tab
- Lazy fetch in parent: triggered when `activeTab === 'wishlists'` and `!wishlistFetched`
- Each item: `item.restaurant` unwrapped from wishlist response
- Grid: `restaurants__grid restaurants__grid--profile restaurants__grid--profile-wishlists`
  - Mobile web: **1 column**; Tablet: 2 cols; Desktop: 3 cols
- `RestaurantCard` gets `profileTablist="wishlists"` + `initialSavedStatus={true}`
- Bookmark tap → shows "Delete this Wishlist?" confirmation modal

### Mobile recovery

```tsx
// components/profile/WishlistsTab.tsx
// 1 column on mobile — matches web's --profile-wishlists single column

const WishlistsTab = ({
  wishlist, wishlistLoading, onWishlistChange,
}: {
  wishlist: Restaurant[];
  wishlistLoading: boolean;
  onWishlistChange: (restaurantId: string, isSaved: boolean) => void;
}) => {
  if (wishlistLoading && wishlist.length === 0) {
    return (
      <View className="px-4 mt-10 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <RestaurantCardSkeleton key={`wl-${i}`} style={{ width: '100%' }} />
        ))}
      </View>
    );
  }

  if (wishlist.length === 0) {
    return (
      <View className="items-center justify-center py-12 px-6">
        <Text className="font-neusans text-lg font-medium text-gray-900 mb-2">
          No Restaurants Found
        </Text>
        <Text className="font-neusans text-sm text-gray-500 text-center">
          No restaurants added to the To-Dine list yet.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={wishlist}
      numColumns={1}           // 1 col — matches web wishlists grid
      estimatedItemSize={240}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 40 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => (
        <RestaurantCard
          restaurant={item}
          profileTablist="wishlists"
          initialSavedStatus={true}
          onWishlistChange={onWishlistChange}
        />
      )}
    />
  );
};
```

---

## 9. Check-ins Tab

### Web (`CheckinsTab.tsx`) — key details

- Same lazy-fetch pattern as wishlists (parent-driven)
- Grid: `restaurants__grid restaurants__grid--profile` → **2 columns mobile**
- `RestaurantCard` gets `profileTablist="checkin"` — changes bookmark to a check-in toggle

### Mobile recovery

```tsx
// components/profile/CheckinsTab.tsx
// 2 columns on mobile — matches web's --profile grid

const CheckinsTab = ({
  checkins, checkinsLoading,
}: {
  checkins: Restaurant[];
  checkinsLoading: boolean;
}) => {
  const columnWidth = (SCREEN_WIDTH - 44) / 2;

  if (checkinsLoading && checkins.length === 0) {
    return (
      <View className="flex-row flex-wrap px-4 gap-3 mt-10">
        {Array.from({ length: 8 }, (_, i) => (
          <RestaurantCardSkeleton key={`ci-${i}`} style={{ width: columnWidth }} />
        ))}
      </View>
    );
  }

  if (checkins.length === 0) {
    return (
      <View className="items-center justify-center py-12 px-6">
        <Text className="font-neusans text-lg font-medium text-gray-900 mb-2">
          No Check-ins Found
        </Text>
        <Text className="font-neusans text-sm text-gray-500 text-center">
          No check-ins have been made yet.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={checkins}
      numColumns={2}           // 2 cols — matches web profile grid
      estimatedItemSize={240}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 40 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => (
        <RestaurantCard
          restaurant={item}
          profileTablist="checkin"
        />
      )}
    />
  );
};
```

---

## 10. Followers Screen (was: FollowersModal)

### Web (`FollowersModal.tsx`) — exact render spec

```
Overlay: fixed inset-0 z-50 bg-black/40
Panel:   bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto

Header:  "Followers" — text-center text-xl py-5 font-neusans
Divider: border-b border-[#E5E5E5]

Each row (px-6 py-3 flex items-center gap-3):
  [Avatar 40×40 rounded-full — links to user profile]
  ─ flex-1 min-w-0:
    [Username — font-neusans font-normal truncate, links to user profile]
    [Palate pills: bg-[#f1f1f1] py-0.5 px-2 rounded-[50px] text-xs
                   font-medium text-[#31343f] flex items-center gap-1]
    [Flag 18×10px per pill]
  [FollowButton size="sm" — HIDDEN if row.id === currentUser.id]

Data loaded: fetch followers list + current user's following list in parallel
isFollowing derived: followingList.includes(follower.id)
                     false if follower.id === current user (can't follow self)

Empty: "There are no users yet." — centered py-12 text-gray-500 font-neusans
```

### Mobile recovery (`/profile/[username]/followers.tsx`)

```tsx
// app/profile/[username]/followers.tsx

export default function FollowersScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user } = useNhostSession();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [followersRes, followingRes] = await Promise.all([
          fetchFollowersForUser(username),
          user?.user_id ? fetchFollowingList(user.user_id) : Promise.resolve([]),
        ]);
        const followingIds = new Set((followingRes as any[]).map((u: any) => u.id));
        setFollowers((followersRes as any[]).map((f: any) => ({
          ...f,
          isFollowing: String(user?.user_id) === String(f.id)
            ? false
            : followingIds.has(f.id),
        })));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, user?.user_id]);

  const handleToggle = async (id: string, currently: boolean) => {
    setLoadingMap(prev => ({ ...prev, [id]: true }));
    setFollowers(prev => prev.map(f => f.id === id ? { ...f, isFollowing: !currently } : f));
    try {
      if (currently) await unfollowUser(id);
      else { haptic('success'); await followUser(id); }
    } catch {
      setFollowers(prev => prev.map(f => f.id === id ? { ...f, isFollowing: currently } : f));
    } finally {
      setLoadingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Stack header: back + title "Followers" — set via Expo Router screenOptions */}

      {loading ? (
        <UserListSkeleton count={5} />
      ) : followers.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12 px-6">
          <Text className="font-neusans text-gray-500 text-center">
            There are no users yet.
          </Text>
        </View>
      ) : (
        <FlashList
          data={followers}
          estimatedItemSize={68}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: '#E5E5E5', marginHorizontal: 24 }} />
          )}
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-3 px-6 py-3">

              {/* Avatar */}
              <Pressable onPress={() => router.push(generateProfileUrl(item.id, item.username))}>
                <Image
                  source={{ uri: item.image || DEFAULT_USER_ICON }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                  contentFit="cover"
                />
              </Pressable>

              {/* Name + palate pills */}
              <View className="flex-1 min-w-0">
                <Pressable onPress={() => router.push(generateProfileUrl(item.id, item.username))}>
                  <Text className="font-neusans font-normal text-[#31343F] truncate">
                    {item.name}
                  </Text>
                </Pressable>
                {item.cuisines.length > 0 && (
                  <View className="flex-row flex-wrap gap-1 mt-1">
                    {item.cuisines.map(cuisine => {
                      const flagUrl = palateFlagMap[cuisine.toLowerCase()];
                      return (
                        <View
                          key={cuisine}
                          className="flex-row items-center gap-1 bg-[#f1f1f1] py-0.5 px-2 rounded-[50px]"
                        >
                          {flagUrl && (
                            <Image
                              source={{ uri: flagUrl }}
                              style={{ width: 14, height: 8, borderRadius: 1 }}
                              contentFit="cover"
                            />
                          )}
                          <Text className="font-neusans text-xs font-medium text-[#31343f]">
                            {capitalizeWords(cuisine)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Follow button — hidden for self */}
              {user?.user_id && String(user.user_id) !== String(item.id) && (
                <FollowButton
                  isFollowing={item.isFollowing}
                  isLoading={loadingMap[item.id]}
                  onToggle={() => handleToggle(item.id, item.isFollowing)}
                  size="sm"
                />
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
```

---

## 11. Following Screen (was: FollowingModal)

Identical structure to the Followers screen with these exact differences from source:

- **Title:** "Following" (stack header)
- **Data source:** `fetchFollowingList(profileUserId)` — only one API call (no cross-check needed)
- **FollowButton extra class:** `className="border border-[#494D5D]"` — this is in the web source exactly
- **No self-check needed** — the profile user doesn't appear in their own following list

```tsx
// app/profile/[username]/following.tsx
// Same FlashList/row structure as followers.tsx
// FollowButton: size="sm" className="border border-[#494D5D]"
// Data: fetchFollowingList(resolvedUserId) — single fetch, no parallel
```

---

## 12. Profile Screen Orchestrator

```tsx
// app/profile/[username].tsx

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user, nhostUser } = useNhostSession();

  const {
    userData, loading: profileDataLoading, nameLoading, aboutMeLoading,
    palatesLoading, isViewingOwnProfile, error: profileError,
    followersCount, followingCount, refreshCounts,
  } = useProfileData(username);

  const { followers, following, followersLoading, followingLoading,
          handleFollow, handleUnfollow, refreshFollowData }
        = useFollowData(userData?.id as string || username);

  const [userReviewCount, setUserReviewCount] = useState(0);
  const [activeTab, setActiveTab] = useState('reviews');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [wishlist, setWishlist] = useState<Restaurant[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistFetched, setWishlistFetched] = useState(false);
  const [checkins, setCheckins] = useState<Restaurant[]>([]);
  const [checkinsLoading, setCheckinsLoading] = useState(false);
  const [checkinsFetched, setCheckinsFetched] = useState(false);

  // Tab list — conditional on isViewingOwnProfile (mirrors Profile.tsx)
  const tabs = [
    { key: 'reviews',   label: 'Reviews' },
    ...(isViewingOwnProfile ? [
      { key: 'wishlists', label: 'To-Dine List' },
      { key: 'checkins',  label: 'Check-ins' },
    ] : []),
  ];

  // Lazy fetch — trigger wishlist/checkins on tab activation
  const handleTabChange = (key: string) => {
    haptic('selection');
    setActiveTab(key);
    if (key === 'wishlists' && !wishlistFetched && isViewingOwnProfile) fetchWishlist();
    if (key === 'checkins'  && !checkinsFetched  && isViewingOwnProfile) fetchCheckins();
  };

  // Check follow status on mount (public profiles only)
  useEffect(() => {
    if (!user || !userData?.id || isViewingOwnProfile) { setIsFollowing(false); return; }
    checkFollowStatus(user.user_id, userData.id as string).then(setIsFollowing);
  }, [user, userData?.id, isViewingOwnProfile]);

  if (profileError && !profileDataLoading) {
    return <ProfileErrorScreen error={profileError} />;
  }

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>

      {(profileDataLoading || nameLoading) && !userData ? (
        <ProfileHeaderSkeleton />
      ) : (
        <ProfileHeader
          userData={userData}
          userReviewCount={userReviewCount}
          followersCount={followersCount}
          followingCount={followingCount}
          followersLoading={followersLoading || profileDataLoading}
          followingLoading={followingLoading || profileDataLoading}
          isViewingOwnProfile={isViewingOwnProfile}
          isFollowing={isFollowing}
          followLoading={followLoading}
          nhostUser={nhostUser}
          currentUser={user}
          onShowFollowers={() => router.push(`/profile/${username}/followers`)}
          onShowFollowing={() => router.push(`/profile/${username}/following`)}
          onFollow={handleProfileFollow}
          onUnfollow={handleProfileUnfollow}
        />
      )}

      <ProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'reviews' && (
        <ReviewsTab
          targetUserId={userData?.id as string || ''}
          onReviewCountChange={setUserReviewCount}
        />
      )}
      {activeTab === 'wishlists' && isViewingOwnProfile && (
        <WishlistsTab
          wishlist={wishlist}
          wishlistLoading={wishlistLoading}
          onWishlistChange={handleWishlistChange}
        />
      )}
      {activeTab === 'checkins' && isViewingOwnProfile && (
        <CheckinsTab checkins={checkins} checkinsLoading={checkinsLoading} />
      )}

    </ScrollView>
  );
}
```

---

## 13. API Migration (Web BFF → Nhost GraphQL)

| Web (`/api/v1/`) | Nhost GraphQL replacement |
|------------------|--------------------------|
| `getReviews({ user_id, status })` | `query GetUserReviews($userId: uuid!, $status: String, $limit: Int!, $offset: Int!)` on `restaurant_reviews where author_id` |
| `getWishlist({ user_id }, token)` | `query GetWishlist($userId: uuid!)` on `user_favorites` with `restaurant` join |
| `getCheckins({ user_id }, token)` | `query GetCheckins($userId: uuid!)` on `user_checkins` with `restaurant` join |
| `getFollowersList(userId)` | `query GetFollowers($userId: uuid!)` on `user_follows where followed_id` |
| `getFollowingList(userId)` | `query GetFollowing($userId: uuid!)` on `user_follows where follower_id` |
| `getFollowingCount(userId)` | `user_follows_aggregate where follower_id` |
| `POST /follow` | `mutation insert_user_follows_one($followedId: uuid!)` |
| `POST /unfollow` | `mutation delete_user_follows($followerId: uuid!, $followedId: uuid!)` |
| `POST /check-follow-status` | `query user_follows where follower_id AND followed_id` |
| `getUserById(identifier)` | `query GetProfile($identifier: String!)` — lookup by username or UUID |

---

## 14. Empty States (exact copy text from source)

| Context | Heading | Message |
|---------|---------|---------|
| Reviews tab | "No Reviews Found" | "No reviews have been made yet." |
| To-Dine List tab | "No Restaurants Found" | "No restaurants added to the To-Dine list yet." |
| Check-ins tab | "No Check-ins Found" | "No check-ins have been made yet." |
| Followers screen | — | "There are no users yet." |
| Following screen | — | "There are no users yet." |

---

## 15. Component Checklist

| Component | Source (web) | Mobile action |
|-----------|-------------|---------------|
| `Profile.tsx` (orchestrator) | `components/Profile/Profile.tsx` | Port to `ProfileScreen` — all state, lazy fetch, follow check |
| `ProfileHeader.tsx` | `components/Profile/ProfileHeader.tsx` | Rewrite in RN — exact spec in §4 |
| `ProfileHeaderSkeleton.tsx` | `components/ui/Skeleton/ProfileHeaderSkeleton.tsx` | Rewrite in RN — exact spec in §5 |
| `ProfileTabs` | `@heroui/tabs` — web only | Custom RN — `#31343F` cursor, 44px height, font-neusans |
| `ReviewsTab.tsx` | `components/Profile/ReviewsTab.tsx` | FlashList 2-col, ReviewCard2, ReviewViewerModal |
| `WishlistsTab.tsx` | `components/Profile/WishlistsTab.tsx` | FlashList **1-col**, RestaurantCard profileTablist="wishlists" |
| `CheckinsTab.tsx` | `components/Profile/CheckinsTab.tsx` | FlashList **2-col**, RestaurantCard profileTablist="checkin" |
| `FollowersModal.tsx` | `components/Profile/FollowersModal.tsx` | Stack screen `/profile/[username]/followers` |
| `FollowingModal.tsx` | `components/Profile/FollowingModal.tsx` | Stack screen `/profile/[username]/following` — add `border border-[#494D5D]` to FollowButton |
| `FollowButton` | `components/ui/follow-button.tsx` | RN Pressable — exact token spec in §4 |
| `TabContentGrid.tsx` | `components/ui/TabContentGrid/TabContentGrid.tsx` | Not ported — logic folded into each tab |
| `useProfileData` | `hooks/useProfileData.ts` | Port with Nhost GraphQL, preserve 25s timeout logic |
| `useFollowData` | `hooks/useFollowData.ts` | Port with Nhost GraphQL mutations |
| `palateFlagMap` | `utils/palateFlags.ts` | Port directly — static map |
| `generateProfileUrl` | `lib/utils.ts` | Port directly |
| `ReviewCard2` | `components/review/ReviewCard2.tsx` | Covered in auth-review-migration.md |
| `RestaurantCard` | `components/Restaurant/RestaurantCard.tsx` | Covered in restaurants.md |

---

## 16. Navigation

```
/(tabs)/profile
  └─ Reads session → router.replace(`/profile/${username}`)

/profile/[username]   ← own OR public depending on isViewingOwnProfile
  ├─ Own:    shows 3 tabs + "Edit Profile" + "Share Profile"
  ├─ Public: shows Reviews tab only + Follow/Unfollow button
  ├─ Tap Followers count  → push /profile/[username]/followers
  ├─ Tap Following count  → push /profile/[username]/following
  ├─ Tap "Edit Profile"   → push /profile/edit
  ├─ Tap review card      → open ReviewViewerModal (full-screen)
  └─ Tap restaurant card  → push /restaurants/[slug]

/profile/[username]/followers
  ├─ Stack header: back + "Followers"
  ├─ Tap user row → push /profile/[tapped-username]
  └─ Follow button → optimistic toggle + mutation

/profile/[username]/following
  └─ Same pattern — FollowButton has extra border border-[#494D5D]
```

---

## 17. Haptic Map

| Interaction | Preset |
|-------------|--------|
| Tab switch | `selection` |
| Tap Followers count | `selection` |
| Tap Following count | `selection` |
| Tap "Edit Profile" | `light` |
| Tap "Share Profile" | `light` |
| Follow (add) | `success` |
| Unfollow (remove) | `light` |
| Follow back in followers list | `success` |
| Wishlist bookmark toggle | `selection` |
| Delete wishlist confirm | `warning` |
| Tap review card | `light` |
| Tap restaurant card | `light` |