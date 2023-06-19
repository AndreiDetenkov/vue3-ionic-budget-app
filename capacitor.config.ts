import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budget.app',
  appName: 'budget-app',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'http://192.168.31.199:8100/',
    cleartext: true,
  },
};

export default config;
