import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // dev에서 /api → Express 백엔드 (CORS 없이 연동)
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
})
