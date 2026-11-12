const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const origin = process.env.TEST_ORIGIN || 'http://localhost:8000';
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_BINARY || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/ajna/`);
    assert.equal(await page.locator('.mobile-puzzle-viewport').count(), 0);
    assert.equal(await page.locator('.mobile-puzzle-zoom').isVisible(), false);
    const menu = page.locator('#wordMenu');
    const initial = await menu.boundingBox();
    const title = await page.locator('.panel-primary > .title').boundingBox();
    await page.mouse.move(title.x + 30, title.y + 10);
    await page.mouse.down(); await page.mouse.move(title.x + 110, title.y + 50, {steps: 4}); await page.mouse.up();
    const moved = await menu.boundingBox();
    assert(moved.x > initial.x + 60 && moved.y > initial.y + 20, 'Desktop menu drag');
    const handle = await page.locator('.panel-resize').boundingBox();
    await page.mouse.move(handle.x + 10, handle.y + 10); await page.mouse.down();
    await page.mouse.move(handle.x + 70, handle.y + 50, {steps: 4}); await page.mouse.up();
    assert((await menu.boundingBox()).width > moved.width + 40, 'Desktop menu resize');
    await page.locator('.panel-options summary').click();
    const volume = page.locator('.panel-volume input');
    await volume.fill('37');
    assert.equal(await page.locator('.panel-volume output').textContent(), '37%');
    await page.locator('[aria-label="Ocultar menu"]').click();
    assert.equal(await menu.isVisible(), false);
    await page.reload();
    assert.equal(await menu.isVisible(), false, 'Current hidden-menu preference survives reload');
    await page.locator('.panel-restore').click();
    await page.locator('#toggleMenu').click();
    assert.equal(await menu.evaluate(e => e.classList.contains('collapsed')), true);
    await page.locator('#toggleMenu').click();
    await page.mouse.move(1200, 600); await page.mouse.wheel(0, -100);
    await page.waitForTimeout(100);
    assert(await page.locator('.container').evaluate(e => Number(e.style.zoom) > 1), 'Desktop wheel zoom');
    await page.locator('.panel-options summary').click();
    await page.keyboard.press('d'); await page.waitForTimeout(200);
    assert(await page.evaluate(() => scrollX > 0), 'Desktop keyboard navigation');
    // A real pointer click must still reach a hidden-element target after zoom.
    const target = page.locator('.image-map-targets > [role="button"]').first();
    await target.scrollIntoViewIfNeeded();
    const point = await target.evaluate(el => {
      const r = el.getBoundingClientRect();
      for (let y = r.top + 1; y < r.bottom; y += 2) for (let x = r.left + 1; x < r.right; x += 2) {
        if (document.elementFromPoint(x, y) === el) return {x, y};
      }
      return null;
    });
    assert(point, 'Visible image-map target');
    const counter = await page.locator('#counter').textContent();
    await page.mouse.click(point.x, point.y);
    assert.notEqual(await page.locator('#counter').textContent(), counter, 'Desktop puzzle selection');
    for (const path of ['ajna/', 'tyre/']) {
      await page.goto(`${origin}/${path}`);
      await page.setViewportSize({width: 800, height: 700});
      assert.equal(await page.locator('.mobile-puzzle-viewport, .mobile-board-viewport').count(), 0, 'Mouse-only small desktop keeps original puzzle structure');
    }
    // A touch device crossing the breakpoint must recover desktop preferences.
    for (const [path, zoomKey] of [['/ajna/', '_ajna__mandalaZoom'], ['/LispenardStreet/', 'lispenardStreetMandalaZoomV1']]) {
      const touch = await browser.newContext({viewport: {width: 1100, height: 844}, hasTouch: true});
      await touch.addInitScript(({path, zoomKey}) => {
        localStorage.setItem(zoomKey, '1.4');
        localStorage.setItem('puzzlePanel:' + path, JSON.stringify({left: 40, top: 60, width: 320, height: '500px', collapsed: false}));
        localStorage.setItem('lispenardStreetGateV1', 'solved');
        localStorage.setItem('lispenardStreetSpoilerAlertV1', 'seen');
      }, {path, zoomKey});
      const mobile = await touch.newPage(); await mobile.goto(origin + path);
      const saved = await mobile.evaluate(path => localStorage.getItem('puzzlePanel:' + path), path);
      await mobile.setViewportSize({width: 390, height: 844});
      await mobile.locator('#toggleMenu').click();
      await mobile.locator('[data-zoom="fit"]').click();
      assert.equal(await mobile.evaluate(key => localStorage.getItem(key), zoomKey), '1.4', 'Mobile zoom must not overwrite desktop zoom');
      assert.equal(await mobile.evaluate(path => localStorage.getItem('puzzlePanel:' + path), path), saved, 'Mobile layout must not overwrite desktop position');
      await mobile.setViewportSize({width: 1100, height: 844});
      await mobile.waitForTimeout(100);
      assert.equal(await mobile.locator('.mobile-puzzle-viewport').count(), 0);
      const width = await mobile.locator('.container').evaluate(e => e.getBoundingClientRect().width);
      const baseWidth = path === '/ajna/' ? 2048 : 3072;
      assert(Math.abs(width - baseWidth * 1.4) < 1, path + ': restore desktop zoom');
      assert.equal(await mobile.locator('#wordMenu').evaluate(e => e.classList.contains('collapsed')), false);
      const restored = await mobile.locator('#wordMenu').boundingBox();
      assert.equal(restored.x, 40); assert.equal(restored.y, 60); assert.equal(restored.width, 320);
      await touch.close();
    }
    const phone = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const phonePage = await phone.newPage();
    await phonePage.goto(`${origin}/ajna/`);
    await phonePage.locator('#toggleMenu').click();
    await phonePage.locator('[aria-label="Ocultar menu"]').click();
    await phonePage.reload();
    assert.equal(await phonePage.locator('#wordMenu').isVisible(),false,'Mobile hidden-menu preference survives reload');
    await phonePage.locator('.panel-restore').click();
    assert.equal(await phonePage.locator('#wordMenu').isVisible(),true);
    await phone.close();
    assert.deepEqual(errors, []);
    console.log('PASS desktop drag, resize, volume, hide/restore, collapse, wheel zoom, keyboard navigation, puzzle selection, small mouse-only viewport, and desktop/mobile preference isolation');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
