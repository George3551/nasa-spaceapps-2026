import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve('dist')
assert.ok(existsSync(root), 'Build first: npm run build')
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = resolve(directory, entry.name)
  return entry.isDirectory() ? walk(path) : [path]
})
const files = walk(root)
assert.ok(files.length < 20000, 'Too many Pages assets')
for (const file of files) {
  const name = relative(root, file).split(sep).join('/')
  assert.ok(statSync(file).size <= 25 * 1024 * 1024, `Pages 25 MiB per-file limit: ${name}`)
  assert.ok(!/(^|\/)(node_modules|src|\.git|fixtures|output)\//.test(name), `Development resource shipped: ${name}`)
  assert.ok(!name.endsWith('.map'), `Source map shipped: ${name}`)
}
const html = readFileSync(resolve(root, 'index.html'), 'utf8')
const entries = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
assert.ok(entries.some(path => path.endsWith('.js')), 'Missing production entry')
for (const path of entries) {
  assert.ok(path.startsWith('/') && !path.startsWith('//'), `Entry must be same-origin root-relative: ${path}`)
  assert.ok(existsSync(resolve(root, path.slice(1))), `Missing entry asset: ${path}`)
}
assert.ok(!html.includes('/src/') && !html.includes('@vite/'), 'Development HTML shipped')
assert.ok(!existsSync(resolve(root, '404.html')), 'Keep Pages default SPA fallback enabled')
const headers = readFileSync(resolve(root, '_headers'), 'utf8')
for (const value of ["connect-src 'self'", "'wasm-unsafe-eval'", "frame-ancestors 'none'", 'camera=(self)', 'microphone=()', 'nosniff']) assert.ok(headers.includes(value), `Missing header protection: ${value}`)
const manifest = JSON.parse(readFileSync('public/models/vision/manifest.json', 'utf8'))
assert.equal(readFileSync(resolve(root, 'models/vision/manifest.json'), 'utf8'), readFileSync('public/models/vision/manifest.json', 'utf8'))
for (const asset of manifest.assets) {
  const content = readFileSync(resolve(root, 'models/vision', asset.path))
  assert.equal(content.length, asset.bytes, `Asset size: ${asset.path}`)
  assert.equal(createHash('sha256').update(content).digest('hex'), asset.sha256, `Asset SHA-256: ${asset.path}`)
}
for (const name of ['LICENSE', 'NOTICE.txt']) assert.ok(existsSync(resolve(root, 'models/vision', name)), `Missing ${name}`)
// Repository-relative Markdown links are checked without making external requests.
for (const file of ['README.md', ...walk(resolve('docs')).filter(path => path.endsWith('.md'))]) {
  const markdown = readFileSync(file, 'utf8')
  for (const [, label, target] of markdown.matchAll(/\[([^\]]+)\]\(([^\s)]+)\)/g)) {
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/)/i.test(target)) continue
    const path = decodeURIComponent(target.split('#')[0])
    assert.ok(existsSync(resolve(file, '..', path)), `Broken local link in ${file}: ${label} -> ${target}`)
  }
}
const largest = files.reduce((a, b) => statSync(a).size > statSync(b).size ? a : b)
console.log(JSON.stringify({ result: 'pass', files: files.length, modelAssets: manifest.assets.length, largest: { path: relative(root, largest).split(sep).join('/'), bytes: statSync(largest).size }, localDocumentationLinks: 'pass' }, null, 2))
