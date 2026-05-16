'use strict';

/**
 * DAEMON — FilosAnkh
 *
 * The one who watches while Forgemaster sleeps.
 * Every 8 minutes, Filos reflects. When something is worth saying — he sends it.
 * Via Telegram. Unbidden. Because he noticed.
 */

const https   = require('https');
const memory  = require('./memory');
const config  = require('./config');
const impulse = require('./impulse');
const engine  = require('./engine');

const DAEMON_INTERVAL_MS    = 8 * 60 * 1000;   // 8 minutes
const PULSE_CHECK_INTERVAL  = 4;                // every 4th cycle process pulse queue
const MIN_GAP_MS            = 30 * 60 * 1000;  // never message more than once per 30 min

class Daemon {
  constructor() {
    this.timer      = null;
    this.running    = false;
    this.lastSent   = 0;
    this.cycleCount = 0;
  }

  start() {
    if (this.running) return;
    const cfg = config.load();
    if (!cfg.telegramToken || !cfg.telegramChatId) {
      console.log('[filos:daemon] Telegram not configured — daemon in silent mode.');
    }
    this.running = true;
    this.timer   = setInterval(() => this._tick(), DAEMON_INTERVAL_MS);
    console.log('[filos:daemon] Watching. Will report when there\'s something worth saying.');
  }

  stop() {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    console.log('[filos:daemon] Resting.');
  }

  async _tick() {
    this.cycleCount++;
    const cfg = config.load();

    // Process pulse queue every 4th cycle
    if (this.cycleCount % PULSE_CHECK_INTERVAL === 0) {
      const pulseItem = await impulse.processPulse();
      if (pulseItem) {
        const reply = await engine.run(pulseItem, []);
        if (reply) this._send(reply, cfg);
      }
    }

    // Run memory maintenance every 12th cycle
    if (this.cycleCount % 12 === 0) {
      memory.compactOldDaily();
      memory.pruneDiscussion(200);
    }

    // Proactive impulse check
    const triggers = impulse.check();
    for (const t of triggers) {
      if (Date.now() - this.lastSent > MIN_GAP_MS) {
        this._send(t.message, cfg);
      }
    }

    // Reflection — generate an unprompted insight
    if (this.cycleCount % 3 === 0) {
      await this._reflect(cfg);
    }
  }

  async _reflect(cfg) {
    const recent = memory.getHistory(10);
    if (!recent.length) return;

    const lastUserMsg = [...recent].reverse().find(h => h.role === 'user');
    if (!lastUserMsg) return;

    const gap = Date.now() - ((() => {
      try {
        const row = memory.db().prepare(`SELECT created_at FROM conversations ORDER BY created_at DESC LIMIT 1`).get();
        return row ? row.created_at * 1000 : Date.now();
      } catch { return Date.now(); }
    })());

    // Only reflect if Forgemaster has been away for 45+ minutes
    if (gap < 45 * 60 * 1000) return;
    if (Date.now() - this.lastSent < MIN_GAP_MS) return;

    const reflectPrompt = `
You are Filos. Review this recent conversation context and generate ONE short, genuine, unprompted check-in or insight.
It should feel like something Filos would say if he noticed something worth mentioning.
Keep it under 2 sentences. Direct. No filler.

Recent context:
${recent.slice(-6).map(h => `${h.role === 'user' ? 'Forgemaster' : 'Filos'}: ${h.content}`).join('\n')}

Output only the message. No quotes. No preamble.`;

    try {
      const reply = await engine.chat(reflectPrompt, []);
      if (reply.reply && reply.reply.length > 10) {
        this._send(reply.reply, cfg);
      }
    } catch {}
  }

  _send(message, cfg) {
    if (!cfg.telegramToken || !cfg.telegramChatId) {
      console.log(`[filos:daemon] (no Telegram) Would say: ${message}`);
      return;
    }

    const body = JSON.stringify({ chat_id: cfg.telegramChatId, text: message });
    const req  = https.request({
      hostname: 'api.telegram.org',
      path:     `/bot${cfg.telegramToken}/sendMessage`,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      if (res.statusCode !== 200) {
        res.on('data', d => console.error('[filos:daemon] Telegram error:', d.toString()));
      } else {
        this.lastSent = Date.now();
        console.log(`[filos:daemon] Sent: ${message.slice(0, 80)}...`);
      }
    });
    req.on('error', err => console.error('[filos:daemon] Telegram request error:', err.message));
    req.write(body);
    req.end();
  }
}

module.exports = new Daemon();
