import './styles/style.css';

import { Player } from './game/player.js';
import { UI } from './ui/ui.js';
import { Config } from './core/config.js';
import { cheat, _initCheats } from './core/utils.js';
import { startGame, restartGame, selectAnswer } from './game/game.js';
import { openShop, ShopUI, goToTitle, goBack } from './ui/ui.js';
import { Editor } from './ui/editor.js';
import './multiplayer/multiplayer-game.js';

const activeAnimations = new Map();
const bossIdleSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568865975111824/idle.png?ex=69b76d5a&is=69b61bda&hm=4bf6542b9781a1846d07e082dcc3b84db858c34826887c3fccdf7e323fed05cd&=&format=webp&quality=lossless';
const bossAttackSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568865098760242/attack.png?ex=69b76d5a&is=69b61bda&hm=08a7b426c3ccad6abc004ac2c4795976365faecc382d665851909dd452f09f21&=&format=webp&quality=lossless';
const bossHitSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568865627111544/hurt.png?ex=69b76d5a&is=69b61bda&hm=f1acd1b84e3b48a1693f4890ccf31b4bdb13e2638bbf1368635439b2389dc7df&=&format=webp&quality=lossless';
const bossDieSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568865350422568/death.png?ex=69b76d5a&is=69b61bda&hm=8a8c1fbfc94aae8d6428bf3296ce0962e2594610abe4736e24a09f1de01822de&=&format=webp&quality=lossless';
const bossAttackProjectileUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568866294141078/projectile.png?ex=69b76d5a&is=69b61bda&hm=e586353b909c1d40a13634c33f5a37159e84a6527da770472962d64a48d6d973&=&format=webp&quality=lossless';
const bossAttackProjectileExplosionUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568963790475404/red_hit_eff.png?ex=69b76d71&is=69b61bf1&hm=b5b7f96a8d84e4aa4024de002d052c0deb6f0697e109e3fea24ec1eed1503195&=&format=webp&quality=lossless';
const playerAttackSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568913077407814/attack_1.png?ex=69b76d65&is=69b61be5&hm=e6fa7b493e00e26e3bbbaee255bc27a942981d309dba573a10f9cdce6c6255d9&=&format=webp&quality=lossless';
const playerIdleSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568913916006470/idle.png?ex=69b76d65&is=69b61be5&hm=cc094c0aa45b3f6ef92cfa3281acfc86fe0cc9f201180c9088f149accefb2abd&=&format=webp&quality=lossless';
const playerHitSpriteUrl = 'https://media.discordapp.net/attachments/1481220361814020106/1482568913349902406/hurt.png?ex=69b76d65&is=69b61be5&hm=9134b48f97ed8574178c7550a5be899cac8ad744594128a2c99653c3b14b07d7&=&format=webp&quality=lossless';


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
            playSpriteAnimation(playerIdleSpriteUrl, 10, 96, 96, 'playerSprite');
            
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
