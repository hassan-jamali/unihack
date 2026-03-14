/* ═══════════════════════════════════════════
   config.js — Static game data & settings
   ═══════════════════════════════════════════ */

const Config = {

  geminiApiKey: (typeof Env !== 'undefined' && Env.GEMINI_API_KEY) || '',

  questionsPerBatch: 8,

  bosses: [
    {
      id:         'maths',
      name:       'Prof. Calculus',
      type:       'MATHS',
      difficulty: 'medium',
      maxHp:      100,
      dmgDealt:   15,
      dmgTaken:   25,
      emoji:      '🧮',
      typeColor:  '#60a5fa',
      typeBg:     'rgba(96,165,250,0.25)',
      intro:      'Prof. Calculus appears!\nTest your mathematical mind!',
      defeat:     "Numbers don't lie!\nProf. Calculus fainted!",
    },
    {
      id:         'science',
      name:       'Dr. Proton',
      type:       'SCIENCE',
      difficulty: 'medium',
      maxHp:      120,
      dmgDealt:   20,
      dmgTaken:   20,
      emoji:      '🔬',
      typeColor:  '#4ade80',
      typeBg:     'rgba(74,222,128,0.25)',
      intro:      'Dr. Proton enters the lab!\nHow well do you know science?',
      defeat:     'Hypothesis disproved!\nDr. Proton fainted!',
    },
    {
      id:         'business',
      name:       'CEO Maxwell',
      type:       'BUSINESS',
      difficulty: 'medium',
      maxHp:      90,
      dmgDealt:   10,
      dmgTaken:   30,
      emoji:      '💼',
      typeColor:  '#fbbf24',
      typeBg:     'rgba(251,191,36,0.25)',
      intro:      'CEO Maxwell enters the boardroom!\nProve your business acumen!',
      defeat:     'Poor ROI!\nCEO Maxwell fainted!',
    },
    {
      id:         'history',
      name:       'General Napoleon',
      type:       'HISTORY',
      difficulty: 'medium',
      maxHp:      110,
      dmgDealt:   18,
      dmgTaken:   22,
      emoji:      '⚔️',
      typeColor:  '#f87171',
      typeBg:     'rgba(248,113,113,0.25)',
      intro:      'General Napoleon representing France comes in!\nHow well do you know history?',
      defeat:     'Lost to the English!\nGeneral Napoleon fainted!',
    },
  ],

  player: {
    name:  'HERO',
    maxHp: 100,
  },
};