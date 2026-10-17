'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = async function check(ctx) {
  async function until(predicate, label, timeout = 10000) {
    const start = Date.now();
    while (!(await predicate())) {
      if (Date.now() - start > timeout) throw new Error('Timed out: ' + label);
      await sleep(50);
    }
  }
  const panel = ctx.getPanel(), pet = ctx.getPet();
  const rendererErrors = [];
  for (const win of [panel, pet]) {
    win.webContents.on('console-message', (event) => {
      if (event.level === 'error') rendererErrors.push(event.message);
    });
    win.webContents.on('render-process-gone', (_event, details) => rendererErrors.push('Renderer exited: ' + details.reason));
  }
  const js = async (code) => {
    try { return await panel.webContents.executeJavaScript(code, true); }
    catch (error) { throw new Error(`Renderer command failed: ${code}`, { cause: error }); }
  };
  await until(() => js('!!document.getElementById("roaming") && !!document.getElementById("version").textContent'), 'panel loaded');
  await until(() => pet.webContents.executeJavaScript('!!document.getElementById("sprite")?.complete && document.getElementById("sprite").naturalWidth > 0'), 'cat asset loaded');

  if (process.env.MISO_TEST_RESTORE === '1') {
    assert.equal(ctx.state().settings.size, 1.35);
    assert.equal(ctx.state().settings.outfit, 'hat');
    assert.equal(ctx.state().settings.speed, 'lively');
    assert.equal(ctx.state().settings.roaming, false);
    assert.equal(ctx.state().settings.clickThrough, false);
    assert.equal(ctx.state().settings.firstRun, false);
    console.log('PASS: Preferences survive a full application restart.');
    return;
  }

  assert.equal(pet.isAlwaysOnTop(), true);
  assert.equal(pet.isResizable(), false);
  assert.equal(await pet.webContents.executeJavaScript('getComputedStyle(document.body).backgroundColor'), 'rgba(0, 0, 0, 0)');
  const petCapture = await pet.webContents.capturePage();
  assert.equal(petCapture.toBitmap()[3], 0, 'The native capture must retain transparent pixels');
  assert.equal(pet.webContents.getLastWebPreferences().contextIsolation, true);
  assert.equal(pet.webContents.getLastWebPreferences().nodeIntegration, false);
  assert.equal(await js('typeof require'), 'undefined');
  assert.equal(await js('typeof window.miso.getState'), 'function');
  console.log('PASS: Real native transparent window, always on top, isolated renderers.');

  await js('document.getElementById("pet-action").click()');
  await until(() => ctx.state().pose === 'interact', 'pet reaction');
  await js('document.getElementById("play-action").click()');
  await until(() => ctx.state().pose === 'play', 'play action');
  await js('document.getElementById("sleep-action").click()');
  await until(() => ctx.state().pose === 'sleep', 'sleep action');
  await js('document.getElementById("sleep-action").click()');
  await until(() => !ctx.state().settings.sleeping, 'wake action');
  console.log('PASS: Pet, play, sleep, and wake via real UI and IPC.');

  await js('document.querySelector("[data-tab=wardrobe]").click(); document.querySelector("[data-outfit=hat]").click()');
  await until(() => ctx.state().settings.outfit === 'hat', 'outfit setting');
  assert.equal(await js('document.getElementById("wardrobe").hidden'), false);
  assert.equal(await js('document.getElementById("home").hidden'), true);
  await js('document.querySelector("[data-tab=settings]").click(); document.querySelectorAll("[data-size]")[2].click()');
  await until(() => ctx.state().settings.size === 1.35, 'size setting');
  assert.equal(pet.getBounds().width, Math.round(230 * 1.35));
  await js('document.getElementById("speed").value="lively"; document.getElementById("speed").dispatchEvent(new Event("change"))');
  await until(() => ctx.state().settings.speed === 'lively', 'speed setting');
  await js('document.getElementById("click-through").click()');
  await until(() => ctx.state().settings.clickThrough, 'click-through');
  await js('window.miso.action("recall")');
  await until(() => !ctx.state().settings.clickThrough, 'recall rescues click-through');
  await js('document.getElementById("visibility").click()');
  await until(() => !pet.isVisible(), 'hide');
  await js('document.getElementById("visibility").click()');
  await until(() => pet.isVisible(), 'show');
  console.log('PASS: Wardrobe, resizing, pace, click-through recovery, hide/show.');

  ctx.updateSettings({ outfit: 'none', roaming: false });
  const inputScale = ctx.state().settings.size;
  pet.webContents.sendInputEvent({ type: 'mouseDown', x: Math.round(120 * inputScale), y: Math.round(150 * inputScale), button: 'left', clickCount: 1 });
  pet.webContents.sendInputEvent({ type: 'mouseUp', x: Math.round(120 * inputScale), y: Math.round(150 * inputScale), button: 'left', clickCount: 1 });
  await until(() => ctx.state().pose === 'interact', 'cat pointer interaction through its preload');
  console.log('PASS: Pointer events on the transparent companion reach its native interaction handler.');

  ctx.updateSettings({ outfit: 'none', roaming: true, speed: 'lively' });
  ctx.perform('recall');
  // Recall can place the cat under the real cursor near a screen edge.
  // Ignore the cursor during this check, since hovering intentionally pauses roaming.
  ctx.updateSettings({ clickThrough: true });
  const before = pet.getPosition();
  await until(() => pet.getPosition().some((value, index) => value !== before[index]), 'native window roaming', 10000);
  ctx.updateSettings({ reducedMotion: true });
  const still = pet.getPosition();
  await sleep(300);
  assert.deepEqual(pet.getPosition(), still, 'Reduced motion must stop movement');
  ctx.updateSettings({ reducedMotion: false, roaming: false, clickThrough: false });
  const p = ctx.getPosition();
  assert.equal(ctx.hitTest({ x: p.x + 1, y: p.y + 1 }, 'idle'), false);
  // The centre of the body in idle.png is opaque; the window corner is transparent.
  const scale = ctx.state().settings.size;
  assert.equal(ctx.hitTest({ x: p.x + 120 * scale, y: p.y + 150 * scale }, 'idle'), true);
  console.log('PASS: Native roaming, reduced motion, and sprite-alpha hit testing.');

  await js('window.miso.update({ size: 999, position: { x: -9999, y: -9999 }, outfit: "../../nope" })');
  assert.equal(ctx.state().settings.size, 1);
  assert.equal(ctx.state().settings.outfit, 'none');
  ctx.updateSettings({ size: 1.35, outfit: 'hat', roaming: false });
  ctx.persist();
  const saved = JSON.parse(fs.readFileSync(path.join(ctx.app.getPath('userData'), 'settings.json'), 'utf8'));
  assert.equal(saved.size, 1.35);
  assert.equal(saved.outfit, 'hat');
  await js('document.querySelector("[data-tab=home]").click()');
  await sleep(150);
  const screenshot = await panel.webContents.capturePage();
  fs.writeFileSync(path.join(process.env.MISO_TEST_RESULTS, 'companion-controls.png'), screenshot.toPNG());
  for (const win of [panel, pet]) {
    const badImages = await win.webContents.executeJavaScript('[...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src)');
    assert.deepEqual(badImages, []);
  }
  assert.deepEqual(rendererErrors, []);
  await js('document.getElementById("close-panel").click()');
  await until(() => ctx.getPanel() === null, 'panel closed');
  assert.equal(pet.isDestroyed(), false);
  assert.equal(pet.isVisible(), true);
  ctx.showPanel();
  await until(() => ctx.getPanel().isVisible(), 'panel reopened');
  console.log('PASS: Safe settings, asset loading, saved preferences, close/reopen controls.');
};
