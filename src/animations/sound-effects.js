/**
 * Combat Sound Effects System
 * Provides randomized SFX for various combat animations
 */

/**
 * Play boss attack sound effects (casting + explosion)
 * @param {number} explosionDelay - Delay between casting and explosion sounds (in milliseconds)
 */
function playBossAttackSFX(explosionDelay = 300) {
  // Discord CDN sounds for casting
  const castingSounds = [
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546374/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-001_gowqwr.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546374/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-002_gowqwr.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546374/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-003_gowqwr.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546374/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-004_gowqwr.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546374/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-005_gowqwr.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546374/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-006_gowqwr.wav'

  ];
  
  // Discord CDN sounds for explosion
  const explosionSounds = [
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546378/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-001_i2glsl.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546378/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-002_kigptx.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546378/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-003_kigptx.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546378/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-004_kigptx.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546378/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-005_i2glsl.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546378/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-006_jqjv6l.wav'
  ];
  
  // Random casting sound
  const castingIndex = Math.floor(Math.random() * 6);
  const castingSound = castingSounds[castingIndex];
  
  // Random explosion sound
  const explosionIndex = Math.floor(Math.random() * 6);
  const explosionSound = explosionSounds[explosionIndex];
  
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
