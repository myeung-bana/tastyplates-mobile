# TastyPlates Mobile — Compile & Build Commands

Commands for building the Expo / React Native app locally and via EAS. Run all commands from the `tastyplates-mobile` directory unless noted.

---

## Prerequisites

```bash
cd tastyplates-mobile
npm ci
```

Copy environment variables before building:

```bash
cp .env.example .env
# Fill EXPO_PUBLIC_NHOST_* and EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
```

For **EAS cloud builds**, set the same `EXPO_PUBLIC_*` values in the Expo project (Expo dashboard → Environment variables / Secrets). Release builds do not use your local `.env` unless configured in EAS.

Install EAS CLI (cloud builds):

```bash
npm install -g eas-cli
eas login
```

---

## Development (Metro)

Start the dev server (Expo Go or dev client):

```bash
npm start
# or, after changing .env:
npx expo start -c
```

This project uses a **development client** (`expo-dev-client`), not Expo Go alone, for native modules (maps, etc.).

---

## Local native builds (device / simulator)

Compiles and installs on a connected device or emulator. Requires native tooling on your machine.

### Android

Requires Android Studio, SDK, and `JAVA_HOME` (the `npm run android` script sets common macOS paths automatically).

```bash
npm run android
# equivalent:
npx expo run:android
```

Optional flags:

```bash
npx expo run:android --device
npx expo run:android --variant release
```

### iOS (macOS only)

Requires Xcode and CocoaPods.

```bash
npm run ios
# equivalent:
npx expo run:ios
```

Optional flags:

```bash
npx expo run:ios --device
npx expo run:ios --configuration Release
```

First iOS run may need:

```bash
cd ios && pod install && cd ..
```

---

## EAS cloud builds (recommended for store / QA)

Profiles are defined in [`eas.json`](../eas.json). No local Android Studio or Xcode is required for these.

### Android

```bash
# Development client (internal distribution, dev client enabled)
eas build --platform android --profile development

# Internal preview APK
eas build --platform android --profile preview

# Production AAB (Google Play)
eas build --platform android --profile production
```

### iOS

```bash
# Development client
eas build --platform ios --profile development

# Internal preview
eas build --platform ios --profile preview

# Production (App Store)
eas build --platform ios --profile production
```

### Both platforms

```bash
eas build --platform all --profile production
```

---

## Export to Apple Developer (App Store Connect)

Use this flow when you want a **new iOS build uploaded to App Store Connect** (TestFlight or App Store review).

### One-time Apple setup

1. **Apple Developer Program** — app registered with bundle ID `com.bana.tastyplates-dev` ([`app.json`](../app.json)).
2. **App Store Connect** — create the TastyPlates app record (if it does not exist yet).
3. **EAS credentials** — let EAS manage signing on first iOS build, or configure in Expo dashboard → Credentials.
4. **(Recommended) App Store Connect API key** for non-interactive submit:
   - [App Store Connect → Users and Access → Keys](https://appstoreconnect.apple.com/access/integrations/api)
   - Create a key with **App Manager** (or Admin) role; download the `.p8` file once.
   - Store in EAS: `eas credentials` → iOS → App Store Connect API key, or set in Expo project secrets.

Optional: add your App Store Connect app ID to [`eas.json`](../eas.json) under `submit.production.ios` when you know it:

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"
    }
  }
}
```

Find **ascAppId** in App Store Connect → App → App Information → **Apple ID** (numeric).

### Before each release

Bump version in [`app.json`](../app.json) when shipping a new user-facing version:

- `expo.version` — marketing version (e.g. `1.1.2`)
- `expo.runtimeVersion` — keep in sync if you use EAS Update
- `expo.ios.buildNumber` — must increase for every App Store upload

The `production` profile has `"autoIncrement": true`, so EAS can bump the build number automatically on cloud builds. You still need to bump `expo.version` manually when releasing a new version to users.

Ensure `EXPO_PUBLIC_*` env vars are set in **Expo project → Environment variables** for the `production` profile.

### Build and upload (recommended)

Build on EAS, then submit the resulting `.ipa` to App Store Connect in one session:

```bash
eas build --platform ios --profile production --auto-submit
```

Or as two explicit steps:

```bash
# 1. Cloud build (store-signed IPA)
eas build --platform ios --profile production

# 2. Upload latest production iOS build to App Store Connect
eas submit --platform ios --profile production --latest
```

Submit a **specific** build (from the EAS build list):

```bash
eas submit --platform ios --profile production --id BUILD_ID
```

Replace `BUILD_ID` with the ID from `eas build:list` or the Expo dashboard build page.

### After upload

1. Open [App Store Connect](https://appstoreconnect.apple.com/) → **TestFlight** — processing usually takes 5–15 minutes.
2. Add internal/external testers, or attach the build to an **App Store** version for review.
3. Fill export compliance (encryption) — `ITSAppUsesNonExemptEncryption: false` is already set in `app.json`.

### Alternative: local archive + upload (macOS + Xcode)

If you built locally with Release configuration:

```bash
npx expo run:ios --configuration Release --device
```

Then in Xcode: **Product → Archive → Distribute App → App Store Connect → Upload**.

Or upload an existing `.ipa` with EAS:

```bash
eas submit --platform ios --path /path/to/TastyPlates.ipa
```

Or use Apple’s **Transporter** app (Mac App Store) and drag the `.ipa` onto App Store Connect.

---

## Store submission (Google Play + iOS)

### Android (Google Play)

```bash
eas submit --platform android --profile production
```

### iOS (App Store Connect)

```bash
eas submit --platform ios --profile production --latest
```

See **Export to Apple Developer** above for the full iOS release workflow.

---

## Build profiles summary

| Profile       | Dev client | Distribution | Typical use                          |
|---------------|------------|--------------|--------------------------------------|
| `development` | Yes        | Internal     | Day-to-day dev on physical devices   |
| `preview`     | No         | Internal     | QA / stakeholder builds              |
| `production`  | No         | Store        | Play Store / App Store release       |

---

## App identifiers (reference)

From [`app.json`](../app.json):

| Platform | Identifier |
|----------|------------|
| Android  | `com.bana.tastyplates.dev` |
| iOS      | `com.bana.tastyplates-dev` |

Version: `1.1.1` (see `expo.version` / `ios.buildNumber` / `android.versionCode` in `app.json`).

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| Stale env after editing `.env` | `npx expo start -c` |
| Android `JAVA_HOME` error | Install Android Studio or `brew install openjdk@17`; use `npm run android` (sets `JAVA_HOME` on macOS) |
| Native project out of date | `npx expo prebuild --clean` then re-run `expo run:ios` / `expo run:android` |
| EAS build missing API keys | Add `EXPO_PUBLIC_*` vars in Expo project secrets for the matching profile |
| iOS submit asks for Apple ID every time | Configure App Store Connect API key in EAS credentials |
| “Build number already used” on iOS | Increment `expo.ios.buildNumber` in `app.json`, or rely on `autoIncrement` on the production profile |
| Upload stuck “Processing” in TestFlight | Wait 15–30 min; check email from Apple for compliance or signing issues |

See also [Architecture.md](./Architecture.md) (Build targets) and [Product_plan.md](./Product_plan.md).
