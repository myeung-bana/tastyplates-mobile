# location-switcher-review.md — Location Switcher & New Review Flow

> **Purpose:** This document defines two connected mobile features grounded entirely in the existing codebase:
> 1. **Location switcher in the top nav** — replaces the TastyPlates logo pill with the current city, tapping opens a location picker sheet driven by `restaurant_locations` (admin-controlled via Nhost).
> 2. **New Review screen with nearby restaurants** — replaces the flat search input with a search bar + Google Places "Nearby" list, using the selected location's coordinates as the bias radius.
>
> Both features extend the existing `LocationContext`, `useLocations()`, `LocationButton`, and `RestaurantSearchSheet` that already exist in the web codebase.

---

## 1. What already exists (web)

| Component | What it does | Mobile equivalent |
|-----------|-------------|------------------|
| `LocationButton.tsx` | Pill button in Navbar: flag + "City, CC" + chevron → opens `LocationModal` | Replace top-nav logo with this pill |
| `LocationModal` | Desktop modal: country tree + city list | Port as bottom sheet |
| `LocationContext.tsx` | `selectedLocation`, `setSelectedLocation`, `locationHierarchy`, `isLoading` | Port directly; swap `localStorage`/cookies → `AsyncStorage` |
| `useLocations()` | Fetches `restaurant_locations` from DB via `/api/v1/locations/get-locations`, builds hierarchy, falls back to hardcoded constants | Port with direct Nhost GraphQL (no BFF) |
| `RestaurantSearchSheet.tsx` | Bottom sheet with Google Places autocomplete, debounce, location bias, `RestaurantMatchInline` | Port directly — this IS the "New Review" search UX |

The web's `LocationButton` already does `"City, CC"` format using `getParentCountryCode()` — this logic is preserved exactly on mobile.

---

## 2. Feature 1 — Location switcher in the top nav

### 2.1 What changes

The top nav currently shows the TastyPlates wordmark on mobile. This is replaced with a tappable **location pill** in the centre of the top nav. The wordmark moves to the left as a small icon-only logo.

```
Before:
┌─────────────────────────────────────────┐
│  ≡   [tastyplates logo]          [👤]   │
└─────────────────────────────────────────┘

After:
┌─────────────────────────────────────────┐
│  [tp]  [🇨🇦 Toronto, CA ▾]      [👤]   │
└─────────────────────────────────────────┘
```

### 2.2 Top nav component

```tsx
// components/layout/TopNav.tsx (mobile — replaces web Navbar on mobile)

const TopNav = () => {
  const { selectedLocation, locationHierarchy } = useLocation();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const { trigger: haptic } = useHaptic();
  const { user } = useNhostSession();

  // Same logic as web LocationButton.tsx — preserve exactly
  const getParentCountryCode = (cityKey: string): string => {
    for (const country of locationHierarchy.countries) {
      const city = country.cities.find(c => c.key === cityKey);
      if (city) return country.shortLabel;
    }
    return '';
  };

  const getDisplayText = (): string => {
    if (selectedLocation.type === 'city') {
      const cc = getParentCountryCode(selectedLocation.key);
      return `${selectedLocation.label}${cc ? `, ${cc}` : ''}`;
    }
    if (selectedLocation.type === 'country') {
      return `${selectedLocation.label}, ${selectedLocation.shortLabel}`;
    }
    return selectedLocation.label;
  };

  return (
    <>
      <View
        className="flex-row items-center justify-between px-4 bg-white border-b border-[#CACACA]"
        style={{ height: 52, paddingTop: 0 }}
      >
        {/* Left: small wordmark icon */}
        <Pressable onPress={() => router.push('/(tabs)/')}>
          <Image
            source={TASTYPLATES_LOGO_COLOUR}
            style={{ height: 18, width: 78 }}
            contentFit="contain"
          />
        </Pressable>

        {/* Centre: location pill — tappable */}
        <Pressable
          onPress={() => { haptic('selection'); setLocationSheetOpen(true); }}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-[50px] bg-[#FCFCFC] border border-[#e5e7eb]"
          style={{ maxWidth: 180 }}
        >
          <Image
            source={{ uri: selectedLocation.flag }}
            style={{ width: 18, height: 12, borderRadius: 2 }}
            contentFit="cover"
          />
          <Text
            className="font-neusans text-xs text-[#494D5D]"
            numberOfLines={1}
          >
            {getDisplayText()}
          </Text>
          <FiChevronDown size={13} color="#494D5D" />
        </Pressable>

        {/* Right: profile avatar */}
        <Pressable onPress={() => router.push(profileHref)}>
          <Image
            source={{ uri: avatarUri || DEFAULT_USER_ICON }}
            style={{ width: 32, height: 32, borderRadius: 16 }}
            contentFit="cover"
          />
        </Pressable>
      </View>

      {/* Location picker bottom sheet */}
      <LocationPickerSheet
        isOpen={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
      />
    </>
  );
};
```

**Design tokens:**
```
Nav height:          52px (matches safe-area-aware top bar)
Background:          bg-white, border-b border-[#CACACA]
Location pill:       bg-[#FCFCFC], border border-[#e5e7eb], rounded-[50px]
Pill padding:        px-3 py-1.5
Flag:                18×12px, borderRadius 2
Label:               font-neusans text-xs text-[#494D5D], numberOfLines=1, maxWidth=180
Chevron:             FiChevronDown, 13px, #494D5D
Logo:                18px height, left-aligned
Avatar:              32×32px circle, right-aligned
```

---

### 2.3 Location Picker Sheet

The web uses `LocationModal` (a desktop-centred card). On mobile this becomes a bottom sheet — matching the pattern already established in `recommend-articles.md` and `profile.md`.

```tsx
// components/navigation/LocationPickerSheet.tsx

const LocationPickerSheet = ({ isOpen, onClose }) => {
  const { locationHierarchy, selectedLocation, setSelectedLocation } = useLocation();
  const { trigger: haptic } = useHaptic();
  const [search, setSearch] = useState('');

  const handleSelect = (location: LocationOption) => {
    haptic('success');
    setSelectedLocation(location);  // updates LocationContext + AsyncStorage
    onClose();
  };

  // Filter cities by search term
  const filteredHierarchy = search.trim()
    ? {
        countries: locationHierarchy.countries
          .map(country => ({
            ...country,
            cities: country.cities.filter(c =>
              c.label.toLowerCase().includes(search.toLowerCase())
            ),
          }))
          .filter(c => c.cities.length > 0),
      }
    : locationHierarchy;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} snapPoints={['70%']}>
      <View className="flex-1 px-4 pt-2">

        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="font-neusans text-base font-medium text-[#31343F]">
            Select Location
          </Text>
          <Pressable onPress={onClose} className="p-1">
            <FiX size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Search input */}
        <View className="flex-row items-center gap-2 bg-gray-100 rounded-xl px-3.5 py-2.5 mb-4">
          <FiSearch size={16} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search cities..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            className="flex-1 font-neusans text-[15px] text-[#31343F]"
            style={{ fontSize: 15 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <FiX size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        {/* Location hierarchy list */}
        <FlashList
          data={filteredHierarchy.countries.flatMap(country => [
            { type: 'country' as const, ...country },
            ...country.cities.map(city => ({ type: 'city' as const, ...city })),
          ])}
          estimatedItemSize={52}
          keyExtractor={item => item.key}
          renderItem={({ item }) => {
            if (item.type === 'country') {
              return (
                <View className="flex-row items-center gap-2 py-3 px-1">
                  <Image
                    source={{ uri: item.flag }}
                    style={{ width: 20, height: 14, borderRadius: 2 }}
                    contentFit="cover"
                  />
                  <Text className="font-neusans text-sm font-medium text-[#31343F]">
                    {item.label}
                  </Text>
                </View>
              );
            }

            const isSelected = selectedLocation.key === item.key;
            return (
              <Pressable
                onPress={() => handleSelect(item)}
                className={`flex-row items-center py-3.5 pl-8 pr-3 rounded-xl mx-1 mb-0.5 ${
                  isSelected ? 'bg-[#fef7f0]' : ''
                }`}
              >
                <Text
                  className={`flex-1 font-neusans text-sm ${
                    isSelected ? 'text-[#ff7c0a] font-medium' : 'text-[#494D5D]'
                  }`}
                >
                  {item.label}
                </Text>
                {isSelected && <FiCheck size={16} color="#ff7c0a" />}
              </Pressable>
            );
          }}
        />
      </View>
    </BottomSheet>
  );
};
```

**Design tokens:**
```
Sheet snap:          70% of screen height
Header text:         font-neusans text-base font-medium text-[#31343F]
Search bg:           bg-gray-100 rounded-xl px-3.5 py-2.5
Country rows:        py-3 px-1, flag 20×14px, font-medium
City rows:           pl-8 (indented), py-3.5 rounded-xl
Selected city:       bg-[#fef7f0], text-[#ff7c0a] font-medium, FiCheck right
Unselected city:     text-[#494D5D]
```

---

### 2.4 How location state propagates

When `setSelectedLocation(city)` is called from the sheet:

1. `LocationContext` updates `selectedLocation` in React state immediately
2. `AsyncStorage.setItem(LOCATION_STORAGE_KEY, city.key)` persists the choice
3. Every screen that reads `useLocation().selectedLocation` re-renders with the new city:
   - Home feed (articles filter, recommended restaurants section)
   - Restaurant search (filter by `location_key`)
   - New Review search (location bias coordinates)
   - Articles section (location-scoped queries)

No manual refetch is needed — React context propagation handles this.

**Location query used to fetch from DB (mobile — direct Nhost GraphQL, no BFF):**

```graphql
# graphql/queries/locationQueries.ts
query GetActiveLocations {
  restaurant_locations(
    where: { is_active: { _eq: true } }
    order_by: [{ display_order: asc }, { name: asc }]
  ) {
    id
    name
    slug
    type
    short_label
    flag_url
    currency
    timezone
    latitude
    longitude
    parent_id
    display_order
  }
}
```

This is the exact same query as the web's `/api/v1/locations/get-locations/route.ts`. The `buildHierarchy()` function from that file is ported directly to `utils/locationUtils.ts` — it's a pure function with no web/Node dependencies.

---

## 3. Feature 2 — New Review with nearby restaurants

### 3.1 What the web does (from `RestaurantSearchSheet.tsx`)

The web already has the complete UX:
- Debounced Google Places Autocomplete (300ms, `DEBOUNCE_MS`)
- Location bias via `AutocompletionRequest.locationBias` (50km radius circle around city coordinates)
- Country restriction for country-level locations via `componentRestrictions`
- Food-type filtering: restaurant, food, meal, cafe, bakery, bar types sorted by relevance score
- Prediction rows: `main_text` (restaurant name) + `secondary_text` (address)
- On tap: `fetchPlaceDetails(place_id)` → `match-restaurant` API check → `RestaurantMatchInline` (existing listing or create new)
- Empty state and initial state UX

**The mobile "New Review" screen IS this sheet**, promoted from a bottom sheet to a full screen.

### 3.2 Screen structure

```
/studio/add-review

┌─────────────────────────────────────────┐
│  [← back]  Create Review               │  ← stack header
│─────────────────────────────────────────│
│  ┌──────────────────────────────────┐  │
│  │ 🔍 Search restaurants...         │  │  ← search bar (always visible)
│  └──────────────────────────────────┘  │
│  Searching in 🇨🇦 Toronto, CA          │  ← location context line
│─────────────────────────────────────────│
│  NEARBY                                 │  ← section header (shown when idle)
│  [Map pin] Sushi Moto                  │
│            123 King St, Toronto         │
│  [Map pin] Ramen Danbo                 │
│            456 Queen St, Toronto        │
│  [Map pin] ...                         │
│─────────────────────────────────────────│
│  ALL RESULTS   (shown when typing)      │
│  [Map pin] Search result 1              │
│            secondary text               │
│  [Map pin] Search result 2              │
│  ...                                    │
│─────────────────────────────────────────│
│  [RestaurantMatchInline]  (after tap)   │
│   ↳ existing listing? or create new?    │
└─────────────────────────────────────────┘
```

### 3.3 Nearby restaurants section (new — not in web)

When the search bar is empty, instead of the web's generic "Search for a restaurant" empty state, the mobile shows a **Nearby** section populated by Google Places Nearby Search.

```ts
// lib/googlePlaces.ts — add this function

/**
 * Fetches nearby restaurants using Google Places Nearby Search REST API.
 * Uses the selected city's coordinates as the centre.
 * Returns up to 10 establishments within the radius.
 */
export async function getNearbyRestaurants(
  coordinates: { lat: number; lng: number },
  radius = 1500   // 1.5km — tight enough to feel "nearby" in a city
): Promise<NearbyPlace[]> {
  const params = new URLSearchParams({
    location: `${coordinates.lat},${coordinates.lng}`,
    radius:   String(radius),
    type:     'restaurant',
    key:      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const res  = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
  );
  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.warn('NearbySearch:', data.status);
    return [];
  }

  return (data.results ?? []).slice(0, 10).map((p: any) => ({
    place_id:         p.place_id,
    name:             p.name,
    address:          p.vicinity,
    latitude:         p.geometry?.location?.lat,
    longitude:        p.geometry?.location?.lng,
    photo_reference:  p.photos?.[0]?.photo_reference ?? null,
    google_rating:    p.rating,
    types:            p.types ?? [],
  }));
}
```

> **Note on radius:** 1.5km feels "nearby" in dense Asian cities (HK, KL). For sprawling cities (Toronto, Vancouver), bump to 3000m. Consider making radius configurable per city via `restaurant_locations` metadata (an optional `search_radius_metres` column on the table).

### 3.4 Full screen component

```tsx
// app/studio/add-review/index.tsx

const DEBOUNCE_MS = 300;

export default function AddReviewSearchScreen() {
  const { selectedLocation } = useLocation();
  const { trigger: haptic } = useHaptic();

  // Search state
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Match state
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  // Nearby state
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  // Location display — same logic as web LocationButton.tsx
  const locationDisplay = useMemo(() => formatLocationDisplay(selectedLocation), [selectedLocation]);

  // Fetch nearby on mount + when location changes
  useEffect(() => {
    if (!selectedLocation.coordinates) return;
    setNearbyLoading(true);
    getNearbyRestaurants(selectedLocation.coordinates)
      .then(setNearbyPlaces)
      .catch(() => setNearbyPlaces([]))
      .finally(() => setNearbyLoading(false));
  }, [selectedLocation.key]);

  // Autocomplete predictions — same debounce + location bias as web RestaurantSearchSheet
  const fetchPredictions = useCallback((input: string) => {
    if (!input.trim()) { setPredictions([]); return; }
    setIsSearching(true);
    getAutocompletePredictions(input, {
      lat:    selectedLocation.coordinates?.lat,
      lng:    selectedLocation.coordinates?.lng,
      radius: 50000,  // 50km bias — matches web's circle radius
    }).then(results => {
      // Same food-type filter + sort as RestaurantSearchSheet.tsx
      const filtered = results
        .filter(p => {
          const types = p.types ?? [];
          return types.some(t =>
            ['restaurant','food','meal','cafe','bakery','bar'].some(k => t.includes(k))
          );
        })
        .sort((a, b) => {
          const score = (p: PlacePrediction) => {
            const t = p.types ?? [];
            let v = 0;
            if (t.some(x => x.includes('restaurant'))) v += 3;
            if (t.some(x => ['food','meal','cafe','bakery','bar'].some(k => x.includes(k)))) v += 2;
            if (t.some(x => x.includes('establishment'))) v += 1;
            return v;
          };
          return score(b) - score(a);
        });
      setPredictions(filtered);
    }).finally(() => setIsSearching(false));
  }, [selectedLocation]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setMatchResult(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), DEBOUNCE_MS);
  };

  const handlePredictionTap = async (placeId: string, placeName: string) => {
    haptic('light');
    setQuery(placeName);
    setPredictions([]);
    setIsMatching(true);

    try {
      const placeData = await fetchPlaceDetails(placeId);
      if (!placeData) { customToast.error('Could not load restaurant details.'); return; }

      // Match against TastyPlates DB (same as web)
      const match = await findTastyPlatesMatch(placeData.place_id, placeData.name, selectedLocation.key);
      setMatchResult({ placeData, existingRestaurant: match });
    } catch {
      customToast.error('Something went wrong. Please try again.');
    } finally {
      setIsMatching(false);
    }
  };

  const hasQuery = query.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* Search bar — sticky */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center gap-2.5 bg-gray-100 rounded-xl px-3.5 py-2.5">
          <FiSearch size={18} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search restaurants..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 font-neusans text-[15px] text-[#31343F]"
            style={{ fontSize: 16 }}
            autoFocus
          />
          {isSearching && <ActivityIndicator size="small" color="#ff7c0a" />}
          {hasQuery && !isSearching && (
            <Pressable onPress={() => { setQuery(''); setPredictions([]); setMatchResult(null); }}>
              <FiX size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        {/* Location context line — always shown */}
        <View className="flex-row items-center gap-1 mt-2 px-1">
          <Text className="font-neusans text-xs text-[#9ca3af]">Searching in</Text>
          <Image
            source={{ uri: selectedLocation.flag }}
            style={{ width: 14, height: 10, borderRadius: 1 }}
            contentFit="cover"
          />
          <Text className="font-neusans text-xs font-medium text-gray-500">
            {locationDisplay}
          </Text>
        </View>

        {/* Results summary — when typing */}
        {hasQuery && !matchResult && (
          <Text className="font-neusans text-xs text-[#9ca3af] mt-1 px-1">
            {isSearching
              ? 'Searching...'
              : `${predictions.length} place${predictions.length !== 1 ? 's' : ''}`
            }
          </Text>
        )}
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">

        {/* Match result — after tapping a prediction */}
        {matchResult && !isMatching && (
          <View className="px-4 pt-4">
            <RestaurantMatchInlineMobile
              placeData={matchResult.placeData}
              existingRestaurant={matchResult.existingRestaurant}
              onUseExisting={restaurant => router.push(`/studio/add-review/${restaurant.slug}`)}
              onCreateNew={placeData => router.push({
                pathname: '/studio/add-review/create',
                params: { placeData: JSON.stringify(placeData) },
              })}
              onClear={() => { setMatchResult(null); setQuery(''); }}
            />
          </View>
        )}

        {/* Matching spinner */}
        {isMatching && (
          <View className="items-center justify-center py-12 gap-2">
            <ActivityIndicator size="small" color="#ff7c0a" />
            <Text className="font-neusans text-sm text-[#6b7280]">Checking restaurant…</Text>
          </View>
        )}

        {/* All Results — when typing and predictions available */}
        {hasQuery && predictions.length > 0 && !matchResult && !isMatching && (
          <View>
            <Text className="font-neusans text-xs font-semibold text-[#9ca3af] uppercase tracking-wider px-4 pt-4 pb-2">
              All Results
            </Text>
            {predictions.map(p => (
              <Pressable
                key={p.place_id}
                onPress={() => handlePredictionTap(p.place_id, p.structured_formatting.main_text)}
                className="flex-row items-start gap-3 px-4 py-3 active:bg-gray-50"
              >
                <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mt-0.5 flex-shrink-0">
                  <HiOutlineLocationMarker size={18} color="#9ca3af" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-neusans text-[15px] font-medium text-[#31343F]" numberOfLines={1}>
                    {p.structured_formatting.main_text}
                  </Text>
                  {p.structured_formatting.secondary_text && (
                    <Text className="font-neusans text-[13px] text-gray-500 mt-0.5" numberOfLines={1}>
                      {p.structured_formatting.secondary_text}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Nearby — shown when idle (no query, no match) */}
        {!hasQuery && !matchResult && (
          <View>
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
              <Text className="font-neusans text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">
                Nearby
              </Text>
              {nearbyLoading && <ActivityIndicator size="small" color="#ff7c0a" />}
            </View>

            {nearbyLoading && nearbyPlaces.length === 0 ? (
              // Skeleton rows
              Array.from({ length: 5 }, (_, i) => (
                <View key={i} className="flex-row items-center gap-3 px-4 py-3">
                  <View className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
                  <View className="flex-1 gap-1.5">
                    <View className="h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
                    <View className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
                  </View>
                </View>
              ))
            ) : nearbyPlaces.length === 0 ? (
              <View className="items-center justify-center py-12 px-6">
                <View className="w-12 h-12 rounded-full bg-orange-50 items-center justify-center mb-3">
                  <FiMapPin size={20} color="#ff7c0a" />
                </View>
                <Text className="font-neusans text-sm font-medium text-gray-700">
                  No nearby restaurants found
                </Text>
                <Text className="font-neusans text-xs text-gray-500 text-center mt-1">
                  Try searching by name above
                </Text>
              </View>
            ) : (
              nearbyPlaces.map(place => (
                <Pressable
                  key={place.place_id}
                  onPress={() => handlePredictionTap(place.place_id, place.name)}
                  className="flex-row items-start gap-3 px-4 py-3 active:bg-gray-50 border-b border-gray-50"
                >
                  {/* Thumbnail or location icon */}
                  {place.photo_reference ? (
                    <Image
                      source={{ uri: getPlacePhotoUrl(place.photo_reference, 80) }}
                      style={{ width: 40, height: 40, borderRadius: 10 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-10 h-10 rounded-[10px] bg-gray-100 items-center justify-center flex-shrink-0">
                      <HiOutlineLocationMarker size={18} color="#9ca3af" />
                    </View>
                  )}

                  {/* Text */}
                  <View className="flex-1 min-w-0">
                    <Text className="font-neusans text-[15px] font-medium text-[#31343F]" numberOfLines={1}>
                      {place.name}
                    </Text>
                    <Text className="font-neusans text-[13px] text-gray-500 mt-0.5" numberOfLines={1}>
                      {place.address}
                    </Text>
                    {place.google_rating && (
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <Image source={STAR_FILLED} style={{ width: 11, height: 11 }} />
                        <Text className="font-neusans text-[11px] text-gray-400">
                          {place.google_rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <FiChevronRight size={16} color="#e5e7eb" />
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* Empty search state */}
        {hasQuery && predictions.length === 0 && !isSearching && !matchResult && !isMatching && (
          <View className="items-center justify-center py-16 px-6">
            <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mb-3">
              <FiSearch size={20} color="#9ca3af" />
            </View>
            <Text className="font-neusans text-sm font-medium text-gray-700">No results found</Text>
            <Text className="font-neusans text-xs text-gray-500 text-center mt-1">
              Try a different name or check the spelling
            </Text>
          </View>
        )}

        {/* Help footer */}
        {!matchResult && (
          <View className="px-4 py-8 items-center">
            <Text className="font-neusans text-xs text-[#9ca3af] text-center">
              Can't find the restaurant?{' '}
              <Text
                className="text-[#ff7c0a]"
                onPress={() => Linking.openURL('mailto:support@tastyplates.co')}
              >
                Contact the TastyPlates team
              </Text>
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
```

---

### 3.5 `RestaurantMatchInlineMobile` (ported from web)

The web `RestaurantMatchInline.tsx` shows:
- **Match found:** "We found this restaurant in our database. We recommend using the existing listing..." → existing restaurant preview → "Use this listing" button
- **No match:** "This restaurant isn't on TastyPlates yet..." → Google place preview → "Create listing & review" button

Port this component directly. The only changes are:
- Replace `Image` (Next.js) with `Image` (Expo)
- Replace `className` with NativeWind equivalent
- Replace `getBestAddress()` — already a pure utility function, port directly

```tsx
// components/reviews/RestaurantMatchInlineMobile.tsx
// Exact visual structure as web RestaurantMatchInline.tsx:

// Match found:
// ┌─────────────────────────────────────────────────────┐
// │ We found this restaurant in our database.            │  text-sm text-gray-600
// │ We recommend using the existing listing...           │
// │─────────────────────────────────────────────────────│
// │  [80×80 img]  Restaurant Name           ★ 4.5 (32)  │  existing listing card
// │               123 King St, Toronto                   │
// │─────────────────────────────────────────────────────│
// │  [Use this listing]   [Create new instead]           │  buttons
// └─────────────────────────────────────────────────────┘

// No match:
// ┌─────────────────────────────────────────────────────┐
// │ This restaurant isn't on TastyPlates yet.            │
// │─────────────────────────────────────────────────────│
// │  [photo]  Restaurant Name (Google)                  │
// │           123 Street, City                           │
// │─────────────────────────────────────────────────────│
// │  [Create listing & write review]                     │
// └─────────────────────────────────────────────────────┘
```

---

## 4. How the location change affects other screens

| Screen | What updates | How |
|--------|-------------|-----|
| Home — Featured restaurants | Filtered by new city | `selectedLocation.key` in GraphQL where clause |
| Home — Recommended restaurants | Filtered by new city | `city_location_id` in `recommended_restaurant_list_items` |
| Home — Articles section | Filtered by new city | `location_id` in `article_restaurant_location_associations` |
| Home — Review feed | No change — feed is global | — |
| Restaurants tab | `location_key` filter + coordinates for map view | `selectedLocation` in query variables |
| New Review — Nearby | Refetches nearby restaurants for new city | `useEffect([selectedLocation.key])` |
| New Review — Autocomplete bias | Uses new city coordinates | `selectedLocation.coordinates` in `locationBias` |
| My Lists | Filters by `location_key` | `useMyList(listType, selectedLocation.key)` |
| Articles list | Filtered by new city | Re-queries with new `locationSlug` |

---

## 5. `useLocations` port (mobile — no BFF)

```ts
// hooks/useLocations.ts (mobile)

export function useLocations(): UseLocationsResult {
  const [hierarchy, setHierarchy] = useState<LocationsHierarchy>(LOCATION_HIERARCHY);
  const [flatList, setFlatList]   = useState<LocationOption[]>(SUPPORTED_LOCATIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        // Direct Nhost GraphQL — no /api/v1/ BFF
        const { data, errors } = await apolloClient.query({
          query: GET_ACTIVE_LOCATIONS,
          fetchPolicy: 'cache-first',  // location data changes rarely
        });

        if (errors?.length) throw new Error(errors[0].message);

        const rows = data?.restaurant_locations ?? [];
        if (!rows.length) throw new Error('No active locations');

        // Reuse buildHierarchy() ported from web route handler
        const h = buildHierarchy(rows);
        const flat = [
          ...h.countries,
          ...h.countries.flatMap(c => c.cities),
        ];

        if (!cancelled) {
          setHierarchy(h);
          setFlatList(flat);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
        // Falls back to hardcoded LOCATION_HIERARCHY already in state
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { hierarchy, flatList, isLoading, error };
}
```

---

## 6. `LocationContext` port (mobile)

```ts
// contexts/LocationContext.tsx (mobile)
// Replace: localStorage → AsyncStorage, js-cookie → AsyncStorage

const DEFAULT_SELECTED: LocationOption = {
  key: 'toronto', label: 'Toronto', shortLabel: 'TO',
  flag: 'https://flagcdn.com/ca.svg', currency: 'CAD',
  timezone: 'America/Toronto', type: 'city', parentKey: 'canada',
  coordinates: { lat: 43.6532, lng: -79.3832 },
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hierarchy, flatList, isLoading: locationsLoading } = useLocations();
  const [selectedLocation, setSelectedLocationState] = useState<LocationOption>(DEFAULT_SELECTED);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (locationsLoading) return;
    AsyncStorage.getItem(LOCATION_STORAGE_KEY).then(savedKey => {
      const key = savedKey ?? DEFAULT_LOCATION;
      const match = flatList.find(loc => loc.key === key);
      if (match) setSelectedLocationState(match);
      setHydrated(true);
    });
  }, [locationsLoading, flatList]);

  const setSelectedLocation = async (location: LocationOption) => {
    setSelectedLocationState(location);
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, location.key);
    // No cookies — AsyncStorage is the mobile equivalent
  };

  return (
    <LocationContext.Provider value={{
      selectedLocation,
      setSelectedLocation,
      locationHierarchy: hierarchy,
      isLoading: locationsLoading || !hydrated,
    }}>
      {children}
    </LocationContext.Provider>
  );
};
```

---

## 7. Screen map

| Feature | Expo Router path | Notes |
|---------|-----------------|-------|
| Location pill (top nav) | All screens via `_layout.tsx` | Part of root layout TopNav |
| Location picker sheet | Inline within TopNav | No separate route — bottom sheet |
| New Review (search + nearby) | `/studio/add-review` | Replaces previous search-only screen |
| Review form (after restaurant selected) | `/studio/add-review/[slug]` | Unchanged |
| Create new listing flow | `/studio/add-review/create` | Unchanged |

---

## 8. Component checklist

| Component | Source (web) | Mobile action |
|-----------|-------------|---------------|
| `LocationButton.tsx` | `components/navigation/LocationButton.tsx` | Display logic only — move to `TopNav` |
| `LocationModal` | `components/navigation/LocationModal.tsx` | Port as `LocationPickerSheet` (bottom sheet) |
| `LocationContext.tsx` | `contexts/LocationContext.tsx` | Port, swap `localStorage`/`Cookies` → `AsyncStorage` |
| `useLocations()` | `hooks/useLocations.ts` | Port, replace `/api/v1/` fetch → Apollo GraphQL |
| `buildHierarchy()` | Inside `get-locations/route.ts` | Port to `utils/locationUtils.ts` (pure function) |
| `RestaurantSearchSheet.tsx` | `components/reviews/RestaurantSearchSheet.tsx` | Port as full `AddReviewSearchScreen` |
| `RestaurantMatchInline.tsx` | `components/reviews/RestaurantMatchInline.tsx` | Port as `RestaurantMatchInlineMobile` |
| `getNearbyRestaurants` | New | REST API wrapper in `lib/googlePlaces.ts` |
| `formatLocationDisplay` | Inside `RestaurantSearchSheet.tsx` | Port to `utils/locationUtils.ts` |
| `getParentCountryCode` | Inside `LocationButton.tsx` and `RestaurantSearchSheet.tsx` | Port to `utils/locationUtils.ts` |

---

## 9. Haptic map

| Interaction | Preset |
|-------------|--------|
| Tap location pill in top nav | `selection` |
| Select a city in the picker | `success` |
| Tap nearby restaurant row | `light` |
| Tap search prediction | `light` |
| Tap "Use this listing" (match found) | `success` |
| Tap "Create listing" (no match) | `success` |
| Tap "Clear" in search | `light` |
| Dismiss location sheet | `light` |