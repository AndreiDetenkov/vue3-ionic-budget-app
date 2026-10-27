# Personal Budget App

[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Ionic](https://img.shields.io/badge/Ionic-8.8-3880ff?logo=ionic&logoColor=white)](https://ionicframework.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.5-119eff?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![Pinia](https://img.shields.io/badge/Pinia-4.0-ffd35b?logo=vuedotjs&logoColor=black)](https://pinia.vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-5.0-729b1a?logo=vitest&logoColor=white)](https://vitest.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-11-f69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

A cross-platform personal expense and budget tracking mobile application built with **Vue 3**, **Ionic Framework 8**, **Capacitor 8**, and **Supabase**.

Designed for mobile devices (Android & iOS) as well as the web, featuring clean hexagonal architecture, native gestures, customizable spending categories, and period-based reporting.

---

## Table of Contents

- [Features](#features)
- [Architecture & Design](#architecture--design)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Mobile Development (Capacitor)](#mobile-development-capacitor)
- [Available Scripts](#available-scripts)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Database & Supabase Integration](#database--supabase-integration)
- [Documentation & ADRs](#documentation--adrs)

---

## Features

- 💳 **Transaction Tracking**: Log daily expenses with amount, title, date, and category. Quick overview of total expenses on the main dashboard.
- 📂 **Expense Categories**: Group spending by pre-defined categories with intuitive iconography (Food, Housing, Transportation, Health, Shopping, Entertainment, Education, Pets, Utilities, etc.).
- 📊 **Period Reports & Analytics**: Filter expenses across time horizons (Today, Week, Month, Year, Custom Range) with per-category totals and visual spending distributions.
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

- **Production Adapter (`SupabaseStorage`)**: Uses `@supabase/supabase-js` to communicate with Supabase PostgREST endpoints. Encapsulates lazy environment variable validation, camelCase ↔ snake_case mapping, and error normalization.
- **Testing / Mock Adapter (`InMemoryStorage`)**: Fast, in-memory implementation seeded with test fixtures. Enables 100% deterministic unit testing without network mocks or Supabase credentials.

For details, refer to [ADR 0001: Domain Storage Seam](./docs/adr/0001-domain-storage-seam.md).

### Feature Modules

Code is organized by vertical feature modules under `src/modules/<feature>/`:

- `transactions`: Dashboard view, transaction lists, add transaction form, update modal, slide list items, and transaction store.
- `categories`: Category selection grid and category store.
- `reports`: Spending breakdown by category, period filter bar, report headers, and report store.

Shared utilities, components (`BaseHeader`, `BaseRefresher`), composables (`useToast`), and storage ports reside in `src/core/`.

---

## Tech Stack

| Layer                      | Technologies                                                                                                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend Framework**     | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)                                                                                                                                                                                                      |
| **Mobile UI & Components** | [Ionic Framework 8](https://ionicframework.com/) (`@ionic/vue`, `@ionic/vue-router`, [Ionicons 8](https://ionic.io/ionicons))                                                                                                                                        |
| **Mobile Runtime**         | [Capacitor 8](https://capacitorjs.com/) (Android & iOS runtime, `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/status-bar`)                                                                                                              |
| **State Management**       | [Pinia 4](https://pinia.vuejs.org/)                                                                                                                                                                                                                                  |
| **Backend & Database**     | [Supabase](https://supabase.com/) (PostgreSQL, PostgREST API)                                                                                                                                                                                                        |
| **Date & Time**            | [Day.js](https://day.js.org/)                                                                                                                                                                                                                                        |
| **Build Tool**             | [Vite 8](https://vitejs.dev/) with tree-shaking & vendor chunk splitting                                                                                                                                                                                             |
| **Testing**                | [Vitest 5](https://vitest.dev/), [@vue/test-utils 2](https://test-utils.vuejs.org/), jsdom                                                                                                                                                                           |
| **Code Quality**           | [TypeScript 5.9](https://www.typescriptlang.org/), [ESLint 9](https://eslint.org/) (Flat Config), [Prettier](https://prettier.io/) (`@ionic/prettier-config`), [Husky](https://typicode.github.io/husky/), [lint-staged](https://github.com/lint-staged/lint-staged) |
| **Package Manager**        | [pnpm 11](https://pnpm.io/) (Node.js 24)                                                                                                                                                                                                                             |

---

## Project Structure

```text
├── android/                   # Capacitor Android native project
├── ios/                       # Capacitor iOS native project
├── docs/                      # Project documentation, design specs, and ADRs
│   ├── adr/                   # Architecture Decision Records
│   ├── design/                # Design templates and screen specifications
│   ├── design-system.md       # Design system v2 token and component guidelines
│   └── features/              # Feature-specific architectural docs
├── src/
│   ├── assets/
│   │   ├── icons/             # Category PNG icons
│   │   └── theme/             # Design tokens (--ds-*) & Ionic variable mappings
│   ├── core/                  # Shared core domain & infrastructure
│   │   ├── components/        # BaseHeader, BaseRefresher
│   │   ├── composables/       # useToast and programmatic controllers
│   │   ├── storage/           # BudgetStorage port, Supabase & InMemory adapters
│   │   └── utils/             # Amount formatting, date intervals, category icons
│   ├── modules/               # Feature-based domain modules
│   │   ├── categories/        # Category components, types & store
│   │   ├── reports/           # Report views, period filters, types & store
│   │   └── transactions/      # Transaction views, forms, modals & store
│   ├── views/                 # Root tab layout (TabsPage.vue)
│   ├── App.vue                # Root application component
│   ├── main.ts                # App entrypoint (Ionic & Pinia bootstrapping)
│   └── router.ts              # Route declarations & lazy-loaded tabs
├── supabase/                  # Supabase local config & schema snippets
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
- **Supabase Account / Project** (for backend database storage)

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

### 3. Configure environment variables

Copy the example environment file and provide your Supabase project credentials:

```bash
cp .env.dist .env
```

Edit `.env`:

```ini
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-or-publishable-key
```

> **Note**: In development or test environments without Supabase credentials, unit tests run seamlessly using `InMemoryStorage`.

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

---

## Available Scripts

| Command              | Description                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`           | Starts the Vite development server with HMR                            |
| `pnpm build`         | Compiles production web bundle into `dist/`                            |
| `pnpm preview`       | Locally previews production build                                      |
| `pnpm test:unit`     | Starts Vitest in watch mode                                            |
| `pnpm test:unit run` | Runs Vitest test suite once                                            |
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

## Database & Supabase Integration

The PostgreSQL database contains two primary tables:

1. **`categories`**:
   - `id` (uuid, primary key)
   - `title` (text)
   - `icon` (text, nullable)
2. **`transactions`**:
   - `id` (uuid, primary key)
   - `name` (text, transaction description/title)
   - `value` (numeric, expense amount)
   - `category_id` (uuid, foreign key referencing `categories.id`)
   - `created_at` (timestamptz)

TypeScript definitions for database tables are generated using the Supabase CLI in `src/core/storage/database.types.ts`:

```bash
npx supabase gen types typescript --project-id <your-project-id> > src/core/storage/database.types.ts
```

---

## Documentation & ADRs

- [GLOSSARY.md](./GLOSSARY.md) — Ubiquitous domain language and terminology definitions.
- [AGENT.md](./AGENT.md) — Development guidelines, conventions, and agent workflow specifications.
- [docs/adr/0001-domain-storage-seam.md](./docs/adr/0001-domain-storage-seam.md) — Architecture Decision Record on domain-storage seam.
- [docs/design-system.md](./docs/design-system.md) — Design system v2 tokens, layout rules, and component audit.
- [docs/features/toast-notifications.md](./docs/features/toast-notifications.md) — Programmatic toast notification system architecture.
