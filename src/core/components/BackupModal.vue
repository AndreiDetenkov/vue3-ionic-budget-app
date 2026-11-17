<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import dayjs from 'dayjs';
import { IonButton, IonButtons, IonChip, IonContent, IonIcon, IonModal, IonSpinner, IonText } from '@ionic/vue';
import { cloudDownloadOutline, cloudUploadOutline, syncOutline } from 'ionicons/icons';
import BaseHeader from '@/core/components/BaseHeader.vue';
import { useToast } from '@/core/composables/useToast';
import {
  exportBackupJson,
  getLocalStorage,
  importBackupJson,
  migrateFromSupabase,
  toError,
  type BudgetStorage,
} from '@/core/storage';

type BusyAction = 'export' | 'import' | 'supabase' | null;

const props = defineProps<{
  remoteStorage?: BudgetStorage;
  onRestored?: () => Promise<void> | void;
}>();

const model = defineModel<boolean>({ default: false });

const { showSuccessToast, showErrorToast } = useToast();

const busyAction = ref<BusyAction>(null);
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');

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

const handleFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  try {
    await runAction('import', async () => {
      const rawJson = await readFileAsText(file);
      const result = await importBackupJson(getLocalStorage(), rawJson);
      await props.onRestored?.();
      await showSuccessToast(`Imported ${result.transactionsCount} transactions`);
    });
  } finally {
    input.value = '';
  }
};

const handleSupabaseImport = () =>
  runAction('supabase', async () => {
    const result = await migrateFromSupabase(getLocalStorage(), props.remoteStorage);
    await props.onRestored?.();
    await showSuccessToast(`Imported ${result.transactionsCount} transactions from Supabase`);
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
      <div class="backup-section">
        <ion-text color="medium">
          <p class="description">
            Data is stored locally on your device. Export a JSON backup anytime or merge data from a saved file or
            Supabase.
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
          data-testid="import-supabase-btn"
          :disabled="busyAction !== null"
          @click="handleSupabaseImport"
        >
          <ion-spinner v-if="busyAction === 'supabase'" name="lines" />
          <template v-else>
            <ion-icon slot="start" :icon="syncOutline" />
            Import from Supabase
          </template>
        </ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
ion-content {
  --background: var(--ion-color-bg-light-grey);
}

.backup-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.description {
  margin-top: 0;
  line-height: 1.4;
}

.hidden-file-input {
  display: none;
}
</style>
