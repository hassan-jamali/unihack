/**
 * Combat Sound Effects System
 * Provides randomized SFX for various combat animations
 */



const castingSounds = [
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546376/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-005_gvrxln.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546376/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-006_fh1sad.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546376/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-004_jhpsut.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546375/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-003_ibszrc.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546374/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-002_gowqwr.wav',
    'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546372/DSGNMisc_MOVEMENT-Laser_Zapswish_HY_PC-001_v4ia9a.wav'

  ];
  

const explosionSounds = [
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546378/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-005_i2glsl.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546378/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-003_kigptx.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546373/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-006_fayu7c.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546373/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-001_zokmba.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546373/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-002_tkq3w2.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773546372/DSGNImpt_EXPLOSION-Flare_Nova_HY_PC-004_nmgndm.wav'
];

const bossIdleSounds = [
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549166/DSGNMisc_MOVEMENT-Bats_Flying_HY_PC-001_xvumbg.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549166/DSGNMisc_MOVEMENT-Bats_Flying_HY_PC-006_dycrfc.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549166/DSGNMisc_MOVEMENT-Bats_Flying_HY_PC-003_ly1nzh.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549166/DSGNMisc_MOVEMENT-Bats_Flying_HY_PC-002_cdz62j.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549166/DSGNMisc_MOVEMENT-Bats_Flying_HY_PC-004_kphghi.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549166/DSGNMisc_MOVEMENT-Bats_Flying_HY_PC-005_dikt72.wav'
]
const PlayerCriticalHitSounds = [
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549161/DSGNTonl_MELEE-Sword_Critical_HY_PC-005_nlzcji.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549160/DSGNTonl_MELEE-Sword_Critical_HY_PC-006_qxwzka.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549160/DSGNTonl_MELEE-Sword_Critical_HY_PC-002_av0u2u.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549159/DSGNTonl_MELEE-Sword_Critical_HY_PC-004_gobgxu.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549158/DSGNTonl_MELEE-Sword_Critical_HY_PC-003_t5hvyl.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549157/DSGNTonl_MELEE-Sword_Critical_HY_PC-001_fswxfg.wav'
]

const playerSlashHitSound = [
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549157/DSGNMisc_MELEE-Sword_Slash_HY_PC-006_pxscov.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549156/DSGNMisc_MELEE-Sword_Slash_HY_PC-004_i03dlx.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549155/DSGNMisc_MELEE-Sword_Slash_HY_PC-002_titdiw.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549154/DSGNMisc_MELEE-Sword_Slash_HY_PC-003_i1jync.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549154/DSGNMisc_MELEE-Sword_Slash_HY_PC-005_jfdc58.wav',
  'https://res.cloudinary.com/dnja9aypg/video/upload/v1773549154/DSGNMisc_MELEE-Sword_Slash_HY_PC-001_m7aszq.wav'
]

/**
 * Play boss attack sound effects (casting + explosion)
 * @param {number} explosionDelay - Delay between casting and explosion sounds (in milliseconds)
 */
function playBossAttackSFX(explosionDelay = 300) {
  // Random casting sound from Cloudinary array
  const castingIndex = Math.floor(Math.random() * castingSounds.length);
  const castingSound = castingSounds[castingIndex];
  
  // Random explosion sound from Cloudinary array
  const explosionIndex = Math.floor(Math.random() * explosionSounds.length);
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
  // Random idle sound from Cloudinary array
  const idleIndex = Math.floor(Math.random() * bossIdleSounds.length);
  const idleSound = bossIdleSounds[idleIndex];
  
  // Play idle sound
  playSound(idleSound);
}

/**
 * Play player attack sound effects (slash + critical)
 */
function playPlayerAttackSFX() {
  // Random slash sound from Cloudinary array
  const slashIndex = Math.floor(Math.random() * playerSlashHitSound.length);
  const slashSound = playerSlashHitSound[slashIndex];
  
  // Random critical sound from Cloudinary array
  const criticalIndex = Math.floor(Math.random() * PlayerCriticalHitSounds.length);
  const criticalSound = PlayerCriticalHitSounds[criticalIndex];
  
  // Play slash sound immediately
  playSound(slashSound);
  
  // Play critical sound immediately after (no delay)
  setTimeout(() => {
    playSound(criticalSound);
  },10); // Small delay to ensure both sounds play
}

/**
 * Generic sound playing function
 * @param {string} soundPath - Path to audio file
 */
function playSound(soundPath) {
  const audio = new Audio(soundPath);
  audio.volume = 0.5; 
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
