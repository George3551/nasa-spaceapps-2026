import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const base = new URL(process.argv[2] ?? 'https://REPLACE-WITH-APP.pages.dev/')
assert.ok(!base.username && !base.password && base.pathname === '/' && !base.search && !base.hash, 'Pass the root URL, without credentials or query')
assert.ok(base.protocol === 'https:' || (base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname)), 'Use HTTPS, or localhost for local rehearsal')
assert.ok(!base.hostname.includes('replace-with'), 'Supply the actual URL: node scripts/verify-deployment.mjs https://your-app.pages.dev/')
const get = async path => {
  const response = await fetch(new URL(path, base), { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`)
  assert.equal(new URL(response.url).origin, base.origin, `${path}: unexpected cross-origin redirect`)
  return response
}
const response = await get('/')
assert.ok(response.headers.get('content-type')?.includes('text/html'), 'Root must be HTML')
const csp = response.headers.get('content-security-policy') ?? ''
for (const directive of ["connect-src 'self'", "'wasm-unsafe-eval'", "frame-ancestors 'none'"]) assert.ok(csp.includes(directive), `Missing CSP ${directive}`)
assert.ok(response.headers.get('permissions-policy')?.includes('camera=(self)'), 'Same-origin camera must be allowed')
assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
const html = await response.text()
const entries = text => [...text.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
const expectedEntries = entries(readFileSync('dist/index.html', 'utf8'))
assert.deepEqual(entries(html), expectedEntries, 'Deployed build entries differ from this local production build')
for (const path of expectedEntries) {
  const asset = await get(path), mime = asset.headers.get('content-type') ?? ''
  assert.ok(!mime.includes('text/html'), `${path}: SPA fallback returned HTML instead of an asset`)
  if (path.endsWith('.js')) assert.ok(/javascript/.test(mime), `${path}: incorrect JavaScript MIME type`)
  if (path.endsWith('.css')) assert.ok(mime.includes('text/css'), `${path}: incorrect CSS MIME type`)
}
const manifest = JSON.parse(readFileSync('public/models/vision/manifest.json', 'utf8'))
assert.deepEqual(await (await get('/models/vision/manifest.json')).json(), manifest, 'Model manifest differs')
for (const asset of manifest.assets) {
  const response = await get(`/models/vision/${asset.path}`)
  if (asset.path.endsWith('.wasm')) assert.ok(response.headers.get('content-type')?.includes('application/wasm'), `${asset.path}: incorrect WASM MIME type`)
  const content = new Uint8Array(await response.arrayBuffer())
  assert.equal(content.length, asset.bytes, `${asset.path}: wrong size, possibly SPA fallback`)
  assert.equal(createHash('sha256').update(content).digest('hex'), asset.sha256, `${asset.path}: wrong SHA-256`)
}
const fallback = await get('/__aegis_release_refresh__/')
assert.deepEqual(entries(await fallback.text()), expectedEntries, 'SPA fallback must resolve the same root-relative assets')
console.log(JSON.stringify({ result: 'pass', url: base.href, entryAssets: expectedEntries.length, modelAssets: manifest.assets.length, headers: 'pass', spaFallback: 'pass', note: 'HTTP verification only. Browser workflows and real-webcam checklist are separate gates.' }, null, 2))
