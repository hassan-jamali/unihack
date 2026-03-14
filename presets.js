/* ═══════════════════════════════════════════
   presets.js — Built-in preset bosses
   These are always available and cannot be
   deleted from the editor.
   ═══════════════════════════════════════════ */

const PRESET_BOSSES = [
  {
    id:        'preset_maths',
    name:      'Prof. Calculus',
    type:      'MATHS',
    difficulty:'medium',
    maxHp:     100,
    dmgDealt:  15,
    dmgTaken:  25,
    image: '',
    typeColor: '#60a5fa',
    typeBg:    'rgba(96,165,250,0.25)',
    intro:     'Prof. Calculus appears!\nTest your mathematical mind!',
    defeat:    "Numbers don't lie!\nProf. Calculus fainted!",
    preset:    true,
  },
  {
    id:        'preset_science',
    name:      'Dr. Proton',
    type:      'SCIENCE',
    difficulty:'medium',
    maxHp:     120,
    dmgDealt:  20,
    dmgTaken:  20,
    image:     './dr_proton.png',
    typeColor: '#4ade80',
    typeBg:    'rgba(74,222,128,0.25)',
    intro:     'Dr. Proton enters the lab!\nHow well do you know science?',
    defeat:    'Hypothesis disproved!\nDr. Proton fainted!',
    preset:    true,
  },
  {
    id:        'preset_history',
    name:      'General Napoleon',
    type:      'HISTORY',
    difficulty:'medium',
    maxHp:     110,
    dmgDealt:  18,
    dmgTaken:  22,
    emoji:     '⚔️',
    typeColor: '#f87171',
    typeBg:    'rgba(248,113,113,0.25)',
    intro:     'General Napoleon comes in!\nHow well do you know history?',
    defeat:    'Lost to the English!\nGeneral Napoleon fainted!',
    preset:    true,
  },
];