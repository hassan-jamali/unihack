/* ═══════════════════════════════════════════
   editor.js — Question & Boss Editor
   Two modes: PDF upload or manual builder
   ═══════════════════════════════════════════ */



import { Config, _saveConfig } from '../core/config.js';
import { AI } from '../ai/ai.js';
import { UI } from './ui.js';

export const Editor = {

  _activeBossIndex: 0,

  // ── Open / Close ──────────────────────────

  open() {
    this._renderBossTabs();
    this._refreshBossList();
    this._switchTab('bosses');
    document.getElementById('settingsApiKey').value = Config.geminiApiKey || '';
    document.getElementById('settingsQCount').value = Config.questionsPerBatch || 8;
    UI.showScreen('editor-screen');
  },

  close() {
    UI.renderBossCards();
    UI.showScreen('title-screen');
  },

  // ── Tab switching ─────────────────────────

  _switchTab(tab) {
    document.querySelectorAll('.ed-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tab)
    );
    document.querySelectorAll('.ed-panel').forEach(p =>
      p.classList.toggle('active', p.dataset.panel === tab)
    );
  },

  // ── Boss selector tabs ────────────────────

  _renderBossTabs() {
    const container = document.getElementById('edBossTabs');
    if (Config.bosses.length === 0) {
      container.innerHTML = `<span style="font-size:5px;color:#3a4a6a">No bosses — add one in the Bosses tab</span>`;
      this._activeBossIndex = 0;
      const list = document.getElementById('manualQuestionList');
      if (list) list.innerHTML = `<div class="ed-empty">Add a boss first.</div>`;
    } else {
      container.innerHTML = Config.bosses.map((b, i) => `
        <button class="ed-boss-tab ${i === 0 ? 'active' : ''}"
                onclick="Editor._selectBoss(${i})"
                data-boss="${i}">
          ${b.image ? `<img src="${b.image}" style="width:12px;height:12px;object-fit:cover;border-radius:2px;vertical-align:middle;margin-right:3px">` : (b.emoji || '❓')} ${b.name}
        </button>
      `).join('');
      this._activeBossIndex = 0;
      this._refreshManualList();
    }
    const s = document.getElementById('pdfStatus');
    if (s) { s.textContent = ''; s.className = 'ed-status'; }
  },

  _selectBoss(i) {
    this._activeBossIndex = i;
    document.querySelectorAll('.ed-boss-tab').forEach((t, idx) =>
      t.classList.toggle('active', idx === i)
    );
    this._refreshManualList();
  },

  get _activeBoss() {
    return Config.bosses[this._activeBossIndex] ?? Config.bosses[0];
  },

  // ══════════════════════════════════════════
  // PDF TAB
  // ══════════════════════════════════════════

  async processPdf() {
    const { preprocessPDF } = await import("../ai/rag.js");
      
    const boss = this._activeBoss;
    if (!boss) {
      this._pdfStatus('Please add a boss first in the Bosses tab.', 'error');
      return;
    }

    const fileInput = document.getElementById('pdfFileInput');
    const file = fileInput.files[0];

    if (!file) {
      this._pdfStatus('Please select a PDF first.', 'error');
      return;
    }

    this._pdfStatus('Processing PDF with RAG...', 'info');

    try {

      const chunks = await preprocessPDF(file);

      console.log("RAG chunks created:", chunks.length);

      const context = chunks.slice(0, 4).join("\n\n");

      console.log("Sending context to Gemini...");

      const questions = await AI.generateFromText(context);

      console.log("Generated questions:", questions);

      Editor._mergeQuestions(this._activeBoss, questions);

      this._pdfStatus(`Generated ${questions.length} questions`, "success");

    } catch (err) {

      this._pdfStatus('RAG error: ' + err.message, 'error');

    }

  },

  _fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = () => rej(new Error('File read failed'));
      r.readAsDataURL(file);
    });
  },

  _pdfStatus(msg, type) {
    const el = document.getElementById('pdfStatus');
    el.textContent = msg;
    el.className = 'ed-status ' + type;
  },

  // ══════════════════════════════════════════
  // MANUAL TAB
  // ══════════════════════════════════════════

  _refreshManualList() {
    const container = document.getElementById('manualQuestionList');
    if (!container) return;
    const boss = this._activeBoss;
    if (!boss) {
      container.innerHTML = `<div class="ed-empty">Add a boss first.</div>`;
      return;
    }
    const questions = boss._customQuestions || [];

    if (questions.length === 0) {
      container.innerHTML = `<div class="ed-empty">No custom questions yet — add one below!</div>`;
      return;
    }

    container.innerHTML = questions.map((q, i) => `
      <div class="ed-question-item">
        <div class="ed-q-text">${q.q}</div>
        <div class="ed-q-meta">
          <span class="ed-correct">✓ ${q.a}</span>
          <span class="ed-wrongs">${q.w.join(' · ')}</span>
        </div>
        <button class="ed-delete-btn" onclick="Editor._deleteQuestion(${i})">✕</button>
      </div>
    `).join('');
  },

  addQuestion() {
    if (Config.bosses.length === 0) {
      this._manualStatus('Add a boss first.', 'error');
      return;
    }
    const boss = this._activeBoss;

    const q = (document.getElementById('manualQ')?.value || '').trim();
    const a = (document.getElementById('manualA')?.value || '').trim();
    const w1 = (document.getElementById('manualW1')?.value || '').trim();
    const w2 = (document.getElementById('manualW2')?.value || '').trim();
    const w3 = (document.getElementById('manualW3')?.value || '').trim();

    if (!q || !a || !w1 || !w2 || !w3) {
      this._manualStatus('Fill in all fields first.', 'error');
      return;
    }

    if (!boss._customQuestions) boss._customQuestions = [];
    boss._customQuestions.push({ q, a, w: [w1, w2, w3] });

    _saveConfig(Config);

    ['manualQ', 'manualA', 'manualW1', 'manualW2', 'manualW3'].forEach(id =>
      document.getElementById(id).value = ''
    );
    document.getElementById('manualQ').focus();

    this._manualStatus(`✅ Added! (${boss._customQuestions.length} total for ${boss.name})`, 'success');
    this._refreshManualList();
  },

  _deleteQuestion(i) {
    this._activeBoss._customQuestions.splice(i, 1);
    this._refreshManualList();
  },

  _manualStatus(msg, type) {
    const el = document.getElementById('manualStatus');
    el.textContent = msg;
    el.className = 'ed-status ' + type;
    setTimeout(() => { el.textContent = ''; el.className = 'ed-status'; }, 3000);
  },

  // ── Boss management ───────────────────────

  _bossImageData: null,

  previewBossImage(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this._bossImageData = e.target.result;
      const preview = document.getElementById('bossImgPreview');
      preview.src = e.target.result;
      preview.style.display = 'block';
      document.getElementById('bossImgLabel').textContent = file.name;
    };
    reader.readAsDataURL(file);
  },

  addBoss() {
    const name = document.getElementById('newBossName').value.trim();
    const type = document.getElementById('newBossType').value.trim().toUpperCase();
    const color = document.getElementById('newBossColor').value;
    const hp = parseInt(document.getElementById('newBossHp').value) || 100;

    if (!name || !type) {
      this._bossStatus('Name and Topic are required.', 'error');
      return;
    }

    const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newBoss = {
      id,
      name,
      type,
      difficulty: document.getElementById('newBossDiff').value || 'medium',
      maxHp: hp,
      dmgDealt: 15,
      dmgTaken: 25,
      typeColor: color,
      typeBg: color + '40',
      intro: `${name} appears!\nHow well do you know ${type}?`,
      defeat: `${name} fainted!`,
      image: this._bossImageData || null,
      emoji: this._bossImageData ? null : '❓',
    };

    Config.bosses.push(newBoss);
    _saveConfig(Config);

    /* Reset form */
    ['newBossName', 'newBossType'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('newBossHp').value = 100;
    document.getElementById('newBossImgInput').value = '';
    document.getElementById('bossImgPreview').style.display = 'none';
    document.getElementById('bossImgLabel').textContent = '📷 Click to upload image';
    this._bossImageData = null;

    this._bossStatus(`✅ ${name} added!`, 'success');
    this._renderBossTabs();
    this._refreshBossList();
  },

  deleteBoss(i) {
    const name = Config.bosses[i]?.name;
    if (!confirm(`Delete "${name}"? Their questions will also be lost.`)) return;
    Config.bosses.splice(i, 1);
    _saveConfig(Config);
    this._activeBossIndex = Math.max(0, this._activeBossIndex - 1);
    this._renderBossTabs();
    this._refreshBossList();
  },

  _refreshBossList() {
    const el = document.getElementById('bossManageList');
    if (!el) return;
    if (Config.bosses.length === 0) {
      el.innerHTML = `<div class="ed-empty">No bosses yet.</div>`;
      return;
    }
    el.innerHTML = Config.bosses.map((b, i) => `
      <div class="ed-question-item">
        <div class="ed-q-text" style="display:flex;align-items:center;gap:8px">
          ${b.image ? `<img src="${b.image}" style="width:22px;height:22px;object-fit:cover;border-radius:2px;flex-shrink:0">` : `<span style="font-size:16px">${b.emoji || '❓'}</span>`}
          <span>${b.name}</span>
        </div>
        <div class="ed-q-meta">
          <span class="ed-correct">${b.type}</span>
          <span class="ed-wrongs">HP ${b.maxHp} · ${b.difficulty}</span>
        </div>
        <button class="ed-delete-btn" onclick="Editor.deleteBoss(${i})">✕</button>
      </div>
    `).join('');
  },

  _bossStatus(msg, type) {
    const el = document.getElementById('bossStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'ed-status ' + type;
    setTimeout(() => { el.textContent = ''; el.className = 'ed-status'; }, 3000);
  },

  // ── Settings tab ──────────────────────────

  saveSettings() {
    Config.geminiApiKey = document.getElementById('settingsApiKey').value.trim();
    Config.questionsPerBatch = parseInt(document.getElementById('settingsQCount').value) || 8;
    _saveConfig(Config);

    const el = document.getElementById('settingsStatus');
    el.textContent = '✅ Saved!';
    el.className = 'ed-status success';
    setTimeout(() => { el.textContent = ''; }, 2000);
  },

  // ── Shared helpers ────────────────────────

  _mergeQuestions(boss, questions) {
  if (!boss._customQuestions) boss._customQuestions = [];
  boss._customQuestions.push(...questions);
  _saveConfig(Config);
  this._refreshManualList(); // ← add this line
  },
};

/* Global bindings */
window.Editor = Editor;
window.openEditor = function () { Editor.open(); }
window.closeEditor = function () { Editor.close(); }
window.edSwitchTab = function (t) { Editor._switchTab(t); }
window.processPdf = function () { Editor.processPdf(); }
window.addQuestion = function () { Editor.addQuestion(); }
window.saveSettings = function () { Editor.saveSettings(); }
window.addBoss = function () { Editor.addBoss(); }
window.previewBossImage = function (el) { Editor.previewBossImage(el); }
