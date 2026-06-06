import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zetass.pos',
  appName: 'Zetass Pos',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    loggingBehavior: 'none',
  },
  ios: {
    scheme: 'ZetassPos',
  },
}

export default config
