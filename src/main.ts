import { app } from './app';
import router from '@/app/router';

router.isReady().then(() => {
  app.mount('#app');
});
