import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'renderer'),
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './renderer/src'),
      '@components': path.resolve(__dirname, './renderer/src/components'),
      '@pages': path.resolve(__dirname, './renderer/src/pages'),
      '@utils': path.resolve(__dirname, './renderer/src/utils'),
      '@backend': path.resolve(__dirname, './backend')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  }
});
