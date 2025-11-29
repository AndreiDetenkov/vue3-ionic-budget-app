<script setup lang="ts">
import { IonAccordion, IonAccordionGroup, IonList, IonLabel, IonListHeader } from '@ionic/vue';
import { Report } from '@/modules/reports';
import ReportListItem from '@/modules/reports/components/ReportListItem.vue';
import ReportListHeader from '@/modules/reports/components/ReportListHeader.vue';

defineProps<{
  reports: Report[];
}>();
</script>

<template>
  <IonList>
    <IonListHeader>
      <ion-label class="list-header">
        <h2>Expense categories</h2>
      </ion-label>
    </IonListHeader>
  </IonList>

  <ion-accordion-group>
    <ion-accordion v-for="report in reports" :key="report.name" :value="report.name">
      <ReportListHeader :icon="report.icon" :name="report.name" :value="report.value" />

      <div slot="content">
        <ion-list lines="full">
          <template v-for="transaction in report.transactions" :key="transaction.id">
            <ReportListItem :item="transaction" />
          </template>
        </ion-list>
      </div>
    </ion-accordion>
  </ion-accordion-group>
</template>

<style scoped>
h2 {
  font-size: 1.25rem;
}
</style>
