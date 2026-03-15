/* ═══════════════════════════════════════════
   sprite-animation.js — Sprite sheet animation system
   ═══════════════════════════════════════════ */

/**
 * Combat Sound Effects System
 * Provides randomized SFX for various combat animations
 */
import { playBossAttackSFX, playBossIdleSFX, playPlayerAttackSFX, playSound } from './sound-effects.js';

// Make sound functions globally available
window.playBossAttackSFX = playBossAttackSFX;
window.playBossIdleSFX = playBossIdleSFX;
window.playPlayerAttackSFX = playPlayerAttackSFX;
window.playSound = playSound;

// Store active animations
const activeAnimations = new Map();
const bossIdleSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568865975111824/idle.png?ex=69b76d5a&is=69b61bda&hm=4bf6542b9781a1846d07e082dcc3b84db858c34826887c3fccdf7e323fed05cd&=&format=webp&quality=lossless';
const bossAttackSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568865098760242/attack.png?ex=69b76d5a&is=69b61bda&hm=08a7b426c3ccad6abc004ac2c4795976365faecc382d665851909dd452f09f21&=&format=webp&quality=lossless';
const bossHitSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568865627111544/hurt.png?ex=69b76d5a&is=69b61bda&hm=f1acd1b84e3b48a1693f4890ccf31b4bdb13e2638bbf1368635439b2389dc7df&=&format=webp&quality=lossless';
const bossDieSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568865350422568/death.png?ex=69b76d5a&is=69b61bda&hm=8a8c1fbfc94aae8d6428bf3296ce0962e2594610abe4736e24a09f1de01822de&=&format=webp&quality=lossless';
const bossAttackProjectileUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568866294141078/projectile.png?ex=69b76d5a&is=69b61bda&hm=e586353b909c1d40a13634c33f5a37159e84a6527da770472962d64a48d6d973&=&format=webp&quality=lossless';
const bossAttackHitProjectileUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568963790475404/red_hit_eff.png?ex=69b76d71&is=69b61bf1&hm=b5b7f96a8d84e4aa4024de002d052c0deb6f0697e109e3fea24ec1eed1503195&=&format=webp&quality=lossless';
const playerAttackSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568913077407814/attack_1.png?ex=69b76d65&is=69b61be5&hm=e6fa7b493e00e26e3bbbaee255bc27a942981d309dba573a10f9cdce6c6255d9&=&format=webp&quality=lossless';
const playerIdleSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568913916006470/idle.png?ex=69b76d65&is=69b61be5&hm=cc094c0aa45b3f6ef92cfa3281acfc86fe0cc9f201180c9088f149accefb2abd&=&format=webp&quality=lossless';
const playerHitSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568913349902406/hurt.png?ex=69b76d65&is=69b61be5&hm=9134b48f97ed8574178c7550a5be899cac8ad744594128a2c99653c3b14b07d7&=&format=webp&quality=lossless';



/**
 * Animation loop function - now globally accessible
 * @param {string} targetElementId - ID of the target element
 */
function animate(targetElementId) {
  const anim = activeAnimations.get(targetElementId);
  if (!anim || !anim.isPlaying) return;

  const now = Date.now();

  if (now - anim.lastFrameTime > anim.frameDuration) {
    // Handle frame repetition (with fallback for playSpriteAnimation)
    const frameRepeat = anim.frameRepeat || 1;
    const repeatCounter = anim.repeatCounter || 0;
    
    anim.repeatCounter = (repeatCounter + 1) % frameRepeat;
    
    // Only advance to next frame when repetition is complete
    if (anim.repeatCounter === 0) {
      anim.currentFrame = (anim.currentFrame + 1) % anim.frameCount;
      
      // Check if we need to return to idle after playing once
      if (anim.playOnce && anim.currentFrame === 0) {
        anim.cyclesPlayed = (anim.cyclesPlayed || 0) + 1;
        if (anim.cyclesPlayed >= 1 && anim.originalAnimation) {
          // Return to original position if we moved to center
          if (anim.moveToCenter && anim.originalPosition && targetElementId === 'playerSprite') {
            const element = document.getElementById(targetElementId);
            if (element) {
              element.style.transition = 'transform 0.3s ease';
              // Restore original position
              Object.keys(anim.originalPosition).forEach(prop => {
                element.style[prop] = anim.originalPosition[prop];
              });
            }
          }
          
          // Return to original idle animation
          const orig = anim.originalAnimation;
          // randomly plays playBossIdleSFX(); with a 50% of playing it or not
          if (Math.random() < 0.5) {
            playBossIdleSFX();
          }
          changeAnimation(targetElementId, orig.image.src, orig.frameCount, orig.frameWidth, orig.frameHeight, orig.frameDuration, false);
          return;
        }
      }
    }
    
    drawFrame(anim, anim.currentFrame);
    anim.lastFrameTime = now;
  }

  requestAnimationFrame(() => animate(targetElementId));
}

/**
 * Prepares a sprite sheet animation for playback
 * @param {string} imageSrc - Path to the sprite sheet image
 * @param {number} frameCount - Total number of frames in the sprite sheet
 * @param {number} frameWidth - Width of a single frame in pixels
 * @param {number} frameHeight - Height of a single frame in pixels
 * @param {string} targetElementId - ID of the HTML element where animation will be rendered
 */
function playSpriteAnimation(imageSrc, frameCount, frameWidth, frameHeight, targetElementId) {
  // Get the target element
  const targetElement = document.getElementById(targetElementId);
  if (!targetElement) {
    console.error(`Target element not found: ${targetElementId}`);
    return;
  }

  // Create and load the image
  const img = new Image();
  img.onload = function() {
    // Create canvas for rendering
    const canvas = document.createElement('canvas');
    const scale = 4; // Increased scale for bigger image
    canvas.width = frameWidth * scale;
    canvas.height = frameHeight * scale;
    canvas.style.imageRendering = 'pixelated'; // Keep pixel art crisp
    canvas.style.width = (frameWidth * scale) + 'px';
    canvas.style.height = (frameHeight * scale) + 'px';
    
    // Get 2D rendering context
    const ctx = canvas.getContext('2d');
    
    // Clear the target element and add canvas
    targetElement.innerHTML = '';
    targetElement.appendChild(canvas);
    
    // Store animation data for later use
    const animationData = {
      image: img,
      frameCount: frameCount,
      frameWidth: frameWidth,
      frameHeight: frameHeight,
      canvas: canvas,
      ctx: ctx,
      currentFrame: 0,
      isPlaying: false,
      frameDuration: 100, // Default 100ms per frame (can be adjusted later)
      lastFrameTime: 0
    };
    
    // Store in active animations map
    activeAnimations.set(targetElementId, animationData);
    
    // Draw first frame as preview
    // Draw first frame
    drawFrame(animationData, 0);

    // Start animation loop
    animationData.isPlaying = true;
    animationData.lastFrameTime = Date.now();

    animate(targetElementId);
    
    // Log confirmation
    console.log(`Sprite animation ready: ${imageSrc} with ${frameCount} frames`);
  };
  
  img.onerror = function() {
    console.error(`Failed to load sprite sheet: ${imageSrc}`);
  };
  
  // Start loading the image
  img.src = imageSrc;
}

/**
 * Draws a specific frame from the sprite sheet
 * @param {Object} animationData - Animation data object
 * @param {number} frameIndex - Frame index to draw (0-based)
 */
function drawFrame(animationData, frameIndex) {
  const { image, frameWidth, frameHeight, ctx } = animationData;
  
  // Calculate source position on sprite sheet
  const sourceX = frameIndex * frameWidth;
  const sourceY = 0;

  const scale = 4; // Same scale as canvas
  
  // Clear canvas
  ctx.clearRect(0, 0, frameWidth * scale, frameHeight * scale);
  
  // Draw the specific frame
  ctx.save()

  ctx.translate(frameWidth * scale, 0)
  ctx.scale(-1, 1)
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    frameWidth,
    frameHeight,
    0,
    0,
    frameWidth * scale,
    frameHeight * scale
  )

  ctx.restore()
}

/**
 * Gets stored animation data for an element
 * @param {string} targetElementId - ID of the target element
 * @returns {Object|null} Animation data object or null if not found
 */
function getAnimationData(targetElementId) {
  return activeAnimations.get(targetElementId) || null;
}

/**
 * Removes an animation from the active animations
 * @param {string} targetElementId - ID of the target element
 */
function removeAnimation(targetElementId) {
  activeAnimations.delete(targetElementId);
}

/**
 * Changes the animation to a different sprite sheet
 * @param {string} targetElementId - ID of the target element
 * @param {string} imageSrc - Path to the new sprite sheet image
 * @param {number} frameCount - Total number of frames in the sprite sheet
 * @param {number} frameWidth - Width of a single frame
 * @param {number} frameHeight - Height of a single frame
 * @param {number} frameDuration - Duration per frame in milliseconds (optional)
 * @param {boolean} playOnce - If true, play animation once and return to idle
 * @param {number} frameRepeat - Number of times to repeat each frame (optional)
 * @param {boolean} moveToCenter - If true, move sprite to center during animation
 */
function changeAnimation(targetElementId, imageSrc, frameCount, frameWidth, frameHeight, frameDuration = 100, playOnce = false, frameRepeat = 1, moveToCenter = false) {
  const anim = activeAnimations.get(targetElementId);
  if (!anim) {
    // If no existing animation, create a new one
    playSpriteAnimation(imageSrc, frameCount, frameWidth, frameHeight, targetElementId);
    return;
  }
  
  // Stop current animation
  anim.isPlaying = false;
  
  // Store original idle animation if we need to return to it
  if (playOnce && !anim.originalAnimation) {
    anim.originalAnimation = {
      image: anim.image,
      frameCount: anim.frameCount,
      frameWidth: anim.frameWidth,
      frameHeight: anim.frameHeight,
      frameDuration: anim.frameDuration
    };
  }
  
  // Store original position if moving to center
  let originalPosition = null;
  if (moveToCenter && targetElementId === 'playerSprite') {
    const element = document.getElementById(targetElementId);
    if (element) {
      originalPosition = {
        left: element.style.left || '',
        right: element.style.right || '',
        bottom: element.style.bottom || '',
        top: element.style.top || '',
        transform: element.style.transform || ''
      };
    }
  }
  
  // Load new image
  const newImg = new Image();
  newImg.onload = function() {
    // Update animation data
    anim.image = newImg;
    anim.frameCount = frameCount;
    anim.frameWidth = frameWidth;
    anim.frameHeight = frameHeight;
    anim.currentFrame = 0;
    anim.frameDuration = frameDuration;
    anim.lastFrameTime = Date.now();
    anim.playOnce = playOnce;
    anim.cyclesPlayed = 0;
    anim.frameRepeat = frameRepeat;
    anim.repeatCounter = 0;
    anim.moveToCenter = moveToCenter;
    anim.originalPosition = originalPosition;
    
    // Update canvas size if needed
    const scale = 4;
    anim.canvas.width = frameWidth * scale;
    anim.canvas.height = frameHeight * scale;
    anim.canvas.style.width = (frameWidth * scale) + 'px';
    anim.canvas.style.height = (frameHeight * scale) + 'px';
    
    // Apply movement to center if requested
    if (moveToCenter && targetElementId === 'playerSprite') {
      const element = document.getElementById(targetElementId);
      if (element) {
        // Move to center and upward while preserving the flip transform
        element.style.transition = 'transform 0.3s ease';
        element.style.transform = 'scaleX(-1) translateX(-200px) translateY(-80px)'; // Move toward center and up
      }
    }
    
    // Draw first frame of new animation
    drawFrame(anim, 0);
    
    // Resume animation
    anim.isPlaying = true;
    animate(targetElementId);
    
    console.log(`Animation changed to: ${imageSrc} with ${frameCount} frames${playOnce ? ' (play once)' : ''}${frameRepeat > 1 ? ` (${frameRepeat}x repeat)` : ''}${moveToCenter ? ' (move to center)' : ''}`);
  };
  
  newImg.onerror = function() {
    console.error(`Failed to load sprite sheet: ${imageSrc}`);
    // Resume previous animation if load fails
    anim.isPlaying = true;
    animate(targetElementId);
  };
  
  newImg.src = imageSrc;
}

// ======================== Boss Animation Functions ========================

/**
 * Plays a temporary animation and returns to idle
 * @param {string} targetElementId - ID of the target element
 * @param {string} imageSrc - Path to the temporary sprite sheet
 * @param {number} frameCount - Total number of frames in the sprite sheet
 * @param {number} frameWidth - Width of a single frame
 * @param {number} frameHeight - Height of a single frame
 * @param {number} frameDuration - Duration per frame in milliseconds (optional)
 * @param {Function} callback - Function to call when animation completes
 */
function playTemporaryAnimation(targetElementId, imageSrc, frameCount, frameWidth, frameHeight, frameDuration = 100, callback) {
  const anim = activeAnimations.get(targetElementId);
  if (!anim) return;
  
  // Store original idle animation data
  const originalData = {
    image: anim.image,
    frameCount: anim.frameCount,
    frameWidth: anim.frameWidth,
    frameHeight: anim.frameHeight,
    frameDuration: anim.frameDuration
  };
  
  // Change to temporary animation
  changeAnimation(targetElementId, imageSrc, frameCount, frameWidth, frameHeight, frameDuration);
  
  // Set up return to idle after animation completes
  setTimeout(() => {
    changeAnimation(targetElementId, originalData.image.src, originalData.frameCount, originalData.frameWidth, originalData.frameHeight, originalData.frameDuration);
    if (callback) callback();
  }, frameDuration * frameCount);
}

// Make the new functions globally available
window.changeAnimation = changeAnimation;
window.playTemporaryAnimation = playTemporaryAnimation;
window.getAnimationData = getAnimationData;

// Make the main function globally available for HTML onclick handlers
window.playSpriteAnimation = playSpriteAnimation;

// Boss animation functions
/**
 * Initialize boss idle animation
 */
function initBossIdleAnimation() {
  changeAnimation('bossSprite', bossIdleSpriteUrl, 4, 81, 71, 120, false, 2, false);
  // Flip boss sprite to face player with multiple retries
  setTimeout(() => {
    flipBossSprite();
  }, 50);

  // if 100ms passed, reproduce playBossIdleSFX() 
  setTimeout(() => {
    playBossIdleSFX();
  }, 100);
}

/**
 * Play boss attack animation
 */
function playBossAttackAnimation() {
  changeAnimation('bossSprite', bossAttackSpriteUrl, 8, 81, 71, 100, true, 2, false);
  // Play projectile animation after attack starts
  setTimeout(() => {
    playBossProjectileAnimation();
  }, 200); // Delay to sync with attack animation
}

/**
 * Play boss hurt animation
 */
function playBossHurtAnimation() {
  changeAnimation('bossSprite', bossHitSpriteUrl, 4, 81, 71, 150, true, 2, false);
}

/**
 * Play boss death animation
 */
function playBossDeathAnimation() {
  changeAnimation('bossSprite', bossDieSpriteUrl, 7, 81, 71, 120, true, 2, false);
}

/**
 * Play projectile animation from boss to player
 */
function playBossProjectileAnimation() {
  // Create projectile element if it doesn't exist
  let projectile = document.getElementById('bossProjectile');
  if (!projectile) {
    projectile = document.createElement('div');
    projectile.id = 'bossProjectile';
    projectile.style.position = 'absolute';
    projectile.style.width = '80px'; // 2x bigger (was 32px)
    projectile.style.height = '80px'; // 2x bigger (was 32px)
    projectile.style.zIndex = '1000';
    projectile.style.transition = 'transform 0.3s linear'; // Faster for diagonal movement
    projectile.style.backgroundImage = bossAttackProjectileUrl;
    projectile.style.backgroundSize = 'contain';
    projectile.style.backgroundRepeat = 'no-repeat';
    projectile.style.backgroundPosition = 'center';
    
    // Add to battle screen
    const battleScreen = document.getElementById('battle-screen');
    if (battleScreen) {
      battleScreen.appendChild(projectile);
      console.log('Projectile created and added to battle screen');
    }
  }
  
  // Get both boss and character positions dynamically
  setTimeout(() => {
    const bossElement = document.getElementById('bossSprite');
    const playerElement = document.getElementById('playerSprite');
    
    if (bossElement && playerElement) {
      const battleRect = document.getElementById('battle-screen').getBoundingClientRect();
      
      // Get boss position (center/mouth area)
      const bossRect = bossElement.getBoundingClientRect();
      const bossCenterX = bossRect.left - battleRect.left + (bossRect.width / 2);
      const bossCenterY = bossRect.top - battleRect.top + (bossRect.height / 2);
      
      // Get character position (center)
      const playerRect = playerElement.getBoundingClientRect();
      const playerCenterX = playerRect.left - battleRect.left + (playerRect.width / 2) -100;
      const playerCenterY = playerRect.top - battleRect.top + (playerRect.height / 2) - 30;
      
      // Calculate trajectory from boss to character
      const deltaX = playerCenterX - bossCenterX;
      const deltaY = playerCenterY - bossCenterY;
      
      // Calculate rotation angle based on trajectory (in degrees)
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      
      // Position projectile at boss center initially
      projectile.style.left = (bossCenterX - 40) + 'px'; // Center the 80px projectile
      projectile.style.top = (bossCenterY - 40) + 'px';  // Center the 80px projectile
      
      // Animate projectile directly to character center with dynamic rotation
      projectile.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) rotate(${angle-200}deg)`;
      console.log(`Projectile from boss (${bossCenterX}, ${bossCenterY}) to character (${playerCenterX}, ${playerCenterY}) at angle ${angle.toFixed(1)}°`);
      
      // Play hit effect on character when projectile arrives
      setTimeout(() => {
        playRedHitEffect(playerCenterX, playerCenterY); // Use actual character position
      }, 200); // Same time as projectile travel
    }
  }, 100);
  
  // Remove projectile after animation
  setTimeout(() => {
    if (projectile && projectile.parentNode) {
      projectile.parentNode.removeChild(projectile);
      console.log('Projectile removed');
    }
  }, 300); // Adjusted timing for direct travel
}

/**
 * Apply horizontal flip to boss sprite element with retry mechanism
 */
function flipBossSprite() {
  const bossElement = document.getElementById('bossSprite');
  if (bossElement) {
    bossElement.style.transform = 'scaleX(-1)';
    
    // Ensure flip is applied by checking and retrying
    const checkFlip = () => {
      const currentTransform = bossElement.style.transform;
      if (!currentTransform || !currentTransform.includes('scaleX(-1)')) {
        bossElement.style.transform = 'scaleX(-1)';
        console.log('Boss sprite flipped to face player');
      }
    };
    
    // Check immediately and retry if needed
    checkFlip();
    
    // Also check after a short delay to ensure it sticks
    setTimeout(checkFlip, 100);
    setTimeout(checkFlip, 300);
  }
}


/**
 * Play red hit effect animation
 */
function playRedHitEffect(x, y) {
  // Create hit effect element
  const hitEffect = document.createElement('div');
  hitEffect.id = 'redHitEffect';
  hitEffect.style.position = 'absolute';
  hitEffect.style.left = x + 'px';
  hitEffect.style.top = y + 'px';
  hitEffect.style.zIndex = '1001';
  hitEffect.style.pointerEvents = 'none';
  
  // Add to battle screen
  const battleScreen = document.getElementById('battle-screen');
  if (battleScreen) {
    battleScreen.appendChild(hitEffect);
    
    // Play sprite animation
    playBossAttackSFX();
    playSpriteAnimation(bossAttackHitProjectileUrl, 7, 48, 48, 'redHitEffect', 80, true);
    
    // Remove after animation completes
    setTimeout(() => {
      if (hitEffect && hitEffect.parentNode) {
        hitEffect.parentNode.removeChild(hitEffect);
      }
    }, 560); // 7 frames × 80ms = 560ms
  }
}

// Make hit effect function globally available
// Make boss animation functions globally available
window.initBossIdleAnimation = initBossIdleAnimation;
window.playBossAttackAnimation = playBossAttackAnimation;
window.playBossHurtAnimation = playBossHurtAnimation;
window.playBossDeathAnimation = playBossDeathAnimation;
window.playBossProjectileAnimation = playBossProjectileAnimation;
window.flipBossSprite = flipBossSprite;
window.playRedHitEffect = playRedHitEffect;

// Export helper functions for future extension
export { playSpriteAnimation, drawFrame, getAnimationData, removeAnimation, activeAnimations };
