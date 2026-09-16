// Run with Playwright installed locally, or PLAYWRIGHT_MODULE pointing to its module.
// This bounded, headed browser check exercises one viewport, one zoom, and one pan.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.MAP_SMOKE_URL || 'http://localhost:3000';
const output = process.env.MAP_SMOKE_OUTPUT || '/tmp/urban-pulse-map-smoke';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false });
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const responses = [];
    const errors = [];
    page.on('response', response => {
      if (/tile\.openstreetmap\.org|basemaps\.cartocdn\.com/.test(response.url())) responses.push({ url: response.url(), status: response.status() });
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    const map = page.locator('.leaflet-container');
    await map.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('img.leaflet-tile')].some(img => img.complete && img.naturalWidth > 0));
    const attribution = map.getByRole('link', { name: 'OpenStreetMap', exact: true });
    assert.equal(await attribution.count(), 1, 'Visible OpenStreetMap attribution is missing');
    assert.equal(await attribution.getAttribute('href'), 'https://www.openstreetmap.org/copyright');
    assert(await attribution.isVisible());
    assert(responses.length > 0 && responses.every(r => r.url.startsWith('https://tile.openstreetmap.org/') && r.status === 200), 'Anonymous tile requests must succeed');
    const initial = await map.locator('img.leaflet-tile').evaluateAll(images => images.map(i => i.src));
    await map.dblclick({ position: { x: 50, y: 60 } });
    await page.waitForFunction(old => [...document.querySelectorAll('img.leaflet-tile')].some(i => i.complete && i.naturalWidth > 0 && !old.includes(i.src)), initial);
    await page.waitForFunction(() => !document.querySelector('.leaflet-container').classList.contains('leaflet-zoom-anim'));
    await page.waitForLoadState('networkidle');
    const beforePan = await map.locator('.leaflet-map-pane').getAttribute('style');
    await map.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(before => document.querySelector('.leaflet-map-pane').getAttribute('style') !== before, beforePan);
    await page.waitForLoadState('networkidle');
    assert(responses.every(r => r.status === 200));
    assert.equal(errors.length, 0, errors.join('\n'));
    await page.waitForTimeout(400); // Let Leaflet's pan transition settle before visual inspection.
    await map.screenshot({ path: `${output}/${name}.png` });
    await writeFile(`${output}/${name}.json`, JSON.stringify({ base, viewport, responses, errors, zoom: 'PASS', pan: 'PASS', attribution: 'PASS' }, null, 2));
    console.log(`${name}: PASS; ${responses.length} tile responses; zoom, pan, attribution; inspect ${output}/${name}.png for watermark`);
    await context.close();
  }
} finally { await browser.close(); }
