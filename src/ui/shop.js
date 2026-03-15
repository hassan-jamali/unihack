/* ═══════════════════════════════════════════
   shop.js — Shop items, quests, purchase logic
   ═══════════════════════════════════════════ */

import { Player } from '../game/player.js';
import { UI } from './ui.js';

export const Shop = {

  // ── Item catalogue ────────────────────────

  ITEMS: [
    // ── HP Boosts ──
    {
      id: 'hp_potion',
      name: 'HP Potion',
      desc: '+25 max HP per battle',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539603675185335/potion.png?ex=69b75219&is=69b60099&hm=45c716b0db5d436302cd4f2e1278ae9982827396810395e06e2e1ee041835786&',
      category: 'hp',
      price: 60,
      effect: { hpBonus: 25 },
      rarity: 'common',
    },
    {
      id: 'hp_elixir',
      name: 'HP Elixir',
      desc: '+60 max HP per battle',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539569277829232/elixir.png?ex=69b75211&is=69b60091&hm=42d8f9b50b6ecab9fd0b3da096797b6a11aac9e724bb59837f613429d7c83351&',
      category: 'hp',
      price: 130,
      effect: { hpBonus: 60 },
      rarity: 'rare',
    },
    {
      id: 'shield',
      name: 'Iron Shield',
      desc: 'Absorbs 20 damage before HP drops',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539642208391318/shield.png?ex=69b75222&is=69b600a2&hm=81620c1d616e8d6420bc515dfe5c3251da0f0c39c70a41c95b68a978a0cfabc7&',
      category: 'hp',
      price: 150,
      effect: { shieldHp: 20 },
      rarity: 'rare',
    },
    // ── Damage Boosts ──
    {
      id: 'dmg_glove',
      name: 'Dual Swords',
      desc: '1.5× damage to bosses',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539568937828617/dualswords.png?ex=69b75211&is=69b60091&hm=3aed9fadfb08d5b84a0a9f2ec76f99a0d710bc3621f03ccd23d593c3ea8b3523&',
      category: 'damage',
      price: 100,
      effect: { dmgMult: 1.5 },
      rarity: 'common',
    },
    {
      id: 'dmg_sword',
      name: 'Brain Sword',
      desc: '2× damage to bosses',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539567843381268/brainsword.png?ex=69b75211&is=69b60091&hm=7f671c9c2db8ba4e7bd2e08472bca88b4f1dd72bd6e81ece4a1a38939fe4ffa6&',
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
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539567151054909/xpring.png?ex=69b75211&is=69b60091&hm=6e728dc1d035215131d3f4c3a2b085d3eafc91e055e248cedb6b2f87d5f00c63&',
      category: 'xp',
      price: 90,
      effect: { xpMult: 1.5 },
      rarity: 'common',
    },
    {
      id: 'coin_charm',
      name: 'Coin Charm',
      desc: '2× coins from battles',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539643416350751/xpcharm.png?ex=69b75223&is=69b600a3&hm=6969ff9a01c23cde6ab88d5c52bf10616c9f1cbada654de1d1f4ae227f1b5df7&',
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
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539604006539396/quest.png?ex=69b75219&is=69b60099&hm=9156e18d408c21b81e43200d7a5b7aa90ae9d1b0be25558f0688da19441608ad&',
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
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539602626613318/firstblood.png?ex=69b75219&is=69b60099&hm=cb17efa558025297248f11779d25680aa5cb6faaff2e39932b4d4010238f616c&',
      diff: 'easy',
      goal: { type: 'defeat_bosses', count: 1 },
      reward: { xp: 50, coins: 30 },
    },
    {
      id: 'q_easy_2',
      name: 'Quiz Kid',
      desc: 'Answer 5 questions correctly',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539641935757443/quiz.png?ex=69b75222&is=69b600a2&hm=305fc0ee8eb46d1f5ba5045c7ad59ac2126dcaf8d4a88ed036585529916e981f&',
      diff: 'easy',
      goal: { type: 'correct_answers', count: 5 },
      reward: { xp: 60, coins: 25 },
    },
    {
      id: 'q_med_1',
      name: 'Boss Rush',
      desc: 'Defeat 3 bosses in one run',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539567457501204/bossrush.png?ex=69b75211&is=69b60091&hm=26a8ee35f3a4ad682506a2481a4bf201ccc30419f16f0042df54acbf5556e201&',
      diff: 'medium',
      goal: { type: 'defeat_bosses_run', count: 3 },
      reward: { xp: 150, coins: 80 },
    },
    {
      id: 'q_med_2',
      name: 'Sharp Mind',
      desc: 'Answer 15 questions correctly',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539602878267556/mind.png?ex=69b75219&is=69b60099&hm=11299e8bdcd1eec43f70ba6f2aa47a2183292e63972c7bfe7d9ce1172a184f53&',
      diff: 'medium',
      goal: { type: 'correct_answers', count: 15 },
      reward: { xp: 120, coins: 60 },
    },
    {
      id: 'q_med_3',
      name: 'No Damage',
      desc: 'Defeat a boss without losing HP',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539603150901338/Nodamage.png?ex=69b75219&is=69b60099&hm=f9104d0527e694309a49b77cf5c5dccdc68f26a8e5d75b4632441a43c0964f7f&',
      diff: 'medium',
      goal: { type: 'no_damage_boss', count: 1 },
      reward: { xp: 200, coins: 100 },
    },
    {
      id: 'q_hard_1',
      name: 'Champion',
      desc: 'Defeat all bosses in one run',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539603389845611/perfect.png?ex=69b75219&is=69b60099&hm=ae0cdd12514f843dc435b2d54f6e17b2665b6f61adbf5684fda62315c1f8a21d&',
      diff: 'hard',
      goal: { type: 'defeat_all', count: 1 },
      reward: { xp: 400, coins: 200 },
    },
    {
      id: 'q_hard_2',
      name: 'Perfectionist',
      desc: 'Complete a full run without any wrong answers',
      image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539568191246559/champion.png?ex=69b75211&is=69b60091&hm=c16f3e0e21b21ad165dd2dc388f1bc98af72204a352bc45e6cf8740953e991ab&',
      diff: 'hard',
      goal: { type: 'perfect_run', count: 1 },
      reward: { xp: 500, coins: 250 },
    },
    {
    id: 'q_mp_win',
    name: 'Unihack Coop Trophy',
    desc: 'Win a multiplayer game',
    image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482539643097321665/unihack.png?ex=69b75223&is=69b600a3&hm=fea6f833c10338d753d6f32934c8f44c1e5d599bc13c61de20f437eb6833367d&',
    diff: 'medium',
    goal: { type: 'mp_win', count: 1 },
    reward: { xp: 300, coins: 150 },
    },
  ],

  getQuest(id) { return this.QUESTS.find(q => q.id === id); },
};