import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api/ai': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: () => '/v1beta/models/gemini-2.0-flash:generateContent',
      },
    },
  },
})
