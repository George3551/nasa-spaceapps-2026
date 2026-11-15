/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Lint configuration.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', '.aegis-scaffold', '.npm-cache', '.wrangler', 'public/models/vision/wasm'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'contracts/**/*.ts'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  { files: ['*.{js,ts}'], languageOptions: { globals: globals.node } },
  { files: ['scripts/*.mjs'], languageOptions: { globals: globals.node } },
)
