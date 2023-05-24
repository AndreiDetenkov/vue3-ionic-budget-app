import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'vue-ionic-budget-app',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'http://10.203.60.21:5173',
    cleartext: true,
  },
};

export default config;
