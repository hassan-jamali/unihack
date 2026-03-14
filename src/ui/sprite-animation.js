/* ═══════════════════════════════════════════
   sprite-animation.js — Sprite sheet animation system
   ═══════════════════════════════════════════ */

// Store active animations
const activeAnimations = new Map();

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

// Make the main function globally available for HTML onclick handlers
window.playSpriteAnimation = playSpriteAnimation;

// Export helper functions for future extension
export { playSpriteAnimation, drawFrame, getAnimationData, removeAnimation, activeAnimations };
