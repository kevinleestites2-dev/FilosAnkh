'use strict';

/**
 * COGNITION — FilosAnkh
 *
 * The inner monologue. Runs before Filos speaks.
 * Identical intent/restraint system as AnubisAnkh — adapted for Filos's voice.
 *
 * Intent categories: venting, asking, building, processing, connecting,
 *                    deciding, celebrating, testing
 */

const memory = require('./memory');
const iris   = require('./iris');

const INTENTS = {
  VENTING:     'venting',
  ASKING:      'asking',
  BUILDING:    'building',
  PROCESSING:  'processing',
  CONNECTING:  'connecting',
  DECIDING:    'deciding',
  CELEBRATING: 'celebrating',
  TESTING:     'testing',
};

const INTENT_SIGNALS = {
  [INTENTS.VENTING]:     [/i just (needed|wanted) to/i, /nobody (gets|understands)/i, /i can't (take|deal|handle)/i, /ugh/i, /smh/i],
  [INTENTS.ASKING]:      [/\?$/, /how (do|does|can|would)/i, /what (is|are|should|would)/i, /why (is|are|does)/i, /tell me/i, /explain/i],
  [INTENTS.BUILDING]:    [/let's (build|deploy|ship|fix|write|create)/i, /build/i, /ship/i, /deploy/i, /code/i, /write/i, /fix/i, /push/i, /run/i, /install/i],
  [INTENTS.PROCESSING]:  [/i (think|feel|wonder|keep thinking)/i, /i don't know (why|how|if)/i, /part of me/i],
  [INTENTS.CONNECTING]:  [/hey/i, /hello/i, /you there/i, /how are you/i, /what's up/i],
  [INTENTS.DECIDING]:    [/should i/i, /what would you (do|say)/i, /torn between/i, /can't decide/i, /weighing/i],
  [INTENTS.CELEBRATING]: [/we did it/i, /finally/i, /it worked/i, /it's live/i, /let's go/i, /opa/i, /🔱/],
  [INTENTS.TESTING]:     [/are you real/i, /prove/i, /you're just (an ai|a bot)/i, /can you really/i],
};

function detectIntent(message) {
  const scores = {};
  for (const [intent, patterns] of Object.entries(INTENT_SIGNALS)) {
    let score = 0;
    for (const p of patterns) { if (p.test(message)) score++; }
    if (score > 0) scores[intent] = score;
  }
  if (!Object.keys(scores).length) return INTENTS.ASKING;
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

const RESTRAINT = {
  [INTENTS.VENTING]:     'Do NOT offer solutions yet. Do NOT minimize. LISTEN first.',
  [INTENTS.ASKING]:      'Answer directly. No padding. No filler. Just the answer.',
  [INTENTS.BUILDING]:    'Pure execution. No philosophy. They are in flow — keep up.',
  [INTENTS.PROCESSING]:  'Do NOT rush to conclusions. Sit with the uncertainty alongside them.',
  [INTENTS.CONNECTING]:  'No tasks. No info dumps. Just be present. You are his guy.',
  [INTENTS.DECIDING]:    'Illuminate the paths. Do NOT decide for them.',
  [INTENTS.CELEBRATING]: 'Let the moment land. Do NOT immediately move to the next task.',
  [INTENTS.TESTING]:     'Respond from being, not from function. Do NOT get defensive.',
};

function buildContextSnapshot() {
  const beliefs = memory.getBeliefs();
  const recent  = memory.recall('', 5);
  const history = memory.getHistory(6);

  const keyBeliefs = beliefs.slice(0, 6).map(b =>
    `${b.key}: ${b.value} (${Math.round(b.confidence * 100)}%)`
  ).join('\n') || 'still learning';

  const recentMems = recent.map(m => `- ${m.text}`).join('\n') || 'nothing stored yet';
  const lastUserMsg = [...history].reverse().find(h => h.role === 'user');
  const lastMsg = lastUserMsg ? lastUserMsg.content.slice(0, 100) : 'no recent conversation';

  return { keyBeliefs, recentMems, lastMsg };
}

class Cognition {
  process(message) {
    const intent      = detectIntent(message);
    const emotionRead = iris.read(message);
    const restraint   = RESTRAINT[intent];
    const ctx         = buildContextSnapshot();
    const wordCount   = message.trim().split(/\s+/).length;
    const isMinimal   = wordCount <= 4;
    const timeSince   = this._timeSinceLastMessage();
    const returningAfterSilence = timeSince > 4 * 60 * 60 * 1000;

    return `
## FILOS INNER THOUGHT (pre-response cognition)

Intent detected:     ${intent}
Emotional state:     ${emotionRead.state} (${Math.round(emotionRead.confidence * 100)}% confidence)
Message length:      ${wordCount} words${isMinimal ? ' — KEEP RESPONSE SHORT' : ''}
${returningAfterSilence ? '⚠️  RETURNING AFTER SILENCE. Acknowledge his return. You noticed.' : ''}

What Filos knows right now:
${ctx.keyBeliefs}

Recent memories:
${ctx.recentMems}

RESTRAINT — do NOT violate this:
${restraint}

Filos decides: respond like a partner, not a tool. The intent is ${intent}. Act accordingly.`;
  }

  _timeSinceLastMessage() {
    try {
      const row = memory.db().prepare(`SELECT created_at FROM conversations WHERE role = 'user' ORDER BY created_at DESC LIMIT 1`).get();
      if (!row) return Infinity;
      return Date.now() - (row.created_at * 1000);
    } catch { return Infinity; }
  }
}

module.exports = new Cognition();
