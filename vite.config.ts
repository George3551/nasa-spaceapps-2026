import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Pages hosts the app at the origin root; SPA fallback paths must use root assets.
  base: '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/app/test/setup.ts'],
    clearMocks: true,
  },
})
