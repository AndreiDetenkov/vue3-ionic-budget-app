# Spec: Unified Domain Storage Seam & Adapters (Candidate 1)

## Objective

Collapse shallow database pass-throughs, row-mapping utilities, eager environment checks, and driver error leaks behind a unified domain-typed persistence seam (`BudgetStorage`) using the Ports & Adapters pattern:

1. Define a clean domain persistence port `BudgetStorage` (`src/core/storage/types.ts`) operating exclusively with canonical domain types (`Transaction`, `Category`, `DateRange`, `CreateTransactionInput`, `UpdateTransactionInput`).
2. Implement a production `SupabaseStorage` adapter that encapsulates lazy client initialization, environment variable validation at call time, PostgREST queries, `snake_case ↔ camelCase` row mapping, and domain `Error` normalization.
3. Implement an `InMemoryStorage` test adapter supporting in-memory seeded state, date-range filtering (`from <= createdAt <= to`), `createdAt` descending and `title` ascending sorting, foreign-key validation on `categoryId`, and idempotent deletion.
4. Replace shallow API wrappers (`src/modules/transactions/api/transactions.ts`, `src/modules/categories/api/categories.ts`), raw DB mapper (`src/modules/transactions/utils/index.ts`), eager Supabase plugin (`src/core/plugins/supabase.ts`), and import-time check (`src/core/utils/env.ts`).
5. Migrate `useTransactionStore`, `useCategoryStore`, `useReportStore`, and `AddTransactionForm` to use `BudgetStorage` (`useStorage()`) with camelCase domain inputs and standard `Error` handling.

## Assumptions

1. The database tables (`transactions`, `categories`) and foreign key relationships remain unchanged; only client-side access is restructured.
2. `src/core/plugins/database.types.ts` is relocated to `src/core/storage/database.types.ts` as an internal implementation detail of `SupabaseStorage` and is never imported outside `src/core/storage/`.
3. Stores access the active storage adapter via `useStorage()` (with support for `setStorage()` in tests).
4. Error handling in stores catches standard `Error` instances; `PostgrestError` is never exposed across the persistence seam.

## Tech Stack & Commands

- **Runtime & Framework**: Vue 3.5 (Composition API, `<script setup>`), Ionic Vue 8.8, Pinia 4.0, TypeScript 5.9
- **BaaS & Client**: Supabase JS 2.49 (`@supabase/supabase-js`)
- **Testing**: Vitest 5.0, `@vue/test-utils` 2.5
- **Commands**:
  - Test: `pnpm test:unit run`
  - Typecheck: `pnpm typecheck`
  - Lint: `pnpm lint`
  - Format: `pnpm format`
  - Dev: `pnpm dev`

## User Stories

1. **As a user tracking personal expenses**, I want my recorded `Transaction` entries for the selected `Date Range` to load reliably with their associated `Category`, so that I can review my recent spending.
2. **As a user creating a new `Transaction`**, I want the form to submit a domain-level input (`name`, `value`, `categoryId`) without exposing database column names, so that my new expense is saved and the current `Date Range` list refreshes automatically.
3. **As a user editing an existing `Transaction`**, I want updates to `name`, `value`, and `categoryId` to persist through the storage seam and refresh the current `Date Range`, so that my corrections are reflected immediately.
4. **As a user deleting a `Transaction`**, I want the removal to execute through the storage seam and refresh the active `Date Range`, so that deleted expenses no longer appear in my list or totals.
5. **As a user viewing `Category Report` summaries**, I want `reportStore` to fetch `Transaction` items for a `Date Range` through the same storage seam and always reset its loading indicator even if a storage error occurs, so that the reports view never hangs in an infinite loading state.
6. **As a user selecting a `Category`**, I want categories to be loaded in alphabetical order by `title` through the storage seam and cached in `categoryStore`, so that I can quickly pick a category when adding or editing a `Transaction`.
7. **As a developer running unit and integration tests**, I want to import any store or Vue component without setting Supabase environment variables, so that tests never crash at module import time.
8. **As a developer writing store tests**, I want to swap the active `BudgetStorage` implementation to `InMemoryStorage` seeded with test `Category` and `Transaction` records, so that I can test `transactionStore`, `categoryStore`, and `reportStore` behavior in-process without network calls or `vi.mock`.
9. **As a developer testing edge cases with `InMemoryStorage`**, I want creating or updating a `Transaction` with an unknown `categoryId` to fail with an `Error`, so that in-memory tests enforce the same foreign-key integrity as the production database.
10. **As a developer testing updates with `InMemoryStorage`**, I want updating a `Transaction` with a non-existent `id` to fail with an `Error`, so that silent no-op updates are caught in tests.
11. **As a developer testing deletions with `InMemoryStorage`**, I want removing a `Transaction` by `id` to be idempotent, so that deletion semantics match production database behavior.
12. **As a developer diagnosing production configuration issues**, I want `SupabaseStorage` to throw a clear `Error` naming the missing environment variable upon the first storage operation if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is unset, so that misconfigurations are reported clearly and caught by store error handlers.
13. **As a developer maintaining domain models**, I want `Transaction`, `Category`, `DateRange`, `CreateTransactionInput`, and `UpdateTransactionInput` to have zero type-level dependencies on generated database schema types, so that database schema regeneration does not ripple into UI components and stores.

## Project Structure & Touched Files

```
src/
├── core/
│   ├── plugins/
│   │   ├── database.types.ts             # (Moved to src/core/storage/database.types.ts)
│   │   └── supabase.ts                    # (Deleted: replaced by lazy SupabaseStorage)
│   ├── storage/
│   │   ├── database.types.ts             # Generated Supabase schema types (internal to storage)
│   │   ├── inMemoryStorage.ts            # InMemoryStorage adapter implementation
│   │   ├── index.ts                      # useStorage, setStorage, createStorage exports
│   │   ├── storage.spec.ts               # Unit tests for InMemoryStorage & lazy SupabaseStorage
│   │   ├── supabaseStorage.ts            # SupabaseStorage adapter implementation
│   │   └── types.ts                      # BudgetStorage port, Transaction, Category, DateRange
│   └── utils/
│       ├── env.ts                        # (Deleted: folded into supabaseStorage.ts)
│       └── index.ts                      # Remove checkEnvVariable export
├── modules/
│   ├── categories/
│   │   ├── api/
│   │   │   └── categories.ts             # (Deleted: replaced by storage.getCategories)
│   │   ├── index.ts                      # Re-export Category from @/core/storage
│   │   ├── store/
│   │   │   ├── categoryStore.ts          # Migrate to useStorage, Error type
│   │   │   └── categoryStore.spec.ts     # In-memory test of category loading & caching
│   │   └── types.ts                      # Re-export Category from @/core/storage
│   ├── reports/
│   │   └── store/
│   │       ├── reportStore.ts            # Migrate to useStorage, wrap getReports in try/finally
│   │       └── reportStore.spec.ts       # Test aggregation & error safety via InMemoryStorage
│   └── transactions/
│       ├── api/
│       │   └── transactions.ts           # (Deleted: replaced by storage methods)
│       ├── components/
│       │   └── AddTransactionForm.vue    # category_id -> categoryId in payload
│       ├── index.ts                      # Clean barrel exports
│       ├── store/
│       │   ├── transactionStore.ts       # Migrate to useStorage, remove PostgrestError
│       │   └── transactionStore.spec.ts  # Test actions via InMemoryStorage
│       ├── types.ts                      # Re-export domain types from @/core/storage
│       └── utils/
│           └── index.ts                  # (Deleted: mappedTransactions folded into adapter)
docs/
├── adr/
│   └── 0001-domain-storage-seam.md       # ADR documenting the architecture decision
└── specs/
    └── 0001-domain-storage-seam.md       # This specification document
```

## Code Style & Architectural Seams

### 1. The Domain Storage Port (`src/core/storage/types.ts`)

```typescript
export interface Category {
  id: string;
  title: string;
  icon: string | null;
}

export interface Transaction {
  id: string;
  name: string;
  value: number;
  createdAt: string;
  categoryId: string;
  category: Category;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface CreateTransactionInput {
  name: string;
  value: number;
  categoryId: string;
}

export interface UpdateTransactionInput {
  id: string;
  name: string;
  value: number;
  categoryId: string;
}

export interface BudgetStorage {
  getCategories(): Promise<Category[]>;
  getTransactionsByRange(range: DateRange): Promise<Transaction[]>;
  createTransaction(input: CreateTransactionInput): Promise<Transaction>;
  updateTransaction(input: UpdateTransactionInput): Promise<Transaction>;
  removeTransaction(id: string): Promise<void>;
}
```

### 2. Storage Composables & Test Seam (`src/core/storage/index.ts`)

```typescript
let activeStorage: BudgetStorage | null = null;

export function useStorage(): BudgetStorage {
  if (!activeStorage) {
    activeStorage = createSupabaseStorage();
  }
  return activeStorage;
}

export function setStorage(storage: BudgetStorage): void {
  activeStorage = storage;
}
```

### 3. Store Migration Example (`src/modules/categories/store/categoryStore.ts`)

```typescript
// Before:
// import { getCategoriesApi } from '../api/categories';
// import { PostgrestError } from '@supabase/supabase-js';
// const error = ref<PostgrestError | null>(null);

// After:
import { useStorage, toError } from '@/core/storage';
const storage = useStorage();
const error = ref<Error | null>(null);

async function getCategoryList(): Promise<void> {
  if (categories.value.length > 0) return;
  error.value = null;
  loading.value = true;
  try {
    const data = await storage.getCategories();
    categories.value = data;
    setCategoriesToPressed(data);
  } catch (err) {
    error.value = toError(err);
  } finally {
    loading.value = false;
  }
}
```

## Implementation Decisions

- **Unified Persistence Port (`BudgetStorage`)**:
  Combines operations on `Transaction` and `Category` because the domain `Transaction` contains its joined `Category` object. An in-memory store must resolve `Category` by `categoryId` from unified state.
- **Production Adapter (`SupabaseStorage`)**:
  - Lazily initializes the Supabase client inside helper methods so importing module files never throws if environment variables are missing.
  - Queries `transactions` with `select('*,categories(*)')`, filters by `gte('created_at', from)` and `lte('created_at', to)`, sorts by `order('created_at', { ascending: false })`, and maps DB rows to domain `Transaction[]`. Throws `Error` if a row lacks a joined category.
  - Queries `categories` with `order('title', { ascending: true })`.
  - Normalizes any Supabase / PostgREST error into a standard `Error`.
- **Test Adapter (`InMemoryStorage`)**:
  - Instantiated via `createInMemoryStorage(seed?: { categories?: Category[]; transactions?: Transaction[] })`.
  - Deep-clones initial seed arrays to isolate test executions.
  - Enforces referential integrity: throws `Error` if `categoryId` is not found during `createTransaction` or `updateTransaction`.
  - Enforces entity existence: throws `Error` if `id` is not found during `updateTransaction`.
  - Idempotent `removeTransaction`: succeeds without error if the `id` is not found.
  - Performs date-range filtering inclusively (`from <= createdAt && createdAt <= to`).
- **Store Refactoring**:
  - Replaces `PostgrestError` with standard `Error`.
  - Replaces raw DB row mapping calls with domain storage calls.
  - Wraps async methods in `try / catch / finally` to guarantee reset of `loading`, `creating`, or `isLoading` flags.
- **Form Payload**:
  - `AddTransactionForm.vue` emits `categoryId` instead of snake_case `category_id`.

## Testing Strategy & Decisions

1. **Lower Seam Unit Tests (`src/core/storage/storage.spec.ts`)**:
   - `InMemoryStorage`: date-range filtering, sorting, foreign-key validation, entity existence validation, and idempotent removal.
   - `SupabaseStorage`: lazy initialization does not throw at import or construction time; throws informative `Error` naming missing env variables when methods are called without configuration.
2. **Upper Seam Store Tests**:
   - `src/modules/categories/store/categoryStore.spec.ts`: test `getCategoryList` loading, caching, and error handling using `setStorage(createInMemoryStorage(...))`.
   - `src/modules/transactions/store/transactionStore.spec.ts`: test `getTransactionsByRange`, `createTransaction`, `updateTransaction`, and `removeTransaction` using `InMemoryStorage`.
   - `src/modules/reports/store/reportStore.spec.ts`: test `getReports` category aggregation, total computation, and `isLoading` reset on failure using `InMemoryStorage`.

## Boundaries

- **Always**:
  - Keep domain types in `src/core/storage/types.ts` free of generated Supabase schema imports.
  - Normalize external/driver errors into standard `Error` instances before returning or throwing across the seam.
  - Run `pnpm test:unit run`, `pnpm typecheck`, `pnpm lint`, and `pnpm format`.
- **Ask first**:
  - Introducing new network dependencies or state management libraries.
  - Changing table schemas or column names in the Supabase backend.
- **Never**:
  - Import `@supabase/supabase-js` or `PostgrestError` inside store or component files.
  - Execute eager environment checks at module top-level scope.
  - Mock Supabase query chains in unit tests when `InMemoryStorage` satisfies the seam.

## Success Criteria

- [x] `BudgetStorage` interface defined with domain types in `src/core/storage/types.ts`.
- [x] `SupabaseStorage` implemented with lazy env checking, query encapsulation, and row mapping.
- [x] `InMemoryStorage` implemented with seed data, foreign-key checks, and date-range filtering.
- [x] Shallow API files (`api/transactions.ts`, `api/categories.ts`, `utils/mappedTransactions`, `core/utils/env.ts`) deleted.
- [x] `useTransactionStore`, `useCategoryStore`, and `useReportStore` migrated to `useStorage()`.
- [x] `AddTransactionForm.vue` payload uses `categoryId` instead of `category_id`.
- [x] Unit tests in `src/core/storage/storage.spec.ts`, `categoryStore.spec.ts`, `transactionStore.spec.ts`, and `reportStore.spec.ts` pass without environment variables or network access.
- [x] `pnpm test:unit run` passes 100%.
- [x] `pnpm typecheck` passes with zero errors.

## Open Questions

All architectural decisions settled in ADR 0001:
1. *Storage Port Granularity*: Unified `BudgetStorage` over separate repositories because `Transaction` embeds `Category`. (Settled: Unified)
2. *Environment Check Timing*: Lazy on method execution rather than import time. (Settled: Lazy)
3. *Error Types*: Standard JavaScript `Error` with descriptive message across the seam. (Settled: Standard Error)
4. *Test Strategy*: `InMemoryStorage` adapter instead of mocking Supabase client methods. (Settled: In-Memory Adapter)
