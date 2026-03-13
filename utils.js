/* ═══════════════════════════════════════════
   utils.js — Pure utility functions
   No dependencies. No side effects.
   Safe to use in any file.
   ═══════════════════════════════════════════ */

/** Fisher-Yates shuffle — returns a new shuffled array */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Promise-based sleep */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Re-trigger a CSS animation by removing and re-adding its class.
 * The forced reflow (offsetWidth) ensures the animation restarts
 * even if it was already playing.
 */
function triggerAnim(el, cls, duration) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), duration);
}
