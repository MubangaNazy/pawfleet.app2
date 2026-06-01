import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pawfleet.app',
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
};

export default config;
