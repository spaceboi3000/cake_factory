// Optional browser smoke test: start `npm run dev` first. Requires Node 22+
// and local Chrome (override CHROME_PATH if needed); no browser dependency.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const output = mkdtempSync(join(tmpdir(), 'cake-browser-'));
const chrome = spawn(process.env.CHROME_PATH ?? '/opt/google/chrome/chrome', [
  '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
  '--remote-debugging-port=0', `--user-data-dir=${join(output, 'profile')}`, 'about:blank',
], { stdio: 'ignore' });
let launchError;
chrome.on('error', error => { launchError = error; });
let socket;
const errors = [];
try {
  let targets;
  for (let i = 0; i < 100; i++) {
    if (launchError) throw launchError;
    try {
      const port = readFileSync(join(output, 'profile', 'DevToolsActivePort'), 'utf8').split('\n')[0];
      targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      break;
    }
    catch { await sleep(100); }
  }
  assert.ok(targets?.length, 'Chrome started');
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const event = JSON.parse(data);
    if (event.id) {
      const item = pending.get(event.id);
      pending.delete(event.id);
      event.error ? item.reject(event.error) : item.resolve(event.result);
    }
    if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails);
    if (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error') errors.push(event.params.args);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function until(expression, timeout = 20000) {
    const start = Date.now();
    while (!(await evaluate(expression))) {
      if (Date.now() - start > timeout) throw new Error('Timed out: ' + expression);
      await sleep(30);
    }
  }
  async function click(text) {
    await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)} || b.textContent.includes(${JSON.stringify(text)})); if (!b || b.disabled) throw new Error('Button unavailable: ' + ${JSON.stringify(text)}); b.click(); })()`);
    await sleep(50);
  }
  const metric = id => evaluate(`document.querySelector('[data-testid="${id}"]')?.textContent`);
  const timers = delay => evaluate(`[...window.__intervals.values()].filter(value => value === ${delay}).length`);
  async function screenshot(name) {
    await sleep(200);
    const layout = await call('Page.getLayoutMetrics');
    const result = await call('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: layout.cssContentSize.width, height: layout.cssContentSize.height, scale: 1 },
    });
    writeFileSync(join(output, `${name}.png`), Buffer.from(result.data, 'base64'));
  }
  async function viewport(width, height = 900, mobile = false) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await sleep(80);
  }
  async function key(key, code, windowsVirtualKeyCode, text) {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, text });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
    await sleep(50);
  }
  async function setSpeed(value) {
    await evaluate(`(() => { const el = document.querySelector('input[type="range"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '${value}'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(50);
  }
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__intervals = new Map(); window.__frames = new Set();
    const si = window.setInterval, ci = window.clearInterval;
    window.setInterval = (fn, delay, ...args) => { const id = si(fn, delay, ...args); window.__intervals.set(id, delay); return id; };
    window.clearInterval = id => { window.__intervals.delete(id); ci(id); };
    const raf = window.requestAnimationFrame, caf = window.cancelAnimationFrame;
    window.requestAnimationFrame = fn => { const id = raf(time => { window.__frames.delete(id); fn(time); }); window.__frames.add(id); return id; };
    window.cancelAnimationFrame = id => { window.__frames.delete(id); caf(id); };
  ` });
  await viewport(1440);
  await call('Page.navigate', { url: process.env.APP_URL ?? 'http://127.0.0.1:3000' });
  await until(`document.body?.innerText.includes('WINDOW 3')`);
  await until(`[...window.__intervals.values()].includes(100)`);
  const battery = () => evaluate(`Number([...document.querySelectorAll('span')].find(el => el.textContent === 'POWER CELL REMAINING').nextElementSibling.textContent.replace('%',''))`);
  assert.equal(await timers(100), 1, 'one DVFS interval under Strict Mode');
  await screenshot('dvfs-desktop');
  const batteryBefore = await battery();
  await click('WINDOW 3');
  assert.equal(await timers(100), 0);
  assert.equal(await timers(600), 0);
  assert.equal(await evaluate(`document.body.innerText.includes('POWER CELL REMAINING') || document.body.innerText.includes('SCROLL DOWN TO VIEW')`), false);
  async function assertHintHidden() {
    assert.equal(await evaluate(`document.querySelector('[data-testid="cache-hint"]') !== null`), false);
    assert.equal(await evaluate(`/matching toppings together|Hint comparison|15 cycles|saves 9/.test(document.querySelector('.cache-game').textContent)`), false, 'no answer in results or optional explanatory text');
  }
  await assertHintHidden();
  assert.equal(await evaluate(`document.querySelector('.cache-game').textContent.includes('Need a hint?')`), false);
  assert.equal(await evaluate(`document.getElementById('cache-challenge').textContent`), 'Six cakes, two of each topping. Can you make fewer pantry trips?');
  const orderNames = () => evaluate(`[...document.querySelectorAll('[data-testid="cache-orders"] button')].map(b => b.getAttribute('aria-label'))`);
  const initialNames = await orderNames();
  for (const topping of ['Strawberry', 'Chocolate', 'Vanilla']) assert.equal(initialNames.filter(name => name.includes(topping)).length, 2);
  assert.ok(initialNames.every((name, index) => name.startsWith('Order ' + (index + 1) + ':')));
  const accessibility = await call('Accessibility.getFullAXTree');
  assert.ok(accessibility.nodes.some(node => node.role?.value === 'button' && node.name?.value === initialNames[0]));
  assert.match(await evaluate(`document.querySelector('details').textContent`), /a CPU reads data without consuming it/);
  const visibleGameText = () => evaluate(`document.querySelector('.cache-game').innerText`);
  const idleText = await visibleGameText();
  for (const topping of ['Strawberry', 'Chocolate', 'Vanilla']) assert.equal(idleText.split(topping).length - 1, 2, 'names appear only on the two relevant order cards');
  assert.equal(idleText.includes('Position'), false);
  assert.ok(await evaluate(`document.querySelector('[data-testid="cache-feedback"]').getBoundingClientRect().bottom <= innerHeight`), 'bakery feedback fits the desktop viewport');
  assert.ok(await evaluate(`document.querySelector('[aria-label="Round controls"]').getBoundingClientRect().bottom <= innerHeight`), 'controls fit the desktop viewport');
  await screenshot('cache-desktop');
  for (let cycle = 1; cycle <= 24; cycle++) {
    await click('Step one cycle');
    assert.equal(await metric('cache-cycles'), String(cycle));
    assert.equal(await metric('cache-cakes'), `${Math.floor(cycle / 4)} / 6`);
    if (cycle < 4) assert.match(await metric('cache-feedback'), new RegExp(`baker waiting. Wait ${cycle} of 3`));
    assert.equal(/Strawberry|Chocolate|Vanilla/.test(await visibleGameText()), false, 'active rounds use icons without repeated topping words');
    assert.deepEqual(await orderNames(), initialNames, 'full accessible order names remain available');
    if (cycle === 2) assert.equal(await metric('cache-shelf'), '——');
    if (cycle === 3) assert.match(await metric('cache-shelf'), /🍓—/);
  }
  assert.equal(await metric('cache-misses'), '6');
  assert.equal(await metric('cache-hits'), '0');
  assert.equal(await metric('cache-status'), 'Round complete');
  assert.match(await metric('cache-result'), /Your round score.*6 cakes · 6 pantry trips · 24 cycles/);
  await assertHintHidden();
  assert.equal(await evaluate(`document.querySelector('.cache-game').textContent.includes('Need a hint?')`), true);
  await screenshot('cache-mixed-result');
  console.log('PASS: mixed trace; wait feedback, shelf arrival, cake count and 24 cycles');

  await click('Reset');
  assert.match(await visibleGameText(), /Strawberry/);
  await evaluate(`document.querySelector('[aria-label="Order 1: Strawberry topping cake"]').focus()`);
  await key('Enter', 'Enter', 13, '\r');
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-pressed')`), 'true');
  await evaluate(`document.querySelector('[aria-label="Order 2: Chocolate topping cake"]').focus()`);
  await key(' ', 'Space', 32, ' ');
  assert.ok(await evaluate(`document.querySelector('[aria-label="Order 1: Chocolate topping cake"]') !== null`));
  console.log('PASS: keyboard swaps using Enter and Space');

  await assertHintHidden();
  assert.equal(await evaluate(`document.querySelector('.cache-game').textContent.includes('Need a hint?')`), true, 'hint availability survives Reset');
  await click('Restore mixed orders');
  await click('Need a hint?');
  assert.match(await metric('cache-hint'), /Hint comparison/);
  assert.match(await metric('cache-hint'), /Same work, fewer waits/);
  await click('Reset');
  assert.ok(await metric('cache-hint'), 'revealed hint survives Reset');
  await click('Try hint example');
  assert.match((await orderNames()).join(' / '), /Order 2: Strawberry.*Order 3: Chocolate.*Order 4: Chocolate.*Order 5: Vanilla/);
  await click('Run');
  assert.equal(await timers(600), 1);
  assert.equal(/Strawberry|Chocolate|Vanilla/.test(await visibleGameText()), false);
  await until(`document.querySelector('[data-testid="cache-cycles"]').textContent === '2'`);
  await click('Pause');
  assert.equal(await timers(600), 0);
  await sleep(750);
  assert.equal(await metric('cache-cycles'), '2');
  assert.ok(await evaluate(`[...document.querySelectorAll('[data-testid="cache-orders"] button')].every(b => b.disabled)`));
  await click('Step one cycle');
  assert.equal(await metric('cache-cycles'), '3');
  await click('Resume');
  assert.equal(await timers(600), 1);
  await until(`document.querySelector('[data-testid="cache-status"]').textContent === 'Round complete'`);
  assert.equal(await metric('cache-cycles'), '15');
  assert.equal(await metric('cache-cakes'), '6 / 6');
  assert.equal(await metric('cache-misses'), '3');
  assert.equal(await metric('cache-hits'), '3');
  assert.equal(await timers(600), 0);
  assert.match(await metric('cache-result'), /Hint-assisted round score/);
  assert.equal((await metric('cache-result')).includes('Your round score'), false);
  await screenshot('cache-grouped-result');
  console.log('PASS: grouped automatic round, 15 cycles, pause/resume/step, locked orders and timer cleanup');

  // A fresh visit must protect discovery again. Complete a self-arranged round
  // using real mouse input and verify automatic reveal only at completion.
  await click('WINDOW 2');
  await click('WINDOW 3');
  await assertHintHidden();
  async function mouseCard(position) {
    const point = await evaluate(`(() => { const el = document.querySelector('[data-testid="cache-orders"] button:nth-child(${position})'); el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2 }; })()`);
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    await sleep(60);
  }
  await mouseCard(2);
  await mouseCard(4);
  await mouseCard(3);
  await mouseCard(5);
  await assertHintHidden();
  for (let cycle = 1; cycle <= 15; cycle++) {
    await click('Step one cycle');
    if (cycle < 15) await assertHintHidden();
  }
  assert.equal(await metric('cache-cycles'), '15');
  assert.match(await metric('cache-result'), /Your round score/);
  assert.ok(await metric('cache-hint'), 'completed self-arrangement reveals example');
  const selfArranged = await orderNames();
  await click('Reset');
  assert.deepEqual(await orderNames(), selfArranged);
  assert.equal(await metric('cache-shelf'), '——');
  assert.ok(await metric('cache-hint'));
  console.log('PASS: protected discovery, persistent hint access, assisted score labels and mouse self-arrangement auto-reveal');
  await click('Run');
  await click('WINDOW 2');
  assert.equal(await timers(600), 0);
  assert.equal(await timers(100), 0);
  assert.equal(await evaluate(`window.__frames.size`), 1);
  async function watchPipeline(pipelined) {
    await evaluate(`(() => { window.__productionTrace = []; window.__observer?.disconnect(); let last = 0; window.__observer = new MutationObserver(() => { const cycle = Number(document.querySelector('[data-testid="pipeline-cycles"]').textContent.slice(1)); const produced = Number(document.querySelector('[data-testid="pipeline-produced"]').textContent.split(' ')[0]); if (produced !== last) { window.__productionTrace.push([cycle, produced]); last = produced; } }); window.__observer.observe(document.querySelector('[data-testid="pipeline-produced"]'), { childList:true, characterData:true, subtree:true }); })()`);
    await until(`Number(document.querySelector('[data-testid="pipeline-cycles"]').textContent.slice(1)) >= 9`);
    assert.deepEqual(await evaluate(`window.__productionTrace`), pipelined ? [[3,1],[4,2],[5,3],[6,4],[7,5],[8,6],[9,7]] : [[3,1],[6,2],[9,3]]);
    await evaluate(`window.__observer.disconnect()`);
  }
  await watchPipeline(false);
  await screenshot('pipeline-sequential-desktop');
  await click('PIPELINING:');
  assert.equal(await metric('pipeline-cycles'), '#0');
  assert.equal(await metric('pipeline-produced'), '0 cakes');
  assert.equal(await evaluate(`document.querySelector('[data-testid="pipeline-track"]').childElementCount`), 0);
  assert.equal(await evaluate(`window.__frames.size`), 1);
  await setSpeed(5);
  await watchPipeline(true);
  await screenshot('pipeline-desktop');
  console.log('PASS: pipeline browser completions, mode reset and one animation loop at 1 and 5 cycles/sec');

  await click('WINDOW 3');
  assert.equal(await metric('cache-cycles'), '0');
  assert.equal(await metric('cache-shelf'), '——');
  assert.equal(await evaluate(`window.__frames.size`), 0);
  await click('WINDOW 1');
  assert.ok(Math.abs((await battery()) - batteryBefore) < 2, 'battery stays frozen while away');
  assert.equal(await timers(100), 1);
  await until(`document.body.innerText.includes('POWER CELL DEPLETED')`, 5000);
  await click('WINDOW 3');
  assert.equal(await evaluate(`document.body.innerText.includes('POWER CELL DEPLETED')`), false);
  console.log('PASS: cross-tab timer isolation, DVFS battery freeze/modal isolation and fresh cache remount');

  await viewport(390, 844, true);
  await call('Emulation.setTouchEmulationEnabled', { enabled: true });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await screenshot('cache-mobile');
  async function tapOrder(label) {
    const point = await evaluate(`(() => { const el = document.querySelector('[aria-label="${label}"]'); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(100);
  }
  await tapOrder('Order 1: Strawberry topping cake');
  await tapOrder('Order 2: Chocolate topping cake');
  assert.ok(await evaluate(`document.querySelector('[aria-label="Order 1: Chocolate topping cake"]') !== null`));
  await click('Run');
  await until(`document.querySelector('[data-testid="cache-cycles"]').textContent === '1'`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[aria-label="One baker"]')).animationName`), 'none');
  assert.match(await metric('cache-feedback'), /baker waiting/);
  await click('Pause');
  await screenshot('cache-mobile-wait');
  const overflow = () => evaluate(`({ width: innerWidth, scroll: document.documentElement.scrollWidth })`);
  const cacheWidth = await overflow();
  assert.equal(cacheWidth.width, cacheWidth.scroll, 'no page overflow on mobile');
  assert.equal(await evaluate(`[...document.querySelectorAll('[data-testid="cache-orders"] button')].every(el => el.scrollWidth <= el.clientWidth)`), true, 'all topping names fit the cards');
  await call('Accessibility.getFullAXTree');
  console.log('Cache narrow width:', cacheWidth);
  await click('WINDOW 2');
  await screenshot('pipeline-mobile');
  await click('PIPELINING:');
  await screenshot('pipeline-mobile-three-stations');
  console.log('Pipeline narrow width:', await overflow());
  await click('WINDOW 1');
  await click('REPLACE BATTERY');
  await setSpeed(1);
  await screenshot('dvfs-mobile');
  console.log('DVFS narrow width:', await overflow());
  console.log('PASS: touch swaps, reduced-motion state feedback and narrow screenshots of all windows');
  assert.deepEqual(errors, [], 'no browser console errors or uncaught exceptions');
  console.log('PASS: no console errors');
  console.log('Screenshots:', output);
} catch (error) {
  console.error(error);
  console.error('Browser errors:', JSON.stringify(errors));
  console.error('Screenshots:', output);
  process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill();
}
