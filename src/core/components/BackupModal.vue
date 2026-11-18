<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import dayjs from 'dayjs';
import { IonButton, IonButtons, IonChip, IonContent, IonIcon, IonModal, IonSpinner, IonText } from '@ionic/vue';
import {
  cloudDownloadOutline,
  cloudUploadOutline,
  documentTextOutline,
  logoGoogle,
  logOutOutline,
  syncOutline,
} from 'ionicons/icons';
import BaseHeader from '@/core/components/BaseHeader.vue';
import { useToast } from '@/core/composables/useToast';
import {
  exportBackupJson,
  getLocalStorage,
  importBackupJson,
  importTransactionsCsv,
  toError,
  useFirebaseCloud,
  type FirebaseAuthUser,
} from '@/core/storage';

type BusyAction = 'signin' | 'sync' | 'signout' | 'export' | 'import' | 'csv' | null;

const props = defineProps<{
  onRestored?: () => Promise<void> | void;
}>();

const model = defineModel<boolean>({ default: false });

const { showSuccessToast, showErrorToast } = useToast();

const busyAction = ref<BusyAction>(null);
const currentUser = ref<FirebaseAuthUser | null>(null);
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');
const csvInputRef = useTemplateRef<HTMLInputElement>('csvInputRef');

let unsubscribeAuth: (() => void) | null = null;

onMounted(() => {
  unsubscribeAuth = useFirebaseCloud().subscribeAuthState((user) => {
    currentUser.value = user;
  });
});

onUnmounted(() => {
  unsubscribeAuth?.();
  unsubscribeAuth = null;
});

const closeModal = () => {
  if (busyAction.value === null) {
    model.value = false;
  }
};

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => {
      const err = reader.error;
      const message =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message
          ? err.message
          : 'Failed to read backup file';
      reject(new Error(message));
    };
    reader.readAsText(file);
  });
}

function downloadJsonFile(filename: string, content: string): void {
  if (typeof URL.createObjectURL !== 'function') {
    throw new Error('File download is not supported in this environment');
  }

  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function runAction(action: Exclude<BusyAction, null>, task: () => Promise<void>): Promise<void> {
  if (busyAction.value) {
    return;
  }

  busyAction.value = action;
  try {
    await task();
  } catch (err) {
    await showErrorToast(toError(err).message);
  } finally {
    busyAction.value = null;
  }
}

async function handleSelectedFile(
  event: Event,
  action: Exclude<BusyAction, null>,
  importText: (rawText: string) => Promise<string>,
): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  try {
    await runAction(action, async () => {
      const rawText = await readFileAsText(file);
      const successMessage = await importText(rawText);
      await props.onRestored?.();
      await showSuccessToast(successMessage);
    });
  } finally {
    input.value = '';
  }
}

const handleExport = () =>
  runAction('export', async () => {
    const json = await exportBackupJson(getLocalStorage());
    const filename = `budget-backup-${dayjs().format('YYYY-MM-DD')}.json`;
    downloadJsonFile(filename, json);
    await showSuccessToast('Backup exported');
  });

const triggerImport = () => {
  fileInputRef.value?.click();
};

const triggerCsvImport = () => {
  csvInputRef.value?.click();
};

const handleFileSelected = (event: Event) =>
  handleSelectedFile(event, 'import', async (rawJson) => {
    const result = await importBackupJson(getLocalStorage(), rawJson);
    return `Imported ${result.transactionsCount} transactions`;
  });

const handleCsvFileSelected = (event: Event) =>
  handleSelectedFile(event, 'csv', async (rawCsv) => {
    const result = await importTransactionsCsv(getLocalStorage(), rawCsv);
    return `Imported ${result.transactionsCount} transactions from CSV`;
  });

const handleGoogleSignIn = () =>
  runAction('signin', async () => {
    const user = await useFirebaseCloud().signInWithGoogle();
    if (user) {
      await showSuccessToast(`Signed in as ${user.email ?? user.displayName ?? 'Google user'}`);
    }
  });

const handleFirebaseSync = () =>
  runAction('sync', async () => {
    const summary = await useFirebaseCloud().syncNow();
    await props.onRestored?.();
    const pushedCount = summary.pushedCategories + summary.pushedTransactions;
    const pulledCount = summary.pulledCategories + summary.pulledTransactions;
    await showSuccessToast(`Sync complete (↑${pushedCount} ↓${pulledCount})`);
  });

const handleSignOut = () =>
  runAction('signout', async () => {
    await useFirebaseCloud().signOut();
    await showSuccessToast('Signed out');
  });
</script>

<template>
  <ion-modal :is-open="model" :backdrop-dismiss="busyAction === null" @didDismiss="closeModal">
    <BaseHeader title="Backup & Sync">
      <template #buttons>
        <ion-buttons slot="end">
          <ion-chip color="primary" :disabled="busyAction !== null" @click="closeModal">Close</ion-chip>
        </ion-buttons>
      </template>
    </BaseHeader>

    <ion-content class="ion-padding">
      <div class="modal-sections">
        <section class="backup-section">
          <h2 class="section-title">Cloud Sync (Firebase)</h2>
          <template v-if="!currentUser">
            <ion-text color="medium">
              <p class="description">Sign in with your family Google account to sync transactions across devices.</p>
            </ion-text>

            <ion-button
              expand="block"
              data-testid="google-signin-btn"
              :disabled="busyAction !== null"
              @click="handleGoogleSignIn"
            >
              <ion-spinner v-if="busyAction === 'signin'" name="lines" />
              <template v-else>
                <ion-icon slot="start" :icon="logoGoogle" />
                Sign in with Google
              </template>
            </ion-button>
          </template>

          <template v-else>
            <ion-text color="dark">
              <p class="description">
                Signed in as <strong>{{ currentUser.email ?? currentUser.displayName ?? currentUser.uid }}</strong>
              </p>
            </ion-text>

            <ion-button
              expand="block"
              data-testid="firebase-sync-btn"
              :disabled="busyAction !== null"
              @click="handleFirebaseSync"
            >
              <ion-spinner v-if="busyAction === 'sync'" name="lines" />
              <template v-else>
                <ion-icon slot="start" :icon="syncOutline" />
                Sync Now
              </template>
            </ion-button>

            <ion-button
              expand="block"
              fill="outline"
              color="medium"
              data-testid="firebase-signout-btn"
              :disabled="busyAction !== null"
              @click="handleSignOut"
            >
              <ion-spinner v-if="busyAction === 'signout'" name="lines" />
              <template v-else>
                <ion-icon slot="start" :icon="logOutOutline" />
                Sign out
              </template>
            </ion-button>
          </template>
        </section>

        <section class="backup-section">
          <h2 class="section-title">Local Backup</h2>
          <ion-text color="medium">
            <p class="description">
              Data is stored locally on your device. Export a JSON backup anytime or merge data from a saved JSON backup
              or transactions CSV file.
            </p>
          </ion-text>

          <ion-button
            expand="block"
            data-testid="export-backup-btn"
            :disabled="busyAction !== null"
            @click="handleExport"
          >
            <ion-spinner v-if="busyAction === 'export'" name="lines" />
            <template v-else>
              <ion-icon slot="start" :icon="cloudDownloadOutline" />
              Export Backup (.json)
            </template>
          </ion-button>

          <ion-button
            expand="block"
            fill="outline"
            data-testid="import-backup-btn"
            :disabled="busyAction !== null"
            @click="triggerImport"
          >
            <ion-spinner v-if="busyAction === 'import'" name="lines" />
            <template v-else>
              <ion-icon slot="start" :icon="cloudUploadOutline" />
              Import Backup (.json)
            </template>
          </ion-button>

          <input
            ref="fileInputRef"
            data-testid="backup-file-input"
            type="file"
            accept="application/json,.json"
            class="hidden-file-input"
            @change="handleFileSelected"
          />

          <ion-button
            expand="block"
            fill="outline"
            color="secondary"
            data-testid="import-csv-btn"
            :disabled="busyAction !== null"
            @click="triggerCsvImport"
          >
            <ion-spinner v-if="busyAction === 'csv'" name="lines" />
            <template v-else>
              <ion-icon slot="start" :icon="documentTextOutline" />
              Import Transactions (.csv)
            </template>
          </ion-button>

          <input
            ref="csvInputRef"
            data-testid="csv-file-input"
            type="file"
            accept="text/csv,.csv"
            class="hidden-file-input"
            @change="handleCsvFileSelected"
          />
        </section>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
ion-content {
  --background: var(--ion-color-bg-light-grey);
}

.modal-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.backup-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.description {
  margin-top: 0;
  line-height: 1.4;
}

.hidden-file-input {
  display: none;
}
</style>
