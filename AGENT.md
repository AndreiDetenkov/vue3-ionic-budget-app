# AGENT.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal budget tracker: Vue 3 + Ionic 8 + Capacitor 8 (Android/iOS), Local-First storage (IndexedDB / `localStorage` with JSON backup and optional Firebase Firestore incremental delta-sync via Google Sign-In). Package manager is **pnpm** (Node 24, pnpm 11).

## Commands

```bash
pnpm dev                 # Vite dev server
pnpm build               # vite build, no type check (output: dist/, used as Capacitor webDir)
pnpm typecheck           # vue-tsc -b --noEmit (solution tsconfig: tsconfig.app.json + tsconfig.node.json)
pnpm lint                # eslint with --fix on src/
pnpm format              # prettier --write src/
pnpm test:unit           # vitest (watch mode by default)
pnpm test:unit run       # single run
pnpm test:unit src/modules/transactions/store/transactionStore.spec.ts   # single file
pnpm test:unit -t "returns 0"                                            # single test by name

pnpm sync                # ionic capacitor sync android (run after a web build)
pnpm run:android         # run on Pixel_9 emulator with live reload
pnpm release             # changelogen: bump version, update CHANGELOG.md, tag and push
```

Vitest runs in `jsdom` with `globals: true`. Specs sit next to the code (`*.spec.ts`).

## Environment

The application runs autonomously in local-first mode with no required environment variables. For Firebase Cloud Sync, configure `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, and `VITE_FIREBASE_ALLOWED_EMAILS` in a gitignored `.env` file (see `.env.example`), plus your local gitignored `.firebaserc` and `firestore.rules`. Cloud sync access is locked down on the backend in Firestore Security Rules.

## Architecture

- **Routing** (`src/router.ts`): Ionic tab layout (`src/views/TabsPage.vue`) with three lazy-loaded tabs: `/tabs/transactions`, `/tabs/reports`, `/tabs/add`. Pages use Ionic lifecycle hooks (e.g. `onIonViewWillEnter`) to load data, not `onMounted`, because Ionic keeps tab pages alive.
- **Feature modules** (`src/modules/<feature>/`): `transactions`, `categories`, `reports`. Each has `store/`, `components/`, `views/`, `types.ts` and an `index.ts` barrel that re-exports domain types and stores. Import from `@/modules/<feature>` (`@` maps to `src/`).
- **Storage seam & data flow** (`src/core/storage/`): Pinia **setup stores** access persistence through the
  `BudgetStorage` port via `useStorage()` (see `docs/adr/0001-domain-storage-seam.md`).
  Default `activeStorage` wraps `createLocalStorage()` (IndexedDB with
  `window.localStorage` fallback, UUID generation, sync metadata `updatedAt`/`deletedAt`, snapshot access
  `getSnapshot`/`replaceSnapshot`, and `DEFAULT_CATEGORIES`) inside `createSyncedLocalStorage()`
  (`src/core/storage/firebaseSync.ts`), triggering non-blocking background delta-sync after mutations when signed in.
  `src/core/storage/firebaseClient.ts` lazily initializes Firebase Auth (`GoogleAuthProvider` popup + redirect fallback)
  and `createFirestoreRemoteAdapter()` behind `useFirebaseCloud()`. `src/core/storage/backup.ts` provides
  Last-Write-Wins JSON backup export/import (`mergeSnapshots`, `exportBackupJson`, `importBackupJson`).
  Tests inject `createInMemoryStorage(seed)` (`src/core/storage/inMemoryStorage.ts`) or `createLocalStorage()` via
  `setStorage()`, and test doubles via `setFirebaseCloud()`.
- **Shared code** (`src/core/`): `BaseHeader`/`BaseRefresher`/`BackupModal` (with Google Sign-In, Sync Now, Sign out, and JSON backup) components, the `useToast` composable (programmatic `toastController` with `showErrorToast`/`showSuccessToast`, see `docs/features/toast-notifications.md`; use it instead of `<ion-toast>` in templates), and utils for dayjs date ranges and amount formatting.
- **Build**: `vite.config.ts` splits vendor chunks (`vue-vendor`, `ionic-vendor`, `utils`, `firebase-vendor`).

## Conventions

- Prettier config is `@ionic/prettier-config`. ESLint uses flat config (`eslint.config.ts`) with `vue/no-deprecated-slot-attribute` off, because Ionic uses the `slot="..."` attribute.
- **Verification**: after code changes run `pnpm typecheck`, `pnpm lint` and `pnpm format`. A husky pre-commit hook runs
  lint-staged (eslint --fix + prettier on staged files) and `pnpm typecheck`.
- Commits follow Conventional Commits (`feat:`, `refactor:`, `chore(release):`); changelogen builds `CHANGELOG.md` from them.
- **Native versions are synced by hand.** `pnpm release` only bumps `package.json`. After a release, set the same
  version in `android/app/build.gradle` (`versionName`) and `ios/App/App.xcodeproj/project.pbxproj`
  (`MARKETING_VERSION`, Debug and Release).
- Vue/Pinia guidance for agents is in `.agents/skills/` (vue-best-practices, vue-pinia-best-practices, vue-testing-best-practices, vue-debug-guides).

## Agent skills

### SDLC workflow

Start every task with `using-agent-skills` to route work through its **Skill Discovery** tree and **Lifecycle Sequence** (`interview-me` / `idea-refine` / `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` + `test-driven-development` → `code-review-and-quality` → `code-simplification` → `git-workflow-and-versioning` + `pr`), applying this repository's skill bindings. See `docs/agents/sdlc.md`.

### Issue tracker

Issues, specs, implementation plans, and task breakdowns live exclusively in GitHub Issues (`AndreiDetenkov/vue3-ionic-budget-app`) via the `gh` CLI — keep them out of local repo files (`tasks/`, `docs/specs/`). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` and `docs/adr/` at the repo root). See `docs/agents/domain.md`.
