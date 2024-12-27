import { createRouter, createWebHistory } from '@ionic/vue-router';
import { Router, RouteRecordRaw } from 'vue-router';

import TabsPage from '@/core/views/TabsPage.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/transactions',
  },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      {
        path: '',
        redirect: '/tabs/transactions',
      },
      {
        path: 'transactions',
        component: () => import('@/modules/transaction/views/TransactionsPage.vue'),
      },
      {
        path: 'calculations',
        component: () => import('@/views/CalculationsView.vue'),
      },
      {
        path: 'add',
        component: () => import('@/modules/transaction/views/AddTransactionPage.vue'),
      },
    ],
  },
];

const router: Router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
