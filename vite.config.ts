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
    port: 5173,
  },
})
