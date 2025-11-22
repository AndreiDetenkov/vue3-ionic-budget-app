<script setup lang="ts">
import { IonAccordion, IonAccordionGroup, IonList } from '@ionic/vue';
import { Report } from '@/modules/reports';
import ReportListItem from '@/modules/reports/components/ReportListItem.vue';
import ReportListHeader from '@/modules/reports/components/ReportListHeader.vue';

defineProps<{
  reports: Report[];
}>();
</script>

<template>
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
