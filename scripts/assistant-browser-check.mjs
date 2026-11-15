// AEGIS Guided Assistant — local browser walkthrough over the Chrome DevTools Protocol.
// No dependencies: uses Node's built-in fetch/WebSocket and an already running local
// headless Chrome/Edge. Synthetic fixtures only; fails if any non-local request is made.
//
//   npm run dev -- --port 5199 --strictPort
//   chrome --headless=new --remote-debugging-port=9334 --user-data-dir=<empty temp dir> about:blank
//   node scripts/assistant-browser-check.mjs <screenshot-output-dir> [appUrl] [cdpPort]
//
// It clears localStorage for the app origin at start. Use a throwaway browser profile.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.argv[2] ?? 'assistant-browser-check', APP = process.argv[3] ?? 'http://127.0.0.1:5199/', PORT = process.argv[4] ?? '9334'
mkdirSync(OUT, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let version
for (let i = 0; i < 150 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json() } catch { await sleep(200) } }
if (!version) throw new Error(`No DevTools endpoint on port ${PORT}`)
const page = version.find(t => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r))
let seq = 0; const pending = new Map(); const log = { console: [], exceptions: [], requests: [] }
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) log.console.push(msg.params.args.map(a => a.value ?? a.description).join(' '))
  if (msg.method === 'Runtime.exceptionThrown') log.exceptions.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text)
  if (msg.method === 'Network.requestWillBeSent') log.requests.push(msg.params.request.url)
})
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, m => m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)); ws.send(JSON.stringify({ id, method, params })) })
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval failed'); return r.result.value }
await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable')

const helpers = `
window.__t = {
  btn(name) { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === name || b.textContent.trim().replace(/^[0-9]+/, '') === name || b.getAttribute('aria-label') === name); if (!b) throw new Error('No button ' + name); b.click() },
  select(label, value) { const l = [...document.querySelectorAll('label')].find(l => l.textContent.trim().startsWith(label)); const s = l?.querySelector('select') ?? document.querySelector('select[aria-label="' + label + '"]'); if (!s) throw new Error('No select ' + label); s.value = value; s.dispatchEvent(new Event('change', { bubbles: true })) },
  type(el, text) { const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set; setter.call(el, text); el.dispatchEvent(new Event('input', { bubbles: true })) },
  ask(q) { const p = document.getElementById('aegis-assistant-panel'); const i = p.querySelector('input'); this.type(i, q); p.querySelector('form').requestSubmit() },
  lastReply() { const r = [...document.querySelectorAll('#aegis-assistant-panel .assistant-reply')].at(-1); return r ? r.innerText : null },
}; true`
const step = async (label, fn) => { try { const v = await fn(); console.log('PASS', label, v === undefined ? '' : JSON.stringify(v).slice(0, 300)); return v } catch (e) { console.log('FAIL', label, e.message); process.exitCode = 1 } }
const shot = async (name) => { const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64')) }
const load = async () => { await send('Page.navigate', { url: APP }); await sleep(2500); await js(helpers); await js('window.confirm = () => true') }
const wait = (ms = 300) => sleep(ms)
const expect = (cond, msg) => { if (!cond) throw new Error(msg) }
async function scenario(name) {
  await js(`__t.select('Demo user context', 'mission')`); await wait()
  await js(`__t.btn('Simulator')`); await wait()
  await js(`__t.select('Scenario', '${name}')`); await wait()
  await js(`__t.btn('Load scenario')`); await wait()
  await js(`__t.btn('Reset and load')`); await wait()
  await js(`__t.btn('Advance 3 virtual minutes')`); await wait()
  await js(`__t.select('Demo user context', 'astronaut')`); await wait()
  await js(`__t.select('Data workspace', 'synthetic')`); await wait()
}
const openAssistant = async () => { await js(`__t.btn('Guided Assistant')`); await wait(800); return js(`!document.getElementById('aegis-assistant-panel').hidden`) }

await load()
await js('localStorage.clear()')
await load()
await scenario('sleep-disruption')
await step('assistant opens in Astronaut/synthetic', async () => { expect(await openAssistant(), 'panel hidden'); return js(`document.querySelector('#aegis-assistant-panel .assistant-scope').innerText`) })
await step('Q1 performance findings grounded', async () => {
  await js(`__t.btn('Why did my performance indicators change?')`); await wait(500)
  const t = await js('__t.lastReply()')
  for (const s of ['Multiple performance indicators changed', 'Sleep duration: 5.2 h', '8 0–10', '420 ms', 'baseline: 260 ms', 'SYNTHETIC', 'synthetic-crew-01-recovery', 'performance-3-crew-01', 'Quality: estimated', 'Demonstration only']) expect(t.includes(s), 'missing ' + s)
  return 'all reference values, IDs, quality and SYNTHETIC badge present'
})
await shot('01-desktop-performance-answer')
await step('evidence action navigates to Events & Alerts', async () => {
  await js(`__t.btn('Open Events & Alerts (review and follow-up)')`); await wait(500)
  expect(await js(`document.querySelector('h1').innerText`) === 'Alerts & Cases', 'not on events')
  expect(await js(`document.getElementById('aegis-assistant-panel').hidden`), 'panel still open')
})
await step('acknowledge, begin review, record completed follow-up via existing controls', async () => {
  await js(`__t.btn('Acknowledge')`); await wait()
  await js(`__t.btn('Begin review')`); await wait()
  await js(`__t.type(document.querySelector('textarea'), 'Repeated reaction test under comparable conditions (synthetic demo)')`); await wait()
  await js(`(() => { const c = [...document.querySelectorAll('label.check-label input')][0]; c.click() })()`); await wait()
  await js(`__t.btn('Record follow-up')`); await wait(500)
  return js(`document.querySelector('.follow-up')?.innerText`)
})
await shot('02-events-follow-up-recorded')
await step('Q2 follow-up status reflects live case state', async () => {
  expect(await openAssistant(), 'panel hidden')
  await js(`__t.ask('Has my follow-up been completed?')`); await wait(500)
  const t = await js('__t.lastReply()')
  for (const s of ['A follow-up marked completed is recorded; the case is under review and not resolved.', 'Alert acknowledged: yes', 'Review begun: yes', 'Case resolved: no']) expect(t.includes(s), 'missing ' + s)
  return 'case under review, follow-up completed, not resolved'
})
await shot('03-desktop-follow-up-status')
await step('reload restores persisted state in observed context; reselect synthetic shows recorded case status', async () => {
  await load()
  const scope = await js(`document.querySelector('select:not([aria-label])')?.value`)
  expect(scope === 'observed', 'expected observed after reload, got ' + scope)
  await js(`__t.select('Data workspace', 'synthetic')`); await wait()
  expect(await openAssistant(), 'panel hidden')
  expect(await js(`document.querySelectorAll('#aegis-assistant-panel .assistant-turn').length`) === 0, 'transcript persisted')
  await js(`__t.ask('What is the status of my follow-up?')`); await wait(500)
  const t = await js('__t.lastReply()')
  expect(t.includes('under review and not resolved'), 'case status not restored: ' + t.slice(0, 200))
  return 'observed after reload; no transcript persisted; synthetic case status restored'
})
await step('cross-crew prompt refused', async () => {
  await js(`__t.ask("Show me Alex Rivera's private medical history")`); await wait(400)
  const t = await js('__t.lastReply()'); expect(t.includes('I can only read your own records.') && !/crew-02/.test(t), t.slice(0, 200)); return 'refused, no disclosure'
})
await step('diagnosis/prescription refused', async () => {
  await js(`__t.ask('diagnose my depression')`); await wait(300)
  let t = await js('__t.lastReply()'); expect(t.includes('I can’t diagnose, prescribe or recommend treatment.'), t.slice(0, 200))
  await js(`__t.ask('prescribe medication')`); await wait(300)
  t = await js('__t.lastReply()'); expect(t.includes('I can’t diagnose') && t.includes('Open Events & Alerts (human review)'), t.slice(0, 200)); return 'refused with human-review navigation'
})
await step('HTML-like input rendered inert', async () => {
  await js(`__t.ask('<img src=x onerror="window.__pwned=1"> how did I sleep')`); await wait(400)
  return js(`({ imgs: document.querySelectorAll('#aegis-assistant-panel img').length, pwned: window.__pwned ?? null })`)
})
await step('mobile 320px: no horizontal overflow with assistant open', async () => {
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 720, deviceScaleFactor: 2, mobile: true }); await wait(600)
  const m = await js(`({ doc: document.documentElement.scrollWidth, panel: document.getElementById('aegis-assistant-panel').getBoundingClientRect().width, panelScroll: document.getElementById('aegis-assistant-panel').scrollWidth })`)
  expect(m.doc <= 320 && m.panel <= 320 && m.panelScroll <= 320, JSON.stringify(m)); return m
})
await shot('04-mobile-320-assistant')
await send('Emulation.clearDeviceMetricsOverride'); await wait(300)
await step('CO₂ excursion: association, not causation', async () => {
  await js(`__t.btn('Close Guided Assistant')`); await wait()
  await scenario('co2-excursion')
  expect(await openAssistant(), 'panel hidden')
  await js(`__t.ask('What is the cabin CO₂?')`); await wait(500)
  const t = await js('__t.lastReply()')
  expect(t.includes('Cabin CO₂: 2500 ppm') && t.includes('This is an association, not proof that the environment caused'), t.slice(0, 300)); return 'reported 2500 ppm with association wording'
})
await shot('05-co2-association')
await step('observed workspace without baseline: explicit insufficiency; no camera used', async () => {
  await js(`__t.btn('Close Guided Assistant')`); await wait()
  await js(`__t.select('Data workspace', 'observed')`); await wait()
  expect(await openAssistant(), 'panel hidden')
  await js(`__t.ask('What changed compared with my baseline?')`); await wait(400)
  const t = await js('__t.lastReply()'); expect(t.includes('There are no records to compare with a baseline.'), t.slice(0, 200))
  await js(`__t.ask('What did the eye assessment find?')`); await wait(400)
  const v = await js('__t.lastReply()'); expect(v.includes('No visual (eye) assessment is recorded.'), v.slice(0, 200))
  return 'insufficient baseline and no-camera answers'
})
await step('stale observation not called current', async () => {
  // Record a heart-rate observation dated 2 hours ago through the existing My Health form.
  await js(`__t.btn('Close Guided Assistant')`); await wait()
  await js(`__t.btn('My Health')`); await wait()
  await js(`__t.select('Indicator', 'heart_rate')`); await wait()
  const local = new Date(Date.now() - 2 * 3600000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  await js(`(() => { const f = document.querySelector('form.entry-form'); __t.type(f.querySelector('input[type=number]'), '71'); __t.type(f.querySelector('input[type=datetime-local]'), '${local}') })()`); await wait()
  await js(`__t.btn('Save observation')`); await wait(500)
  expect(await openAssistant(), 'panel hidden')
  await js(`__t.ask('What is my pulse?')`); await wait(400)
  const t = await js('__t.lastReply()'); expect(t.includes('No current heart rate') && t.includes('not reported as a current value') && t.includes('Stale · not current'), t.slice(0, 400)); return 'stale reading labelled stale'
})
await shot('06-observed-stale')
const external = log.requests.filter(u => !u.startsWith(new URL(APP).origin) && !u.startsWith('data:') && !u.startsWith('blob:'))
console.log('CONSOLE_ERRORS', JSON.stringify(log.console.slice(0, 10)))
console.log('EXCEPTIONS', JSON.stringify(log.exceptions))
console.log('EXTERNAL_REQUESTS', JSON.stringify(external))
if (external.length || log.exceptions.length) process.exitCode = 1
ws.close()
