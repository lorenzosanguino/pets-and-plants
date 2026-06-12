import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React y React-DOM en su propio chunk
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // Firebase en su propio chunk (es pesado)
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase-vendor';
          }
          // idb / IndexedDB en su propio chunk
          if (id.includes('node_modules/idb')) {
            return 'db-vendor';
          }
        }
      }
    },
    // Subir el límite de aviso a 600KB para chunks secundarios (los lazy se cargan bajo demanda)
    chunkSizeWarningLimit: 600
  }
})
