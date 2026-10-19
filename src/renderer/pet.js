'use strict';
const cat = document.getElementById('cat');
const sprite = document.getElementById('sprite');
const bubble = document.getElementById('bubble');
let currentPose;
// Warm the small local sprite set so the first step/skin change cannot flash blank.
const sprites = [];
for (const skin of ['none', 'hat', 'pumpkin', 'box']) {
  for (const pose of ['idle', 'walk_1', 'walk_2', 'sleep']) {
    const asset = new Image();
    asset.src = `../../assets/cat/hd/${skin}-${pose}.png`;
    sprites.push(asset);
  }
}

function render(state) {
  if (!state) return;
  if (state.pose !== currentPose) { sprite.src = `../../assets/cat/hd/${state.pose}.png`; currentPose = state.pose; }
  sprite.style.transform = state.facing < 0 ? 'scaleX(-1)' : '';
  cat.dataset.activity = state.activity || '';
  cat.classList.toggle('reduced-motion', state.settings.reducedMotion);
  bubble.textContent = state.message;
  bubble.classList.toggle('visible', !!state.message);
}
window.miso.onState(render);
window.miso.getState().then(render);

cat.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  cat.setPointerCapture(event.pointerId);
  window.miso.drag('start');
});
cat.addEventListener('pointerup', (event) => {
  if (event.button !== 0) return;
  if (cat.hasPointerCapture(event.pointerId)) cat.releasePointerCapture(event.pointerId);
  window.miso.drag('end');
});
cat.addEventListener('lostpointercapture', () => window.miso.drag('end'));
cat.addEventListener('pointercancel', () => window.miso.drag('end'));
cat.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.miso.action('pet'); } });
document.addEventListener('contextmenu', (event) => { event.preventDefault(); window.miso.menu(); });
