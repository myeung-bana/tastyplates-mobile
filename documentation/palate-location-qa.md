# Palate / location QA (mobile)

Checklist aligned with palate review plan implementation.

## Location hierarchy + pill

1. Cold start with saved city slug from onboarding: pill shows flag (if HTTPS URL) plus `City, CC` label; changing city persists full JSON in Secure Store (coords, flag, country short label).
2. Top nav: logo taps home `(tabs)`, center pill opens sheet, cuisine search + profile remain usable.
3. CMS fetch fails: pill still works with presets / last stored prefs; picker shows error row and presets remain via stored JSON.
4. Search in picker filters cities; selecting city updates `LocationContext` and closes sheet (`success` haptic).

## Create review (`/studio/add-review`)

5. Idle: **Nearby** lists up to ~10 Places within 1.5 km of anchored coords; shimmer while loading.
6. No coords (edge): empty-state copy guides user to choose a region with coordinates.
7. Typing (`>= 2 chars`): gastronomy-heavy filtering + sorting on autocomplete predictions; tapping row triggers match (`light` haptic).
8. Nearby row tap reuses prediction + match pipeline.
9. Matched venue: primary CTA navigates slug screen; unmatched flows to listing create with place id params.
10. Footer mailto renders when idle.

## Regression

11. My Lists anchored region pill opens same global picker (`GlobalLocationPill`).
12. `AddToMyListSheet` still reads `location` for Places autocomplete bias.
