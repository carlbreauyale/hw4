import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The FastAPI backend (backend/main.py) runs on port 8000.
// Proxying /api and /images keeps the front end on a single origin in dev.
const backend = 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The project lives in a OneDrive folder, where file-change events are sometimes missed
    // (Vite then serves a stale, half-saved file). Polling checks files directly instead.
    watch: { usePolling: true, interval: 300 },
    proxy: {
      '/api': backend,
      '/images': backend,
    },
  },
})
