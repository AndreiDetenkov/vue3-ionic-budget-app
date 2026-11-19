<script setup lang="ts">
import { shallowRef } from 'vue';
import { storeToRefs } from 'pinia';
import {
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonGrid,
  IonIcon,
  IonLabel,
  IonPage,
  IonProgressBar,
  IonRow,
  onIonViewWillEnter,
} from '@ionic/vue';
import { cloudUploadOutline } from 'ionicons/icons';
import { useCategoryStore } from '@/modules/categories';
import { useReportStore } from '@/modules/reports';
import { useTransactionStore } from '@/modules/transactions';
import { useFirebaseCloud } from '@/core/storage';
import BackupModal from '@/core/components/BackupModal.vue';
import BaseRefresher from '@/core/components/BaseRefresher.vue';
import BaseHeader from '@/core/components/BaseHeader.vue';
import TotalAmount from '@/modules/transactions/components/TotalAmount.vue';
import TransactionList from '@/modules/transactions/components/TransactionList.vue';

const categoryStore = useCategoryStore();
const reportStore = useReportStore();
const transactionStore = useTransactionStore();
const { loading, transactions } = storeToRefs(transactionStore);
const { getTransactionsByRange } = transactionStore;
const isBackupModalOpen = shallowRef(false);

onIonViewWillEnter(() => {
  if (!transactions.value.length) getTransactionsByRange('month');
});

const reloadStores = () =>
  Promise.all([
    categoryStore.getCategoryList(true),
    getTransactionsByRange(transactionStore.transactionsUnit),
    reportStore.refreshReports(),
  ]);

const refreshContent = async () => {
  const cloud = useFirebaseCloud();
  if (cloud.isSyncEnabled()) {
    try {
      await cloud.syncNow();
    } catch {
      // Offline or auth error: still reload local data below.
    }
  }
  await reloadStores();
};

const handleBackupRestored = async () => {
  await reloadStores();

  if (categoryStore.error) {
    throw categoryStore.error;
  }
  if (transactionStore.error) {
    throw transactionStore.error;
  }
};
</script>

<template>
  <ion-page>
    <BaseHeader title="Transactions">
      <template #buttons>
        <ion-buttons slot="end">
          <ion-button aria-label="Backup and sync" @click="isBackupModalOpen = true">
            <ion-icon slot="icon-only" :icon="cloudUploadOutline" />
          </ion-button>
        </ion-buttons>
      </template>
      <ion-progress-bar v-if="loading" type="indeterminate" color="secondary" />
    </BaseHeader>

    <ion-content fullscreen class="ion-padding">
      <BaseRefresher :on-refresh="refreshContent" />

      <template v-if="transactions.length">
        <TotalAmount />
        <TransactionList />
      </template>
      <ion-grid v-else class="ion-padding-top">
        <ion-row>
          <ion-col class="ion-text-center">
            <ion-label> Oops!...No Transactions at this moment </ion-label>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>

    <BackupModal v-model="isBackupModalOpen" :on-restored="handleBackupRestored" />
  </ion-page>
</template>

<style scoped>
ion-content {
  --background: var(--ion-color-bg-light-grey);
}
</style>
