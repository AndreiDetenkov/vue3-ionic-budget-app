# Spec: Remove Global Transaction Draft & Isolate Edit State (Candidate 3)

## Objective

Eliminate the temporal coupling and global draft state in `transactionStore` during transaction editing:
1. Remove `transactionItems` and `setTransactionItems` from the public interface of `transactionStore`.
2. Make `updateTransaction(payload: UpdateTransactionInput): Promise<{ success: boolean }>` a self-contained method with an explicit payload.
3. Align the return contract of `removeTransaction(id: string): Promise<{ success: boolean }>` with `createTransaction` and `updateTransaction`.
4. Deepen `UpdateItemModal.vue`: pass `transaction: Transaction` as an input prop, isolate the reactive draft and numeric validation inside the component, encapsulate `categoryStore.getCategoryList()`, and handle toasts and modal dismissal locally.
5. Simplify `SlideListItem.vue`: decouple from `categoryStore` and global item setting; handle removal failure gracefully with a toast.

## Assumptions

1. The modal layout and controls in `UpdateItemModal.vue` continue using `<ion-select interface="action-sheet">` (visual redesign to `CategoriesForm` is out of scope).
2. The component file remains `src/modules/transactions/components/SlideTransaction/UpdateItemModal.vue` to avoid unnecessary churn in imports and git history.
3. `BudgetStorage` (`src/core/storage/types.ts`) and its implementations (`inMemoryStorage.ts`, `supabaseStorage.ts`) already support `updateTransaction(input)` and `removeTransaction(id)` without modifications.
4. Error handling in `useTransactionStore` catches exceptions from `storage`, assigns `error.value = toError(err)`, and returns `{ success: false }`.

## Tech Stack & Commands

- **Runtime & Framework**: Vue 3.5 (Composition API, `<script setup>`), Ionic Vue 8.8, Pinia 4.0, TypeScript 5.9
- **Testing**: Vitest 5.0, `@vue/test-utils` 2.5
- **Commands**:
  - Test: `pnpm test:unit run`
  - Typecheck: `pnpm typecheck`
  - Lint: `pnpm lint`
  - Format: `pnpm format`
  - Dev: `pnpm dev`

## Project Structure & Touched Files

```
src/
├── core/storage/                    # Unchanged: provides BudgetStorage, Transaction, UpdateTransactionInput
└── modules/
    └── transactions/
        ├── store/
        │   ├── transactionStore.ts       # Remove transactionItems, setTransactionItems; update update/remove signatures
        │   └── transactionStore.spec.ts  # Test explicit updateTransaction(payload), removeTransaction({ success })
        ├── components/
        │   └── SlideTransaction/
        │       ├── SlideListItem.vue     # Pass { transaction } via componentProps; handle removal error toast
        │       ├── UpdateItemModal.vue   # Prop { transaction }, local draft, category fetching, toasts
        │       └── UpdateItemModal.spec.ts # Component tests: draft isolation, category load, numeric parsing
        └── types.ts                      # Re-export storage types (unchanged or cleaned if needed)
docs/
└── specs/
    └── 0003-remove-global-transaction-draft.md # This specification document
```

## Code Style & Architectural Seams

### 1. `transactionStore.ts` Interface
```typescript
// Before (temporal coupling & global mutable draft):
const transactionItems = ref<UpdateTransactionInput>({ id: '', name: '', value: 0, categoryId: '' });
function setTransactionItems(input: UpdateTransactionInput): void;
async function updateTransaction(): Promise<{ success: boolean }>;
async function removeTransaction(id: string): Promise<void>;

// After (deep, self-contained methods with explicit arguments):
async function updateTransaction(payload: UpdateTransactionInput): Promise<{ success: boolean }> {
  error.value = null;
  loading.value = true;
  try {
    await storage.updateTransaction(payload);
    await getTransactionsByRange(transactionsUnit.value);
    return { success: true };
  } catch (err) {
    error.value = toError(err);
    return { success: false };
  } finally {
    loading.value = false;
  }
}

async function removeTransaction(id: string): Promise<{ success: boolean }> {
  error.value = null;
  loading.value = true;
  try {
    await storage.removeTransaction(id);
    await getTransactionsByRange(transactionsUnit.value);
    return { success: true };
  } catch (err) {
    error.value = toError(err);
    return { success: false };
  } finally {
    loading.value = false;
  }
}
```

### 2. `UpdateItemModal.vue` Interface & Local Draft
```typescript
const props = defineProps<{
  transaction: Transaction;
}>();

const categoryStore = useCategoryStore();
const transactionStore = useTransactionStore();
const { showSuccessToast, showErrorToast } = useToast();

onMounted(() => {
  categoryStore.getCategoryList();
});

const draft = ref({
  name: props.transaction.name,
  value: String(props.transaction.value),
  categoryId: props.transaction.categoryId,
});

const isValid = computed(() => {
  const numValue = Number(draft.value.value);
  return (
    draft.value.name.trim().length > 0 &&
    draft.value.categoryId.length > 0 &&
    Number.isFinite(numValue) &&
    numValue > 0
  );
});

async function confirmHandler(): Promise<void> {
  if (!isValid.value) return;

  const { success } = await transactionStore.updateTransaction({
    id: props.transaction.id,
    name: draft.value.name.trim(),
    value: Number(draft.value.value),
    categoryId: draft.value.categoryId,
  });

  if (success) {
    await showSuccessToast('Successfully updated!');
    await modalController.dismiss(true, 'confirm');
  } else {
    await showErrorToast('Oops...Something went wrong');
  }
}
```

## Testing Strategy

1. **Unit Tests (`transactionStore.spec.ts`)**:
   - Verify `updateTransaction(payload)` successfully updates transaction through `BudgetStorage` and re-fetches range.
   - Verify `updateTransaction(payload)` returns `{ success: false }` and sets `error` on failure.
   - Verify `removeTransaction(id)` returns `{ success: true }` on success and `{ success: false }` on failure.
   - Verify `transactionItems` and `setTransactionItems` do not exist in store instance.

2. **Component Tests (`UpdateItemModal.spec.ts`)**:
   - Mount with `props: { transaction }` and `createInMemoryStorage({ categories, transactions })`.
   - Verify form inputs initialize with `transaction` values.
   - Verify `categoryStore.getCategoryList()` populates categories options.
   - Verify cancelling or editing draft before submit does not alter storage or store transactions.
   - Verify submit converts string input to numeric `value` and calls `transactionStore.updateTransaction`.
   - Verify submit button is disabled when input is invalid or store is loading.

## Boundaries

- **Always**:
  - Run `pnpm test:unit run` and `pnpm typecheck` before finishing.
  - Parse and validate `value` to a finite positive number before calling `updateTransaction`.
  - Isolate form draft in component local state.
  - Return `{ success: boolean }` from mutation actions.
- **Ask first**:
  - Changing visual components / replacing `<ion-select>`.
  - Adding new dependencies.
  - Modifying `BudgetStorage` port interface.
- **Never**:
  - Store temporary form state in global Pinia stores.
  - Mutate `props.transaction` directly.
  - Suppress TypeScript compiler errors with `@ts-ignore` or `any`.
  - Swallow mutation errors without returning `{ success: false }`.

## Success Criteria

- [ ] `transactionItems` and `setTransactionItems` are completely removed from `transactionStore.ts`.
- [ ] `updateTransaction(payload: UpdateTransactionInput)` accepts payload explicitly and returns `Promise<{ success: boolean }>`.
- [ ] `removeTransaction(id: string)` returns `Promise<{ success: boolean }>`.
- [ ] `SlideListItem.vue` opens `UpdateItemModal` with `componentProps: { transaction }`, without calling `store.setTransactionItems` or `categoryStore.getCategoryList()`.
- [ ] `SlideListItem.vue` shows `showErrorToast` if `removeTransaction` returns `{ success: false }`.
- [ ] `UpdateItemModal.vue` declares `defineProps<{ transaction: Transaction }>()`, isolates its reactive draft, calls `categoryStore.getCategoryList()` on mount, validates input, shows toasts, and only dismisses on success.
- [ ] `UpdateItemModal.spec.ts` covers initialization, isolation, validation, and submission.
- [ ] `pnpm test:unit run` passes 100% of tests.
- [ ] `pnpm typecheck` passes with zero errors.

## Open Questions

All frontier questions have been settled in Rounds 1 & 2:
1. *Store signatures*: `removeTransaction` aligned to `Promise<{ success: boolean }>`. (Settled: Yes)
2. *Modal prop*: Single prop `transaction: Transaction`. (Settled: Yes)
3. *Local draft & parsing*: Reactive draft with `Number(value)` conversion and validation. (Settled: Yes)
4. *Locality of categories and toasts*: Encapsulated inside `UpdateItemModal.vue`. (Settled: Yes)
5. *Component testing*: Dedicated `UpdateItemModal.spec.ts` testing through `InMemoryStorage`. (Settled: Yes)
6. *UI Controls*: Keep `<ion-select interface="action-sheet">` in modal. (Settled: Yes)
