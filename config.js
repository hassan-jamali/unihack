/* ═══════════════════════════════════════════
   config.js — Static game data & settings
   Edit via the in-game Config Editor, or
   paste JSON directly into the editor panel.
   ═══════════════════════════════════════════ */

const CONFIG_STORAGE_KEY = 'brainBattle_config';

const CONFIG_DEFAULTS = {
  geminiApiKey:      '',
  questionsPerBatch: 8,
  player: {
    name:  'HERO',
    maxHp: 100,
  },
  bosses: [],
};

/* Merge saved config over defaults */
function _loadConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...CONFIG_DEFAULTS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load saved config, using defaults:', e);
  }
  return { ...CONFIG_DEFAULTS };
}

function _saveConfig(cfg) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn('Failed to save config:', e);
  }
}

function _resetConfig() {
  try { localStorage.removeItem(CONFIG_STORAGE_KEY); } catch (e) {}
}

const Config = _loadConfig();