import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zetass.pos',
  appName: 'Zetass Pos',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
    loggingBehavior: 'none',
    backgroundColor: '#0f172a',
  },
  ios: {
    scheme: 'ZetassPos',
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
