/* ═══════════════════════════════════════════
   utils.js — Pure utility functions
   No dependencies. No side effects.
   ═══════════════════════════════════════════ */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function triggerAnim(el, cls, duration) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), duration);
}