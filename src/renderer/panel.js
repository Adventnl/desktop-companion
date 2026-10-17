'use strict';
const $ = (id) => document.getElementById(id);
let latest;
const titles = { home: 'Meet your new shadow.', wardrobe: 'A wardrobe for a little soul.', settings: 'Your day. Your kind of company.' };
const outfitNames = { none: 'A friendly little haunting.', hat: 'A little everyday magic.', pumpkin: 'Cozy looks good on you.', box: 'Home is wherever we fit.' };

function render(state) {
  if (!state) return;
  latest = state;
  const s = state.settings;
  $('roaming').checked = s.roaming;
  $('reduced-motion').checked = s.reducedMotion;
  $('click-through').checked = s.clickThrough;
  $('launch-login').checked = s.launchAtLogin;
  $('launch-login').disabled = !state.capabilities.login;
  $('login-description').textContent = state.capabilities.login ? 'Start Miso when you sign in to your computer.' : 'Available in the installed app, outside development or portable mode.';
  $('speed').value = s.speed;
  $('sleep-label').textContent = s.sleeping ? 'Rise & shine' : 'Take a nap';
  $('sleep-description').textContent = s.sleeping ? 'Hello, sleepy little spirit' : 'Dream a little dream';
  $('visibility-label').textContent = s.hidden ? 'Taking a break' : 'On your desktop';
  $('visibility').setAttribute('aria-label', s.hidden ? 'Show Miso' : 'Hide Miso');
  $('visibility').classList.toggle('off', s.hidden);
  $('preview-sprite').src = `../../assets/cat/${state.pose}.png`;
  $('scene-status').textContent = s.hidden ? 'TAKING A LITTLE BREAK' : s.sleeping ? 'DREAMING LITTLE DREAMS' : s.reducedMotion ? 'QUIETLY KEEPING COMPANY' : 'HAPPILY HAUNTING';
  $('preview-message').textContent = state.message || (s.sleeping ? 'The world can wait a little.' : outfitNames[s.outfit]);
  $('version').textContent = state.version;
  $('notice').textContent = state.notice;
  $('notice').hidden = !state.notice;
  document.body.classList.toggle('reduce-motion', s.reducedMotion);
  document.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.size) === s.size)));
  document.querySelectorAll('[data-outfit]').forEach((b) => {
    const selected = b.dataset.outfit === s.outfit;
    b.classList.toggle('selected', selected);
    b.setAttribute('aria-pressed', String(selected));
  });
}

function showError() { $('notice').hidden = false; $('notice').textContent = 'Miso could not update that setting. Please try again.'; }
async function update(patch) { try { render(await window.miso.update(patch)); } catch { showError(); } }
async function action(name) { try { render(await window.miso.action(name)); } catch { showError(); } }

document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
  const tab = button.dataset.tab;
  document.querySelectorAll('.tab-panel').forEach((panel) => { panel.hidden = panel.id !== tab; });
  document.querySelectorAll('[data-tab]').forEach((b) => {
    b.classList.toggle('active', b === button);
    if (b === button) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('page-title').textContent = titles[tab];
}));
document.querySelector('.brand').addEventListener('click', (e) => { e.preventDefault(); document.querySelector('[data-tab="home"]').click(); });
document.querySelectorAll('[data-size]').forEach((button) => button.addEventListener('click', () => update({ size: Number(button.dataset.size) })));
document.querySelectorAll('[data-outfit]').forEach((button) => button.addEventListener('click', () => update({ outfit: button.dataset.outfit })));
for (const [id, key] of [['roaming', 'roaming'], ['reduced-motion', 'reducedMotion'], ['click-through', 'clickThrough'], ['launch-login', 'launchAtLogin']]) {
  $(id).addEventListener('change', () => update({ [key]: $(id).checked }));
}
$('speed').addEventListener('change', () => update({ speed: $('speed').value }));
$('visibility').addEventListener('click', () => { if (latest) update({ hidden: !latest.settings.hidden }); });
$('pet-action').addEventListener('click', () => action('pet'));
$('preview-pet').addEventListener('click', () => action('pet'));
$('play-action').addEventListener('click', () => action('play'));
$('sleep-action').addEventListener('click', () => action('sleep'));
$('recall').addEventListener('click', () => action('recall'));
$('next-display').addEventListener('click', () => action('next-display'));
$('quit').addEventListener('click', () => action('quit'));
$('close-panel').addEventListener('click', () => window.miso.closePanel());
if (navigator.userAgent.includes('Mac')) $('shortcut').textContent = '⌘ ⇧ M';
window.miso.onState(render);
window.miso.getState().then(render).catch(showError);
