## TastyStudio maps + Google-native detail deferral

The mobile spec (`tasty-studio-v1`) calls for an optional **`MyListMapView`** toggle plus a canonical route at `/places/google/[place_id]` with editorial chrome. Those surfaces require pinning map SDKs (`react-native-maps` / Expo Maps), tile budgets, plus Hasura-fed TP slug badges.

### v1.0 scope shipped

- `app/places/google/[place_id]` opens authoritative Google Maps URIs (`query_place_id`) so testers can QA Google-only rows without embedding the SDK yet.
- `MyListPlaceCard` deep-links TP slugs whenever `tastyplates_restaurant_slug` hydrates via future matching jobs (`google_place_id` column migration is already tracked in `Repo/`).

### v1.1 backlog

1. Install configured map module + expo config plugins for iOS/Android API keys (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`).
2. Map toggle on `studio/my-lists` stacked under list mode; cluster pins sourced from Apollo `user_place_collections`.
3. Replace stub screen with hydrated layout (photos carousel, curated CTA, open hours from `google_place_cache` rows once populated server-side).

Track schema + Hasura commentary in [`tastyplates-nhost/documentation/my-lists-hasura-setup.md`](../../../tastyplates-nhost/documentation/my-lists-hasura-setup.md).
