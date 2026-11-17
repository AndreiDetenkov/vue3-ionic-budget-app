# AGENT.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal budget tracker: Vue 3 + Ionic 8 + Capacitor 8 (Android/iOS), Local-First storage (IndexedDB / `localStorage` with JSON backup & CSV import). Package manager is **pnpm** (Node 24, pnpm 11).

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

No backend environment variables are required in production — the application runs autonomously with local device storage.

## Architecture

- **Routing** (`src/router.ts`): Ionic tab layout (`src/views/TabsPage.vue`) with three lazy-loaded tabs: `/tabs/transactions`, `/tabs/reports`, `/tabs/add`. Pages use Ionic lifecycle hooks (e.g. `onIonViewWillEnter`) to load data, not `onMounted`, because Ionic keeps tab pages alive.
- **Feature modules** (`src/modules/<feature>/`): `transactions`, `categories`, `reports`. Each has `store/`, `components/`, `views/`, `types.ts` and an `index.ts` barrel that re-exports domain types and stores. Import from `@/modules/<feature>` (`@` maps to `src/`).
- **Storage seam & data flow** (`src/core/storage/`): Pinia **setup stores** access persistence through the
  `BudgetStorage` port via `useStorage()` (see `docs/adr/0001-domain-storage-seam.md` and `docs/CAPABILITY-MAP.md`).
  Default `activeStorage` uses `createLocalStorage()` (`src/core/storage/localStorage.ts`), which provides local-first
  persistence via IndexedDB (with `window.localStorage` fallback), UUID generation, sync metadata (`updatedAt`,
  soft-delete `deletedAt`), snapshot access (`getSnapshot`/`replaceSnapshot`), and `DEFAULT_CATEGORIES`
  (`src/core/storage/defaultCategories.ts`). `src/core/storage/backup.ts` provides Last-Write-Wins JSON backup
  export/import (`mergeSnapshots`, `exportBackupJson`, `importBackupJson`) and CSV transactions import
  (`parseTransactionsCsv`, `importTransactionsCsv`).
  Tests inject `createInMemoryStorage(seed)` (`src/core/storage/inMemoryStorage.ts`) or `createLocalStorage()` via `setStorage()`.
- **Shared code** (`src/core/`): `BaseHeader`/`BaseRefresher`/`BackupModal` components, the `useToast` composable (programmatic `toastController` with `showErrorToast`/`showSuccessToast`, see `docs/features/toast-notifications.md`; use it instead of `<ion-toast>` in templates), and utils for dayjs date ranges and amount formatting.
- **Build**: `vite.config.ts` splits vendor chunks (vue, ionic, dayjs).

## Conventions

- Prettier config is `@ionic/prettier-config`. ESLint uses flat config (`eslint.config.ts`) with `vue/no-deprecated-slot-attribute` off, because Ionic uses the `slot="..."` attribute.
- **Verification**: after code changes run `pnpm typecheck`, `pnpm lint` and `pnpm format`. A husky pre-commit hook runs
  lint-staged (eslint --fix + prettier on staged files) and `pnpm typecheck`. A Claude Code Stop hook
  (`.claude/hooks/verify.sh`) runs the same checks when there are uncommitted changes and blocks until they pass.
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
