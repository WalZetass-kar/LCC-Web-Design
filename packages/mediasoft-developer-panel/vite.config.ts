import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    obfuscatorPlugin({
      apply: 'build',
      exclude: [/node_modules/],
      options: {
        compact: true,
        identifierNamesGenerator: 'hexadecimal',
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.6,
        rotateStringArray: true,
        deadCodeInjection: false,
        controlFlowFlattening: false,
        selfDefending: false,
      },
    }),
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('recharts')) return 'vendor-charts'
          if (id.includes('@tanstack')) return 'vendor-table'
          if (id.includes('jspdf') || id.includes('xlsx') || id.includes('exceljs')) return 'vendor-export'
          if (id.includes('@capacitor')) return 'vendor-capacitor'
          if (id.includes('i18next')) return 'vendor-i18n'
          if (id.includes('react')) return 'vendor-react'
          return undefined
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
  },
  server: {
    port: 5174,
  },
})
