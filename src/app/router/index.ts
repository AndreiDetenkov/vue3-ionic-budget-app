import { createRouter, createWebHistory } from '@ionic/vue-router';
import { Router, RouteRecordRaw } from 'vue-router';

import TabsPage from '@/views/TabsPage.vue';

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
        component: () => import('@/views/Transactions.vue'),
      },
      {
        path: 'categories',
        component: () => import('@/views/Categories.vue'),
      },
      {
        path: 'add',
        component: () => import('@/views/AddTransaction.vue'),
      },
    ],
  },
];

const router: Router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
