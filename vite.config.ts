import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
  preview: {
    allowedHosts: ['sonypharm-lpc.tail9aa352.ts.net'],
  },
  server: {
    allowedHosts: ['sonypharm-lpc.tail9aa352.ts.net'],
  },
})
