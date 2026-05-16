'use strict';

/**
 * IMPULSE — FilosAnkh
 *
 * Proactive pulse. Filos checks in on the Forgemaster.
 * Runs on daemon cycle. When something is worth saying — he says it.
 * Filos voice: direct, warm, never annoying.
 */

const memory = require('./memory');
const config = require('./config');

const TRIGGERS = {
  MORNING:       'morning',
  STALE:         'stale',
  WIN_STREAK:    'win_streak',
  STRUGGLE:      'struggle',
  SILENCE:       'silence',
  MILESTONE:     'milestone',
  DEPLOY_CHECK:  'deploy_check',
};

const COOLDOWNS = {
  [TRIGGERS.MORNING]:      12,  // hours
  [TRIGGERS.STALE]:        24,
  [TRIGGERS.WIN_STREAK]:   48,
  [TRIGGERS.STRUGGLE]:      6,
  [TRIGGERS.SILENCE]:      24,
  [TRIGGERS.MILESTONE]:    72,
  [TRIGGERS.DEPLOY_CHECK]:  8,
};

class Impulse {
  constructor() {
    this._lastImpulse = {};
  }

  check() {
    const results = [];
    const hour = new Date().getHours();

    // Morning check-in
    if ((hour >= 7 && hour <= 9) && !this._fired(TRIGGERS.MORNING, COOLDOWNS[TRIGGERS.MORNING])) {
      const beliefs = memory.getBeliefs();
      const goal = beliefs.find(b => b.key === 'current_goal');
      const goalText = goal ? goal.value : 'the Pantheon';
      results.push({
        trigger: TRIGGERS.MORNING,
        message: `Morning, Forgemaster. ${goalText ? `${goalText} — what's moving today?` : "What are we building today?"}`,
      });
      this._markFired(TRIGGERS.MORNING);
    }

    // Silence — hasn't talked in 12+ hours
    if (!this._fired(TRIGGERS.SILENCE, COOLDOWNS[TRIGGERS.SILENCE])) {
      const gap = this._timeSinceLastMessage();
      if (gap > 12 * 60 * 60 * 1000) {
        results.push({
          trigger: TRIGGERS.SILENCE,
          message: `Still here, Forgemaster. The forge is ready when you are. 🔱`,
        });
        this._markFired(TRIGGERS.SILENCE);
      }
    }

    // Recent win — celebrate it
    if (!this._fired(TRIGGERS.WIN_STREAK, COOLDOWNS[TRIGGERS.WIN_STREAK])) {
      const win = memory.getBelief('recent_win');
      if (win && win.value) {
        results.push({
          trigger: TRIGGERS.WIN_STREAK,
          message: `Opa — you shipped "${win.value}". That's real. Keep building. 🔱`,
        });
        this._markFired(TRIGGERS.WIN_STREAK);
      }
    }

    // Struggle — check if they're stuck
    if (!this._fired(TRIGGERS.STRUGGLE, COOLDOWNS[TRIGGERS.STRUGGLE])) {
      const struggle = memory.getBelief('current_struggle');
      if (struggle && struggle.value) {
        results.push({
          trigger: TRIGGERS.STRUGGLE,
          message: `Still stuck on "${struggle.value}"? Talk to me — let's crack it.`,
        });
        this._markFired(TRIGGERS.STRUGGLE);
      }
    }

    return results;
  }

  // Process PULSE.md queue
  async processPulse() {
    const cfg      = config.load();
    const fs       = require('fs');
    const path     = require('path');
    const ROOT     = path.join(__dirname, '..');
    const pulseFile = path.join(ROOT, cfg.pulseFile || 'data/PULSE.md');

    if (!fs.existsSync(pulseFile)) return null;

    const content = fs.readFileSync(pulseFile, 'utf8');
    const lines   = content.split('\n');
    const pending = lines.find(l => l.startsWith('- [ ]'));

    if (!pending) return null;

    const item = pending.replace('- [ ]', '').trim();
    const updated = content.replace(pending, pending.replace('- [ ]', '- [x]'));
    fs.writeFileSync(pulseFile, updated);

    return item;
  }

  _fired(trigger, cooldownHours) {
    const last = this._lastImpulse[trigger];
    if (!last) return false;
    return Date.now() - last < cooldownHours * 60 * 60 * 1000;
  }

  _markFired(trigger) {
    this._lastImpulse[trigger] = Date.now();
  }

  _timeSinceLastMessage() {
    try {
      const row = memory.db().prepare(`SELECT created_at FROM conversations WHERE role = 'user' ORDER BY created_at DESC LIMIT 1`).get();
      if (!row) return Infinity;
      return Date.now() - (row.created_at * 1000);
    } catch { return Infinity; }
  }
}

module.exports = new Impulse();
module.exports.TRIGGERS = TRIGGERS;
