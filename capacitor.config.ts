import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dhlstores.app',
  appName: 'DHL Stores',
  webDir: 'dist/public',
  // Keep OAuth on the HTTPS web origin until a verified Android deep-link callback is added.
  // Override for a different production domain with CAPACITOR_SERVER_URL during sync.
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://cuahangtoit-9a4r8wsz.manus.space',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
