import './styles/style.css';

import { Player } from './game/player.js';
import { UI } from './ui/ui.js';
import { Config } from './core/config.js';
import { cheat, _initCheats } from './core/utils.js';
import { startGame, restartGame, selectAnswer } from './game/game.js';
import { openShop, ShopUI, goToTitle, goBack } from './ui/ui.js';
import { Editor } from './ui/editor.js';
import { Multiplayer } from './multiplayer/server.js';

// Wire up lazy cheat references
_initCheats(Player, UI);

window.cheat = cheat;
window.startGame = startGame;
window.restartGame = restartGame;
window.goToTitle = goToTitle;
window.selectAnswer = selectAnswer;
window.goBack = goBack;

window.openShop = openShop;
window.ShopUI = ShopUI;

window.openQuests = function() {
  UI.showScreen('quests-screen', 'slide-left');
  setTimeout(() => UI.renderQuests(), 50);
};

document.addEventListener('DOMContentLoaded', () => {
  Player.resetDailyQuests();
  UI.renderBossCards();
  UI.updateHUD();
  document.getElementById('playerHudName').textContent = Config.player.name;
  
  // Initialize responsive scroll arrows for normal mode
  initResponsiveScrollArrows();
  
  // Initialize idle animation for player sprite
  initIdleAnimation();
});

// Initialize idle animation when battle screen is shown
function initIdleAnimation() {
  // Start idle animation when battle screen becomes active
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const battleScreen = document.getElementById('battle-screen');
        if (battleScreen && battleScreen.classList.contains('active')) {
          // Start idle animation
          setTimeout(() => {
            // Initialize player idle animation
            playSpriteAnimation('src/assets/player/idle.png', 10, 96, 96, 'playerSprite');
            
            // Initialize boss idle animation
            initBossIdleAnimation();
          }, 100);
        }
      }
    });
  });
  
  const battleScreen = document.getElementById('battle-screen');
  if (battleScreen) {
    observer.observe(battleScreen, { attributes: true });
  }
}

// Scroll functionality for normal mode
function scrollBosses(direction) {
  const container = document.getElementById('bossCardsContainer');
  if (!container) return;
  
  const scrollAmount = 250; // Adjust scroll speed as needed
  
  if (direction === 'left') {
    container.scrollLeft -= scrollAmount;
  } else {
    container.scrollLeft += scrollAmount;
  }
  
  // Update arrow visibility
  updateScrollArrows();
}

function updateScrollArrows() {
  const container = document.getElementById('bossCardsContainer');
  const leftArrow = document.getElementById('scrollLeft');
  const rightArrow = document.getElementById('scrollRight');
  const arrowsContainer = document.getElementById('scrollArrowsContainer');
  
  if (!container || !leftArrow || !rightArrow || !arrowsContainer) return;
  
  // Hide left arrow if at start
  if (container.scrollLeft <= 0) {
    leftArrow.classList.add('hidden');
  } else {
    leftArrow.classList.remove('hidden');
  }
  
  // Hide right arrow if at end
  if (container.scrollLeft >= container.scrollWidth - container.clientWidth) {
    rightArrow.classList.add('hidden');
  } else {
    rightArrow.classList.remove('hidden');
  }
}

function initResponsiveScrollArrows() {
  const container = document.getElementById('bossCardsContainer');
  const arrowsContainer = document.getElementById('scrollArrowsContainer');
  
  if (!container || !arrowsContainer) return;
  
  // Check if scrolling is needed
  function checkScrollNeeded() {
    const needsScroll = container.scrollWidth > container.clientWidth;
    
    if (needsScroll) {
      arrowsContainer.classList.add('visible');
      updateScrollArrows();
    } else {
      arrowsContainer.classList.remove('visible');
    }
  }
  
  // Initial check
  setTimeout(checkScrollNeeded, 100);
  
  // Update when window resizes
  window.addEventListener('resize', checkScrollNeeded);
  
  // Update when boss cards are rendered
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.target.id === 'bossCardsContainer') {
        setTimeout(checkScrollNeeded, 100);
      }
    });
  });
  
  observer.observe(container, { childList: true, subtree: true });
  container.addEventListener('scroll', updateScrollArrows);
}

// Make functions globally available
window.scrollBosses = scrollBosses;
window.updateScrollArrows = updateScrollArrows;
