<script setup lang="ts">
import { IonChip } from '@ionic/vue';
import { ref } from 'vue';

enum Filter {
  LastYear = 'lastYear',
  CurrentYear = 'currentYear',
  LastMonth = 'lastMonth',
  CurrentMonth = 'currentMonth',
}

const selectedFilter = ref<Filter>();

const filters = [
  { value: Filter.LastYear, label: 'Last year' },
  { value: Filter.CurrentYear, label: 'Current year' },
  { value: Filter.LastMonth, label: 'Last month' },
  { value: Filter.CurrentMonth, label: 'Current month' },
];
</script>

<template>
  <div class="ion-padding">
    <ion-chip
      v-for="filter in filters"
      :key="filter.value"
      :outline="selectedFilter !== filter.value"
      color="primary"
      @click="selectedFilter = filter.value"
    >
      {{ filter.label }}
    </ion-chip>
  </div>
</template>

<style scoped></style>
