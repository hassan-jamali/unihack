/* ═══════════════════════════════════════════
   presets.js — Built-in preset bosses
   These are always available and cannot be
   deleted from the editor.
   ═══════════════════════════════════════════ */

const PRESET_BOSSES = [
  {
    id:        'preset_maths',
    name:      'Terence',
    type:      'MATHS',
    difficulty:'medium',
    maxHp:     100,
    dmgDealt:  15,
    dmgTaken:  25,
    image: 'https://cdn.discordapp.com/attachments/1481220361814020106/1482347610672201798/New_Piskel_1.png?ex=69b69f4b&is=69b54dcb&hm=63d7a7cc309d48def8f3d1990de2c84268634972822bb8b71d8fd569a824316a',
    typeColor: '#60a5fa',
    typeBg:    'rgba(96,165,250,0.25)',
    intro:     'Terence appears!\nTest your mathematical mind!',
    defeat:    "Numbers don't lie!\nTerence fainted!",
    preset:    true,
    useStaticIcon: true,  // Terence uses static icon instead of animations
  },
  {
    id:        'preset_science',
    name:      'Dr. Proton',
    type:      'SCIENCE',
    difficulty:'medium',
    maxHp:     120,
    dmgDealt:  20,
    dmgTaken:  20,
    image:     'https://cdn.discordapp.com/attachments/1481220361814020106/1482347403704012831/New_Piskel-1.png.png?ex=69b69f19&is=69b54d99&hm=508279d800597b8322c6e267f34bf336ae2722a9d1f0c4620b720bf0f06435e4',
    typeColor: '#4ade80',
    typeBg:    'rgba(74,222,128,0.25)',
    intro:     'Dr. Proton enters the lab!\nHow well do you know science?',
    defeat:    'Hypothesis disproved!\nDr. Proton fainted!',
    preset:    true,
    useStaticIcon: false,  // Explicitly use animated sprites
  },
  {
    id:        'preset_history',
    name:      'General Napoleon',
    type:      'HISTORY',
    difficulty:'medium',
    maxHp:     110,
    dmgDealt:  18,
    dmgTaken:  22,
    image:     'https://cdn.discordapp.com/attachments/1481220361814020106/1482578843855229140/New_Piskel_2.png?ex=69b776a5&is=69b62525&hm=2b5e0a007a6a27d4dad036f6ef5ea399cb07858f2043fff81ea52f727f115e44',
    typeColor: '#f87171',
    typeBg:    'rgba(248,113,113,0.25)',
    intro:     'General Napoleon comes in!\nHow well do you know history?',
    defeat:    'Lost to the English!\nGeneral Napoleon fainted!',
    preset:    true,
    useStaticIcon: false,  // Explicitly use animated sprites
  },
  {
    id:        'preset_biology',
    name:      'Dr. Cell',
    type:      'BIOLOGY',
    difficulty:'hard',
    maxHp:     150,
    dmgDealt:  25,
    dmgTaken:  15,
    image:     'https://media.discordapp.net/attachments/1425681723949191219/1482616470792966144/ezgif-7cf98e6cb6b65d5e.gif?ex=69b799b0&is=69b64830&hm=820e36f01a07f6ec3b880c3d0a3ef670da66d624429e5a44ea044250d57b2349&=',
    typeColor: '#10b981',
    typeBg:    'rgba(16,185,129,0.25)',
    intro:     'Dr. Cell enters the laboratory!\nTest your knowledge of life sciences!',
    defeat:    'Cell division complete!\nDr. Cell has been defeated!',
    preset:    true,
    useStaticIcon: false,  // Will use animated sprites
  },
];

export const Presets = PRESET_BOSSES;