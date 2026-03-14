/**
 * Combat Sound Effects System
 * Provides randomized SFX for various combat animations
 */

/**
 * Play boss attack sound effects (casting + explosion)
 * @param {number} explosionDelay - Delay between casting and explosion sounds (in milliseconds)
 */
function playBossAttackSFX(explosionDelay = 300) {
  // Random casting sound (001-006)
  const castingIndex = Math.floor(Math.random() * 6) + 1;
  const castingSound = `src/assets/combat_effects/hit_sfx/boss_atk/DSGNMisc_MOVEMENT-Laser Zapswish_HY_PC-${castingIndex.toString().padStart(3, '0')}.wav`;
  
  // Random explosion sound (001-006)
  const explosionIndex = Math.floor(Math.random() * 6) + 1;
  const explosionSound = `src/assets/combat_effects/hit_sfx/boss_atk/DSGNImpt_EXPLOSION-Flare Nova_HY_PC-${explosionIndex.toString().padStart(3, '0')}.wav`;
  
  // Play casting sound immediately
  playSound(castingSound);
  
  // Play explosion sound after delay
  setTimeout(() => {
    playSound(explosionSound);
  }, explosionDelay);
}

/**
 * Play boss idle sound effects (random ambient sounds)
 */
function playBossIdleSFX() {
  // Random idle sound (001-006)
  const idleIndex = Math.floor(Math.random() * 6) + 1;
  const idleSound = `src/assets/combat_effects/hit_sfx/boss_idle/DSGNMisc_MOVEMENT-Bats Flying_HY_PC-${idleIndex.toString().padStart(3, '0')}.wav`;
  
  // Play idle sound
  playSound(idleSound);
}

/**
 * Play player attack sound effects (slash + critical)
 */
function playPlayerAttackSFX() {
  // Random slash sound (001-006)
  const slashIndex = Math.floor(Math.random() * 6) + 1;
  const slashSound = `src/assets/combat_effects/hit_sfx/player_atk/DSGNMisc_MELEE-Sword Slash_HY_PC-${slashIndex.toString().padStart(3, '0')}.wav`;
  
  // Random critical sound (001-006)
  const criticalIndex = Math.floor(Math.random() * 6) + 1;
  const criticalSound = `src/assets/combat_effects/hit_sfx/player_atk/DSGNTonl_MELEE-Sword Critical_HY_PC-${criticalIndex.toString().padStart(3, '0')}.wav`;
  
  // Play slash sound immediately
  playSound(slashSound);
  
  // Play critical sound immediately after (no delay)
  setTimeout(() => {
    playSound(criticalSound);
  }, 50); // Small delay to ensure both sounds play
}

/**
 * Generic sound playing function
 * @param {string} soundPath - Path to audio file
 */
function playSound(soundPath) {
  const audio = new Audio(soundPath);
  audio.volume = 0.7; // Set volume to 70%
  audio.play().catch(error => {
    console.log('Sound play failed:', error);
  });
}

// Export functions for use in other modules
export {
  playBossAttackSFX,
  playBossIdleSFX,
  playPlayerAttackSFX,
  playSound
};

// Also make functions globally available for direct use
window.playBossAttackSFX = playBossAttackSFX;
window.playBossIdleSFX = playBossIdleSFX;
window.playPlayerAttackSFX = playPlayerAttackSFX;
window.playSound = playSound;
