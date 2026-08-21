# MiniMart Cashier — Desktop

Windows desktop equivalent of the Android cashier tablet (`android/`). Same
offline-first design: a local SQLite cache of the product catalog and
worker balances, sales queued locally the moment they're confirmed, and a
background + manual sync that flushes the queue to the FastAPI backend.

Talks to the same `/api/mobile/v1/cashier/*` endpoints the Android app
uses, and authenticates as the same fixed device identity (`ADMIN001` /
`0000`) — no per-cashier login, matching the tablet.

## Differences from the Android app

- **Catalog-first flow, not worker-first.** The Android tablet gates the
  whole screen behind a worker lookup before showing any products. The
  desktop till instead shows the product catalog immediately on launch —
  the cashier rings up items into the cart first, and only enters the
  Employee ID being charged when they tap "Confirm Sale" at the end,
  matching how a real register works (ring up, then take payment).
- **Manual sync button** in the top bar shows the count of unsynced
  transactions and lets the cashier trigger a sync on demand (not just on
  the background timer). A dropdown panel lists every transaction with its
  status (pending/synced/failed) and, on failure, the server's error.
- No bundled seed data — a brand-new install with zero connectivity shows
  an empty catalog until it can reach the server once (Android ships a
  starter JSON for this; we didn't need that here since these are managed
  installs, not field tablets).
- **Top Up button** in the top bar lets the cashier credit a worker's
  balance with cash received on the spot, instead of sending them to the
  admin web app. Looks the worker up in the locally cached directory, then
  calls the existing `POST /api/admin/workers/{id}/topup` endpoint
  directly — the till's device identity (`ADMIN001`) already has the
  `admin` role, so no new backend endpoint was needed. Unlike sales,
  top-ups are **not** queued for offline sync: they require a live
  connection, since silently double-crediting a balance after a dropped
  connection is a worse failure mode than telling the cashier to try
  again once online.

## Local dev

```
cd desktop-app
npm install
npm run tauri:dev
```

Requires the Rust toolchain (`rustup`) in addition to Node — Tauri builds
a native binary via Cargo. To point at a different backend than the
hardcoded server IP (`76.13.19.246:8000`), set `VITE_API_BASE_URL` in a
`.env` file before running dev/build, and also update the CSP allowlist
in `src-tauri/tauri.conf.json` (`connect-src`) and the HTTP capability
scope in `src-tauri/capabilities/default.json` to match.

## Building the Windows .exe

Cross-compiling a Windows installer from macOS isn't practical with Tauri
(it needs Windows-specific linking). Two options:

1. **CI (recommended)**: push to `main` with changes under `desktop-app/`,
   or run the "Build Desktop App (Windows)" GitHub Actions workflow
   manually. It builds on a `windows-latest` runner and uploads the NSIS
   `.exe` installer as a workflow artifact.
2. **On a Windows machine**: install Node + Rust (`rustup`), then
   `npm install && npm run tauri:build`. The installer lands in
   `src-tauri/target/release/bundle/nsis/`.

## Icons

`src-tauri/icons/` currently has placeholder icons (solid blue square).
Regenerate with `npx tauri icon path/to/logo.png` once real branding is
available.
