/* ═══════════════════════════════════════════
   shop.js — Shop items, quests, purchase logic
   ═══════════════════════════════════════════ */

import { Player } from '../game/player.js';
import { UI } from './ui.js';

export const Shop = {

  // ── Item catalogue ────────────────────────

  ITEMS: [
    // ── Cosmetics ──
    {
      id: 'skin_fire',
      name: 'Fire Aura',
      desc: 'Player glows with flames 🔥',
      icon: '🔥',
      category: 'cosmetic',
      price: 80,
      effect: { playerEmoji: '🧑‍🚒' },
      rarity: 'common',
    },
    {
      id: 'skin_robot',
      name: 'Robot Skin',
      desc: 'Become a learning machine 🤖',
      icon: '🤖',
      category: 'cosmetic',
      price: 120,
      effect: { playerEmoji: '🤖' },
      rarity: 'rare',
    },
    {
      id: 'skin_wizard',
      name: 'Wizard Robe',
      desc: 'Ancient scholar look 🧙',
      icon: '🧙',
      category: 'cosmetic',
      price: 200,
      effect: { playerEmoji: '🧙' },
      rarity: 'epic',
    },
    // ── HP Boosts ──
    {
      id: 'hp_potion',
      name: 'HP Potion',
      desc: '+25 max HP per battle',
      icon: '🧪',
      category: 'hp',
      price: 60,
      effect: { hpBonus: 25 },
      rarity: 'common',
    },
    {
      id: 'hp_elixir',
      name: 'HP Elixir',
      desc: '+60 max HP per battle',
      icon: '💊',
      category: 'hp',
      price: 130,
      effect: { hpBonus: 60 },
      rarity: 'rare',
    },
    {
      id: 'shield',
      name: 'Iron Shield',
      desc: 'Absorbs 20 damage before HP drops',
      icon: '🛡️',
      category: 'hp',
      price: 150,
      effect: { shieldHp: 20 },
      rarity: 'rare',
    },
    // ── Damage Boosts ──
    {
      id: 'dmg_glove',
      name: 'Power Glove',
      desc: '1.5× damage to bosses',
      icon: '🥊',
      category: 'damage',
      price: 100,
      effect: { dmgMult: 1.5 },
      rarity: 'common',
    },
    {
      id: 'dmg_sword',
      name: 'Brain Sword',
      desc: '2× damage to bosses',
      icon: '⚔️',
      category: 'damage',
      price: 220,
      effect: { dmgMult: 2 },
      rarity: 'epic',
    },
    // ── XP / Coin Boosts ──
    {
      id: 'xp_ring',
      name: 'XP Ring',
      desc: '1.5× XP from battles',
      icon: '💍',
      category: 'xp',
      price: 90,
      effect: { xpMult: 1.5 },
      rarity: 'common',
    },
    {
      id: 'coin_charm',
      name: 'Coin Charm',
      desc: '2× coins from battles',
      icon: '🪙',
      category: 'coins',
      price: 110,
      effect: { coinMult: 2 },
      rarity: 'rare',
    },
    // ── Quest Unlock ──
    {
      id: 'quest_pass',
      name: 'Quest Pass',
      desc: 'Unlocks the Quests board',
      icon: '📜',
      category: 'unlock',
      price: 150,
      effect: { unlockQuests: true },
      rarity: 'epic',
    },
    {
      id: 'gameboy_mode',
      name: 'Game Boy Mode',
      desc: 'Unlocks the retro Game Boy shell',
      icon: '🎮',
      category: 'unlock',
      price: 300,
      effect: { unlockGameboy: true },
      rarity: 'epic',
    }
  ],

  getItem(id) { return this.ITEMS.find(i => i.id === id); },

  purchase(id) {
    const item = this.getItem(id);
    if (!item) return { ok: false, msg: 'Item not found.' };
    if (Player.hasItem(id)) return { ok: false, msg: 'Already owned!' };
    if (!Player.spendCoins(item.price)) return { ok: false, msg: 'Not enough coins!' };

    Player.addItem(id);

    // Handle special unlocks
    if (item.effect?.unlockQuests) {
      Player.questsUnlocked = true;
    }

    // Add:
    if (item.effect?.unlockGameboy) {
      Player.gameboyUnlocked = true;
    }
    return { ok: true, msg: `Bought ${item.name}!` };
  },

  // ── Quest catalogue ───────────────────────

  QUESTS: [
    {
      id: 'q_easy_1',
      name: 'First Blood',
      desc: 'Defeat any 1 boss',
      icon: '⚔️',
      diff: 'easy',
      goal: { type: 'defeat_bosses', count: 1 },
      reward: { xp: 50, coins: 30 },
    },
    {
      id: 'q_easy_2',
      name: 'Quiz Kid',
      desc: 'Answer 5 questions correctly',
      icon: '✅',
      diff: 'easy',
      goal: { type: 'correct_answers', count: 5 },
      reward: { xp: 60, coins: 25 },
    },
    {
      id: 'q_med_1',
      name: 'Boss Rush',
      desc: 'Defeat 3 bosses in one run',
      icon: '🏃',
      diff: 'medium',
      goal: { type: 'defeat_bosses_run', count: 3 },
      reward: { xp: 150, coins: 80 },
    },
    {
      id: 'q_med_2',
      name: 'Sharp Mind',
      desc: 'Answer 15 questions correctly',
      icon: '🧠',
      diff: 'medium',
      goal: { type: 'correct_answers', count: 15 },
      reward: { xp: 120, coins: 60 },
    },
    {
      id: 'q_med_3',
      name: 'No Damage',
      desc: 'Defeat a boss without losing HP',
      icon: '🛡️',
      diff: 'medium',
      goal: { type: 'no_damage_boss', count: 1 },
      reward: { xp: 200, coins: 100 },
    },
    {
      id: 'q_hard_1',
      name: 'Champion',
      desc: 'Defeat all bosses in one run',
      icon: '🏆',
      diff: 'hard',
      goal: { type: 'defeat_all', count: 1 },
      reward: { xp: 400, coins: 200 },
    },
    {
      id: 'q_hard_2',
      name: 'Perfectionist',
      desc: 'Complete a full run without any wrong answers',
      icon: '💎',
      diff: 'hard',
      goal: { type: 'perfect_run', count: 1 },
      reward: { xp: 500, coins: 250 },
    },
  ],

  getQuest(id) { return this.QUESTS.find(q => q.id === id); },
};