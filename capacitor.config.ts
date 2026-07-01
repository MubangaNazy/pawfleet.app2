import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'zm.pawfleet.app',
  appName: 'PawFleet',
  webDir: 'dist',
  plugins: {
    Geolocation: {
      permissions: ['coarseLocation', 'fineLocation'],
    },
  },
  android: {
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
    // Allow localhost during dev; remove before prod build
    cleartext: false,
  },
};

export default config;
