/* ═══════════════════════════════════════════
   config.js — Static game data & settings
   Edit bosses, difficulty, and player stats
   here. Nothing else needs to change.
   ═══════════════════════════════════════════ */   
const Config = {

  /** Gemini API key — loaded from env.js (never commit that file!) */
  geminiApiKey: (typeof Env !== 'undefined' && Env.GEMINI_API_KEY) || '',

  /** How many AI questions to generate per batch */
  questionsPerBatch: 8,
  
  /** How many AI questions to generate per batch */
  questionsPerBatch: 8,

  /**
   * Boss roster — add a new boss by copying a block.
   *
   * id         unique key
   * name       display name shown in HUD
   * type       topic sent to AI — also shown as badge
   * difficulty 'easy' | 'medium' | 'hard'
   * maxHp      starting HP
   * dmgDealt   HP player loses on a WRONG answer
   * dmgTaken   HP boss loses on a CORRECT answer
   * emoji      boss sprite (swap for <img> with real art)
   * typeColor  hex — badge background colour
   * typeBg     rgba — subtle arena overlay colour
   * intro      dialogue shown when boss enters
   * defeat     dialogue shown when boss faints
   */
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
  ],

  /** Player starting stats */
  player: {
    name:  'HERO',
    maxHp: 100,
  },
};
