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
  const js = (code) => panel.webContents.executeJavaScript(code, true);
  const petJS = (code) => pet.webContents.executeJavaScript(code, true);
  await until(() => js('!!document.getElementById("open-miso")'), 'launcher loaded');
  await until(() => petJS('document.getElementById("sprite").complete && document.getElementById("sprite").naturalWidth > 0'), 'cat loaded');

  if (process.env.MISO_TEST_RESTORE === '1') {
    assert.equal(ctx.state().settings.size, 1);
    assert.equal(ctx.state().settings.outfit, 'hat');
    assert.equal(ctx.state().settings.roaming, false);
    assert.equal(ctx.state().settings.firstRun, false);
    assert.equal(ctx.state().pose, 'hat-idle');
    console.log('PASS: Selected skin and sit-still choice survive a full restart.');
    return;
  }

  assert.equal(await js('document.querySelectorAll("button").length'), 1);
  assert.equal(await js('document.querySelector("nav, aside, select") === null'), true);
  assert.equal(pet.isVisible(), false, 'Miso waits for the Open button on a normal launch');
  assert.equal(pet.isAlwaysOnTop(), true);
  assert.equal(pet.isResizable(), false);
  assert.equal(await petJS('getComputedStyle(document.body).backgroundColor'), 'rgba(0, 0, 0, 0)');
  assert.equal((await pet.webContents.capturePage()).toBitmap()[3], 0);
  assert.equal(pet.webContents.getLastWebPreferences().contextIsolation, true);
  assert.equal(pet.webContents.getLastWebPreferences().nodeIntegration, false);
  assert.equal(await js('typeof require'), 'undefined');
  fs.writeFileSync(path.join(process.env.MISO_TEST_RESULTS, 'launcher.png'), (await panel.webContents.capturePage()).toPNG());
  ctx.updateSettings({ hidden: true, roaming: false });
  await js('document.getElementById("open-miso").click()');
  await until(() => ctx.getPanel() === null && pet.isVisible(), 'one button opens cat and closes launcher');
  console.log('PASS: Single-button launcher, transparent native pet, isolated renderers.');

  const fixedSize = pet.getSize();
  const skins = ctx.menuItems().find((item) => item.label === 'Change skin').submenu;
  assert.equal(skins.length, 4);
  for (const [index, outfit] of ['none', 'hat', 'pumpkin', 'box'].entries()) {
    skins[index].click();
    assert.equal(ctx.state().settings.outfit, outfit);
    ctx.perform('pet');
    assert.equal(ctx.state().pose, `${outfit}-idle`);
    assert.equal(ctx.state().activity, 'interact');
    ctx.perform('play');
    assert.equal(ctx.state().pose, `${outfit}-idle`);
    ctx.perform('sleep');
    assert.equal(ctx.state().pose, `${outfit}-sleep`);
    ctx.perform('sleep');
    assert.equal(ctx.state().settings.outfit, outfit);
    assert.deepEqual(pet.getSize(), fixedSize);
  }
  ctx.updateSettings({ outfit: 'pumpkin', roaming: false });
  pet.webContents.sendInputEvent({ type: 'mouseDown', x: 115, y: 130, button: 'left', clickCount: 1 });
  pet.webContents.sendInputEvent({ type: 'mouseUp', x: 115, y: 130, button: 'left', clickCount: 1 });
  await until(() => ctx.state().activity === 'interact', 'real pointer reaction');
  await until(() => petJS('document.getElementById("sprite").src.endsWith("pumpkin-idle.png")'), 'skin retained by renderer');
  assert.deepEqual(pet.getSize(), fixedSize);
  console.log('PASS: Every skin stays on through petting, playing, napping and waking; no resizing.');

  ctx.updateSettings({ roaming: false });
  ctx.menuItems().find((item) => item.label === 'Wander around').click();
  assert.equal(ctx.state().settings.roaming, true);
  ctx.perform('recall');
  ctx.updateSettings({ clickThrough: true });
  const before = pet.getPosition();
  await until(() => pet.getPosition().some((value, index) => value !== before[index]), 'roaming', 12000);
  const start = pet.getPosition();
  await sleep(200);
  const end = pet.getPosition();
  if (end[0] !== start[0]) {
    assert.equal(ctx.state().facing, end[0] > start[0] ? 1 : -1);
    const transform = await petJS('getComputedStyle(document.getElementById("sprite")).transform');
    assert.equal(transform, ctx.state().facing < 0 ? 'matrix(-1, 0, 0, 1, 0, 0)' : 'none');
  }
  assert.match(ctx.state().pose, /^pumpkin-walk_[12]$/);
  ctx.menuItems().find((item) => item.label === 'Sit still').click();
  const stopped = pet.getPosition();
  await sleep(300);
  assert.deepEqual(pet.getPosition(), stopped);
  assert.equal(ctx.state().pose, 'pumpkin-idle');
  ctx.updateSettings({ clickThrough: false });
  const p = ctx.getPosition();
  assert.equal(ctx.hitTest({ x: p.x + 1, y: p.y + 1 }, 'pumpkin-idle'), false);
  assert.equal(ctx.hitTest({ x: p.x + 115, y: p.y + 140 }, 'pumpkin-idle'), true);
  console.log('PASS: Native roaming faces its travel direction; Sit still stops it; alpha hit testing works.');

  ctx.updateSettings({ outfit: 'hat', roaming: false });
  ctx.persist();
  await until(() => petJS('document.getElementById("sprite").src.endsWith("hat-idle.png") && document.getElementById("sprite").complete'), 'hat loaded');
  await sleep(150);
  fs.writeFileSync(path.join(process.env.MISO_TEST_RESULTS, 'companion.png'), (await pet.webContents.capturePage()).toPNG());
  for (const skin of ['none', 'hat', 'pumpkin', 'box']) {
    for (const pose of ['idle', 'walk_1', 'walk_2', 'sleep']) {
      ctx.updateSettings({ outfit: skin, sleeping: pose === 'sleep' });
      // Verify all generated assets are valid fixed-size RGBA images, with a clear border.
      const img = require('electron').nativeImage.createFromPath(path.join(__dirname, '../assets/cat/hd', `${skin}-${pose}.png`));
      assert.deepEqual(img.getSize(), { width: 320, height: 320 });
      const data = img.toBitmap();
      for (let i = 0; i < 320; i++) {
        for (const offset of [i, 319 * 320 + i, i * 320, i * 320 + 319]) assert.equal(data[offset * 4 + 3], 0);
      }
    }
  }
  ctx.updateSettings({ outfit: 'hat', sleeping: false, roaming: false });
  ctx.persist();
  ctx.showPanel();
  await until(() => ctx.getPanel().isVisible(), 'launcher reopened');
  assert.deepEqual(rendererErrors, []);
  console.log('PASS: All 16 sprites load with clean transparent borders, consistent frames, saved skin.');
};
