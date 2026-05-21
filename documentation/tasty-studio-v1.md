# tasty_studio_v1.md — TastyStudio Mobile: FAB Menu, Reviews & My Lists

> **Purpose:** This document defines the full mobile implementation of the TastyStudio feature — the floating action button (FAB) menu, Create Review, Manage Reviews, and the new My Lists feature (Check-ins + Likes). It covers UX, component structure, database schema, Google Places integration strategy, and the dual-track logic for matching places against existing listings.
>
> All visual language follows `design.md`. The FAB interaction is inspired by Spotify's "Create" button pattern — a single persistent button that expands into a contextual radial/stacked menu.

---

## 1. Web Architecture (what exists today)

```
/tastystudio/dashboard        → TastyStudioDashboard (stats, quick actions)
/tastystudio/add-review       → ReviewSubmissionPage
/tastystudio/review-listing   → ListingPage (published + drafts)
/tastystudio/edit-review/[id] → edit a review

TastyStudioSidebar:
  - Dashboard    (FiHome)
  - Upload a Review (FiEdit3)
  - Reviews      (FiFileText)

Active item: bg-[#ff7c0a] text-white shadow-sm rounded-xl
Inactive:    text-[#494D5D] hover:bg-gray-50

Layout: left sidebar (lg:w-64, fixed) + main content (lg:ml-64)
```

**Key finding from codebase:** The web has Google Places Autocomplete already wired into `ReviewSubmission.tsx` via:
- `GooglePlacesAutocomplete` component (autocomplete service, predictions dropdown)
- `RestaurantSearch` component (wraps autocomplete, handles `place_changed`)
- `RestaurantMatchInline` component (shows match result — existing or new)
- `fetchPlaceDetails` + `formatAddressComponents` in `lib/google-places-utils.ts`
- `RestaurantMatchDialog` for the modal confirmation

**My Lists does not exist in the web codebase yet.** Check-ins and Wishlists exist on the profile page (via `restaurantUserService`) but have no dedicated browse/discovery screen.

---

## 2. TastyStudio FAB — The "Studio" Button

### 2.1 Interaction design (Spotify "Create" pattern)

The Studio button lives in the bottom navigation bar at the rightmost position. Unlike a standard nav item, it behaves as a **Floating Action Button (FAB) with a radial stacked menu**.

**Closed state:**
```
Bottom nav, rightmost position
Icon:  pencil + sparkle (custom, or FiEdit3)
Label: "Studio"
Color: text-[#ff7c0a], bg transparent
```

**Tapped → Open state (Spotify-style):**
```
1. The Studio button icon morphs to a circular ✕ (×)
   - Scale animation: scale(0.9) → scale(1.0) with spring
   - Icon swap: FiEdit3 → FiX, rotates 90°, duration 220ms

2. A dark overlay fades in: rgba(0,0,0,0.5) over the whole screen

3. Three menu items spring up from the button position, staggered:
   - Item 1 (first up, 60ms delay):   Create Review
   - Item 2 (second up, 120ms delay): Manage Reviews
   - Item 3 (third up, 180ms delay):  My Lists

4. Each menu item: pill shape, label on left, icon on right
   bg-white, shadow-lg, rounded-full, font-neusans
   Icon circle: bg-[#ff7c0a] w-12 h-12 rounded-full

5. Tap outside or tap × → reverse animation, items spring back down
```

### 2.2 Animation spec (Reanimated 4)

```tsx
// Each menu item enters from y=40 → y=0, opacity 0 → 1
// Spring config: mass=0.8, damping=18, stiffness=200

const ITEMS = [
  { key: 'review',   label: 'Create Review',   icon: FiEdit3,    route: '/studio/add-review' },
  { key: 'manage',   label: 'Manage Reviews',  icon: FiFileText, route: '/studio/review-listing' },
  { key: 'lists',    label: 'My Lists',        icon: FiBookmark, route: '/studio/my-lists' },
];

// Stagger: items[0] delay=60ms, items[1] delay=120ms, items[2] delay=180ms
// Close button: FiX, rotates 90° on open (Spotify-style)
```

### 2.3 FAB component

```tsx
// components/studio/StudioFAB.tsx

const MENU_ITEMS = [
  { key: 'review',  label: 'Create Review',  Icon: FiEdit3,    route: '/studio/add-review'     },
  { key: 'manage',  label: 'Manage Reviews', Icon: FiFileText, route: '/studio/review-listing'  },
  { key: 'lists',   label: 'My Lists',       Icon: FiBookmark, route: '/studio/my-lists'        },
];

export const StudioFAB = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { trigger: haptic } = useHaptic();
  const router = useRouter();

  // Shared values for overlay and button icon
  const overlayOpacity  = useSharedValue(0);
  const buttonRotation  = useSharedValue(0);

  // Per-item shared values
  const itemTranslations = MENU_ITEMS.map(() => useSharedValue(40));
  const itemOpacities    = MENU_ITEMS.map(() => useSharedValue(0));

  const open = () => {
    haptic('light');
    setIsOpen(true);
    overlayOpacity.value  = withTiming(1, { duration: 200 });
    buttonRotation.value  = withSpring(1, { mass: 0.8, damping: 18, stiffness: 200 });
    MENU_ITEMS.forEach((_, i) => {
      itemTranslations[i].value = withDelay(
        i * 60,
        withSpring(0, { mass: 0.8, damping: 18, stiffness: 200 })
      );
      itemOpacities[i].value = withDelay(
        i * 60,
        withTiming(1, { duration: 160 })
      );
    });
  };

  const close = () => {
    haptic('light');
    overlayOpacity.value = withTiming(0, { duration: 180 });
    buttonRotation.value = withSpring(0, { mass: 0.8, damping: 18, stiffness: 200 });
    MENU_ITEMS.forEach((_, i) => {
      const reverseIndex = MENU_ITEMS.length - 1 - i;
      itemTranslations[reverseIndex].value = withDelay(
        i * 40,
        withSpring(40, { mass: 0.8, damping: 18, stiffness: 200 })
      );
      itemOpacities[reverseIndex].value = withDelay(
        i * 40,
        withTiming(0, { duration: 120 })
      );
    });
    setTimeout(() => setIsOpen(false), MENU_ITEMS.length * 40 + 160);
  };

  const toggle = () => isOpen ? close() : open();

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const buttonIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(buttonRotation.value, [0, 1], [0, 45])}deg` }],
  }));

  const handleNavigate = (route: string) => {
    close();
    setTimeout(() => router.push(route), 220); // wait for close animation
    haptic('success');
  };

  return (
    <>
      {/* Full-screen overlay — tap to close */}
      {isOpen && (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }, overlayStyle]}
          pointerEvents="box-only"
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={close} />
        </Animated.View>
      )}

      {/* Menu items — stacked above the FAB */}
      {isOpen && (
        <View
          style={{
            position: 'absolute',
            bottom: BOTTOM_NAV_HEIGHT + SAFE_AREA_BOTTOM + 12,
            right: 16,
            zIndex: 50,
            gap: 12,
          }}
        >
          {[...MENU_ITEMS].reverse().map((item, reversedIndex) => {
            const originalIndex = MENU_ITEMS.length - 1 - reversedIndex;
            const itemStyle = useAnimatedStyle(() => ({
              transform: [{ translateY: itemTranslations[originalIndex].value }],
              opacity: itemOpacities[originalIndex].value,
            }));

            return (
              <Animated.View key={item.key} style={itemStyle}>
                <Pressable
                  onPress={() => handleNavigate(item.route)}
                  className="flex-row items-center gap-3 pl-4 pr-1 py-1 bg-white rounded-full shadow-lg"
                  style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }}
                >
                  <Text className="font-neusans text-sm text-[#31343F] font-medium">
                    {item.label}
                  </Text>
                  <View className="w-12 h-12 rounded-full bg-[#ff7c0a] items-center justify-center">
                    <item.Icon size={20} color="white" />
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}

      {/* The FAB button itself — lives in BottomNav as the "Studio" tab */}
      <Pressable onPress={toggle} className="items-center gap-0.5">
        <Animated.View
          className="w-10 h-10 rounded-full bg-[#ff7c0a] items-center justify-center"
          style={buttonIconStyle}
        >
          {isOpen
            ? <FiX size={20} color="white" />
            : <FiEdit3 size={20} color="white" />
          }
        </Animated.View>
        <Text className="font-neusans text-[10px] text-[#ff7c0a]">Studio</Text>
      </Pressable>
    </>
  );
};
```

### 2.4 Bottom nav integration

The Studio button replaces the standard tab item in position 5. It does not navigate to a tab — it opens the FAB menu instead.

```tsx
// components/layout/BottomNav.tsx

const NAV_ITEMS = [
  { key: 'home',        label: 'Home',        Icon: FiHome,      route: '/(tabs)/'           },
  { key: 'restaurants', label: 'Discover',    Icon: FiCompass,   route: '/(tabs)/restaurants' },
  { key: 'following',   label: 'Following',   Icon: FiUsers,     route: '/(tabs)/following'   },
  { key: 'profile',     label: 'Profile',     Icon: FiUser,      route: '/(tabs)/profile'     },
  // Studio is NOT a nav item — it renders the FAB
];

// In BottomNav render:
<View className="flex-row items-center px-2">
  {NAV_ITEMS.map(item => <NavItem key={item.key} {...item} />)}
  <StudioFAB />   {/* rightmost position */}
</View>
```

---

## 3. Screen: Create Review (`/studio/add-review`)

### 3.1 What the web does (from `ReviewSubmission.tsx`)

The review submission flow has two entry points:
- `/tastystudio/add-review` — no pre-selected restaurant (search first)
- `/tastystudio/add-review/[slug]` — restaurant pre-selected from its detail page

**Flow:**
```
Step 1: Restaurant selection
  └─ GooglePlacesAutocomplete → types=['establishment']
       └─ User selects from predictions
            └─ fetchPlaceDetails(place_id) → full PlaceData
                 └─ Match against existing DB listings (by name + location)
                      ├─ Match found → RestaurantMatchInline (use existing or create new)
                      └─ No match → RestaurantMatchInline (create new listing)

Step 2: Review form
  - Review title (max reviewTitleMaxLimit chars)
  - Review body  (max reviewDescriptionMaxLimit chars)
  - Star rating  (1–5, custom Rating component)
  - Image upload (min: minimumImage, max: maximumImage)
  - Save as Draft / Submit

Step 3: Success screen
```

**Validation constants (from source):**
```ts
minimumImage     = 1        // at least 1 photo required
maximumImage     = 5        // max 5 photos
reviewTitleMaxLimit  // from constants/validation
reviewDescriptionMaxLimit
```

### 3.2 Mobile screen (`/studio/add-review/index.tsx`)

```tsx
// app/studio/add-review/index.tsx
// Step 1: Restaurant search

export default function AddReviewSearchScreen() {
  const { selectedLocation } = useLocation();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-4 pb-2 border-b border-gray-100">
        <Text className="font-neusans text-xl text-[#31343F] mb-1">Create Review</Text>
        <Text className="font-neusans text-sm text-[#6b7280]">
          Search for the restaurant you visited
        </Text>
      </View>

      {/* Search input */}
      <View className="px-4 py-3">
        <View className="flex-row items-center gap-3 border border-gray-200 rounded-[50px] px-4 py-3">
          <FiSearch size={18} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search restaurants..."
            placeholderTextColor="#9ca3af"
            className="flex-1 font-neusans text-[13px] text-[#31343F]"
            style={{ fontSize: 16 }}  // prevent iOS zoom
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setPredictions([]); }}>
              <FiX size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>
        {/* Location context */}
        <Text className="font-neusans text-xs text-[#6b7280] mt-2 ml-1">
          Searching near {selectedLocation.label}
        </Text>
      </View>

      {/* Predictions list */}
      {predictions.length > 0 && !matchResult && (
        <FlashList
          data={predictions}
          estimatedItemSize={64}
          keyExtractor={p => p.place_id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePlaceSelect(item)}
              className="flex-row items-center gap-3 px-4 py-4 border-b border-gray-50"
            >
              <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                <FiMapPin size={16} color="#9ca3af" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="font-neusans text-sm text-[#31343F]" numberOfLines={1}>
                  {item.structured_formatting.main_text}
                </Text>
                <Text className="font-neusans text-xs text-[#6b7280]" numberOfLines={1}>
                  {item.structured_formatting.secondary_text}
                </Text>
              </View>
              {matching && <ActivityIndicator size="small" color="#ff7c0a" />}
            </Pressable>
          )}
        />
      )}

      {/* Match result inline */}
      {matchResult && (
        <RestaurantMatchInlineMobile
          matchResult={matchResult}
          onUseExisting={handleUseExisting}
          onCreateNew={handleCreateNew}
          onClear={() => { setMatchResult(null); setQuery(''); }}
        />
      )}
    </SafeAreaView>
  );
}
```

### 3.3 Review form screen (`/studio/add-review/[slug].tsx`)

```tsx
// app/studio/add-review/[slug].tsx
// Step 2: Write the review (pre-selected restaurant)

export default function AddReviewFormScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [stars, setStars]   = useState(0);
  const [images, setImages] = useState<string[]>([]);  // local URIs
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>

        {/* Restaurant header (fetched by slug) */}
        <RestaurantReviewHeader slug={slug} />

        {/* Star rating */}
        <View className="mb-5">
          <Text className="font-neusans text-sm text-[#374151] mb-3">Your Rating</Text>
          <StarRating value={stars} onChange={setStars} size={36} />
        </View>

        {/* Review title */}
        <View className="mb-4">
          <Text className="font-neusans text-sm text-[#374151] mb-2">Review Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Give your review a title..."
            placeholderTextColor="#797979"
            maxLength={reviewTitleMaxLimit}
            className="border border-[#797979] rounded-[10px] px-4 py-3 text-base text-[#31343F]"
            style={{ fontSize: 16 }}
          />
          <Text className="text-xs text-right mt-1 font-neusans text-[#9ca3af]">
            {title.length}/{reviewTitleMaxLimit}
          </Text>
        </View>

        {/* Review body */}
        <View className="mb-4">
          <Text className="font-neusans text-sm text-[#374151] mb-2">Your Experience</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Describe your dining experience..."
            placeholderTextColor="#797979"
            multiline
            numberOfLines={5}
            maxLength={reviewDescriptionMaxLimit}
            className="border border-[#797979] rounded-[10px] px-4 py-3 text-base text-[#31343F]"
            style={{ fontSize: 16, textAlignVertical: 'top', minHeight: 120 }}
          />
          <Text className="text-xs text-right mt-1 font-neusans text-[#9ca3af]">
            {body.length}/{reviewDescriptionMaxLimit}
          </Text>
        </View>

        {/* Image upload */}
        <View className="mb-6">
          <Text className="font-neusans text-sm text-[#374151] mb-2">
            Photos ({images.length}/{maximumImage})
          </Text>
          <ImageUploadGrid
            images={images}
            onAdd={handleAddImage}
            onRemove={handleRemoveImage}
            maxImages={maximumImage}
            minImages={minimumImage}
          />
        </View>

        {/* Actions */}
        <Button
          variant="primary"
          className="w-full mb-3"
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <Spinner /> : 'Publish Review'}
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onPress={handleSaveDraft}
          disabled={savingDraft}
        >
          {savingDraft ? <Spinner /> : 'Save as Draft'}
        </Button>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

---

## 4. Screen: Manage Reviews (`/studio/review-listing`)

### 4.1 Web (`Listing.tsx`) — what it does

```
Tabs:   Published Reviews | Draft Reviews
Search: debounced text search (300ms) across review titles
Each published card: restaurant image, title, date, rating, status badge, edit/delete actions
Each draft card:     draft indicator, title, date, delete with confirmation modal
Pagination: page-based (not cursor) for published reviews
```

### 4.2 Mobile recovery

```tsx
// app/studio/review-listing/index.tsx

const TABS = [
  { key: 'published', label: 'Published' },
  { key: 'drafts',    label: 'Drafts'    },
];

export default function ReviewListingScreen() {
  const [activeTab, setActiveTab]   = useState<'published' | 'drafts'>('published');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch]           = useDebounce(searchTerm, 300);
  const { user } = useNhostSession();

  const { published, loadingPublished } = usePublishedReviews(user?.user_id, debouncedSearch);
  const { drafts,    loadingDrafts    } = useDraftReviews(user?.user_id, debouncedSearch);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Search */}
      <View className="px-4 py-3">
        <View className="flex-row items-center gap-2 border border-gray-200 rounded-[50px] px-4 py-2.5">
          <FiSearch size={16} color="#9ca3af" />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search your reviews..."
            placeholderTextColor="#9ca3af"
            className="flex-1 font-neusans text-sm text-[#31343F]"
            style={{ fontSize: 16 }}
          />
        </View>
      </View>

      {/* Tab bar — dark underline style (matches profile tabs) */}
      <ProfileTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      {activeTab === 'published' && (
        <PublishedReviewsList
          reviews={published}
          loading={loadingPublished}
        />
      )}
      {activeTab === 'drafts' && (
        <DraftReviewsList
          drafts={drafts}
          loading={loadingDrafts}
        />
      )}
    </SafeAreaView>
  );
}
```

**Published review card:**
```tsx
// Each card: restaurant image (80×80 rounded-xl), title, date, stars, Edit + Delete actions
// Edit → router.push(`/studio/edit-review/${review.id}`)
// Delete → confirmation bottom sheet
// Status badge: "Published" (green bg) / "Draft" (amber bg)
```

---

## 5. New Feature: My Lists (`/studio/my-lists`)

### 5.1 Feature overview

My Lists is a new screen that gives users a personal collection manager with two lists:

| List | Icon | Meaning | Previous home |
|------|------|---------|--------------|
| **Check-ins** | FiMapPin | "Have been" — places the user has visited | Profile Check-ins tab |
| **Likes** | FiHeart | "Want to go" — places the user has saved | Profile Wishlists tab (renamed) |

Both lists support:
- Existing TastyPlates restaurant listings (linked via UUID/slug)
- New Google Places entries that don't yet exist in the TastyPlates DB (linked via `google_place_id`)
- City/location filter inherited from `LocationContext`
- Map view toggle (see pins on a map)
- Swipe-to-delete

### 5.2 Screen layout

```
/studio/my-lists

┌─────────────────────────────────────────┐
│  My Lists                               │
│  [Toronto ▾]   (location filter pill)  │
│─────────────────────────────────────────│
│  [Check-ins │ Likes]  (tab bar)        │
│─────────────────────────────────────────│
│  [🗺 Map]  [≡ List]   (view toggle)    │
│─────────────────────────────────────────│
│  List view:                             │
│  [RestaurantListCard]                   │
│  [RestaurantListCard]                   │
│  ...                                    │
│  [+ Add Place]  (FAB within screen)    │
│─────────────────────────────────────────│
│  Map view:                              │
│  MapView with pins + bottom sheet      │
└─────────────────────────────────────────┘
```

### 5.3 Screen implementation

```tsx
// app/studio/my-lists/index.tsx

const LIST_TABS = [
  { key: 'checkins', label: 'Check-ins' },
  { key: 'likes',    label: 'Likes'     },
];

type ViewMode = 'list' | 'map';

export default function MyListsScreen() {
  const [activeList, setActiveList] = useState<'checkins' | 'likes'>('checkins');
  const [viewMode, setViewMode]     = useState<ViewMode>('list');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const { selectedLocation, setSelectedLocation } = useLocation();
  const { trigger: haptic } = useHaptic();

  const { items: checkins, loading: checkinsLoading, refresh: refreshCheckins }
    = useMyList('checkin', selectedLocation.key);
  const { items: likes, loading: likesLoading, refresh: refreshLikes }
    = useMyList('like', selectedLocation.key);

  const currentItems    = activeList === 'checkins' ? checkins : likes;
  const currentLoading  = activeList === 'checkins' ? checkinsLoading : likesLoading;
  const currentRefresh  = activeList === 'checkins' ? refreshCheckins : refreshLikes;

  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <Text className="font-neusans text-xl text-[#31343F]">My Lists</Text>
        {/* Location picker pill */}
        <Pressable
          onPress={() => setLocationPickerOpen(true)}
          className="flex-row items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full"
        >
          <Image source={{ uri: selectedLocation.flag }} style={{ width: 16, height: 12 }} />
          <Text className="font-neusans text-sm text-[#31343F]">{selectedLocation.label}</Text>
          <FiChevronDown size={14} color="#6b7280" />
        </Pressable>
      </View>

      {/* Tab bar */}
      <ProfileTabs
        tabs={LIST_TABS}
        activeTab={activeList}
        onTabChange={key => { haptic('selection'); setActiveList(key as any); }}
      />

      {/* View mode toggle */}
      <View className="flex-row items-center px-4 py-2 gap-2">
        {(['list', 'map'] as ViewMode[]).map(mode => (
          <Pressable
            key={mode}
            onPress={() => { haptic('selection'); setViewMode(mode); }}
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
              viewMode === mode
                ? 'bg-[#ff7c0a] border-[#ff7c0a]'
                : 'bg-white border-gray-200'
            }`}
          >
            {mode === 'list'
              ? <FiList size={14} color={viewMode === mode ? 'white' : '#6b7280'} />
              : <FiMap  size={14} color={viewMode === mode ? 'white' : '#6b7280'} />
            }
            <Text className={`font-neusans text-xs ${
              viewMode === mode ? 'text-white' : 'text-[#6b7280]'
            }`}>
              {mode === 'list' ? 'List' : 'Map'}
            </Text>
          </Pressable>
        ))}
        <Text className="font-neusans text-xs text-[#6b7280] ml-auto">
          {currentItems.length} places
        </Text>
      </View>

      {/* Content */}
      {viewMode === 'list' ? (
        <MyListContent
          items={currentItems}
          loading={currentLoading}
          listType={activeList}
          onDelete={currentRefresh}
        />
      ) : (
        <MyListMapView
          items={currentItems}
          location={selectedLocation}
        />
      )}

      {/* Add Place FAB — within screen (separate from Studio FAB) */}
      <Pressable
        onPress={() => { haptic('success'); setAddSheetOpen(true); }}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[#ff7c0a]
                   items-center justify-center shadow-lg"
        style={{ shadowColor: '#ff7c0a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
      >
        <FiPlus size={24} color="white" />
      </Pressable>

      {/* Add Place bottom sheet */}
      <AddToListSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        listType={activeList}
        location={selectedLocation}
        onAdded={currentRefresh}
      />
    </SafeAreaView>
  );
}
```

### 5.4 List item card

```tsx
// components/studio/MyListCard.tsx

const MyListCard = ({ item, listType, onDelete }) => {
  const { trigger: haptic } = useHaptic();
  const isLinked = !!item.tastyplates_uuid;  // has a TastyPlates listing

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable
          onPress={() => { haptic('warning'); onDelete(item.id); }}
          className="bg-red-500 w-20 items-center justify-center rounded-r-2xl"
        >
          <FiTrash2 size={20} color="white" />
        </Pressable>
      )}
    >
      <Pressable
        onPress={() => {
          haptic('light');
          if (isLinked) router.push(`/restaurants/${item.tastyplates_slug}`);
          else router.push(`/places/google/${item.google_place_id}`);
        }}
        className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-gray-50"
      >
        {/* Image */}
        <Image
          source={{ uri: item.image_url || DEFAULT_RESTAURANT_IMAGE }}
          style={{ width: 60, height: 60, borderRadius: 12 }}
          contentFit="cover"
        />

        {/* Info */}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2">
            <Text className="font-neusans text-sm font-medium text-[#31343F] flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            {/* Linked badge — shows if in TastyPlates DB */}
            {isLinked && (
              <View className="px-1.5 py-0.5 bg-[#fef7f0] rounded-full">
                <Text className="font-neusans text-[9px] text-[#ff7c0a] font-medium">TP</Text>
              </View>
            )}
          </View>
          <Text className="font-neusans text-xs text-[#6b7280] mt-0.5" numberOfLines={1}>
            {item.address}
          </Text>
          <Text className="font-neusans text-[10px] text-[#9ca3af] mt-0.5">
            Added {formatDistanceToNow(new Date(item.created_at))} ago
          </Text>
        </View>

        <FiChevronRight size={16} color="#9ca3af" />
      </Pressable>
    </Swipeable>
  );
};
```

### 5.5 Add to List bottom sheet

```tsx
// components/studio/AddToListSheet.tsx
// Uses Google Places search to find a restaurant,
// then adds it to the user's list (with optional TastyPlates match)

const AddToListSheet = ({ isOpen, onClose, listType, location, onAdded }) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<ResolvedPlace | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePlaceSelect = async (prediction: PlacePrediction) => {
    const placeData = await fetchPlaceDetails(prediction.place_id);
    if (!placeData) return;

    // Check if a TastyPlates listing already exists for this google_place_id or name
    const match = await findTastyPlatesMatch(placeData.place_id, placeData.name, location.key);

    setSelectedPlace({
      place_id:         placeData.place_id,
      name:             placeData.name,
      address:          placeData.formatted_address,
      image_url:        placeData.photos?.[0] ? getPhotoUrl(placeData.photos[0], 400) : null,
      latitude:         placeData.geometry?.location?.lat(),
      longitude:        placeData.geometry?.location?.lng(),
      tastyplates_uuid: match?.uuid ?? null,
      tastyplates_slug: match?.slug ?? null,
    });
  };

  const handleAdd = async () => {
    if (!selectedPlace) return;
    setSaving(true);
    try {
      await addToMyList({
        listType,
        googlePlaceId:    selectedPlace.place_id,
        name:             selectedPlace.name,
        address:          selectedPlace.address,
        imageUrl:         selectedPlace.image_url,
        latitude:         selectedPlace.latitude,
        longitude:        selectedPlace.longitude,
        tastyplatesUuid:  selectedPlace.tastyplates_uuid,
        tastyplatesSlug:  selectedPlace.tastyplates_slug,
        locationKey:      location.key,
      });
      haptic('success');
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} snapPoints={['75%']}>
      <View className="flex-1 px-4 pt-2">
        <Text className="font-neusans text-lg text-[#31343F] mb-4">
          Add to {listType === 'checkins' ? 'Check-ins' : 'Likes'}
        </Text>

        {/* Search input */}
        <GooglePlacesSearchInput
          query={query}
          onQueryChange={setQuery}
          onPredictions={setPredictions}
          location={location}
        />

        {/* Predictions */}
        {predictions.length > 0 && !selectedPlace && (
          <FlashList
            data={predictions}
            estimatedItemSize={56}
            renderItem={({ item }) => (
              <Pressable onPress={() => handlePlaceSelect(item)} className="flex-row items-center gap-3 py-3 border-b border-gray-50">
                <FiMapPin size={16} color="#9ca3af" />
                <View className="flex-1">
                  <Text className="font-neusans text-sm text-[#31343F]">
                    {item.structured_formatting.main_text}
                  </Text>
                  <Text className="font-neusans text-xs text-[#6b7280]">
                    {item.structured_formatting.secondary_text}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}

        {/* Selected place preview */}
        {selectedPlace && (
          <View className="mt-3">
            <PlacePreviewCard place={selectedPlace} />
            {selectedPlace.tastyplates_uuid && (
              <View className="flex-row items-center gap-2 px-3 py-2 bg-[#fef7f0] rounded-xl mt-2">
                <FiCheckCircle size={14} color="#ff7c0a" />
                <Text className="font-neusans text-xs text-[#ff7c0a]">
                  Linked to a TastyPlates listing — tap to see reviews
                </Text>
              </View>
            )}
            <Button
              variant="primary"
              className="w-full mt-4"
              onPress={handleAdd}
              disabled={saving}
            >
              {saving ? <Spinner /> : `Add to ${listType === 'checkins' ? 'Check-ins' : 'Likes'}`}
            </Button>
          </View>
        )}
      </View>
    </BottomSheet>
  );
};
```

---

## 6. Database Schema — My Lists

### 6.1 Design principles

The schema must handle three realities:

1. **Known listings** — restaurant exists in TastyPlates DB (has `uuid`, `slug`)
2. **Google Places only** — user added a place from Google that isn't in TastyPlates yet
3. **Later resolution** — a Google-only entry can be retroactively linked when TastyPlates adds that listing

The approach: store `google_place_id` as the primary key for user-collected places. Link to `tastyplates_restaurant_uuid` when available. This is the same pattern used by apps like Yelp, Foursquare, and Google Maps Collections.

### 6.2 Core tables

```sql
-- ─────────────────────────────────────────────────
-- Table: user_place_collections
-- The user's My Lists entries. One row per place per list per user.
-- ─────────────────────────────────────────────────
CREATE TABLE user_place_collections (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- List type
  list_type                TEXT NOT NULL CHECK (list_type IN ('checkin', 'like')),

  -- Google Places identity (always stored — never null)
  google_place_id          TEXT NOT NULL,

  -- Snapshot of place data at time of save (denormalized for offline/fast display)
  name                     TEXT NOT NULL,
  address                  TEXT,
  latitude                 NUMERIC(10, 7),
  longitude                NUMERIC(10, 7),
  image_url                TEXT,           -- first Google photo URL (may expire)
  google_types             TEXT[],         -- e.g. ['restaurant', 'food']

  -- TastyPlates link (nullable — populated when DB listing exists or is created)
  tastyplates_restaurant_uuid  UUID REFERENCES restaurants(uuid) ON DELETE SET NULL,
  tastyplates_restaurant_slug  TEXT,

  -- Location context (from LocationContext at time of save)
  location_key             TEXT,           -- e.g. 'toronto', 'hong-kong-island'
  location_label           TEXT,           -- e.g. 'Toronto'

  -- Timestamps
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A user can only add a place once per list type
  UNIQUE (user_id, google_place_id, list_type)
);

-- Index: fetch all items for a user's list quickly
CREATE INDEX idx_upc_user_list ON user_place_collections (user_id, list_type, created_at DESC);

-- Index: resolve Google place → TastyPlates listing (for backfill jobs)
CREATE INDEX idx_upc_google_place ON user_place_collections (google_place_id);

-- Index: find all collections linked to a TastyPlates restaurant
CREATE INDEX idx_upc_tp_uuid ON user_place_collections (tastyplates_restaurant_uuid)
  WHERE tastyplates_restaurant_uuid IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_upc_updated_at
BEFORE UPDATE ON user_place_collections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

```sql
-- ─────────────────────────────────────────────────
-- Table: google_place_cache
-- Canonical cache of Google Place metadata.
-- Decouples snapshot data in user_place_collections from
-- fresh data for display. Refreshed by background job.
-- ─────────────────────────────────────────────────
CREATE TABLE google_place_cache (
  google_place_id          TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  formatted_address        TEXT,
  latitude                 NUMERIC(10, 7),
  longitude                NUMERIC(10, 7),
  primary_photo_url        TEXT,
  google_rating            NUMERIC(3, 1),
  user_ratings_total       INT,
  google_types             TEXT[],
  phone                    TEXT,
  website                  TEXT,

  -- TastyPlates match (updated by matching job)
  tastyplates_restaurant_uuid  UUID REFERENCES restaurants(uuid) ON DELETE SET NULL,
  tastyplates_restaurant_slug  TEXT,

  -- Cache freshness
  fetched_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at               TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gpc_expires ON google_place_cache (expires_at);
CREATE INDEX idx_gpc_tp_uuid ON google_place_cache (tastyplates_restaurant_uuid)
  WHERE tastyplates_restaurant_uuid IS NOT NULL;
```

### 6.3 Hasura GraphQL — permissions & queries

**Mutations needed:**

```graphql
# Add to list
mutation AddToMyList(
  $userId: uuid!
  $listType: String!
  $googlePlaceId: String!
  $name: String!
  $address: String
  $latitude: numeric
  $longitude: numeric
  $imageUrl: String
  $googleTypes: [String!]
  $tastyplatesUuid: uuid
  $tastyplatesSlug: String
  $locationKey: String
  $locationLabel: String
) {
  insert_user_place_collections_one(
    object: {
      user_id: $userId
      list_type: $listType
      google_place_id: $googlePlaceId
      name: $name
      address: $address
      latitude: $latitude
      longitude: $longitude
      image_url: $imageUrl
      google_types: $googleTypes
      tastyplates_restaurant_uuid: $tastyplatesUuid
      tastyplates_restaurant_slug: $tastyplatesSlug
      location_key: $locationKey
      location_label: $locationLabel
    }
    # Upsert: if already in list, update the snapshot
    on_conflict: {
      constraint: user_place_collections_user_id_google_place_id_list_type_key
      update_columns: [name, address, image_url, updated_at]
    }
  ) {
    id
  }
}

# Remove from list
mutation RemoveFromMyList($id: uuid!, $userId: uuid!) {
  delete_user_place_collections_by_pk(id: $id) {
    id
  }
}

# Check if a specific place is in either list (for button state)
query CheckPlaceInLists($userId: uuid!, $googlePlaceId: String!) {
  user_place_collections(
    where: { user_id: { _eq: $userId }, google_place_id: { _eq: $googlePlaceId } }
  ) {
    id list_type
  }
}

# Fetch a user's list
query GetMyList($userId: uuid!, $listType: String!, $locationKey: String) {
  user_place_collections(
    where: {
      user_id: { _eq: $userId }
      list_type: { _eq: $listType }
      _and: [
        { _or: [
          { location_key: { _eq: $locationKey } }
          { location_key: { _is_null: true } }
        ]}
      ]
    }
    order_by: { created_at: desc }
  ) {
    id google_place_id name address latitude longitude
    image_url location_key location_label created_at
    tastyplates_restaurant_uuid
    tastyplates_restaurant_slug
  }
}
```

**Hasura permissions (row-level security):**
```yaml
# user_place_collections — select permission
# Users can only see their own list entries
filter:
  user_id: { _eq: X-Hasura-User-Id }

# user_place_collections — insert permission
check:
  user_id: { _eq: X-Hasura-User-Id }
set:
  user_id: X-Hasura-User-Id  # always set from session, never from client

# user_place_collections — delete permission
filter:
  user_id: { _eq: X-Hasura-User-Id }
```

---

## 7. Google Places Integration Strategy

### 7.1 The dual-track matching logic

When a user adds a place from Google Places, we must determine whether a TastyPlates listing already exists for that place. This is the same pattern already implemented in `RestaurantMatchInline` on the web.

```
User searches Google Places → selects a prediction
         │
         ▼
fetchPlaceDetails(place_id) → { name, address, place_id, geometry, ... }
         │
         ▼
findTastyPlatesMatch(place_id, name, locationKey)
  │
  ├─ Step 1: Exact google_place_id match
  │    query restaurants WHERE google_place_id = $place_id
  │    └─ If found → return existing listing ✓
  │
  ├─ Step 2: Name + location fuzzy match
  │    query restaurants WHERE title ILIKE $name AND location_key = $locationKey
  │    └─ Evaluate: same name, similar address?
  │         └─ If confidence ≥ threshold → return existing listing ✓
  │
  └─ No match found → place is Google-only
```

**Match result states:**
```tsx
type MatchResult =
  | { type: 'exact',   restaurant: TastyPlatesRestaurant } // google_place_id match
  | { type: 'fuzzy',   restaurant: TastyPlatesRestaurant } // name+location match
  | { type: 'none',    placeData: GooglePlaceData }        // Google-only

// UI treatment:
// 'exact' → "Found on TastyPlates" + link to listing + still allows adding to list
// 'fuzzy' → "This might be [name] on TastyPlates — is this the same place?"
// 'none'  → "Not on TastyPlates yet" + still allows adding to list
```

### 7.2 How the `restaurants` table should store Google Place IDs

```sql
-- Add google_place_id column to restaurants table if not already present
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE;

-- Index for fast lookup during matching
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id
  ON restaurants (google_place_id)
  WHERE google_place_id IS NOT NULL;
```

When a new restaurant is created from a Google Place (via the listing flow), `google_place_id` is saved. This enables `O(1)` exact matching for all future user collections of that place.

### 7.3 Background matching job (server-side)

When a user adds a Google-only place to their list, a background job should run to:
1. Check if a TastyPlates listing was later created with the same `google_place_id`
2. Update `user_place_collections.tastyplates_restaurant_uuid` and `tastyplates_restaurant_slug` if found

```ts
// Background job (runs daily or on restaurant creation)
async function backfillPlaceCollectionLinks() {
  // Find unlinked collection entries where google_place_id matches a restaurant
  const unlinked = await db.query(`
    SELECT upc.id, r.uuid, r.slug
    FROM user_place_collections upc
    JOIN restaurants r ON r.google_place_id = upc.google_place_id
    WHERE upc.tastyplates_restaurant_uuid IS NULL
      AND r.status = 'publish'
  `);

  for (const row of unlinked) {
    await db.query(`
      UPDATE user_place_collections
      SET tastyplates_restaurant_uuid = $1,
          tastyplates_restaurant_slug = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [row.uuid, row.slug, row.id]);
  }
}
```

### 7.4 Google Places API — React Native setup

The web uses `window.google.maps.places` (browser SDK). React Native uses the REST API instead.

```ts
// lib/googlePlaces.ts — Mobile REST API wrapper

const PLACES_API = 'https://maps.googleapis.com/maps/api/place';
const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Autocomplete — typed predictions as user types
export async function getAutocompletePredictions(
  input: string,
  locationBias?: { lat: number; lng: number; radius?: number }
): Promise<PlacePrediction[]> {
  const params = new URLSearchParams({
    input,
    key:   KEY!,
    types: 'restaurant|food|bar',
    ...(locationBias && {
      location: `${locationBias.lat},${locationBias.lng}`,
      radius:   String(locationBias.radius ?? 10000),
    }),
  });

  const res = await fetch(`${PLACES_API}/autocomplete/json?${params}`);
  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places Autocomplete: ${data.status}`);
  }
  return data.predictions ?? [];
}

// Place Details — full info for a selected place
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const fields = [
    'place_id', 'name', 'formatted_address', 'geometry',
    'address_components', 'formatted_phone_number',
    'international_phone_number', 'website',
    'rating', 'user_ratings_total', 'photos',
  ].join(',');

  const params = new URLSearchParams({ place_id: placeId, fields, key: KEY! });
  const res  = await fetch(`${PLACES_API}/details/json?${params}`);
  const data = await res.json();

  if (data.status !== 'OK') return null;
  const p = data.result;

  return {
    place_id:          p.place_id,
    name:              p.name,
    formatted_address: p.formatted_address,
    phone:             p.formatted_phone_number || p.international_phone_number,
    website:           p.website,
    latitude:          p.geometry?.location?.lat,
    longitude:         p.geometry?.location?.lng,
    address_components: p.address_components ?? [],
    photo_reference:   p.photos?.[0]?.photo_reference ?? null,
    rating:            p.rating,
    user_ratings_total: p.user_ratings_total,
  };
}

// Photo URL — static photo from reference
export function getPlacePhotoUrl(photoReference: string, maxWidth = 400): string {
  return `${PLACES_API}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${KEY}`;
}
```

> **Note:** Google Places photos via `photo_reference` expire. Store the URL in `image_url` for the snapshot, but refresh from `google_place_cache` for display.

### 7.5 Location bias for search

When searching for places in My Lists, bias the autocomplete results to the selected city's coordinates:

```ts
// Use selectedLocation.coordinates for the location bias
const predictions = await getAutocompletePredictions(query, {
  lat:    selectedLocation.coordinates.lat,
  lng:    selectedLocation.coordinates.lng,
  radius: 15000,  // 15km — wide enough for city-level browsing
});
```

---

## 8. `useMyList` Hook

```ts
// hooks/useMyList.ts

export function useMyList(listType: 'checkin' | 'like', locationKey: string) {
  const { user } = useNhostSession();
  const [items, setItems]     = useState<UserPlaceCollection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user?.user_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await apolloClient.query({
        query: GET_MY_LIST,
        variables: { userId: user.user_id, listType, locationKey },
        fetchPolicy: 'cache-and-network',
      });
      setItems(data.user_place_collections);
    } catch (e) {
      console.error('useMyList fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, listType, locationKey]);

  useEffect(() => { fetch(); }, [fetch]);

  const addToList = async (input: AddToListInput) => {
    await apolloClient.mutate({ mutation: ADD_TO_MY_LIST, variables: { ...input, userId: user?.user_id } });
    await fetch();
  };

  const removeFromList = async (id: string) => {
    await apolloClient.mutate({ mutation: REMOVE_FROM_MY_LIST, variables: { id, userId: user?.user_id } });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return { items, loading, refresh: fetch, addToList, removeFromList };
}
```

---

## 9. Screen Map

| Web route | Mobile screen | Expo Router path |
|-----------|--------------|-----------------|
| `/tastystudio/dashboard` | Studio FAB (replaces dashboard) | — |
| `/tastystudio/add-review` | Create Review search | `/studio/add-review` |
| `/tastystudio/add-review/[slug]` | Create Review form | `/studio/add-review/[slug]` |
| `/tastystudio/review-listing` | Manage Reviews | `/studio/review-listing` |
| `/tastystudio/edit-review/[id]` | Edit Review | `/studio/edit-review/[id]` |
| `/tastystudio/add-review/success` | Success confirmation | `/studio/add-review/success` |
| *(new)* | My Lists | `/studio/my-lists` |
| *(new)* | Add to List sheet | *(bottom sheet within my-lists)* |
| *(new)* | Google Place detail | `/places/google/[place_id]` |

---

## 10. Component Checklist

| Component | Source | Action |
|-----------|--------|--------|
| `StudioFAB` | New | FAB with Reanimated stacked menu |
| `BottomNav` | Existing | Add `StudioFAB` as rightmost item (replace Studio nav item) |
| `ReviewSubmission.tsx` | `components/Restaurant/Review/ReviewSubmission.tsx` | Port to RN — two-step flow (search → form) |
| `RestaurantMatchInlineMobile` | `components/reviews/RestaurantMatchInline.tsx` | Port to RN — same match/no-match states |
| `ReviewListingScreen` | `components/Restaurant/Listing/Listing.tsx` | Port to RN — tabs + FlashList |
| `MyListsScreen` | New | New screen — spec in §5.3 |
| `MyListCard` | New | Swipeable card — spec in §5.4 |
| `AddToListSheet` | New | Bottom sheet with Google Places search |
| `GooglePlacesSearchInput` | `components/ui/GooglePlacesAutocomplete.tsx` | Port using REST API (not browser SDK) |
| `PlacePreviewCard` | New | Preview of selected place before adding |
| `MyListMapView` | New | MapView with pins for list items |
| `useMyList` | New | Hook — spec in §8 |
| `lib/googlePlaces.ts` | `lib/google-places-utils.ts` | Port using REST API |
| `findTastyPlatesMatch` | Partial (exists in `RestaurantMatchDialog`) | Port matching logic |
| `ImageUploadGrid` | `components/ui/ImageUploadDropzone` | Port to RN using `expo-image-picker` |
| `StarRating` | `components/Restaurant/Review/Rating.tsx` | Port to RN tappable stars |

---

## 11. Environment Variables

```env
# .env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Required Google APIs to enable in Google Cloud Console:
# - Places API (New) or Places API
# - Maps SDK for Android
# - Maps SDK for iOS
# Note: REST API used on mobile (no browser JS SDK)
```

---

## 12. Haptic Map

| Interaction | Preset |
|-------------|--------|
| Open Studio FAB | `light` |
| Close Studio FAB | `light` |
| Tap menu item (Create Review, Manage, My Lists) | `success` |
| Tap outside to close FAB | `light` |
| Select autocomplete prediction | `selection` |
| Confirm existing TastyPlates match | `success` |
| Submit review | `success` |
| Save as draft | `light` |
| Add to Check-ins | `success` |
| Add to Likes | `success` |
| Swipe to delete | `light` |
| Confirm delete | `warning` |
| Toggle map/list view | `selection` |
| Location filter change | `selection` |