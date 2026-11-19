import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budget.app',
  appName: 'Personal Budget App',
  webDir: 'dist',
  plugins: {
    // Native side only fetches the Google ID token; the Firebase JS SDK owns the session.
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
