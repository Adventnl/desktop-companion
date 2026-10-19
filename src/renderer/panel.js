'use strict';
const button = document.getElementById('open-miso');
window.miso.getState().then((state) => {
  if (state) document.querySelector('img').src = `../../assets/cat/hd/${state.settings.outfit}-idle.png`;
});
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    await window.miso.action('open');
    window.miso.closePanel();
  } catch {
    const notice = document.getElementById('notice');
    notice.textContent = 'Could not open Miso. Please try again.';
    notice.hidden = false;
    button.disabled = false;
  }
});
