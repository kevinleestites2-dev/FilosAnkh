'use strict';

/**
 * ENGINE — FilosAnkh
 *
 * The intelligence core. Three modes:
 *
 * 1. SMART (default) — LightAgent full ReAct loop via Python bridge
 * 2. CONTROLLED     — OpenAI-compatible API call direct (no agent loop)
 * 3. FAST           — Gemini Flash direct (fallback when Ollama is down)
 *
 * Self-learning: Filos stores his own refinements in data/learnings.json
 */

const { execSync }    = require('child_process');
const path            = require('path');
const fs              = require('fs');
const config          = require('./config');
const soul            = require('./soul');
const memory          = require('./memory');

const LEARNINGS_FILE = path.join(__dirname, '..', 'data', 'learnings.json');
const BRIDGE_PY      = path.join(__dirname, '..', 'bridge.py');

// ── Self-Learning ─────────────────────────────────────────────────────────

function loadLearnings() {
  if (!fs.existsSync(LEARNINGS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(LEARNINGS_FILE, 'utf8')); } catch { return {}; }
}

function selfLearn(userMessage, reply) {
  if (reply.length < 30) return;
  const learnings = loadLearnings();
  const key = userMessage.slice(0, 40).toLowerCase().replace(/\s+/g, '_');
  learnings[key] = { reply: reply.slice(0, 200), ts: Date.now() };

  // Keep last 50
  const keys = Object.keys(learnings);
  if (keys.length > 50) {
    const oldest = keys.sort((a, b) => (learnings[a].ts || 0) - (learnings[b].ts || 0)).slice(0, keys.length - 50);
    for (const k of oldest) delete learnings[k];
  }

  const dir = path.dirname(LEARNINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LEARNINGS_FILE, JSON.stringify(learnings, null, 2));
}

// ── LightAgent Bridge ─────────────────────────────────────────────────────

async function runLightAgent(userMessage, history) {
  const cfg     = config.load();
  const system  = soul.buildSystemPrompt(userMessage);

  const payload = JSON.stringify({
    system,
    history,
    message:    userMessage,
    model:      cfg.lightAgentModel || 'llama3.1',
    base_url:   cfg.ollamaBaseUrl   || 'http://localhost:11434',
    api_key:    cfg.lightAgentKey   || 'ollama',
    temperature: 0.7,
  });

  // Escape single quotes in payload for shell
  const escaped = payload.replace(/'/g, "'\"'\"'");

  const result = execSync(
    `python3 "${BRIDGE_PY}" '${escaped}'`,
    { encoding: 'utf8', timeout: 60000 }
  );

  const parsed = JSON.parse(result.trim());
  return parsed.reply || '(no reply)';
}

// ── Controlled / Direct API ───────────────────────────────────────────────

async function runDirect(userMessage, history) {
  const cfg  = config.load();
  const base = cfg.ollamaBaseUrl || 'http://localhost:11434';

  const messages = [
    { role: 'system', content: soul.buildSystemPrompt(userMessage) },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const body = JSON.stringify({
    model:    cfg.lightAgentModel || 'llama3.1',
    messages,
    temperature: 0.7,
    stream: false,
  });

  // Use built-in https — no fetch dep needed
  return new Promise((resolve, reject) => {
    const url = new URL(`${base}/v1/chat/completions`);
    const lib = url.protocol === 'https:' ? require('https') : require('http');

    const req = lib.request({
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization':  `Bearer ${cfg.lightAgentKey || 'ollama'}`,
      },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.choices?.[0]?.message?.content || '(no reply)');
        } catch (err) {
          reject(new Error(`Parse error: ${err.message} — raw: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Gemini Flash (fast fallback) ──────────────────────────────────────────

async function runGemini(userMessage, history) {
  const cfg    = config.load();
  const apiKey = cfg.geminiApiKey;
  if (!apiKey) throw new Error('No GOOGLE_AI_STUDIO_API_KEY');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const contents = [
    ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const system = soul.buildSystemPrompt(userMessage);

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  });

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const req = require('https').request({
      hostname: url.hostname,
      path:     `${url.pathname}${url.search}`,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '(no reply)';
          resolve(text);
        } catch (err) {
          reject(new Error(`Gemini parse error: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Public API ────────────────────────────────────────────────────────────

async function run(userMessage, history) {
  const cfg = config.load();
  const mode = cfg.mode || 'smart';

  // Try LightAgent first (smart mode)
  if (mode === 'smart') {
    try {
      return await runLightAgent(userMessage, history);
    } catch (err) {
      console.error('[filos:engine] LightAgent failed, falling back to direct:', err.message);
      // Fall through to direct
    }
  }

  // Direct Ollama API
  if (cfg.ollamaBaseUrl) {
    try {
      return await runDirect(userMessage, history);
    } catch (err) {
      console.error('[filos:engine] Direct Ollama failed, falling back to Gemini:', err.message);
      // Fall through to Gemini
    }
  }

  // Last resort: Gemini
  return await runGemini(userMessage, history);
}

async function chat(systemPrompt, history) {
  const cfg = config.load();
  try {
    const messages = [{ role: 'system', content: systemPrompt }, ...history];
    const reply = await runDirect(systemPrompt, messages);
    return { reply };
  } catch {
    return { reply: '' };
  }
}

module.exports = { run, chat, selfLearn, runLightAgent, runDirect, runGemini };
