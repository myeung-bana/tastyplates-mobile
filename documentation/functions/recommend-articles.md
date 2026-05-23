# recommend-articles.md — Mobile Recovery Plan: Featured Restaurants & Articles

> **Purpose:** This document maps the `FeaturedRestaurants` (homepage "Featured Restaurants" section) and `Articles` sections from `tastyplates-v2` to their React Native (Expo) equivalents. It also proposes the full Article detail screen, which does not yet exist as a standalone page in the web codebase. All visual language from `design.md` is preserved. Side-scrolling carousels replace the web's Splide.js slider and CSS grid, which are the natural native equivalents.

---

## 1. Web Architecture — How These Sections Exist Today

```
app/page.tsx (Homepage)
  ├─ <Hero />
  ├─ <FeaturedRestaurants />      ← "Featured Restaurants" carousel
  ├─ <QuickFinds />               ← cuisine icon grid
  ├─ <ClientOnlyReviews />        ← review feed tabs
  ├─ <Articles />                 ← articles section (location-scoped)
  └─ <Discover />                 ← "Coming Soon" mobile app banner

components/FeaturedRestaurants/FeaturedRestaurants.tsx
  └─ @splidejs/react-splide       ← WEB ONLY carousel, cannot port
       └─ FeaturedCard            ← individual restaurant card (3:4 image, gradient overlay)

components/Articles/Articles.tsx
  └─ ArticleCard.tsx              ← individual card (16:9 or 4:3 image, category pill, title, read time)
  └─ ArticleCardSkeleton.tsx      ← animated pulse placeholder
  └─ SeeAllButton.tsx             ← orange full-width or inline CTA

components/Articles/ArticleDetail.tsx  ← article detail component (no standalone page in web yet)
  └─ ArticleRelatedRestaurantsSection.tsx  ← linked restaurants below article body
```

### Data sources

| Component | Web API call | Mobile replacement |
|-----------|-------------|-------------------|
| `FeaturedRestaurants` | `fetch('/api/v1/featured-restaurants')` | Nhost GraphQL: `query GetFeaturedRestaurants` on `featured_restaurants` table with `restaurant` join |
| `Articles` | `fetch('/api/v1/articles/get-articles?limit=8&location_slug=...')` | Nhost GraphQL: `query GetArticles($limit: Int!, $locationSlug: String!)` |
| `ArticleDetail` | Fetched by slug/id on individual page | Nhost Functions: `articles/get-article-by-slug` / `get-article-by-id` — body + **`article_restaurant_associations`** (display order) with batch-resolved **`restaurant`** rows |

---

## 2. Homepage Section Order (Mobile)

The mobile home screen maintains the same hierarchy as the web, with the Featured Restaurants section renamed to "Recommended" to match product intent and better suit the mobile context:

```
HomeScreen (/(tabs)/)
  ├─ HeroBanner
  ├─ FeaturedRestaurantsSection   ← "Recommended" horizontal scroll carousel
  ├─ QuickFindsSection            ← cuisine grid (5-col)
  ├─ ReviewFeedSection            ← Trending / For You tabs + review cards
  └─ ArticlesSection              ← "Articles" horizontal scroll carousel + "See All"
```

---

## 3. Featured Restaurants (Recommended) Section

### Web layout (`FeaturedRestaurants.tsx`)

```
Section: py-6 md:py-10, max-w-[1280px]
Title:   "Featured Restaurants" — text-center text-xl md:text-2xl
         font-neusans font-normal text-[#1b1b1b] mb-4 md:mb-6

Splide carousel options:
  Desktop:  perPage=3, gap=1rem, padding left/right=1rem
  Tablet:   perPage=2, gap=1rem
  Mobile:   perPage=1, gap=0.75rem, padding-right=20% (peek next card)
  type=slide, drag=free, snap=true, no pagination, no arrows

FeaturedCard:
  Container:  aspect-[3/4], rounded-2xl, overflow-hidden, bg-gray-200
  Image:      fill, object-cover, group-hover:scale-105, duration-500
  Overlay:    absolute inset-x-0 bottom-0 h-2/5
              bg-gradient-to-t from-black/70 via-black/30 to-transparent
  Text block: absolute inset-x-0 bottom-0 p-4 md:p-5
    Title:    text-white text-lg md:text-xl font-neusans font-medium
              leading-snug line-clamp-2
    Address:  flex items-center gap-1 text-white/80 text-sm font-neusans
              truncate, HiOutlineLocationMarker icon h-3.5 w-3.5

Skeleton: 3 pulse blocks, same aspect-[3/4], rounded-2xl
```

**Address priority logic (from `getDisplayAddress`):**
```ts
// Priority: listing_street → address.street_address → "city, country_short" → null
function getDisplayAddress(listing_street, address): string | null {
  if (listing_street?.trim()) return listing_street.trim();
  if (address?.street_address?.trim()) return address.street_address.trim();
  if (address?.city) return address.country_short
    ? `${address.city}, ${address.country_short}` : address.city;
  return null;
}
```

### Mobile recovery (`FeaturedRestaurantsSection.tsx`)

The Splide.js carousel becomes a native `FlatList` with `horizontal`, `pagingEnabled={false}`, and a right-padding peek — the exact equivalent of `padding-right: 20%` on mobile web.

```tsx
// components/home/FeaturedRestaurantsSection.tsx

const CARD_WIDTH = SCREEN_WIDTH * 0.72;  // 72% of screen width
const CARD_MARGIN = 12;                  // gap between cards
const PEEK = SCREEN_WIDTH * 0.08;        // ~8% right peek of next card

const FeaturedRestaurantsSection = () => {
  const [items, setItems] = useState<FeaturedRestaurantData[]>([]);
  const [loading, setLoading] = useState(true);
  const { trigger: haptic } = useHaptic();

  useEffect(() => {
    fetchFeaturedRestaurants().then(data => {
      setItems(data.filter(d => d.restaurant));
      setLoading(false);
    });
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <View className="py-6 w-full">

      {/* Section title */}
      <Text className="font-neusans font-normal text-[#1b1b1b] text-xl text-center mb-4 px-4">
        Recommended
      </Text>

      {loading ? (
        <FeaturedSkeleton />
      ) : (
        <FlatList
          data={items}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + CARD_MARGIN}
          snapToAlignment="start"
          contentContainerStyle={{ paddingLeft: 16, paddingRight: PEEK }}
          keyExtractor={item => String(item.id)}
          ItemSeparatorComponent={() => <View style={{ width: CARD_MARGIN }} />}
          renderItem={({ item }) => (
            <FeaturedCard
              restaurant={item.restaurant}
              width={CARD_WIDTH}
            />
          )}
        />
      )}
    </View>
  );
};
```

### FeaturedCard (mobile)

```tsx
// components/home/FeaturedCard.tsx
// Preserves the 3:4 portrait ratio, gradient overlay, and text overlay exactly

const FeaturedCard = ({
  restaurant,
  width,
}: {
  restaurant: FeaturedRestaurantData['restaurant'];
  width: number;
}) => {
  const { trigger: haptic } = useHaptic();
  const address = getDisplayAddress(restaurant.listing_street, restaurant.address);

  return (
    <Pressable
      onPress={() => { haptic('light'); router.push(`/restaurants/${restaurant.slug}`); }}
      style={{ width }}
    >
      {/* 3:4 portrait card — matches web aspect-[3/4] */}
      <View
        style={{ width, aspectRatio: 3 / 4 }}
        className="rounded-2xl overflow-hidden bg-gray-200"
      >
        <Image
          source={{ uri: restaurant.featured_image_url || DEFAULT_RESTAURANT_IMAGE }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />

        {/* Bottom gradient overlay — from-black/70 via-black/30 to-transparent */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          locations={[0, 0.6, 1]}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',  // h-2/5
          }}
        />

        {/* Text overlay — absolute bottom, p-4 */}
        <View className="absolute bottom-0 left-0 right-0 p-4">
          <Text
            className="text-white text-lg font-neusans font-medium leading-snug"
            numberOfLines={2}
          >
            {restaurant.title}
          </Text>
          {address && (
            <View className="flex-row items-center gap-1 mt-1.5">
              <HiOutlineLocationMarker size={14} color="rgba(255,255,255,0.8)" />
              <Text
                className="text-sm font-neusans flex-1"
                style={{ color: 'rgba(255,255,255,0.8)' }}
                numberOfLines={1}
              >
                {address}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};
```

### Skeleton (mobile)

```tsx
// FeaturedSkeleton — 3 pulse cards, same dimensions
const FeaturedSkeleton = () => (
  <View className="flex-row" style={{ paddingLeft: 16, gap: 12 }}>
    {[1, 2, 3].map(i => (
      <View
        key={i}
        style={{ width: CARD_WIDTH, aspectRatio: 3 / 4 }}
        className="rounded-2xl bg-gray-200 animate-pulse"
      />
    ))}
  </View>
);
```

**Design tokens:**
```
Card width:        72% of screen width (SCREEN_WIDTH * 0.72)
Card aspect:       3:4 (portrait)
Card radius:       rounded-2xl (16px)
Gap between cards: 12px
Right peek:        ~8% of screen width (shows next card edge)
Snap:              snapToInterval = cardWidth + gap
Gradient:          transparent → rgba(0,0,0,0.3) → rgba(0,0,0,0.7), bottom 40%
Title font:        font-neusans font-medium text-lg (18px) text-white
Address font:      font-neusans text-sm text-white/80
Address icon:      HiOutlineLocationMarker, 14×14px, white/80
Section title:     font-neusans font-normal text-xl text-[#1b1b1b] text-center
Library needed:    expo-linear-gradient for gradient overlay
```

---

## 4. Articles Section

### Web layout (`Articles.tsx` + `ArticleCard.tsx` + `_articles.scss`)

```
Section: padding 2.5rem 0 (desktop) / 1.5rem 0 (mobile)
         max-width: 1280px, px: 1rem desktop / 0.75rem mobile

Header:  flex items-center justify-center, relative
  Title:   "Articles" — font-neusans font-normal text-[#1b1b1b]
           1.5rem desktop / 1.25rem mobile, text-center
  See all: absolute right-0 — "See all" link, hidden on mobile

Grid:    grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6
         (1 column mobile → 4 columns desktop)
         8 cards total, 8 skeletons while loading

ArticleCard (size="large"):
  Container:   block overflow-hidden font-neusans group
  Image wrap:  aspect-video (16:9) rounded-2xl mb-2 overflow-hidden
  Image:       fill object-cover group-hover:scale-105 duration-200
  Category pill: absolute bottom-2 left-2
                 bg-white/90 text-[#ff7c0a] text-[10px] font-semibold
                 px-2 py-0.5 rounded-full capitalize
  Title:       font-semibold text-[#31343F] line-clamp-2 mb-1 leading-snug
               text-sm md:text-base (large variant)
  Read time:   FiClock w-3 h-3 + "{n} min read"
               text-gray-400 text-xs md:text-sm (large)

Mobile "See all" button: mt-5 md:hidden — SeeAllButton variant="block"
  Style: bg-[#ff7c0a] text-white rounded-lg py-3 px-6 w-full font-neusans font-normal

Location filtering: articles fetched by selectedLocation.key from LocationContext
```

### Mobile recovery (`ArticlesSection.tsx`)

On mobile the 4-column grid becomes a horizontal scroll of article cards — 2 visible at once with a peek of the third, matching the web's carousel intent.

```tsx
// components/home/ArticlesSection.tsx

const ARTICLE_CARD_WIDTH = SCREEN_WIDTH * 0.64;  // 64% — shows ~1.5 cards
const ARTICLE_GAP = 12;

const ArticlesSection = () => {
  const { selectedLocation } = useLocation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const { trigger: haptic } = useHaptic();

  useEffect(() => {
    setLoading(true);
    fetchArticles({ limit: 8, locationSlug: selectedLocation.key })
      .then(data => setArticles(data.map(transformHasuraArticle)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedLocation.key]);

  if (!loading && articles.length === 0) return null;

  return (
    <View className="py-6 w-full">

      {/* Section header */}
      <View className="flex-row items-center justify-between px-4 mb-4">
        <Text className="font-neusans font-normal text-[#1b1b1b] text-xl">
          Articles
        </Text>
        <Pressable
          onPress={() => { haptic('light'); router.push('/articles'); }}
        >
          <Text className="font-neusans text-sm text-[#ff7c0a]">See all</Text>
        </Pressable>
      </View>

      {loading ? (
        <ArticleSkeletonRow />
      ) : (
        <>
          {/* Horizontal scroll */}
          <FlatList
            data={articles}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={ARTICLE_CARD_WIDTH + ARTICLE_GAP}
            snapToAlignment="start"
            contentContainerStyle={{
              paddingLeft: 16,
              paddingRight: SCREEN_WIDTH * 0.1,
            }}
            keyExtractor={a => a.id}
            ItemSeparatorComponent={() => <View style={{ width: ARTICLE_GAP }} />}
            renderItem={({ item }) => (
              <ArticleCard
                article={item}
                width={ARTICLE_CARD_WIDTH}
                size="large"
              />
            )}
          />

          {/* "See all" CTA — full-width button below the scroll */}
          <View className="px-4 mt-5">
            <Pressable
              onPress={() => { haptic('light'); router.push('/articles'); }}
              className="w-full py-3 px-6 bg-[#ff7c0a] rounded-lg items-center justify-center"
            >
              <Text className="font-neusans font-normal text-[0.9375rem] text-white text-center">
                See all
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
};
```

### ArticleCard (mobile)

```tsx
// components/articles/ArticleCard.tsx

interface ArticleCardProps {
  article: Article;
  size?: 'default' | 'large';
  width?: number;
}

const ArticleCard = ({ article, size = 'default', width }: ArticleCardProps) => {
  const { trigger: haptic } = useHaptic();
  const isLarge = size === 'large';
  const coverSrc = article.cover_image_url?.trim() || DEFAULT_ARTICLE_COVER_IMAGE;

  const href = article.slug?.trim()
    ? `/articles/${encodeURIComponent(article.slug.trim())}`
    : `/articles/${article.id}`;

  return (
    <Pressable
      onPress={() => { haptic('light'); router.push(href); }}
      style={width ? { width } : undefined}
      className="overflow-hidden font-neusans"
    >
      {/* Cover image — 16:9 (large) or 4:3 (default) */}
      <View
        className="relative overflow-hidden rounded-2xl mb-2"
        style={{ aspectRatio: isLarge ? 16 / 9 : 4 / 3 }}
      >
        <Image
          source={{ uri: coverSrc }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />

        {/* Category pill — absolute bottom-left */}
        <View
          className="absolute rounded-full"
          style={{
            bottom: 8,
            left: 8,
            backgroundColor: 'rgba(255,255,255,0.9)',
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text
            className="text-[#ff7c0a] font-semibold capitalize"
            style={{ fontSize: 10 }}
          >
            {article.category}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text
        className={`font-semibold text-[#31343F] leading-snug mb-1 ${
          isLarge ? 'text-sm' : 'text-[12px]'
        }`}
        numberOfLines={2}
      >
        {article.title}
      </Text>

      {/* Read time */}
      <View className="flex-row items-center gap-1">
        <FiClock size={12} color="#9ca3af" />
        <Text className={`text-gray-400 ${isLarge ? 'text-xs' : 'text-[11px]'}`}>
          {article.reading_time_minutes} min read
        </Text>
      </View>
    </Pressable>
  );
};
```

### Article skeleton row (mobile)

```tsx
// ArticleSkeletonRow — 3 pulse cards
const ArticleSkeletonRow = () => (
  <View className="flex-row" style={{ paddingLeft: 16, gap: 12 }}>
    {[1, 2, 3].map(i => (
      <View key={i} style={{ width: ARTICLE_CARD_WIDTH }} className="animate-pulse">
        <View
          className="rounded-2xl bg-gray-200 mb-2"
          style={{ aspectRatio: 16 / 9 }}
        >
          {/* Category pill placeholder */}
          <View
            className="absolute rounded-full bg-white/70"
            style={{ bottom: 8, left: 8, width: 64, height: 18 }}
          />
        </View>
        <View className="h-4 w-full rounded bg-gray-300 mb-1.5" />
        <View className="h-4 w-11/12 rounded bg-gray-200 mb-1.5" />
        <View className="h-3 w-1/3 rounded bg-gray-200" />
      </View>
    ))}
  </View>
);
```

**Design tokens:**
```
Card width:        64% of screen width (shows ~1.5 cards)
Card aspect:       16:9 (large, homepage) / 4:3 (default, list page)
Card radius:       rounded-2xl (16px)
Gap:               12px
Category pill:     bg-white/90 text-[#ff7c0a] text-[10px] font-semibold
                   rounded-full px-2 py-0.5 — bottom-left of image
Title:             font-neusans font-semibold text-[#31343F]
                   text-sm (large) / text-[12px] (default), numberOfLines=2
Read time:         FiClock 12px + text-[11px] text-gray-400
Section title:     font-neusans font-normal text-xl text-[#1b1b1b]
"See all" inline:  font-neusans text-sm text-[#ff7c0a]
"See all" block:   bg-[#ff7c0a] text-white rounded-lg py-3 px-6 w-full
                   font-neusans font-normal text-[0.9375rem]
```

---

## 5. Article List Screen (`/articles`)

The web has no dedicated `/articles` list page yet — the "See All" button links to `/articles` but no page file was found. This screen is proposed for mobile.

### Screen design

```
Route: /articles

┌─────────────────────────────────────────┐
│  [← back]  Articles  [location picker] │  ← Stack header
│─────────────────────────────────────────│
│  [Location filter: Hong Kong ▾]        │  ← sticky below header
│─────────────────────────────────────────│
│  [Article Card — 4:3 image, full width]│
│  [Category pill on image]              │
│  Title (2 lines max)                   │
│  🕐 4 min read                        │
│─────────────────────────────────────────│
│  [Article Card]                        │
│  ...                                   │
│─────────────────────────────────────────│
│  [Load more / infinite scroll]         │
└─────────────────────────────────────────┘
```

```tsx
// app/articles/index.tsx

const ARTICLE_LIST_LIMIT = 12;

export default function ArticlesListScreen() {
  const { selectedLocation } = useLocation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchMore = useCallback(async (currentOffset = 0) => {
    setLoading(true);
    try {
      const data = await fetchArticles({
        limit: ARTICLE_LIST_LIMIT,
        offset: currentOffset,
        locationSlug: selectedLocation.key,
      });
      const transformed = data.map(transformHasuraArticle);
      setArticles(prev =>
        currentOffset === 0 ? transformed : [...prev, ...transformed]
      );
      setOffset(currentOffset + transformed.length);
      setHasMore(transformed.length === ARTICLE_LIST_LIMIT);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation.key]);

  // Refetch when location changes
  useEffect(() => {
    setArticles([]);
    setOffset(0);
    setHasMore(true);
    fetchMore(0);
  }, [selectedLocation.key]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {loading && articles.length === 0 ? (
        // Full-page skeleton: 6 article card skeletons, stacked
        <View className="px-4 pt-4 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <ArticleCardSkeleton key={i} large={false} />
          ))}
        </View>
      ) : (
        <FlashList
          data={articles}
          estimatedItemSize={280}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
          renderItem={({ item }) => (
            <ArticleCard article={item} size="default" />
          )}
          onEndReached={() => { if (hasMore && !loading) fetchMore(offset); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && articles.length > 0
              ? <ActivityIndicator color="#ff7c0a" style={{ marginVertical: 16 }} />
              : null
          }
          ListEmptyComponent={
            !loading ? (
              <View className="items-center justify-center py-16">
                <Text className="font-neusans text-gray-400 text-center">
                  No articles available for this location yet.
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
```

---

## 6. Article Detail Screen (`/articles/[slug]`)

### Web component (`ArticleDetail.tsx`) — full spec

```
Route: /articles/[slug]  (proposed — not yet a page in web)

Container: max-w-2xl mx-auto px-4 pt-16 md:pt-24 pb-10 font-neusans

Back link:    FiArrowLeft w-4 h-4 + text-sm text-gray-400
              hover:text-[#ff7c0a] transition-colors mb-6

Category:     block text-[11px] text-[#ff7c0a] font-semibold
              uppercase tracking-wider mb-1

Title:        text-2xl md:text-3xl font-semibold text-[#1b1b1b]
              leading-snug mb-3

Meta row:     flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mb-6
  Location:   FiMapPin w-3 h-3 + location name → from article_linked_locations
  Read time:  FiClock w-3 h-3 + "{n} min read"
  Date:       "Month Day, Year" (en-US long date)
  Author:     author avatar (16×16 rounded-full) + author name
  Views:      FiEye w-3 h-3 + view_count.toLocaleString() (only if > 0)
  Separator:  "·" between each item

Hero image:   w-full aspect-[16/9] rounded-2xl overflow-hidden mb-8
              Image: fill, object-cover, priority

Excerpt:      text-base text-gray-500 leading-relaxed mb-6 italic
              border-l-2 border-[#ff7c0a] pl-4

Body:         prose prose-gray max-w-none text-[15px] leading-relaxed text-gray-700
              (raw content string — note: web renders as plain text, not HTML)

Related restaurants (ArticleRelatedRestaurantsSection):
  Section:    mt-10 pt-8 border-t border-gray-100
  Title:      "Restaurants in this article"
              text-lg md:text-xl font-semibold text-gray-900 mb-2 text-center
  Subtitle:   "Places we mention in this story..."
              text-sm text-gray-600 mb-6 text-center
  Each row:   p-4 rounded-2xl bg-white border border-gray-100
              hover:border-[#ff7c0a]/30 transition-colors
    Image:    w-full aspect-[16/9] rounded-xl overflow-hidden bg-gray-100
    Title:    text-lg font-semibold text-gray-900 mb-1
    Desc:     text-sm text-gray-600 leading-relaxed mb-2 line-clamp-3
    Address:  text-xs text-gray-500
    CTA:      "View restaurant →" text-sm font-medium text-[#ff7c0a]
              (links to /restaurants/[slug])
```

### Mobile screen (`/articles/[slug].tsx`)

```tsx
// app/articles/[slug].tsx

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const { trigger: haptic } = useHaptic();

  useEffect(() => {
    fetchArticleBySlug(slug).then(raw => {
      if (raw) setArticle(transformHasuraArticle(raw));
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <ArticleDetailSkeleton />;
  if (!article) return <ArticleNotFoundScreen />;

  const formattedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const authorLabel = article.author_profile?.displayName || article.author_name;
  const heroSrc = article.cover_image_url?.trim() || DEFAULT_ARTICLE_COVER_IMAGE;
  const linkedLocs = article.article_linked_locations ?? [];
  const linkedRestaurants = article.article_linked_restaurants ?? [];
  const cityLocation = linkedLocs.find(l => l.type === 'city') ?? linkedLocs[0];

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Hero image — full bleed, 16:9, no padding */}
      <View className="w-full" style={{ aspectRatio: 16 / 9 }}>
        <Image
          source={{ uri: heroSrc }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      </View>

      {/* Content — padded */}
      <View className="px-4 pt-6">

        {/* Category */}
        {article.category ? (
          <Text
            className="font-neusans font-semibold uppercase mb-1"
            style={{ fontSize: 11, letterSpacing: 0.8, color: '#ff7c0a' }}
          >
            {article.category}
          </Text>
        ) : null}

        {/* Title */}
        <Text className="font-neusans font-semibold text-2xl text-[#1b1b1b] leading-snug mb-3">
          {article.title}
        </Text>

        {/* Meta row */}
        <View className="flex-row flex-wrap items-center mb-6" style={{ gap: 8 }}>
          {cityLocation?.name && (
            <>
              <View className="flex-row items-center gap-1">
                <FiMapPin size={12} color="#9ca3af" />
                <Text className="text-xs text-gray-400 font-neusans">{cityLocation.name}</Text>
              </View>
              <Text className="text-xs text-gray-400">·</Text>
            </>
          )}
          <View className="flex-row items-center gap-1">
            <FiClock size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-400 font-neusans">
              {article.reading_time_minutes} min read
            </Text>
          </View>
          {formattedDate && (
            <>
              <Text className="text-xs text-gray-400">·</Text>
              <Text className="text-xs text-gray-400 font-neusans">{formattedDate}</Text>
            </>
          )}
          {authorLabel && (
            <>
              <Text className="text-xs text-gray-400">·</Text>
              <View className="flex-row items-center gap-1.5">
                {article.author_profile?.avatarUrl && (
                  <Image
                    source={{ uri: article.author_profile.avatarUrl }}
                    style={{ width: 16, height: 16, borderRadius: 8 }}
                    contentFit="cover"
                  />
                )}
                <Text className="text-xs text-gray-400 font-neusans">{authorLabel}</Text>
              </View>
            </>
          )}
          {typeof article.view_count === 'number' && article.view_count > 0 && (
            <>
              <Text className="text-xs text-gray-400">·</Text>
              <View className="flex-row items-center gap-1">
                <FiEye size={12} color="#9ca3af" />
                <Text className="text-xs text-gray-400 font-neusans">
                  {article.view_count.toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Excerpt — italic, orange left border */}
        {article.excerpt ? (
          <View
            className="mb-6"
            style={{ borderLeftWidth: 2, borderLeftColor: '#ff7c0a', paddingLeft: 16 }}
          >
            <Text className="font-neusans text-base text-gray-500 leading-relaxed italic">
              {article.excerpt}
            </Text>
          </View>
        ) : null}

        {/* Body content */}
        {article.content ? (
          <Text
            className="font-neusans leading-relaxed text-gray-700"
            style={{ fontSize: 15 }}
          >
            {article.content}
          </Text>
        ) : null}

        {/* Related restaurants */}
        {linkedRestaurants.length > 0 && (
          <ArticleRelatedRestaurantsSection restaurants={linkedRestaurants} />
        )}
      </View>
    </ScrollView>
  );
}
```

### Article detail skeleton (mobile)

```tsx
// Matches ArticleDetailSkeleton from web exactly
const ArticleDetailSkeleton = () => (
  <View className="flex-1 bg-white">
    {/* Hero image skeleton */}
    <View className="w-full bg-gray-300 animate-pulse" style={{ aspectRatio: 16 / 9 }} />
    <View className="px-4 pt-6 animate-pulse">
      {/* Category */}
      <View className="h-3 w-16 rounded bg-gray-200 mb-2" />
      {/* Title — 2 lines */}
      <View className="h-8 w-full rounded bg-gray-300 mb-1" />
      <View className="h-8 w-3/4 rounded bg-gray-300 mb-4" />
      {/* Meta row */}
      <View className="flex-row gap-2 mb-6">
        <View className="h-3 w-20 rounded bg-gray-200" />
        <View className="h-3 w-4 rounded bg-gray-200" />
        <View className="h-3 w-28 rounded bg-gray-200" />
      </View>
      {/* Body lines */}
      <View className="gap-3">
        {[100, 83, 100, 75, 91, 100].map((pct, i) => (
          <View
            key={i}
            className="h-4 rounded bg-gray-200"
            style={{ width: `${pct}%` }}
          />
        ))}
      </View>
    </View>
  </View>
);
```

---

## 7. Related Restaurants Section (mobile)

Directly ported from `ArticleRelatedRestaurantsSection.tsx`.

```tsx
// components/articles/ArticleRelatedRestaurantsSection.tsx

const ArticleRelatedRestaurantsSection = ({
  restaurants,
}: {
  restaurants: ArticleLinkedRestaurant[];
}) => {
  if (!restaurants.length) return null;
  const { trigger: haptic } = useHaptic();

  const sorted = [...restaurants].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  return (
    <View
      className="mt-10 pt-8"
      style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
    >
      <Text className="font-neusans font-semibold text-lg text-gray-900 mb-2 text-center">
        Restaurants in this article
      </Text>
      <Text className="font-neusans text-sm text-gray-600 mb-6 text-center">
        Places we mention in this story — tap through for full listings, photos, and reviews.
      </Text>

      <View className="gap-4">
        {sorted.map(r => {
          const href = r.slug ? `/restaurants/${encodeURIComponent(r.slug)}` : null;
          const imgUri = r.imageUrl?.trim() || DEFAULT_RESTAURANT_IMAGE;

          return (
            <Pressable
              key={r.associationId}
              onPress={href ? () => { haptic('light'); router.push(href); } : undefined}
              disabled={!href}
            >
              {/* Card: bg-white, border-gray-100, rounded-2xl, p-4 */}
              <View
                className="p-4 rounded-2xl bg-white"
                style={{ borderWidth: 1, borderColor: '#f3f4f6' }}
              >
                {/* 16:9 restaurant image */}
                <View className="w-full rounded-xl overflow-hidden bg-gray-100 mb-4"
                      style={{ aspectRatio: 16 / 9 }}>
                  <Image
                    source={{ uri: imgUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>

                {/* Restaurant name */}
                <Text className="font-neusans font-semibold text-lg text-gray-900 mb-1">
                  {r.title}
                </Text>

                {/* Description */}
                {r.description && (
                  <Text
                    className="font-neusans text-sm text-gray-600 leading-relaxed mb-2"
                    numberOfLines={3}
                  >
                    {r.description}
                  </Text>
                )}

                {/* Address */}
                {r.addressLine && (
                  <Text className="font-neusans text-xs text-gray-500">
                    {r.addressLine}
                  </Text>
                )}

                {/* CTA */}
                {href && (
                  <Text className="font-neusans text-sm font-medium text-[#ff7c0a] mt-3">
                    View restaurant →
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
```

---

## 8. Data Fetching (API Migration)

All `/api/v1/` calls are replaced with direct Nhost GraphQL queries.

### Featured Restaurants

```graphql
query GetFeaturedRestaurants {
  featured_restaurants(order_by: { sort_order: asc }) {
    id
    sort_order
    restaurant {
      id
      uuid
      title
      slug
      featured_image_url
      listing_street
      address {
        city
        country_short
        street_address
      }
      average_rating
      ratings_count
    }
  }
}
```

```ts
// services/featuredRestaurantsService.ts
export const fetchFeaturedRestaurants = async () => {
  const { data } = await apolloClient.query({ query: GET_FEATURED_RESTAURANTS });
  return data.featured_restaurants.filter((d: any) => d.restaurant);
};
```

### Articles (list)

```graphql
query GetArticles($limit: Int!, $offset: Int!, $locationSlug: String) {
  articles(
    where: {
      status: { _eq: "published" }
      _and: [
        { article_restaurant_location_associations: {
            restaurant_location: { slug: { _eq: $locationSlug } }
        }}
      ]
    }
    order_by: { published_at: desc }
    limit: $limit
    offset: $offset
  ) {
    id uuid slug title excerpt category
    featured_image_url featured_image_alt
    reading_time_minutes published_at updated_at
    content author_id view_count
    author_profile { id displayName avatarUrl }
    article_restaurant_associations {
      id restaurant_id display_order
      restaurant { uuid title slug featured_image_url listing_street content }
    }
    article_restaurant_location_associations {
      id location_id display_order
      restaurant_location { name slug short_label flag_url type }
    }
  }
}
```

> **Note:** The location filter should be optional — when `locationSlug` is null or "all", omit the `_and` condition to return articles from all locations.

### Article detail (by slug)

```graphql
query GetArticleBySlug($slug: String!) {
  articles(where: { slug: { _eq: $slug }, status: { _eq: "published" } }, limit: 1) {
    id uuid slug title excerpt category
    featured_image_url featured_image_alt
    reading_time_minutes published_at updated_at
    content author_id view_count
    meta_title meta_description meta_keywords
    author_profile { id displayName avatarUrl email }
    article_restaurant_associations {
      id restaurant_id display_order
      restaurant { uuid title slug featured_image_url listing_street content address }
    }
    article_restaurant_location_associations {
      id location_id display_order
      restaurant_location { name slug short_label flag_url type }
    }
  }
}
```

```ts
// services/articlesService.ts
export const fetchArticleBySlug = async (slug: string) => {
  const { data } = await apolloClient.query({
    query: GET_ARTICLE_BY_SLUG,
    variables: { slug: decodeURIComponent(slug) },
  });
  return data.articles[0] ?? null;
};
```

---

## 9. Screen Map

| Web | Mobile screen | Expo Router path |
|-----|--------------|-----------------|
| Homepage `<FeaturedRestaurants />` | `FeaturedRestaurantsSection` | Inside `/(tabs)/` home screen |
| Homepage `<Articles />` | `ArticlesSection` | Inside `/(tabs)/` home screen |
| `/articles` (no page yet) | Articles list screen | `/articles` |
| `/articles/[slug]` (no page yet) | Article detail screen | `/articles/[slug]` |

---

## 10. Component Checklist

| Component | Source (web) | Mobile action |
|-----------|-------------|---------------|
| `FeaturedRestaurants.tsx` | `components/FeaturedRestaurants/FeaturedRestaurants.tsx` | `FeaturedRestaurantsSection` — FlatList horizontal, no Splide |
| `FeaturedCard` | Inside `FeaturedRestaurants.tsx` | Port to RN — LinearGradient replaces CSS gradient |
| `SkeletonSlider` | Inside `FeaturedRestaurants.tsx` | `FeaturedSkeleton` — 3 pulse cards |
| `Articles.tsx` | `components/Articles/Articles.tsx` | `ArticlesSection` — FlatList horizontal |
| `ArticleCard.tsx` | `components/Articles/ArticleCard.tsx` | Port to RN Pressable — same aspect ratios, category pill |
| `ArticleCardSkeleton.tsx` | `components/ui/Skeleton/ArticleCardSkeleton.tsx` | Port to RN animate-pulse |
| `SeeAllButton.tsx` | `components/ui/SeeAllButton.tsx` | Inline RN Pressable — same `#ff7c0a` bg, rounded-lg |
| `ArticleDetail.tsx` | `components/Articles/ArticleDetail.tsx` | `ArticleDetailScreen` — full ScrollView |
| `ArticleDetailSkeleton` | Inside `ArticleDetail.tsx` | Port to RN animate-pulse |
| `ArticleRelatedRestaurantsSection.tsx` | `components/Articles/ArticleRelatedRestaurantsSection.tsx` | Port to RN Pressable cards |
| `transformHasuraArticle` | `utils/articleTransformers.ts` | Port directly — pure function, no web deps |
| `Article` type | `types/article.ts` | Port directly to `types/article.ts` |
| `getDisplayAddress` | Inside `FeaturedRestaurants.tsx` | Port to `utils/addressUtils.ts` |
| `locationContext` | `contexts/LocationContext.tsx` | Port with Zustand or React Context |
| — | `/articles` list page | New screen — proposed in §5 |

---

## 11. Libraries Required

| Need | Web | Mobile |
|------|-----|--------|
| Carousel / horizontal scroll | `@splidejs/react-splide` | Native `FlatList` with `horizontal` + `snapToInterval` |
| Gradient overlay on images | CSS `bg-gradient-to-t` | `expo-linear-gradient` → `<LinearGradient>` |
| Location marker icon | `react-icons/hi` → `HiOutlineLocationMarker` | `react-icons` not available in RN — use `Feather` `map-pin` or `@expo/vector-icons` |
| Clock icon | `react-icons/fi` → `FiClock` | Same: use Expo vector icons `Feather` set |
| Eye icon | `react-icons/fi` → `FiEye` | Expo vector icons `Feather` |
| Arrow left | `react-icons/fi` → `FiArrowLeft` | Expo vector icons `Feather` |

---

## 12. Haptic Map

| Interaction | Preset |
|-------------|--------|
| Tap featured restaurant card | `light` |
| Tap article card (home section) | `light` |
| Tap "See all" articles button | `light` |
| Tap article in list screen | `light` |
| Tap related restaurant in article | `light` |
| Scroll snap (carousel) | *(implicit — gesture handler)* |