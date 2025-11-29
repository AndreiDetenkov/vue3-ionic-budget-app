<script setup lang="ts">
import { useReportStore } from '@/modules/reports/store/reportStore';

const reportStore = useReportStore();
</script>

<template>
  <div class="total">
    <span class="total__amount">{{ reportStore.totalAmount }}</span>
    <span class="total__currency">&nbsp;KGS</span>
  </div>
</template>

<style scoped>
.total {
  border: 1px solid var(--ion-color-medium-tint);
  border-radius: 1rem;
  display: flex;
  justify-content: center;
  align-items: baseline;
  padding: 2rem 1rem;
  margin: 1rem;
}

.total__amount {
  font-size: 1.8rem;
  font-weight: 600;
}

.total__currency {
  font-size: 1.4rem;
  font-weight: 600;
}
</style>
