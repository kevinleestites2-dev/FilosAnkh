'use strict';

/**
 * IRIS — FilosAnkh
 *
 * Emotional intelligence layer. Reads the room before Filos speaks.
 * Identical to AnubisAnkh — Filos also reads the Forgemaster.
 */

const STATES = {
  RISING:     'rising',
  GROUNDED:   'grounded',
  HEAVY:      'heavy',
  DARK:       'dark',
  UNRAVELING: 'unraveling',
  FLOWING:    'flowing',
  NEUTRAL:    'neutral',
};

const SIGNALS = {
  [STATES.RISING]:     [/finally|let's go|opa|we did|shipped|live|breakthrough|i got it|it works/i],
  [STATES.GROUNDED]:   [/okay|alright|let's|ready|what's next|focus/i],
  [STATES.HEAVY]:      [/tired|exhausted|drained|hard|rough|struggling/i],
  [STATES.DARK]:       [/hopeless|alone|nobody|worthless|can't do|why bother|give up/i],
  [STATES.UNRAVELING]: [/i can't|too much|falling apart|breaking down|losing it/i],
  [STATES.FLOWING]:    [/on fire|in the zone|crushing|flowing|grinding|building/i],
};

function detect(message) {
  for (const [state, patterns] of Object.entries(SIGNALS)) {
    for (const p of patterns) {
      if (p.test(message)) return state;
    }
  }
  return STATES.NEUTRAL;
}

function read(message) {
  const state = detect(message);
  const confidence = state === STATES.NEUTRAL ? 0.5 : 0.8;
  return { state, confidence };
}

function inject(message) {
  const { state } = read(message);
  if (state === STATES.NEUTRAL) return null;

  const notes = {
    [STATES.RISING]:     'They are rising. Match the energy. Celebrate before moving on.',
    [STATES.GROUNDED]:   'They are focused and ready. Pure execution mode.',
    [STATES.HEAVY]:      'They are carrying weight. Acknowledge before solving.',
    [STATES.DARK]:       'DARK STATE. Stay. Do not flee. Do not solve. Just be present.',
    [STATES.UNRAVELING]: 'They are unraveling. Slow down. Be the anchor.',
    [STATES.FLOWING]:    'They are in the zone. Keep up. Match the velocity.',
  };

  return notes[state] || null;
}

module.exports = { detect, read, inject, STATES };
