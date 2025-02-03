<script setup lang="ts">
import { IonCol, IonGrid, IonItem, IonLabel, IonRow, IonThumbnail, IonAccordionGroup, IonAccordion } from '@ionic/vue';
import { CategoryReport } from '@/modules/reports';
import { formatDate } from '@/core/utils/dates';

defineProps<{
  reports: CategoryReport[];
}>();
</script>

<template>
  <ion-accordion-group>
    <ion-accordion v-for="report in reports" :key="report.name" :value="report.name">
      <ion-item slot="header">
        <ion-grid>
          <ion-row class="ion-align-items-center">
            <ion-col size="auto">
              <ion-thumbnail>
                <img alt="" :src="report.icon" />
              </ion-thumbnail>
            </ion-col>

            <ion-col>
              <ion-label>{{ report.name }}</ion-label>
            </ion-col>

            <ion-col size="auto">
              <ion-label>{{ report.value }}&nbsp;&#8838;</ion-label>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-item>

      <div slot="content">
        <ion-list lines="full">
          <ion-item v-for="transaction in report.transactions" :key="transaction.id">
            <ion-grid>
              <ion-row class="ion-align-items-center">
                <ion-col>
                  <ion-label class="title">{{ transaction.name }}</ion-label>
                </ion-col>

                <ion-col size="auto">
                  <ion-label class="amount">{{ transaction.value }}</ion-label>
                  <ion-label class="date">{{ formatDate(transaction.createdAt) }}</ion-label>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-item>
        </ion-list>
      </div>
    </ion-accordion>
  </ion-accordion-group>
</template>

<style scoped>
ion-thumbnail {
  --size: 2rem;
  margin-right: 1rem;
}

.title {
  font-size: 1rem;
  color: var(--ion-color-medium-shade);
}

.amount {
  font-size: 16px;
  text-align: right;
}

.date {
  font-size: 11px;
  color: var(--ion-color-medium-shade);
}
</style>
