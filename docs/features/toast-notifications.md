# Toast Notifications Feature Documentation

This document describes the toast notification system used across the application. The system leverages Ionic's programmatic `@ionic/vue` `toastController` inside a reusable Vue composable.

## Architecture & Benefits

Previously, the app used a custom `<app-toast>` component wrapped around `<ion-toast>` that required declaring component elements in the template and maintaining reactive open/close states inside each component.

The new implementation has the following advantages:
1. **Cleaner Templates**: No need to add template code or register `<app-toast>` inside views and forms.
2. **Programmatic API**: Toasts are created, presented, and dismissed dynamically through JavaScript/TypeScript via the controller.
3. **No Stateful State-Syncing**: Eliminates the need to synchronize a `toast.isOpen` ref across components.
4. **Consistency**: Default options (such as duration, position, and styling anchors) are preconfigured inside the composable, reducing repetition.

---

## Composable API

The toast system is exposed via the `useToast` composable located at:
[useToast.ts](file:///Users/andrei.detenkov/development/vue3-ionic-budget-app/src/core/composables/useToast.ts)

### Returned Functions

#### 1. `showToast(options: ToastOptions): Promise<HTMLIonToastElement>`
A low-level wrapper around Ionic's `toastController.create`. It merges user-provided options with the default presets.
- **Default Position**: `'top'`
- **Default Duration**: `2000ms`
- **Returns**: A promise that resolves to the presented toast element.

#### 2. `showErrorToast(message: string, options?: ToastOptions): Promise<HTMLIonToastElement>`
A specialized controller preset for displaying error messages.
- **Color**: `'danger'`
- **Position Anchor**: `'header'`
- **Position**: `'top'`

#### 3. `showSuccessToast(message: string, options?: ToastOptions): Promise<HTMLIonToastElement>`
A specialized controller preset for displaying success messages.
- **Color**: `'success'`
- **Position Anchor**: `'header'`
- **Position**: `'top'`

---

## Usage Examples

### 1. Showing a Success or Error Toast (Basic)

```vue
<script setup lang="ts">
import { useToast } from '@/core/composables/useToast';

const { showSuccessToast, showErrorToast } = useToast();

async function handleAction() {
  try {
    await performAction();
    await showSuccessToast('Action completed successfully!');
  } catch (error) {
    await showErrorToast('Something went wrong!');
  }
}
</script>
```

### 2. Showing a Custom Toast with Positioning

If you need to show a custom toast (e.g. at the bottom or middle of the screen), you can use the generic `showToast` function:

```vue
<script setup lang="ts">
import { useToast } from '@/core/composables/useToast';

const { showToast } = useToast();

async function showCustomToast() {
  await showToast({
    message: 'Custom positioned toast',
    position: 'bottom',
    color: 'warning',
    duration: 1500
  });
}
</script>
```
