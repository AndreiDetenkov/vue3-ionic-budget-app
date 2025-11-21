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
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ionic-vendor': ['@ionic/vue', '@ionic/vue-router', '@ionic/core'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'query-vendor': ['@tanstack/vue-query'],
          utils: ['dayjs'],
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
