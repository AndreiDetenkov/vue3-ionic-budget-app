# Spec: Collapse Category Selection State into v-model Seam (Candidate 2)

## Objective

Eliminate duplicate selection state, leaky UI properties, and cross-store temporal coupling between `useCategoryStore`, `CategoriesForm.vue`, and `AddTransactionForm.vue`:

1. Remove UI-specific selection state (`pressedCategories`, `setCategoriesToPressed`, `resetPressedCategories`) and the `PressedCategory` interface from `useCategoryStore` (`src/modules/categories/store/categoryStore.ts` and `src/modules/categories/types.ts`).
2. Turn `CategoriesForm.vue` into a focused, self-contained category picker component exposing a clean two-way binding seam using `defineModel<string>({ required: true })`.
3. Compute the active card visual highlight (`.pressed-card`) declaratively via `category.id === selectedCategoryId` without mutating objects in the store.
4. Enforce idempotent selection: tapping an active category card keeps it selected (radio-button semantics).
5. Decouple `AddTransactionForm.vue` from `useCategoryStore`: bind directly via `<CategoriesForm v-model="state.categoryId" />`, removing manual imports, intermediate event handlers, and manual `resetPressedCategories()` calls.
6. Add component tests in `CategoriesForm.spec.ts` using `createInMemoryStorage` to verify selection, switching, idempotent tapping, and external reset via `v-model`. Update `categoryStore.spec.ts` to remove obsolete `pressedCategories` checks.

## Assumptions

1. The visual presentation (3-column grid of Ionic cards with icons, ripple effect, and `.pressed-card` style) remains identical.
2. The category selection remains a single-choice input (`categoryId: string`).
3. Categories are loaded into `useCategoryStore` prior to or during form usage; `CategoriesForm` reads the reactive `categories` list directly from the store.
4. The modal window for editing transactions (`UpdateItemModal.vue`) continues using `<ion-select>` and is not affected by this change.

## Tech Stack & Commands

- **Runtime & Framework**: Vue 3.5 (Composition API, `<script setup>`, `defineModel`), Ionic Vue 8.8, Pinia 4.0, TypeScript 5.9
- **Testing**: Vitest 5.0, `@vue/test-utils` 2.5
- **Commands**:
  - Test: `pnpm test:unit run`
  - Typecheck: `pnpm typecheck`
  - Lint: `pnpm lint`
  - Format: `pnpm format`
  - Dev: `pnpm dev`

## User Stories

1. **As a user recording a new Transaction**, I want to tap a Category card in the category selector, so that the tapped Category is visually highlighted as active and bound to my new Transaction.
2. **As a user recording a new Transaction**, I want tapping a different Category card to switch the active highlight to the newly tapped Category, so that only one Category is selected at a time.
3. **As a user recording a new Transaction**, I want tapping an already selected Category card to keep that Category selected (idempotent selection), so that an accidental double tap does not clear my selection and invalidate the form.
4. **As a user submitting a new Transaction without selecting a Category**, I want the form validation to reject submission and show an error notification, so that a Transaction cannot be created without a Category.
5. **As a user who has just successfully created a Transaction**, I want the form fields and the visual Category selection highlight to reset automatically when the form clears its state, so that the next Transaction starts with a clean, unselected state.
6. **As a maintainer of the category store module**, I want `useCategoryStore` to only manage and cache domain Category items loaded through the `BudgetStorage` seam, so that UI-specific selection state (`PressedCategory`) does not leak into the store interface.
7. **As a maintainer of the transaction creation form module**, I want the form to coordinate Category selection solely through a single `v-model` binding without importing or calling `useCategoryStore`, so that resetting the form state automatically resets the category selector.
8. **As a maintainer of the category selector module**, I want the active card highlight to be derived declaratively from the `v-model` value (`id === selectedCategoryId`) and the domain Category list from `useCategoryStore`, so that visual state can never drift out of sync with the form state.
9. **As a developer running automated tests**, I want to verify the category selector module through its `v-model` interface backed by `useCategoryStore` and the `InMemoryStorage` adapter, so that selection, switching, idempotent re-tapping, and external reset are tested without mocking stores or UI infrastructure.
10. **As a developer maintaining domain types**, I want the categories module barrel to continue exporting the domain `Category` type while removing the obsolete `PressedCategory` interface, so that consumers have a clean domain type surface.

## Project Structure & Touched Files

```
src/
├── core/
│   └── storage/
│       └── index.ts                      # export useStorage composable
└── modules/
    ├── categories/
    │   ├── components/
    │   │   ├── CategoriesForm.vue        # defineModel<string>, declarative :class, id === selectedCategoryId
    │   │   └── CategoriesForm.spec.ts    # Component test: v-model contract, idempotent tap, reset
    │   ├── store/
    │   │   ├── categoryStore.ts          # Remove pressedCategories, setCategoriesToPressed, resetPressedCategories
    │   │   └── categoryStore.spec.ts     # Remove assertions on store.pressedCategories
    │   └── types.ts                      # Remove PressedCategory interface
    └── transactions/
        └── components/
            └── AddTransactionForm.vue    # Remove useCategoryStore import, bind <CategoriesForm v-model="state.categoryId" />
docs/
└── specs/
    └── 0002-collapse-category-selection-state.md # This specification document
```

## Code Style & Architectural Seams

### 1. `useCategoryStore` Cleaned Interface (`src/modules/categories/store/categoryStore.ts`)

```typescript
// Before:
// const pressedCategories = ref<PressedCategory[]>([]);
// function setCategoriesToPressed(newCategories: Category[]): void;
// function resetPressedCategories(): void;

// After:
export const useCategoryStore = defineStore('categoryStore', () => {
  const storage = useStorage();
  const categories = ref<Category[]>([]);
  const error = ref<Error | null>(null);
  const loading = ref<boolean>(false);

  async function getCategoryList(): Promise<void> {
    if (categories.value.length > 0) return;

    error.value = null;
    loading.value = true;
    try {
      categories.value = await storage.getCategories();
    } catch (err) {
      error.value = toError(err);
    } finally {
      loading.value = false;
    }
  }

  return {
    categories,
    error,
    loading,
    getCategoryList,
  };
});
```

### 2. `CategoriesForm.vue` Two-Way Binding Seam

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { IonCol, IonGrid, IonLabel, IonRippleEffect, IonRow } from '@ionic/vue';
import { useCategoryStore } from '@/modules/categories/store/categoryStore';
import { getCategoryIconUrl } from '@/core/utils';

const selectedCategoryId = defineModel<string>({ required: true });

const categoryStore = useCategoryStore();
const { categories } = storeToRefs(categoryStore);

function onTapHandler(id: string): void {
  if (!id) return;
  selectedCategoryId.value = id;
}
</script>

<template>
  <ion-grid class="ion-margin-bottom">
    <ion-row>
      <ion-col v-for="{ id, title, icon } in categories" :key="id.toString()" size="4">
        <div
          @click.stop="onTapHandler(id)"
          class="ion-activatable ripple-parent card"
          :class="{ 'pressed-card': id === selectedCategoryId }"
        >
          <ion-ripple-effect class="card-custom-ripple" />
          <div class="category-icon" :style="{ maskImage: `url(${getCategoryIconUrl(icon)})` }" />
          <ion-label class="card-title">{{ title }}</ion-label>
        </div>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>
```

### 3. `AddTransactionForm.vue` Decoupled State

```vue
<!-- Before: -->
<!-- <script setup> -->
<!-- const categoryStore = useCategoryStore(); -->
<!-- function setCategoryId(id: string) { state.value.categoryId = id; } -->
<!-- function clearState() { state.value.categoryId = ''; categoryStore.resetPressedCategories(); } -->
<!-- </script> -->
<!-- <CategoriesForm @select-category="setCategoryId" /> -->

<!-- After: -->
<script setup lang="ts">
// No useCategoryStore import required
function clearState(): void {
  state.value.transaction = state.value.amount = state.value.categoryId = '';
}
</script>

<template>
  <CategoriesForm v-model="state.categoryId" class="ion-margin-bottom" />
</template>
```

## Implementation Decisions

- **Store Interface Simplification**:
  - `pressedCategories`, `setCategoriesToPressed`, and `resetPressedCategories` are deleted from `categoryStore`.
  - The public interface of `categoryStore` shrinks by 3 exports, focusing strictly on domain category data (`categories`, `loading`, `error`, `getCategoryList`).
- **Removal of UI-Specific Type**:
  - `PressedCategory` interface is removed from `src/modules/categories/types.ts`.
  - Re-exports only canonical domain `Category` from `@/core/storage`.
- **v-model Seam on `CategoriesForm`**:
  - `selectedCategoryId = defineModel<string>({ required: true })` provides a standard Vue 3.5 two-way reactive binding contract.
  - Cards highlight based on direct comparison `id === selectedCategoryId`.
  - Tapping a card sets `selectedCategoryId.value = id`. Re-tapping an already selected card leaves it selected.
- **Form Decoupling in `AddTransactionForm`**:
  - `AddTransactionForm` binds `<CategoriesForm v-model="state.categoryId" />`.
  - Clearing `state.value.categoryId = ''` automatically unsets the highlighted card without any cross-store call.
- **No New ADR**:
  - Not an architectural compromise requiring an ADR; standard refactor consolidating UI state into component props/v-model.

## Testing Strategy & Decisions

1. **Category Store Tests (`categoryStore.spec.ts`)**:
   - Asserts on `store.categories` (sorting by title, caching).
   - Removed all assertions on `store.pressedCategories`.
2. **Category Form Component Tests (`CategoriesForm.spec.ts`)**:
   - Backed by real `useCategoryStore` seeded via `createInMemoryStorage({ categories })`.
   - Verifies initial render without active card when `modelValue = ''`.
   - Verifies active `.pressed-card` on the card matching `modelValue`.
   - Verifies card click emits `update:modelValue` with category id.
   - Verifies repeated click on the same card keeps it selected.
   - Verifies clicking another card switches selection.
   - Verifies resetting `modelValue = ''` from parent removes `.pressed-card` from all cards.

## Boundaries

- **Always**:
  - Use `defineModel<string>()` for two-way binding.
  - Derive visual highlight declaratively without mutating store state.
  - Run `pnpm test:unit run` and `pnpm typecheck`.
- **Ask first**:
  - Changing visual design, layout grid, or CSS variables.
  - Introducing multi-category selection.
- **Never**:
  - Re-introduce UI selection flags into Pinia stores.
  - Call `categoryStore` reset methods from parent form components.

## Success Criteria

- [x] `pressedCategories`, `setCategoriesToPressed`, and `resetPressedCategories` deleted from `categoryStore.ts`.
- [x] `PressedCategory` interface deleted from `src/modules/categories/types.ts`.
- [x] `CategoriesForm.vue` uses `defineModel<string>({ required: true })` and derives `.pressed-card` via `id === selectedCategoryId`.
- [x] `AddTransactionForm.vue` uses `<CategoriesForm v-model="state.categoryId" />` and no longer imports `categoryStore`.
- [x] `CategoriesForm.spec.ts` covers rendering, card selection, idempotency, and parent reset.
- [x] `categoryStore.spec.ts` passes without `pressedCategories`.
- [x] `pnpm test:unit run` passes 100%.
- [x] `pnpm typecheck` passes with zero errors.

## Open Questions

All frontier questions settled in Round 1:
1. *v-model Contract*: Standard `defineModel<string>({ required: true })`. (Settled: Yes)
2. *Re-tap Behavior*: Idempotent selection (radio-button semantics, remains selected). (Settled: Yes)
3. *Store Decoupling*: `AddTransactionForm` does not import `categoryStore` for selection. (Settled: Yes)
4. *Test Surface*: Replace `store.pressedCategories` assertions with `CategoriesForm.spec.ts` component tests. (Settled: Yes)
