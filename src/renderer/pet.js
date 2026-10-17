'use strict';
const cat = document.getElementById('cat');
const sprite = document.getElementById('sprite');
const bubble = document.getElementById('bubble');
let currentPose;

function render(state) {
  if (!state) return;
  if (state.pose !== currentPose) { sprite.src = `../../assets/cat/${state.pose}.png`; currentPose = state.pose; }
  sprite.style.transform = state.facing < 0 ? 'scaleX(-1)' : '';
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
cat.addEventListener('dblclick', () => window.miso.panel());
document.addEventListener('contextmenu', (event) => { event.preventDefault(); window.miso.menu(); });
