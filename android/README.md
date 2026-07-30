# MiniMart Field (Android)

Native Android client for workers to place mini-mart orders on-site, with
or without internet. It talks to the same FastAPI backend as the web app,
through new `/api/mobile/v1/*` endpoints — see [../docs/mobile-api.md](../docs/mobile-api.md).

## Architecture

```
Compose UI  →  ViewModel  →  Repository  →  Room (local DB)
                                   ↓
                            Retrofit (when online)
                                   ↓
                        FastAPI /api/mobile/v1/*
```

Orders are always written to Room first (`SyncStatus.PENDING`). A
`WorkManager` job (`SyncWorker`) uploads pending/failed orders whenever a
network is available, either on a 15-minute periodic schedule or
immediately via the "Sync Now" button. Every order carries a
device-generated `client_record_id`; the server treats it as an
idempotency key, so retried uploads never create duplicate orders.

## Project layout

- `data/local/` — Room entities (`ProductEntity`, `OrderEntity`), DAOs, `AppDatabase`.
- `data/remote/` — Retrofit `ApiService`, DTOs, auth interceptor.
- `data/Repository.kt` — single source of truth for the UI; owns Room + Retrofit.
- `data/TokenStore.kt` — JWT storage via `EncryptedSharedPreferences` (Android Keystore-backed).
- `sync/SyncWorker.kt` — background upload of queued orders.
- `ui/` — Compose screens: login, dashboard, order form, order list (Pending/Synced/Failed tabs).

## Requirements

- Android Studio Ladybug (2024.2) or newer
- JDK 17
- Android SDK 35, min SDK 26

## Build

Open the `android/` folder in Android Studio, let it sync, then:

```bash
# Debug APK (uses http://10.0.2.2:8000 — the emulator's alias for your
# host machine's localhost — and allows cleartext HTTP for local testing)
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk

# Release APK (uses the production HTTPS URL in build.gradle.kts)
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

### Pointing at your real server

`release` builds point at `http://76.13.19.246:8000/` — the Hostinger VPS,
plain HTTP, matching how the backend runs today. For the `debug` build type,
`10.0.2.2` only works from the Android **emulator**; on a physical test
device use your machine's LAN IP, e.g. `http://192.168.1.20:8000/`.

**TEMPORARY: cleartext (HTTP) is currently allowed in release builds too.**
This was a deliberate short-term call because the Hostinger backend doesn't
have TLS yet and QQ Browser/UC Browser were blocking the web app on Chinese
phones, so shipping the APK now took priority. It means the login PIN and
session token travel unencrypted over the network — acceptable for a
same-site/local-network stopgap, not for the open internet long-term.

**Follow-up (do this soon):** provision HTTPS on Hostinger (Let's Encrypt
via nginx is the usual route), then:
1. Change `API_BASE_URL` in the `release` block of `app/build.gradle.kts` to `https://your-domain/`
2. Set `CLEARTEXT_ALLOWED`/`manifestPlaceholders["cleartextAllowed"]` back to `"false"` in that same block
3. Rebuild and redistribute the APK

## Signing a release build

1. Generate a keystore once (keep it somewhere safe — losing it means you
   can never update the app under the same package again):
   ```bash
   keytool -genkey -v -keystore minimart-release.keystore \
     -alias minimart -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Create `android/keystore.properties` (this file is git-ignored, never
   commit it or the `.keystore` file):
   ```properties
   storeFile=/absolute/path/to/minimart-release.keystore
   storePassword=********
   keyAlias=minimart
   keyPassword=********
   ```
3. `./gradlew assembleRelease` now produces a signed APK automatically. If
   `keystore.properties` is absent, the release build compiles unsigned
   (useful for CI dry-runs) — you must sign it manually before distributing.

Future updates: reuse the **same** keystore/alias, just bump `versionCode`
in `app/build.gradle.kts`.

## Installing the APK manually

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
Or copy the APK to the device and open it (enable "Install unknown apps"
for the file manager / browser used to open it).

## Manual testing checklist

- [ ] Login with valid employee ID/PIN succeeds; invalid PIN shows an error
- [ ] Turn off Wi-Fi/data, submit an order → appears under "Pending"
- [ ] Turn network back on, tap "Sync Now" → order moves to "Synced"
- [ ] Kill the app while an order is Pending, reopen → order still there
- [ ] Submit two orders offline, go online, sync → both appear as distinct orders on the server (no dupes)
- [ ] Re-run sync on an already-synced order (e.g. by forcing a retry) → server does not create a duplicate (`client_record_id` idempotency)
- [ ] Stop the backend, tap "Sync Now" → order moves to "Failed" with a readable error, not a crash
- [ ] Reboot the device with a Pending order queued → periodic WorkManager sync eventually uploads it without opening the app
- [ ] Logout clears the token; app returns to Login screen
