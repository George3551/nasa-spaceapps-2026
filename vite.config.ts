/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Build and test configuration.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  // Pages hosts the app at the origin root; SPA fallback paths must use root assets.
  base: '/',
  plugins: [react(), tailwindcss()],
  test: {
    // Integration worktrees and temporary tools are not part of this app's suite.
    exclude: [...configDefaults.exclude, '**/.aegis-scaffold/**'],
    environment: 'jsdom',
    setupFiles: ['./src/app/test/setup.ts'],
    clearMocks: true,
  },
})
