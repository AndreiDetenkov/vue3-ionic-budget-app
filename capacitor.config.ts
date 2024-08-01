import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budget.app',
  appName: 'budget-app',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
