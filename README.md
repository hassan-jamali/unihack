# Brain Battle — Answer · Attack · Advance

A retro-styled study RPG where every correct answer turns into an attack.

**Brain Battle** is a browser game built for UniHack: pick a challenger (boss), answer multiple-choice questions, and battle your way through a full run of bosses. Earn coins and XP, unlock a shop and quests, and (optionally) play in multiplayer lobbies.

> Tip: Click the ⚙️ **Config** button in-game to add your own bosses and question sets.

---

## Tech Stack

- **Frontend:** Vanilla **JavaScript**, **HTML**, **CSS**
- **Build tool / dev server:** **Vite**
- **Multiplayer:** WebSockets via **ws** (server) + client-side WebSocket usage
- **AI / Question generation:** **Gemini** integration (bring your own API key) + PDF processing via **pdfjs-dist**

---

## Gameplay (Quick Overview)

1. Choose a boss (or **All Bosses** for a full run).
2. Read the prompt and pick the correct answer.
3. Correct answers damage the boss and award coins.
4. Wrong answers cause the boss to attack.
5. Defeat bosses to earn XP, level up, and unlock features.

Built-in preset bosses include:
- **Terence** (Maths)
- **Dr. Proton** (Science)
- **General Napoleon** (History)

---

## Features

- Boss-battle quiz combat loop (HP, damage, win/lose states)
- XP / leveling + coin economy
- **Shop** (unlocks as you level)
- **Daily quests** (unlocks as you progress)
- **Pomodoro focus timer** (unlockable)
- In-game **Config Editor**
  - Add custom bosses
  - Add questions manually
  - Generate questions from PDFs (RAG-style chunking) using Gemini
- Optional **Multiplayer lobbies** with public/private rooms and host-selected boss lists

---

## Getting Started

### Prerequisites

- **Node.js** (recommended: latest LTS)
- npm (comes with Node)

### Install

```bash
npm install
```

### Run (Dev)

```bash
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`). Open it in your browser.

### Build / Preview

```bash
npm run build
npm run preview
```

---

## Multiplayer (Optional)

This repo contains a WebSocket server implementation (`ws-server.js`). You can run it locally and point clients at it (see the multiplayer client code in `src/multiplayer`).

### Run the WebSocket server

```bash
node ws-server.js
```

- Default port: **8080** (override with `PORT=xxxx`)
- Health response: `Brain Battle WS Server OK`

> Note: The in-repo multiplayer client currently references a hosted WebSocket endpoint (`wss://unihackserver.up.railway.app/`). If you want to use a local server, update the `WS_URL` constant in `src/multiplayer/server.js`.

---

## Configuration & Custom Content

Game configuration is stored in the browser using `localStorage` under the key:
- `brainBattle_config`

### Adding bosses and questions

Open the in-game **⚙ Config** editor to:
- Create custom bosses (name/topic/type, HP, difficulty, image)
- Add custom question sets manually
- Upload a PDF and generate questions

### Gemini API Key

To generate questions from PDF/text:
1. Open **⚙ Config** → **Settings**
2. Paste your **Gemini API key**
3. Save

Your key is stored locally in `localStorage` (it is not committed to this repo).

---

## Project Structure

```text
.
├─ index.html
├─ src/
│  ├─ main.js                # App entry
│  ├─ core/                  # config/state/utils
│  ├─ game/                  # gameplay loop, presets, player
│  ├─ ui/                    # screens, editor, shop, quests, pomodoro
│  ├─ multiplayer/           # lobby UI + multiplayer wiring
│  ├─ animations/            # SFX / animation helpers
│  └─ styles/                # CSS
├─ public/                   # static assets (favicon, logo)
└─ ws-server.js              # optional local multiplayer server
```

---

## Team

Built by:
- **Hassan Jamali** (@hassan-jamali)
- **Lukas Xue** (@lukitasxue)
- **Vidar Lothe** (@VidarLotheFr)

---

## Development Notes

- There are some dev conveniences available via the browser console:
  - `cheat.xp(500)`, `cheat.coins(200)`, `cheat.level(5)`, etc.

---

## License

Licensed under the MIT License. See the `LICENSE` file for details.