import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Must match android/app/build.gradle and google-services.json. Permanent once on Google Play.
  appId: 'com.pawfleet.app',
  appName: 'PawFleet',
  webDir: 'dist',
  plugins: {
    Geolocation: {
      permissions: ['coarseLocation', 'fineLocation'],
    },
    // Web requests go through the phone's own network stack, so they are not throttled while the app is in the background.
    CapacitorHttp: { enabled: true },
  },
  android: {
    // Stops Android pausing location updates after 5 minutes in the background.
    useLegacyBridge: true,
    allowMixedContent: false,
    backgroundColor: '#1B4332',
  },
  ios: {
    backgroundColor: '#1B4332',
    contentInset: 'automatic',
    // scroll: false prevents iOS bounce on the root view
    scrollEnabled: false,
  },
  server: {
    cleartext: false,
  },
};

export default config;
