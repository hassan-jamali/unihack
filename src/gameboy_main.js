import './styles/style.css';
import './styles/gameboy_shell.css';

import { Player } from './game/player.js';
import { UI } from './ui/ui.js';
import { Config } from './core/config.js';
import { cheat, _initCheats } from './core/utils.js';
import './shells/gameboy_shell.js';

// Global exports so inline HTML onclicks still work
import { startGame, restartGame, selectAnswer } from './game/game.js';
import { openShop, ShopUI, goToTitle } from './ui/ui.js';
import { Editor } from './ui/editor.js';

// Wire up lazy cheat references
_initCheats(Player, UI);

window.cheat = cheat;
window.startGame = startGame;
window.restartGame = restartGame;
window.goToTitle = goToTitle;
window.selectAnswer = selectAnswer;

window.openShop = openShop;
window.ShopUI = ShopUI;

window.openQuests = function() {
  UI.showScreen('quests-screen');
  setTimeout(() => UI.renderQuests(), 50);
};

document.addEventListener('DOMContentLoaded', () => {
  Player.resetDailyQuests();
  UI.renderBossCards();
  UI.updateHUD();
  document.getElementById('playerHudName').textContent = Config.player.name;
});
