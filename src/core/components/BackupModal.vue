<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import dayjs from 'dayjs';
import { IonButton, IonButtons, IonChip, IonContent, IonIcon, IonModal, IonSpinner, IonText } from '@ionic/vue';
import { cloudDownloadOutline, cloudUploadOutline, logoGoogle, logOutOutline, syncOutline } from 'ionicons/icons';
import BaseHeader from '@/core/components/BaseHeader.vue';
import { useToast } from '@/core/composables/useToast';
import {
  exportBackupJson,
  getLocalStorage,
  importBackupJson,
  toError,
  useFirebaseCloud,
  type FirebaseAuthUser,
} from '@/core/storage';

type BusyAction = 'signin' | 'sync' | 'signout' | 'export' | 'import' | null;

const props = defineProps<{
  onRestored?: () => Promise<void> | void;
}>();

const model = defineModel<boolean>({ default: false });

const { showSuccessToast, showErrorToast } = useToast();

const busyAction = shallowRef<BusyAction>(null);
const currentUser = shallowRef<FirebaseAuthUser | null>(null);
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');

const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024;
const isNativePlatform = Capacitor.isNativePlatform();
const jsonFileAccept = isNativePlatform ? undefined : 'application/json,text/plain,application/octet-stream,.json';

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

function isShareCanceledError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') {
    return true;
  }
  const message =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : String(err);
  return message.toLowerCase().includes('cancel');
}

async function exportJsonFile(filename: string, content: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({
        title: filename,
        files: [uri],
        dialogTitle: 'Export Backup',
      });
      return true;
    } catch (err) {
      if (isShareCanceledError(err)) {
        return false;
      }
      throw err;
    }
  }

  downloadJsonFile(filename, content);
  return true;
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

async function handleFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  try {
    await runAction('import', async () => {
      if (file.size > MAX_IMPORT_FILE_BYTES) {
        throw new Error('File is too large to import (max 50 MB)');
      }
      const rawJson = await readFileAsText(file);
      const result = await importBackupJson(getLocalStorage(), rawJson);
      await props.onRestored?.();
      await showSuccessToast(`Imported ${result.transactionsCount} transactions`);
    });
  } finally {
    input.value = '';
  }
}

const handleExport = () =>
  runAction('export', async () => {
    const json = await exportBackupJson(getLocalStorage());
    const filename = `budget-backup-${dayjs().format('YYYY-MM-DD')}.json`;
    const exported = await exportJsonFile(filename, json);
    if (exported) {
      await showSuccessToast('Backup exported');
    }
  });

const triggerImport = () => {
  fileInputRef.value?.click();
};

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
  <ion-modal
    :is-open="model"
    :backdrop-dismiss="busyAction === null"
    :can-dismiss="busyAction === null"
    @didDismiss="closeModal"
  >
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
              file.
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
            :accept="jsonFileAccept"
            class="hidden-file-input"
            @change="handleFileSelected"
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
