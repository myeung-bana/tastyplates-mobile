# TastyPlates — Store Publishing Strategy

| | |
|---|---|
| **Status** | Draft v1.0 |
| **Owner** | Muser (6ixTech) |
| **Repo audited** | `tastyplates-mobile` @ `77ec894` (Expo SDK 54, RN 0.81, app v1.2.0) |
| **Last updated** | 2026-10-18 |
| **Sequencing** | Google Play first → Apple App Store second |

---

## 1. Strategy at a glance

We ship to **Google Play first**, then Apple App Store.

Why Play first:

- Play review is faster and more forgiving, so we can validate the release pipeline (EAS build → signing → store submit) with real users sooner.
- Sign in with Apple, iPad review, Xcode 26 builds and Apple's age-rating questionnaire are iOS-only. Deferring them lets Phase 1 focus on the gaps that matter for **both** stores.
- Closed-testing on Play gives us crash and UX data before Apple's stricter review.

Most compliance work (account deletion, report/block, privacy policy) is **shared**. It is built once in Phase 1 and reused for iOS in Phase 2.

```
Phase 0  Security & foundations      (both stores, blocking)
Phase 1  Google Play launch          (shared compliance + Play-specific)
Phase 2  Apple App Store launch      (iOS-only delta)
Phase 3  Post-launch hardening       (both)
```

Legend: 🔴 blocker (store will reject) · 🟠 required for listing · 🟢 recommended

---

## 2. Phase 0 — Security & foundations (do first, both stores)

| # | Item | Pri | Repo / area | Done |
|---|---|---|---|---|
| 0.1 | `.env` is committed and contains the Firebase **service-account private key**. Revoke and reissue the key in Google Cloud. | 🔴 | GCP / Firebase | [ ] |
| 0.2 | Remove `.env` from git history (`git filter-repo`), add `.env*` to `.gitignore`, keep `.env.example` only. | 🔴 | mobile | [ ] |
| 0.3 | Make the repo private. Move non-public secrets to EAS Secrets. Only `EXPO_PUBLIC_*` client keys may ship in the bundle. | 🔴 | GitHub / EAS | [ ] |
| 0.4 | Restrict the Google Maps API key: Android package name + SHA-1 (now), iOS bundle ID (Phase 2). | 🟠 | GCP | [ ] |
| 0.5 | Decide the **production** IDs. They are permanent once published (and survive an App Store transfer to the JV). Current values are dev IDs: `com.bana.tastyplates.dev` (Android), `com.bana.tastyplates-dev` (iOS). Proposal: `com.sixtech.tastyplates` on both; keep `.dev` for an internal variant. | 🔴 | `app.json` | [ ] |
| 0.6 | Decide native-folder strategy. `ios/` and `android/` are committed, so `app.json` changes don't apply unless you run `npx expo prebuild --clean`. Recommended: adopt Continuous Native Generation (gitignore native dirs) or commit to editing native files by hand. | 🟠 | mobile | [ ] |
| 0.7 | Align versions: `package.json` 1.1.1 vs app 1.2.0. Consider `appVersionSource: "remote"` in `eas.json`. | 🟢 | mobile | [ ] |

---

## 3. Phase 1 — Google Play launch

### 3a. Shared compliance (built now, reused for iOS)

| # | Item | Pri | Repo / area | Done |
|---|---|---|---|---|
| 1.1 | **In-app account deletion.** Settings → Account Security → Delete account. The Nhost function takes identity from the JWT only. It deletes or anonymises reviews, lists, follows and comments, then deletes the `auth.users` row. | 🔴 | nhost + mobile | [ ] |
| 1.2 | **Web account-deletion URL** (required by the Play Data safety form). A simple page on the web app, e.g. `/account/delete`. | 🔴 | v2 (web) | [ ] |
| 1.3 | **Report content.** Report a review, comment, list or profile. Needs a `content_reports` table + Hasura insert permission + reason enum. | 🔴 | nhost + mobile | [ ] |
| 1.4 | **Block user.** Needs a `user_blocks` table. Hasura select permissions hide blocked users' content. Manage blocked users from Settings. | 🔴 | nhost + mobile | [ ] |
| 1.5 | **Moderation queue.** Admin MCP tools to list and resolve reports and remove content. Target: act within 24h. | 🟠 | business-portal (MCP) | [ ] |
| 1.6 | **Privacy Policy.** Real content (PDPO-aligned): data collected (email, birthdate, gender, palates, photos, approximate city), purpose, retention, deletion, contact. Host it at a public URL and render it in the app (`app/privacy-policy.tsx` is a placeholder today). | 🔴 | web + mobile | [ ] |
| 1.7 | **Terms of Service / Content Guidelines.** Zero tolerance for objectionable content, plus the reporting process. `app/terms-of-service.tsx` is a placeholder today. | 🔴 | web + mobile | [ ] |
| 1.8 | Make birthdate and gender optional, or document why they're needed (they feed the Data safety and App Privacy forms). | 🟢 | mobile | [ ] |
| 1.9 | Keep scraped external (Google) reviews **out of the mobile app** (Maps ToS / IP risk). Show Google Places attribution wherever Places data or photos appear. | 🟠 | mobile | [ ] |
| 1.10 | Crash reporting (Sentry or Crashlytics) wired up for release builds. | 🟢 | mobile | [ ] |

### 3b. Android-specific

| # | Item | Pri | Repo / area | Done |
|---|---|---|---|---|
| 1.11 | **Release signing.** `android/app/build.gradle` signs release builds with `debug.keystore`. Switch to EAS-managed credentials and enrol in Play App Signing. Back up the upload key. | 🔴 | mobile / EAS | [ ] |
| 1.12 | Remove unused permissions: `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ_/WRITE_EXTERNAL_STORAGE` (deprecated). Use the Android Photo Picker via `expo-image-picker`. | 🔴 | mobile | [ ] |
| 1.13 | Confirm `targetSdkVersion` is **36** in the release AAB (required for new apps since 31 Aug 2026; Expo SDK 54 defaults to 36). | 🔴 | mobile | [ ] |
| 1.14 | Set the production `android.package` (from 0.5) and set `versionCode` via EAS auto-increment. | 🔴 | `app.json` | [ ] |
| 1.15 | Fill in `eas.json` → `submit.production.android` (Play service-account JSON, track `internal`). | 🟠 | mobile | [ ] |

### 3c. Play Console setup

| # | Item | Pri | Done |
|---|---|---|---|
| 1.16 | Developer account under **6ixTech as an organization** (D-U-N-S number required). Personal accounts created after Nov 2023 must run a 12-tester / 14-day closed test before production. | 🟠 | [ ] |
| 1.17 | Data safety form. Must match the Privacy Policy and the actual SDKs (Nhost, Firebase, Google Maps, Sentry). | 🔴 | [ ] |
| 1.18 | Content rating (IARC) questionnaire, declaring user-generated content and user interaction. | 🟠 | [ ] |
| 1.19 | Target audience and content: 13+ (not designed for children). | 🟠 | [ ] |
| 1.20 | Store listing: icon 512², feature graphic 1024×500, ≥2 phone screenshots, short and full descriptions, category Food & Drink, support email, privacy URL. | 🟠 | [ ] |
| 1.21 | App access: reviewer demo account already through onboarding (credentials in the Play Console "App access" section). | 🟠 | [ ] |

### 3d. Play rollout

1. **Internal testing** (team) → smoke test the release AAB, sign-in, review creation, deletion, report/block.
2. **Closed testing** (12+ external testers, ≥14 days; mandatory if personal account) → collect crashes and feedback.
3. **Production** staged rollout 10% → 50% → 100%, watching the crash-free rate.

**Phase 1 exit criteria:** all 🔴 items in Phases 0–1 closed, internal + closed tracks green, crash-free sessions ≥ 99%.

---

## 4. Phase 2 — Apple App Store launch (iOS delta)

Starts once Play is in production. Shared items 1.1–1.10 are already done.

| # | Item | Pri | Repo / area | Done |
|---|---|---|---|---|
| 2.1 | **Sign in with Apple** (Guideline 4.8, required because Google sign-in is offered). Enable the Nhost Apple provider + Services ID, add the `expo-apple-authentication` plugin, and turn on the Apple sign-in capability for the app ID. Render the button on iOS only. | 🔴 | nhost + mobile | [ ] |
| 2.2 | Rewrite the permission purpose strings. Camera and photos must explain the review-photo use. Remove `NSMicrophoneUsageDescription` and `NSFaceIDUsageDescription` (unused). Keep location only if the device location is actually read. | 🔴 | `app.config.js` | [ ] |
| 2.3 | Set `supportsTablet: false` unless the iPad layout is tested (otherwise iPad screenshots + iPad review are required). | 🟠 | `app.json` | [ ] |
| 2.4 | Build with **Xcode 26 / iOS 26 SDK** (required for uploads since Apr 2026). Pin the EAS build image. | 🔴 | `eas.json` | [ ] |
| 2.5 | Production bundle ID (from 0.5), registered under the 6ixTech Apple Developer Organization. | 🔴 | Apple Dev | [ ] |
| 2.6 | Restrict the Maps key to the iOS bundle ID. | 🟠 | GCP | [ ] |
| 2.7 | Verify `PrivacyInfo.xcprivacy` covers all required-reason APIs from bundled SDKs. Keep `ITSAppUsesNonExemptEncryption=false`. | 🟠 | mobile | [ ] |
| 2.8 | Fill in `eas.json` → `submit.production.ios` (`ascAppId`, Apple Team ID). | 🟠 | mobile | [ ] |

### App Store Connect setup

| # | Item | Pri | Done |
|---|---|---|---|
| 2.9 | App Privacy ("nutrition label"). Must match the Play Data safety form and the privacy manifest. | 🔴 | [ ] |
| 2.10 | Age rating questionnaire (updated 13+/16+/18+ tiers). Declare user-generated content. | 🟠 | [ ] |
| 2.11 | Screenshots 6.9" (+ iPad if tablet is supported), description, keywords, support URL, privacy URL. | 🟠 | [ ] |
| 2.12 | Review notes: demo account, where to find Delete account / Report / Block, and the moderation SLA. | 🟠 | [ ] |
| 2.13 | TestFlight internal → external beta → submit for review → phased release. | 🟠 | [ ] |

**Phase 2 exit criteria:** all 🔴 items closed, TestFlight external beta green, approved by App Review.

---

## 5. Phase 3 — Post-launch (both stores)

- OTA updates via `expo-updates` channels (`production`). Bump `runtimeVersion` on every native change.
- Monitor Play Android vitals and the App Store crash reports. Watch moderation-queue SLA.
- Track yearly target-API bumps (Play: API 37 expected Aug 2027) and Apple SDK minimums.
- When the JV entity is formed: App Store Connect app transfer + Play Console app transfer (bundle IDs stay the same).

---

## 6. Open decisions

| Decision | Options | Owner | Status |
|---|---|---|---|
| Production bundle / package ID | `com.sixtech.tastyplates` vs other | Muser | Open |
| Native folders | CNG (gitignore `ios/` `android/`) vs hand-maintained | Muser | Open |
| Play account type | Organization (6ixTech, D-U-N-S) vs personal | Muser | Open |
| Deletion semantics | Hard-delete reviews vs anonymise ("Deleted user") | Muser | Open |
| Crash reporting | Sentry vs Firebase Crashlytics | Muser | Open |

---

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-18 | Initial strategy from the store-readiness audit of `tastyplates-mobile@77ec894`. Play-first sequencing. |
