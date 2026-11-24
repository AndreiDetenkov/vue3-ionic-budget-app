# Personal Budget App

[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Ionic](https://img.shields.io/badge/Ionic-8.8-3880ff?logo=ionic&logoColor=white)](https://ionicframework.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.6-119eff?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-13-ffca28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Pinia](https://img.shields.io/badge/Pinia-4.1-ffd35b?logo=vuedotjs&logoColor=black)](https://pinia.vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-5.1-729b1a?logo=vitest&logoColor=white)](https://vitest.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-11-f69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

A cross-platform personal expense and budget tracking mobile application built with **Vue 3**, **Ionic Framework 8**, **Capacitor 8**, **Local-First storage (IndexedDB)**, and optional **Firebase** cloud sync.

Designed for mobile devices (Android & iOS) as well as the web, featuring clean hexagonal architecture, native gestures, customizable spending categories, and period-based reporting.

---

## Table of Contents

- [Features](#features)
- [Architecture & Design](#architecture--design)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Mobile Development (Capacitor)](#mobile-development-capacitor)
- [Available Scripts](#available-scripts)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Storage, Backup & Firebase Cloud Sync](#storage-backup--firebase-cloud-sync)
- [Documentation & ADRs](#documentation--adrs)

---

## Features

- 💳 **Transaction Tracking**: Log daily expenses with amount, title, date, and category. Quick overview of total expenses on the main dashboard.
- 📂 **Expense Categories**: Group spending by pre-defined categories with intuitive iconography (Food, Housing, Transportation, Health, Shopping, Entertainment, Education, Pets, Utilities, etc.).
- 📊 **Period Reports & Analytics**: Filter expenses across time horizons (Today, Week, Month, Year, Custom Range) with per-category totals and visual spending distributions.
- 💾 **Local-First Offline Storage**: Persists locally in IndexedDB (with `localStorage` fallback) and works out of the box without any backend setup.
- 📦 **JSON Backup & Restore**: Export/import snapshots via `BackupModal` with Last-Write-Wins merging (`updatedAt` / `deletedAt`) and native share/file access (`@capacitor/filesystem`, `@capacitor/share`).
- ☁️ **Optional Firebase Cloud Sync**: Google Sign-In (`@capacitor-firebase/authentication` on native, popup/redirect on web) with incremental Cloud Firestore delta-sync and allowlisted accounts.
- 📱 **Native Mobile Gestures**:
  - Pull-to-refresh on transaction feeds.
  - Swipe/slide gestures on list items to edit or delete transactions.
  - Native haptics and keyboard handling via Capacitor plugins.
- 🔔 **Programmatic Toast Feedback**: Clean toast notifications for user actions via the reusable `useToast` composable.
- 🎨 **Design System v2**: Modern visual design using semantic CSS variables and design tokens (`--ds-*`).

---

## Architecture & Design

The application follows modular and decoupled design principles:

### Domain-Storage Seam (Hexagonal Architecture)

Pinia setup stores (`transactionStore`, `categoryStore`, `reportStore`) interact with persistent storage solely through an abstract port interface: `BudgetStorage` (`src/core/storage/types.ts`).

- **Local-First & Cloud Sync Adapters (`createLocalStorage`, `createSyncedLocalStorage`)**: IndexedDB (`budget-app-db` v2 with `window.localStorage` fallback), UUID generation, `updatedAt`/`deletedAt` sync metadata, and 14 `DEFAULT_CATEGORIES`, wrapped by `createSyncedLocalStorage()` for background incremental delta-sync via `createFirebaseSyncService()` and `createFirebaseCloudController()` (`useFirebaseCloud()`). JSON backup export/import and Last-Write-Wins `mergeSnapshots` live in `src/core/storage/backup.ts`.
- **Testing Adapter (`createInMemoryStorage`)**: Fast, deterministic in-memory implementation injected via `setStorage()` (alongside `setFirebaseCloud()` for cloud test doubles) without network calls or Firebase credentials.

For details, refer to [ADR 0001: Domain Storage Seam](./docs/adr/0001-domain-storage-seam.md).

### Feature Modules

Code is organized by vertical feature modules under `src/modules/<feature>/`:

- `transactions`: Dashboard view, transaction lists, add transaction form, update modal, slide list items, and transaction store.
- `categories`: Category selection grid and category store.
- `reports`: Spending breakdown by category, period filter bar, report headers, and report store.

Shared utilities, components (`BaseHeader`, `BaseRefresher`, `BackupModal`), composables (`useToast`, `useCloudAutoSync`), and storage ports reside in `src/core/`.

---

## Tech Stack

| Layer                      | Technologies                                                                                                                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend Framework**     | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`), [Vue Router 5](https://router.vuejs.org/)                                                                                                                                                            |
| **Mobile UI & Components** | [Ionic Framework 8](https://ionicframework.com/) (`@ionic/vue`, `@ionic/vue-router`, [Ionicons 8](https://ionic.io/ionicons))                                                                                                                                         |
| **Mobile Runtime**         | [Capacitor 8](https://capacitorjs.com/) (Android & iOS runtime, `@capacitor/app`, `@capacitor/filesystem`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/share`, `@capacitor/status-bar`, `@capacitor-firebase/authentication`)                            |
| **State Management**       | [Pinia 4.1](https://pinia.vuejs.org/)                                                                                                                                                                                                                                 |
| **Storage & Cloud Sync**   | IndexedDB / `localStorage` (local-first), JSON backup, optional [Firebase 13](https://firebase.google.com/) (Cloud Firestore & Google Auth)                                                                                                                           |
| **Date & Time**            | [Day.js](https://day.js.org/)                                                                                                                                                                                                                                         |
| **Build Tool**             | [Vite 8.3](https://vitejs.dev/) (Rolldown) with tree-shaking & vendor chunk splitting                                                                                                                                                                                 |
| **Testing**                | [Vitest 5.1](https://vitest.dev/), [@vue/test-utils 2](https://test-utils.vuejs.org/), `jsdom` 31, and Node 24 Android Emulator E2E (`adb` + WebView CDP + `uiautomator`)                                                                                             |
| **Code Quality**           | [TypeScript 5.9](https://www.typescriptlang.org/), [ESLint 10](https://eslint.org/) (Flat Config), [Prettier](https://prettier.io/) (`@ionic/prettier-config`), [Husky](https://typicode.github.io/husky/), [lint-staged](https://github.com/lint-staged/lint-staged) |
| **Package Manager**        | [pnpm 11+](https://pnpm.io/) (Node.js 24)                                                                                                                                                                                                                             |

---

## Project Structure

```text
├── android/                   # Capacitor Android native project
├── ios/                       # Capacitor iOS native project
├── e2e/
│   └── android/
│       ├── specs/             # Android emulator E2E test scenarios (*.e2e.mjs)
│       └── lib/               # E2E runner, ADB/CDP driver, fixtures & helpers
├── docs/                      # Project documentation, design specs, and ADRs
│   ├── adr/                   # Architecture Decision Records
│   ├── agents/                # SDLC & agent skill bindings
│   ├── design/                # Design templates and screen specifications
│   ├── design-system.md       # Design system v2 token and component guidelines
│   └── features/              # Feature-specific architectural docs
├── src/
│   ├── assets/
│   │   ├── icons/             # Category PNG icons
│   │   └── theme/             # Design tokens (--ds-*) & Ionic variable mappings
│   ├── core/                  # Shared core domain & infrastructure
│   │   ├── components/        # BaseHeader, BaseRefresher, BackupModal
│   │   ├── composables/       # useToast, useCloudAutoSync
│   │   ├── storage/           # IndexedDB/localStorage, Firebase delta-sync, JSON backup & InMemory adapters
│   │   └── utils/             # Amount formatting, date intervals, category icons
│   ├── modules/               # Feature-based domain modules
│   │   ├── categories/        # Category components, types & store
│   │   ├── reports/           # Report views, period filters, types & store
│   │   └── transactions/      # Transaction views, forms, modals & store
│   ├── views/                 # Root tab layout (TabsPage.vue)
│   ├── App.vue                # Root application component
│   ├── main.ts                # App entrypoint (Ionic & Pinia bootstrapping)
│   └── router.ts              # Route declarations & lazy-loaded tabs
├── firebase.json              # Firebase config (local .firebaserc and firestore.rules are gitignored)
├── firestore.indexes.json     # Firestore composite index definitions
├── capacitor.config.ts        # Capacitor configuration
├── vite.config.ts             # Vite build & chunking configuration
├── AGENT.md                   # Agentic workflow & coding assistant guidelines
└── GLOSSARY.md                # Domain terminology and ubiquitous language
```

---

## Prerequisites

- **Node.js**: `^24.x` (managed via [.nvmrc](./.nvmrc))
- **pnpm**: `^11.x`
- **Android Studio** (optional, for Android native testing/building)
- **Firebase Project** (optional — app runs autonomously in local-first mode; only needed for Cloud Firestore sync & Google Sign-In)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/AndreiDetenkov/vue3-ionic-budget-app.git
cd vue3-ionic-budget-app
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables (optional)

Local-first mode works out of the box with no `.env` file. If you want Firebase Cloud Sync, copy the example environment file and fill it with the **web app** config from Firebase Console → Project settings → General → Your apps → Web app (`</>`) → SDK setup and configuration → Config:

```bash
cp .env.example .env
```

```ini
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
# Comma-separated Google accounts allowed to sign in and sync
VITE_FIREBASE_ALLOWED_EMAILS=
```

> **Note**: `.env` is gitignored. Vite bakes these values into the build, so set them before `pnpm build`.

### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Use mobile device emulation in browser DevTools for the best experience.

---

## Mobile Development (Capacitor)

The mobile workflow uses [Capacitor](https://capacitorjs.com/) to package the Vite web application into the native Android project.

### Android

1. Build web assets:
   ```bash
   pnpm build
   ```
2. Sync web bundle with the Android project:
   ```bash
   pnpm sync
   ```
3. Open project in Android Studio:
   ```bash
   pnpm open
   ```
4. Run on an Android emulator or connected device with live reload:
   ```bash
   pnpm run:android
   ```

### Google Sign-In on Android (new machine checklist)

Inside the Capacitor WebView, Firebase web `signInWithPopup` / `signInWithRedirect` cannot work (error: _"Unable to process request due to missing initial state"_). On native platforms the app uses `@capacitor-firebase/authentication` to get a Google ID token natively, then signs in to the Firebase JS SDK with `signInWithCredential` (see `src/core/storage/firebaseClient.ts`). This requires:

1. **`android/app/google-services.json`** — gitignored, must be restored manually. Download it from Firebase Console → Project settings → General → Your apps → Android app `com.budget.app`. Without it the build succeeds but native Google Sign-In fails.
2. **Release keystore `budget-app-keystore`** (repo root, gitignored) plus its password and alias. Keep a backup. A new keystore means a new SHA-1 (see step 3), and Google Play will reject updates signed with a different key.
3. **SHA-1 of the signing key registered** in the Firebase Android app (Project settings → Android app → Add fingerprint). Current release SHA-1:
   ```
   FF:65:73:C9:04:1B:12:60:0B:01:3C:09:04:C6:71:06:F9:27:94:91
   ```
   To read the SHA-1 of any signed APK (no keystore password needed):
   ```bash
   ~/Library/Android/sdk/build-tools/<version>/apksigner verify --print-certs android/app/release/app-release.apk
   ```
   For debug builds also add the debug key SHA-1 (`~/.android/debug.keystore`, password `android`), which is different on every machine.
4. **Google provider enabled** in Firebase Console → Authentication → Sign-in method.

If sign-in fails with `DEVELOPER_ERROR` / code 10, the SHA-1 of the APK's signing key is not registered in Firebase (or `google-services.json` is outdated).

---

## Available Scripts

| Command              | Description                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`           | Starts the Vite development server with HMR                            |
| `pnpm build`         | Compiles production web bundle into `dist/`                            |
| `pnpm preview`       | Locally previews production build                                      |
| `pnpm test:unit`     | Starts Vitest in watch mode                                            |
| `pnpm test:unit run` | Runs Vitest test suite once                                            |
| `pnpm test:android`  | Runs isolated Android emulator E2E suite on `Pixel_9` (`adb` + CDP)    |
| `pnpm typecheck`     | Type-checks code with `vue-tsc -b --noEmit`                            |
| `pnpm lint`          | Runs ESLint with auto-fix on `src/`                                    |
| `pnpm format`        | Formats source files using Prettier                                    |
| `pnpm sync`          | Runs `ionic capacitor sync android`                                    |
| `pnpm open`          | Opens Android Studio for the native Android project                    |
| `pnpm run:android`   | Runs on Android emulator with live reload                              |
| `pnpm release`       | Creates a release via `changelogen` (version bump, changelog, git tag) |

---

## Testing & Quality Assurance

### Unit Tests

Unit tests are written using [Vitest](https://vitest.dev/) and [@vue/test-utils](https://test-utils.vuejs.org/), residing next to the source code (`*.spec.ts`):

```bash
# Run all unit tests once
pnpm test:unit run

# Run a specific test file
pnpm test:unit src/modules/transactions/store/transactionStore.spec.ts

# Filter tests by name
pnpm test:unit -t "calculates total"
```

### Android Emulator E2E Tests

End-to-end tests drive the real Capacitor Android WebView and native Android dialogs (`ChooserActivity`, `DocumentsUI`) on an Android emulator using Node 24 (`adb`, WebView CDP, and `uiautomator`), with zero external test runner dependencies.

- **Prerequisites**: Android SDK (`adb`, `emulator`), an AVD (default `Pixel_9`, override via `ANDROID_AVD=<name>`, or target an emulator with `ANDROID_SERIAL=<serial>`), and a JDK (`JAVA_HOME` or Android Studio JBR) for building the debug APK.
- **Isolation & Safety**: Refuses non-emulator USB devices by default (`ANDROID_E2E_ALLOW_DEVICE=1` to override), clears app state (`pm clear com.budget.app`), uses generated JSON fixtures only (never signs in or touches production Firebase), audits `logcat` / JS exceptions / Firestore requests, and cleans up temporary downloads and app data afterward.

```bash
# Full run: boot Pixel_9 if needed, build + sync + assembleDebug, install, and run E2E suite
pnpm test:android

# Fast iteration when APK is already built and installed
pnpm test:android -- --skip-build --skip-install

# Run one or more specific E2E specs by name
pnpm test:android -- --skip-build --skip-install reports
pnpm test:android -- --skip-build --skip-install reports backup
```

### Type Checking & Linting

```bash
# Typecheck
pnpm typecheck

# Lint with ESLint
pnpm lint

# Format with Prettier
pnpm format
```

Pre-commit hooks are configured via **Husky** and **lint-staged** to automatically lint, format, and typecheck staged files prior to each commit.

---

## Storage, Backup & Firebase Cloud Sync

### Local-First Storage

The app stores all data locally in IndexedDB database `budget-app-db` (version 2) across `snapshots` and `sync_cursors` object stores (falling back to `window.localStorage` when IndexedDB is unavailable), seeded with 14 built-in categories (`DEFAULT_CATEGORIES`).

### JSON Backup

Users can export and import full JSON snapshots via `BackupModal` (`src/core/storage/backup.ts`). Imports merge records using Last-Write-Wins (`updatedAt`) and preserve soft-delete tombstones (`deletedAt`).

### Cloud Firestore Collections (Optional Sync)

When signed in with Google, `createFirebaseSyncService()` incrementally syncs deltas with Cloud Firestore across two collections:

1. **`categories`**:
   - `id` (string, UUID)
   - `title` (string)
   - `icon` (string, nullable)
   - `updatedAt` (string, ISO 8601 timestamp)
   - `deletedAt` (string, nullable ISO 8601 timestamp)
2. **`transactions`**:
   - `id` (string, UUID)
   - `name` (string, transaction description/title)
   - `value` (number, expense amount)
   - `categoryId` (string, references `categories.id`)
   - `createdAt` (string, ISO 8601 timestamp)
   - `updatedAt` (string, ISO 8601 timestamp)
   - `deletedAt` (string, nullable ISO 8601 timestamp)

Physical deletes are disabled in favor of `deletedAt` tombstones, and backend access is restricted via local gitignored `firestore.rules` and `.firebaserc` alongside `VITE_FIREBASE_ALLOWED_EMAILS`.

---

## Documentation & ADRs

- [GLOSSARY.md](./GLOSSARY.md) — Ubiquitous domain language and terminology definitions.
- [AGENT.md](./AGENT.md) — Development guidelines, conventions, and agent workflow specifications.
- [docs/agents/sdlc.md](./docs/agents/sdlc.md) — SDLC workflow phases and agent skill bindings.
- [docs/adr/0001-domain-storage-seam.md](./docs/adr/0001-domain-storage-seam.md) — Architecture Decision Record on domain-storage seam.
- [docs/design-system.md](./docs/design-system.md) — Design system v2 tokens, layout rules, and component audit.
- [docs/features/toast-notifications.md](./docs/features/toast-notifications.md) — Programmatic toast notification system architecture.
