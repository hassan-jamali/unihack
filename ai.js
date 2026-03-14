/* ═══════════════════════════════════════════
   ai.js — Question generation via Google Gemini API
   The only file that calls fetch().
   Falls back to hardcoded questions on error.
   Depends on: config.js, state.js, utils.js

   Expects Config.geminiApiKey to be set in config.js
   ═══════════════════════════════════════════ */

const AI = {

  async fetchQuestions(boss) {
    this._startLoader(boss.name);
    try {
      const rawText   = await this._callAPI(boss);
      const questions = this._parse(rawText);
      return shuffle(questions);
    } catch (err) {
      console.warn('AI fetch failed, using fallback:', err.message);
      return shuffle(this._fallback(boss.type));
    } finally {
      this._stopLoader();
    }
  },

  async _callAPI(boss) {
    const prompt = `You are generating quiz questions for a Pokémon-style educational battle game.

Generate exactly ${Config.questionsPerBatch} multiple choice questions on the topic of ${boss.type} at a ${boss.difficulty} difficulty level.

Requirements:
- Each question must have exactly 1 correct answer and exactly 3 plausible but wrong answers
- Cover a wide variety of subtopics within ${boss.type} — do not repeat similar questions
- Keep question text under 80 characters
- Keep all answer text under 40 characters
- Make questions genuinely educational and interesting
- Do NOT include question numbers or labels

Respond with ONLY a raw JSON array. No explanation, no markdown, no code fences. Format:
[{ "q": "Question?", "a": "Correct answer", "w": ["Wrong 1", "Wrong 2", "Wrong 3"] }]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Config.geminiApiKey}`;

    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:     0.7,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', errData);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini raw response:', JSON.stringify(data, null, 2));

    const rawText = data.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)
      ?.map(p => p.text)
      ?.join('');

    console.log('Extracted text:', rawText);

    if (!rawText) throw new Error('Empty response from Gemini API');
    return rawText;
  },

  _parse(rawText) {
    const match = rawText.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found in response');

    const questions = JSON.parse(match[0]);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Empty or invalid response from API');
    }

    const valid = questions.filter(q =>
      typeof q.q === 'string' && q.q.length > 0 &&
      typeof q.a === 'string' && q.a.length > 0 &&
      Array.isArray(q.w)      && q.w.length >= 3
    );

    if (valid.length === 0) throw new Error('No valid questions in API response');
    return valid;
  },

  _startLoader(bossName) {
    let dots = 0;
    const el = document.getElementById('dialogueText');
    el.textContent     = `Summoning ${bossName}`;
    State.loadingTimer = setInterval(() => {
      dots = (dots + 1) % 4;
      el.textContent = `Summoning ${bossName}` + '.'.repeat(dots);
    }, 380);
  },

  _stopLoader() {
    if (State.loadingTimer) {
      clearInterval(State.loadingTimer);
      State.loadingTimer = null;
    }
  },

  _fallback(type) {
    const questions = {
      MATHS: [
        { q: 'What is 12 × 8?',             a: '96',           w: ['84', '108', '72'] },
        { q: 'What is √144?',               a: '12',           w: ['14', '11', '13'] },
        { q: 'What is 15% of 200?',         a: '30',           w: ['25', '35', '20'] },
        { q: 'What is 2³ + 3²?',            a: '17',           w: ['13', '19', '21'] },
        { q: 'Solve: 3x + 6 = 21. x = ?',  a: '5',            w: ['3', '7', '9'] },
        { q: 'Next prime after 13?',        a: '17',           w: ['15', '16', '19'] },
        { q: '0.25 as a fraction?',         a: '1/4',          w: ['1/2', '1/5', '2/5'] },
        { q: 'Sides on a heptagon?',        a: '7',            w: ['6', '8', '9'] },
      ],
      SCIENCE: [
        { q: 'Chemical symbol for Gold?',   a: 'Au',           w: ['Go', 'Gd', 'Ag'] },
        { q: 'Powerhouse of the cell?',     a: 'Mitochondria', w: ['Nucleus', 'Ribosome', 'Vacuole'] },
        { q: 'Planet closest to the Sun?',  a: 'Mercury',      w: ['Venus', 'Mars', 'Earth'] },
        { q: 'Gas that plants absorb?',     a: 'CO₂',          w: ['O₂', 'N₂', 'H₂'] },
        { q: 'Atomic number of Carbon?',    a: '6',            w: ['12', '8', '4'] },
        { q: 'Speed of light (approx)?',    a: '300,000 km/s', w: ['150,000 km/s', '500,000 km/s', '200,000 km/s'] },
        { q: "Earth's main atmosphere gas?",a: 'Nitrogen',     w: ['Oxygen', 'CO₂', 'Argon'] },
        { q: 'Bones in adult human body?',  a: '206',          w: ['212', '198', '220'] },
      ],
      BUSINESS: [
        { q: 'ROI stands for?',             a: 'Return on Investment',    w: ['Rate of Income', 'Revenue of Interest', 'Return on Income'] },
        { q: 'GDP stands for?',             a: 'Gross Domestic Product',  w: ['General Demand Price', 'Growth Data Point', 'Global Dollar Price'] },
        { q: 'B2B means?',                  a: 'Business to Business',    w: ['Back to Basics', 'Buy to Build', 'Brand to Brand'] },
        { q: 'IPO stands for?',             a: 'Initial Public Offering', w: ['Internal Profit Overview', 'Investment Portfolio Option', 'Income Per Output'] },
        { q: "A 'dividend' is?",            a: 'Profit paid to shareholders', w: ['A type of tax', 'Company loan', 'Stock price increase'] },
        { q: "A 'bear market' means?",      a: 'Prices falling 20%+',     w: ['Prices rising fast', 'Stable market', 'New market opening'] },
        { q: "What is 'inflation'?",        a: 'Rise in general prices',  w: ['Fall in unemployment', 'Increase in exports', 'Drop in interest rates'] },
        { q: "What is 'cash flow'?",        a: 'Money moving in & out',   w: ['Total profit', 'Bank balance', 'Tax owed'] },
      ],
      HISTORY: [
        { q: 'Who was the first US President?',    a: 'George Washington', w: ['John Adams', 'Thomas Jefferson', 'Benjamin Franklin'] },
        { q: 'Year WW2 ended?',                    a: '1945',              w: ['1943', '1944', '1918'] },
        { q: 'Which empire built the Colosseum?',  a: 'Roman Empire',      w: ['Greek Empire', 'Ottoman Empire', 'Byzantine Empire'] },
        { q: 'Who painted the Sistine Chapel?',    a: 'Michelangelo',      w: ['Leonardo da Vinci', 'Raphael', 'Botticelli'] },
        { q: 'Year the Berlin Wall fell?',         a: '1989',              w: ['1991', '1987', '1985'] },
        { q: 'Napoleon was exiled to?',            a: 'Saint Helena',      w: ['Elba', 'Corsica', 'Malta'] },
        { q: 'First country to give women vote?',  a: 'New Zealand',       w: ['Australia', 'Finland', 'USA'] },
        { q: 'Ancient wonder still standing?',     a: 'Great Pyramid',     w: ['Colossus of Rhodes', 'Lighthouse of Alexandria', 'Hanging Gardens'] },
      ],
    };
    return questions[type] ?? questions.MATHS;
  },
};