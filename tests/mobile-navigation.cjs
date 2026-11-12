// Run against a local HTTP server: node tests/mobile-navigation.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const origin = process.env.TEST_ORIGIN || 'http://localhost:8000';
const wordPuzzles = ['LAURA/index.html', 'LispenardStreet/index.html', 'ajna/index.html', 'arcane/index.html', 'bichanos/index.html', 'celtic/index.html', 'cores/index.html', 'fundodomar/level3.html', 'goya/index.html', 'losgatos/index.html', 'mais_gatos/index.html', 'margrego/index.html', 'rotadeseda/index.html', 'tarits/index.html', 'unrealunearth/index.html', 'vibevegana/index.html', 'yaga/index_abruxa.html'];
const jigsaws = ['alittlepuzzle/', 'allthewitches/', 'flower/', 'green_eye/', 'lucifer/', 'passacaglia/', 'tyre/', 'yaga/', 'mosaico/', 'pavao/', 'fundodomar/'];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_BINARY || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.addInitScript(() => {
      localStorage.setItem('lispenardStreetGateV1', 'solved');
      localStorage.setItem('lispenardStreetSpoilerAlertV1', 'seen');
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function bounds(selector) {
      const box = await page.locator(selector).boundingBox();
      assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 391 && box.y + box.height <= 845, `${selector} outside mobile viewport: ${JSON.stringify(box)}`);
    }
    for (const path of wordPuzzles) {
      await page.goto(`${origin}/${path}`, { waitUntil: 'load' });
      await page.locator('#wordMenu.collapsed').waitFor();
      await bounds('#wordMenu');
      await page.locator('#toggleMenu').click();
      await bounds('#wordMenu');
      if (path === 'LispenardStreet/index.html') {
        assert.equal(await page.evaluate(() => {const r=document.getElementById('wordMenu').getBoundingClientRect(); return menuResizeEdges({target:document.getElementById('wordList'), clientX:r.left+1, clientY:r.top+1});}), '', 'Docked mobile menu must not start legacy edge resizing');
      }
      await page.locator('[data-zoom="fit"]').click();
      const width = await page.locator('.mobile-puzzle-viewport > *').evaluate(e => e.getBoundingClientRect().width);
      assert(width <= 391, `${path}: fit width ${width}`);
      await page.locator('[data-zoom="in"]').click();
      const larger = await page.locator('.mobile-puzzle-viewport > *').evaluate(e => e.getBoundingClientRect().width);
      assert(larger > width, `${path}: zoom must enlarge puzzle`);
      console.log(`PASS ${path}`);
    }
    for (const path of jigsaws) {
      await page.goto(`${origin}/${path}`, { waitUntil: 'load' });
      if (path === 'mosaico/') await page.locator('#easyMode').click();
      const tip = page.locator('#closeTip');
      if (await tip.isVisible()) await tip.click();
      await bounds('.mobile-jigsaw-menu');
      assert.equal(await page.locator('.mobile-jigsaw-toggle').getAttribute('aria-expanded'), 'false');
      await page.locator('.mobile-jigsaw-toggle').click();
      assert.equal(await page.locator('.mobile-jigsaw-toggle').getAttribute('aria-expanded'), 'true');
      await bounds('.mobile-jigsaw-menu');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
      console.log(`PASS ${path}`);
    }
    await page.goto(`${origin}/ajna/`);
    await page.locator('#toggleMenu').click();
    await page.locator('.panel-options summary').click();
    await page.locator('.panel-volume input').fill('23');
    assert.equal(await page.locator('.panel-volume output').textContent(), '23%');
    await page.locator('[aria-label="Ocultar menu"]').click();
    assert.equal(await page.locator('#wordMenu').isVisible(), false);
    await page.locator('.panel-restore').click();
    await page.locator('#toggleMenu').click();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: 300, y: 250}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: 150, y: 150}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    await page.waitForTimeout(200);
    assert(await page.locator('.mobile-puzzle-viewport').evaluate(e => e.scrollLeft > 0 || e.scrollTop > 0), 'Native touch pan must move the puzzle');
    await page.locator('#toggleMenu').click();
    await page.setViewportSize({width: 844, height: 390});
    const landscape = await page.locator('#wordMenu').boundingBox();
    assert(landscape.y >= 0 && landscape.y + landscape.height <= 391);
    await page.locator('[data-zoom="fit"]').click();
    const fitLandscape = await page.locator('.mobile-puzzle-viewport > *').boundingBox();
    const fitViewport = await page.locator('.mobile-puzzle-viewport').boundingBox();
    assert(fitLandscape.height <= fitViewport.height + 1, 'Landscape fit must respect puzzle viewport height');
    await page.setViewportSize({width: 320, height: 568});
    const small = await page.locator('#wordMenu').boundingBox();
    assert(small.x >= 0 && small.x + small.width <= 321 && small.y + small.height <= 569);
    const desktop = await browser.newPage({viewport: {width: 1440, height: 900}});
    await desktop.goto(`${origin}/ajna/`);
    assert.equal(await desktop.locator('.mobile-puzzle-zoom').isVisible(), false);
    assert.equal(await desktop.locator('#wordMenu').evaluate(e => e.classList.contains('collapsed')), false);
    assert.deepEqual(errors, []);
    console.log('PASS touch pan, landscape, desktop, and no JavaScript errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
