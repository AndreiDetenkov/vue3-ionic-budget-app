import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.personal.budget',
  appName: 'budget-app',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'http://192.168.31.199:5173/',
    cleartext: true,
  },
};

export default config;
