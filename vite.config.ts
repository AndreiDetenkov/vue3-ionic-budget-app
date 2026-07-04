import legacy from '@vitejs/plugin-legacy';
import vue from '@vitejs/plugin-vue';
import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue(), legacy()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router/') || id.includes('node_modules/pinia/')) {
            return 'vue-vendor';
          }

          if (id.includes('node_modules/@ionic/vue/') || id.includes('node_modules/@ionic/vue-router/') || id.includes('node_modules/@ionic/core/')) {
            return 'ionic-vendor';
          }

          if (id.includes('node_modules/@supabase/supabase-js/')) {
            return 'supabase-vendor';
          }

          if (id.includes('node_modules/@tanstack/vue-query/')) {
            return 'query-vendor';
          }

          if (id.includes('node_modules/dayjs/')) {
            return 'utils';
          }

          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
