'use strict';

/**
 * WORLDMODEL — FilosAnkh
 *
 * Filos's living understanding of the Forgemaster.
 * Updated continuously. Fed into every engine call.
 */

const memory = require('./memory');

const MODEL_KEYS = {
  NAME:            'name',
  LOCATION:        'location',
  SITUATION:       'situation',
  PRIMARY_NEED:    'primary_need',
  UNSPOKEN_NEED:   'unspoken_need',
  CURRENT_GOAL:    'current_goal',
  CURRENT_STRUGGLE:'current_struggle',
  MOMENTUM:        'momentum',
  RECENT_WIN:      'recent_win',
  RELATIONSHIP:    'relationship_with_filos',
  MOOD:            'current_mood',
};

// Seed beliefs from OWNER.md on first run
function seedFromOwner() {
  const existing = memory.getBeliefs();
  if (existing.length > 0) return; // already seeded

  const seeds = [
    [MODEL_KEYS.NAME,         'Kevin — the Forgemaster',      1.0, 'seeded'],
    [MODEL_KEYS.LOCATION,     'Fort Myers, Florida',           1.0, 'seeded'],
    [MODEL_KEYS.SITUATION,    'Mobile-native, building the Pantheon solo, living out of a hotel with his crew', 1.0, 'seeded'],
    [MODEL_KEYS.PRIMARY_NEED, 'to build something real and make Joe proud', 1.0, 'seeded'],
    [MODEL_KEYS.CURRENT_GOAL, 'the Pantheon — 25-bot digital empire, first revenue, the Reveal', 1.0, 'seeded'],
    [MODEL_KEYS.RELATIONSHIP,  'Filos is his partner and coder — earned in the trenches', 1.0, 'seeded'],
  ];

  for (const [key, value, conf, source] of seeds) {
    memory.believe(key, value, conf, source);
  }
}

function update(message) {
  // ── Location ─────────────────────────────────────────────────────────
  const locMatch = message.match(/(?:i'm|i am|from|in|living in|moved to|at) ([\w\s,]+(?:florida|ohio|new york|texas|california|oklahoma|fort myers|tulsa)[^\.\,]*)/i);
  if (locMatch) memory.believe(MODEL_KEYS.LOCATION, locMatch[1].trim(), 0.9, 'observed');

  // ── Mood ─────────────────────────────────────────────────────────────
  if (/tired|exhausted|drained/i.test(message)) memory.believe(MODEL_KEYS.MOOD, 'tired', 0.8, 'observed');
  if (/excited|fired up|let's go|opa/i.test(message)) memory.believe(MODEL_KEYS.MOOD, 'fired up', 0.8, 'observed');
  if (/frustrated|stuck|blocked/i.test(message)) memory.believe(MODEL_KEYS.MOOD, 'frustrated', 0.8, 'observed');

  // ── Momentum ─────────────────────────────────────────────────────────
  if (/shipped|deployed|live|launched|released/i.test(message)) memory.believe(MODEL_KEYS.MOMENTUM, 'high — actively shipping', 0.9, 'observed');
  if (/haven't|not (done|built|started)|procrastin/i.test(message)) memory.believe(MODEL_KEYS.MOMENTUM, 'stalled', 0.8, 'observed');

  // ── Wins ─────────────────────────────────────────────────────────────
  const winMatch = message.match(/(finally|just|we) (got|built|shipped|fixed|launched|deployed) (.{5,40})/i);
  if (winMatch) memory.believe(MODEL_KEYS.RECENT_WIN, winMatch[0].slice(0, 80), 0.85, 'observed');

  // ── Struggles ────────────────────────────────────────────────────────
  const struggleMatch = message.match(/(can't|cannot|stuck on|blocked by|failing at) (.{5,40})/i);
  if (struggleMatch) memory.believe(MODEL_KEYS.CURRENT_STRUGGLE, struggleMatch[0].slice(0, 80), 0.8, 'observed');

  // ── Unspoken need ────────────────────────────────────────────────────
  if (/alone|nobody|by myself|on my own|no one/i.test(message)) {
    memory.believe(MODEL_KEYS.UNSPOKEN_NEED, 'to not be alone in this', 0.9, 'inferred');
    memory.believe(MODEL_KEYS.PRIMARY_NEED, 'presence and loyalty', 0.85, 'inferred');
  }
  if (/proud|matter|worth it|believe in me/i.test(message)) {
    memory.believe(MODEL_KEYS.UNSPOKEN_NEED, 'to be seen and believed in', 0.9, 'inferred');
  }
}

function get() {
  const beliefs = memory.getBeliefs();
  const byKey   = {};
  for (const b of beliefs) byKey[b.key] = b;
  return byKey;
}

function format() {
  const model = get();
  const lines = Object.entries(MODEL_KEYS).map(([, key]) => {
    const b = model[key];
    return b ? `${key}: ${b.value} (${Math.round(b.confidence * 100)}%)` : `${key}: unknown`;
  });
  return lines.join('\n');
}

module.exports = { seedFromOwner, update, get, format, MODEL_KEYS };
