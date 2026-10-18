# TastyPlates — Google Play Release Runbook (Phase 0 + 1)

Companion to [`publish-strat.md`](./publish-strat.md). The code work is done; this lists the
console, credential and ops steps that must be done by a person, in order.

---

## 1. Secrets and keys (do first)

1. **Revoke the Firebase service-account key** that was committed in `.env` (GCP → IAM → Service
   accounts → Keys → delete) and issue a new one only where a server needs it (never in mobile).
2. **Purge `.env` from git history** in `tastyplates-mobile`, then force-push and make the repo private:
   ```bash
   git filter-repo --path .env --invert-paths
   ```
   Everyone with a clone must re-clone afterwards.
3. **Rotate the Google Maps key** and restrict it to Android package `com.sixtech.tastyplates`
   + the **Play App Signing SHA-1** (from Play Console → Setup → App signing) + the upload key SHA-1
   (from `eas credentials`). APIs: Maps SDK for Android, Places API.
4. Rotate the admin MCP API key that was visible in local config.

## 2. EAS environment variables

Set per environment (`development`, `preview`, `production`):

```bash
eas env:create --environment production --name EXPO_PUBLIC_NHOST_SUBDOMAIN --value ... --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_NHOST_REGION --value ... --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_NHOST_FUNCTIONS_URL --value ... --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value ... --visibility sensitive
eas env:create --environment production --name EXPO_PUBLIC_WEB_ORIGIN --value https://tastyplates.co --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value ... --visibility plaintext
eas env:create --environment production --name SENTRY_ORG --value ... --visibility plaintext
eas env:create --environment production --name SENTRY_PROJECT --value ... --visibility plaintext
eas env:create --environment production --name SENTRY_AUTH_TOKEN --value ... --visibility secret
```

Sentry source-map upload only runs when `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` are
all set (see `app.config.js`); crash reporting only runs when `EXPO_PUBLIC_SENTRY_DSN` is set and the
build is not a dev build.

## 3. Identity changes

- **Google OAuth:** create an Android OAuth client for `com.sixtech.tastyplates` with both SHA-1s;
  update the Nhost Google provider if the web client changed.
- **Nhost redirect allow-list:** add the new app scheme / redirect URLs.
- **iOS:** the bundle ID is now `com.sixtech.tastyplates`, which means a **new App Store app** in Phase 2.

## 4. Backend deploy (tastyplates-nhost)

1. Merge to the deploy branch so these migrations apply:
   - `1789000000000_add_account_deletion`
   - `1789000100000_add_ugc_safety`
   Verify in the Hasura console that `user_profiles.deletion_scheduled_for`, `content_reports` and
   `user_blocks` exist. The migrations assume `user_profiles.user_id` is text-compatible and
   `auth.users.id` is uuid; check the first apply on a staging project.
2. **Cron trigger** (Hasura console → Events → Cron Triggers → Create):
   - Name: `purge_deleted_accounts`
   - Webhook: `{{NHOST_FUNCTIONS_URL}}/admin/purge-deleted-accounts`
   - Schedule: `0 3 * * *` (daily 03:00 UTC)
   - Header: `x-admin-secret` from env `NHOST_ADMIN_SECRET`
   - Payload: `{}`; retries 3
3. Smoke-test the functions with a test account: `restaurant-users/delete-restaurant-user`,
   `restaurant-users/restore-account`, `reports/create-report`, `blocks/block-user`,
   `admin/list-reports`, `admin/resolve-report`.

## 5. Web deploy (tastyplates-v2-1)

Deploy so these are public **before** submitting the Data safety form:
- https://tastyplates.co/privacy-policy (fill in the `[Address]` placeholder)
- https://tastyplates.co/terms-of-service
- https://tastyplates.co/content-guidelines
- https://tastyplates.co/account/delete

Have counsel review the updated Privacy Policy and Terms (PDPO / GDPR / CCPA wording).

## 6. Moderation operations

- Portal deploy includes `/api/mcp/list-reports` and `/api/mcp/resolve-report`; rebuild and restart
  `tastyplates-admin-mcp` so `list_reports` / `resolve_report` appear.
- Someone must check `list_reports` **at least daily**; Terms and Guidelines promise action within
  24 hours. `age_hours` on each report shows SLA status.

## 7. Play Console setup

### 7a. Account and app
- Developer account under **6ixTech** as an **organization** (D-U-N-S required). If only a personal
  account is available, the 12-tester / 14-day closed test is mandatory.
- Create app: name "TastyPlates", default language English, App, Free.
- **App signing:** let Google manage the app signing key (Play App Signing). EAS manages the upload
  key; back it up with `eas credentials` → Android → Download keystore and store it offline.
- **Service account for `eas submit`:** GCP → create service account → JSON key → Play Console
  → Users and permissions → invite with release permissions → upload the JSON with
  `eas credentials` → Android → Google Service Account. Never commit it (`play-service-account.json`
  is gitignored).

### 7b. Data safety form

| Data type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Name (display name / username) | Yes | No | No | Account management, app functionality |
| Email address | Yes | No | No | Account management |
| User IDs | Yes | No | No | Account management, app functionality |
| Date of birth, gender (Personal info → Other) | Yes | No | **Yes** | Personalisation |
| Approximate location (selected city, profile city) | Yes | No | Yes | App functionality |
| Photos | Yes | No | Yes | App functionality (review/profile photos) |
| Other user-generated content (reviews, comments, lists) | Yes | No | Yes | App functionality |
| App interactions (likes, follows, check-ins, saves) | Yes | No | Yes | App functionality, personalisation |
| Crash logs, diagnostics | Yes | No | No | App functionality (crash analysis) |

- Precise location: **not collected** (Android does not request location permission).
- Data encrypted in transit: **Yes**.
- Users can request deletion: **Yes** — in-app (Settings → Account Security → Delete Account) and
  `https://tastyplates.co/account/delete`.
- Service providers acting on our behalf (Nhost, AWS, Sentry, Google Maps Platform) are processing,
  not "sharing", under Play's definitions.

### 7c. Other declarations
- **Content rating (IARC):** category Social/Reference-style app with **user-generated content** and
  **users can interact** (comments, follows). No violence, gambling or purchases.
- **Target audience:** 13–15, 16–17, 18+ (not designed for children; no under-13 age band).
- **Ads:** No ads in the app.
- **App access:** provide a reviewer account that has already completed onboarding:
  email + password, and note "Sign in with email on the Get Started screen".
- **Government / financial / health:** none.

### 7d. Store listing
- Icon 512×512 PNG, feature graphic 1024×500, at least 2 phone screenshots (home feed, restaurant
  detail, write review, profile).
- Short description (≤80 chars) and full description (≤4000 chars).
- Category **Food & Drink**; support email; privacy policy URL `https://tastyplates.co/privacy-policy`.

## 8. Build and submit

```bash
eas build --platform android --profile production
eas submit --platform android --profile production   # internal track, draft release
```

Before promoting, confirm in the AAB (Play Console → App bundle explorer):
- package `com.sixtech.tastyplates`, `targetSdkVersion` 36
- permissions: `CAMERA`, `INTERNET` (plus Expo defaults); **no** `RECORD_AUDIO`,
  `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, or location

## 9. Rollout

1. **Internal testing** (team). Run this script on at least two devices:
   - [ ] Sign up with email and with Google; consent text and legal links open
   - [ ] Browse as guest; reporting prompts sign-in
   - [ ] Create a review with camera and gallery photos
   - [ ] Report a review, a comment, a profile and a list; reports appear in `list_reports`
   - [ ] Block a user: their reviews/comments disappear, follow is removed; unblock from Settings
   - [ ] `resolve_report` with `remove_content` hides the review in the app
   - [ ] Delete account → signed out; sign in again within 30 days → restore prompt works
   - [ ] Force a crash in a preview build with a DSN → event appears in Sentry with source maps
2. **Closed testing**: 12+ external testers for at least 14 consecutive days; fix every crash.
3. **Production**: staged rollout 10% → 50% → 100%, holding each step for 48h while crash-free
   sessions stay ≥ 99%.

**Exit criteria:** every 🔴 item in `publish-strat.md` Phases 0–1 closed, internal and closed tracks
green, crash-free sessions ≥ 99%.
