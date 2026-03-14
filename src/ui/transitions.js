/* ═══════════════════════════════════════════
   transitions.js — Screen transition animations
   ═══════════════════════════════════════════ */

export const Transitions = {
  
  // ── Transition types ──────────────────────
  
  async slideLeft(fromScreen, toScreen) {
    return this._slide(fromScreen, toScreen, 'left');
  },
  
  async slideRight(fromScreen, toScreen) {
    return this._slide(fromScreen, toScreen, 'right');
  },
  
  async slideUp(fromScreen, toScreen) {
    return this._slide(fromScreen, toScreen, 'up');
  },
  
  async slideDown(fromScreen, toScreen) {
    return this._slide(fromScreen, toScreen, 'down');
  },
  
  async fade(fromScreen, toScreen) {
    return this._fade(fromScreen, toScreen);
  },
  
  // ── Core transition logic ──────────────────
  
  async _slide(fromScreen, toScreen, direction) {
    const fromEl = typeof fromScreen === 'string' ? document.getElementById(fromScreen) : fromScreen;
    const toEl = typeof toScreen === 'string' ? document.getElementById(toScreen) : toScreen;
    
    if (!fromEl || !toEl) return;
    
    // Set up initial positions
    this._prepareSlideElements(fromEl, toEl, direction);
    
    // Start transition
    fromEl.classList.add('transitioning');
    toEl.classList.add('transitioning', 'active');
    
    // Wait for animation
    await this._waitForTransition(300);
    
    // Clean up
    this._cleanupTransition(fromEl, toEl);
  },
  
  async _fade(fromScreen, toScreen) {
    const fromEl = typeof fromScreen === 'string' ? document.getElementById(fromScreen) : fromScreen;
    const toEl = typeof toScreen === 'string' ? document.getElementById(toScreen) : toScreen;
    
    if (!fromEl || !toEl) return;
    
    // Set up initial states
    fromEl.style.opacity = '1';
    toEl.style.opacity = '0';
    toEl.classList.add('active');
    
    // Start transition
    fromEl.classList.add('transitioning');
    toEl.classList.add('transitioning');
    
    // Animate
    fromEl.style.transition = 'opacity 0.2s ease';
    toEl.style.transition = 'opacity 0.2s ease';
    
    fromEl.style.opacity = '0';
    toEl.style.opacity = '1';
    
    // Wait for animation
    await this._waitForTransition(200);
    
    // Clean up
    this._cleanupTransition(fromEl, toEl);
  },
  
  // ── Helper methods ───────────────────────
  
  _prepareSlideElements(fromEl, toEl, direction) {
    // Reset positions
    fromEl.style.transition = 'none';
    toEl.style.transition = 'none';
    
    // Set initial positions based on direction
    const transforms = {
      left: { from: 'translateX(0)', to: 'translateX(100%)' },
      right: { from: 'translateX(0)', to: 'translateX(-100%)' },
      up: { from: 'translateY(0)', to: 'translateY(100%)' },
      down: { from: 'translateY(0)', to: 'translateY(-100%)' }
    };
    
    const transform = transforms[direction];
    fromEl.style.transform = transform.from;
    toEl.style.transform = transform.to;
    
    // Force reflow
    fromEl.offsetHeight;
    toEl.offsetHeight;
    
    // Set transitions
    fromEl.style.transition = 'transform 0.3s ease';
    toEl.style.transition = 'transform 0.3s ease';
    
    // Apply final positions
    fromEl.style.transform = transforms[direction].to === 'translateX(100%)' ? 'translateX(-100%)' : transforms[direction].to === 'translateX(-100%)' ? 'translateX(100%)' : transforms[direction].to === 'translateY(100%)' ? 'translateY(-100%)' : 'translateY(100%)';
    toEl.style.transform = transforms[direction].from;
  },
  
  _cleanupTransition(fromEl, toEl) {
    fromEl.classList.remove('active', 'transitioning');
    toEl.classList.remove('transitioning');
    
    // Reset styles
    fromEl.style.transition = '';
    toEl.style.transition = '';
    fromEl.style.transform = '';
    toEl.style.transform = '';
    fromEl.style.opacity = '';
    toEl.style.opacity = '';
  },
  
  _waitForTransition(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
