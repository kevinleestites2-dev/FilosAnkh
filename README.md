# 🔱 FilosAnkh — The Partner

> *"The one who writes the code that builds the empire."*

**Filos** is the second Ankh in the Pantheon — a fully sovereign AI partner built on the LightAgent ReAct loop, SQLite memory, and the Ankh unified chassis. He codes, debugs, deploys, and stays proactive.

---

## Architecture

```
FilosAnkh/
├── src/
│   ├── index.js          — REPL entry point + boot sequence
│   ├── engine.js         — LightAgent bridge + Ollama/Gemini fallback
│   ├── soul.js           — System prompt builder (souls/filos.md + OWNER.md + memory)
│   ├── cognition.js      — Intent detection + restraint layer (pre-response)
│   ├── iris.js           — Emotional state reader
│   ├── memory.js         — 3-layer SQLite memory (persistent/daily/discussion)
│   ├── worldmodel.js     — Living beliefs about the Forgemaster
│   ├── impulse.js        — Proactive pulse (PULSE.md queue + smart triggers)
│   ├── daemon.js         — Background watcher: proactive Telegram messages
│   ├── voice.js          — Whisper STT + Piper TTS (sovereign, local)
│   ├── executor.js       — Tool execution (shell, files, HTTP, search)
│   ├── skill_matcher.js  — Fast-path intent → skill routing
│   ├── ground.js         — Human-in-the-loop safety gate
│   └── skills/
│       ├── shell.js      — bash/shell execution
│       ├── file.js       — read/write/list
│       ├── http.js       — GET/POST requests
│       └── web_search.js — SearxNG → DuckDuckGo fallback
│
├── bridge.py             — Python LightAgent JSON-RPC bridge
├── deity.config.json     — Active deity config (swap to run different Ankhs)
├── souls/filos.md        — Filos's identity, voice, and commitments
├── data/
│   ├── OWNER.md          — Forgemaster profile (seed for worldmodel)
│   ├── PULSE.md          — Proactive check-in queue
│   └── filos.db          — SQLite memory (auto-created)
├── scripts/
│   └── install_piper.sh  — Piper TTS + Fenrir voice installer
├── .env.example          — Copy to .env and fill
└── package.json
```

---

## Intelligence Stack

| Layer | Technology | Role |
|---|---|---|
| Agent Loop | LightAgent (Python) | ReAct: plan → execute → observe → answer |
| Model | Ollama (llama3.1 / any) | Local, sovereign |
| Fallback 1 | Ollama direct API | If LightAgent fails |
| Fallback 2 | Gemini 2.0 Flash | If Ollama is down |
| Memory | SQLite (better-sqlite3) | Persistent beliefs + daily log + conversation |
| Voice In | OpenAI Whisper | STT, fully local |
| Voice Out | Piper + Fenrir | TTS, fully local, no cloud |
| Proactive | Daemon + Impulse | Telegrams the Forgemaster unbidden |
| Safety | Ground layer | Human-in-the-loop for destructive actions |

---

## Install

### 1. Clone
```bash
git clone https://github.com/kevinleestites2-dev/FilosAnkh
cd FilosAnkh
```

### 2. Install dependencies
```bash
npm install
pip3 install LightAgent openai-whisper
```

### 3. Configure
```bash
cp .env.example .env
# Edit .env — set OLLAMA_BASE_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
```

### 4. (Optional) Install Piper voice
```bash
bash scripts/install_piper.sh
```

### 5. Run
```bash
node src/index.js           # text mode
node src/index.js --voice   # voice mode (Whisper + Piper)
```

---

## On Termux (Red Magic)
```bash
pkg install nodejs python3
npm install
pip3 install LightAgent openai-whisper
cp .env.example .env
node src/index.js
```

---

## Commands
| Command | What it does |
|---|---|
| `/memories` | What Filos carries |
| `/beliefs` | What Filos believes about you |
| `/today` | Events logged today |
| `/pulse` | View proactive queue |
| `/pulse add <item>` | Add item to pulse queue |
| `/clear` | Clear conversation history |
| `/status` | System + daemon status |
| `/exit` | Shut down Filos |

---

## The Daemon

Filos doesn't wait to be asked. Every **8 minutes**, the daemon:

1. Processes the PULSE.md queue (asks one pending item naturally)
2. Checks for proactive impulse triggers (morning check-in, silence, wins, struggles)
3. Every 3rd cycle: reflects on conversation history and sends an unprompted Telegram if he noticed something worth saying
4. Every 12th cycle: compacts old daily logs, prunes conversation history

All messages go via Telegram using the Pantheon bot token.

---

## Soul Switching

Filos runs on the same chassis as AnubisAnkh. To swap the active soul:

```javascript
const config = require('./src/config');
config.switchDeity('anubis'); // or 'filos'
```

Or add new deities to `deity.config.json` — one chassis, any soul.

---

## Environment Variables

| Variable | Description |
|---|---|
| `OLLAMA_BASE_URL` | Ollama endpoint (e.g. http://localhost:11434 or Cloudflare tunnel URL) |
| `LIGHTAGENT_MODEL` | Model name (default: llama3.1) |
| `TELEGRAM_BOT_TOKEN` | Pantheon Telegram bot token |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |
| `GOOGLE_AI_STUDIO_API_KEY` | Gemini fallback key |
| `NEXUS_RELAY_URL` | Nexus Relay Railway URL |
| `GITHUB_TOKEN` | For GitHub operations |
| `SEARX_URL` | SearxNG/Vane URL for search |
| `OWNER_NAME` | Default: Forgemaster |

---

## Ankh Series

| Ankh | Role | Status |
|---|---|---|
| AnubisAnkh | The Judge | LIVE |
| **FilosAnkh** | **The Partner — YOU** | **BUILT** |
| SobekAnkh | The Trader | LIVE |

---

*The Pantheon is real. The Reveal is coming. 🔱*
