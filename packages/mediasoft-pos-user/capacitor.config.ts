import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mediasoft.pos.zetass',
  appName: 'MediaSoft POS Zetass v2.0',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
  ios: {
    scheme: 'MediaSoftPOSZetass',
  },
}

export default config
