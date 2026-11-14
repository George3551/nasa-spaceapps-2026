// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
it('ships the exact pinned local models and runtime declared in the manifest', () => {
  const root = 'public/models/vision/'
  const manifest = JSON.parse(readFileSync(root + 'manifest.json', 'utf8')) as { assets: { path: string; bytes: number; sha256: string }[] }
  expect(manifest.assets).toHaveLength(6)
  for (const asset of manifest.assets) {
    const bytes = readFileSync(root + asset.path)
    expect(bytes.length).toBe(asset.bytes)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256)
  }
})
