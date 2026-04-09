import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://backend:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'ol': ['ol'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'state': ['zustand', '@tanstack/react-query'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['ol', 'zustand', '@tanstack/react-query'],
  },
})
