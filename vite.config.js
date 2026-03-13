import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { geminiProxyPlugin } from './server/gemini-proxy.js'

export default defineConfig({
  plugins: [react(), geminiProxyPlugin()],
  server: {
    host: true,
  },
})
