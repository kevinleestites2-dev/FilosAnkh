'use strict';

/**
 * EXECUTOR — FilosAnkh
 *
 * Routes tool calls to skills.
 * Identical pattern to AnubisAnkh.
 */

const SKILLS = {
  shell:      require('./skills/shell'),
  http:       require('./skills/http'),
  file:       require('./skills/file'),
  web_search: require('./skills/web_search'),
};

async function execute(skill, action, args = {}) {
  const handler = SKILLS[skill];
  if (!handler) return { error: `Unknown skill: ${skill}` };

  const fn = handler[action];
  if (typeof fn !== 'function') return { error: `Unknown action: ${skill}.${action}` };

  try {
    const result = await fn(args);
    return { result };
  } catch (err) {
    return { error: err.message };
  }
}

function list() {
  return Object.entries(SKILLS).map(([name, s]) => ({
    name,
    actions: Object.keys(s).filter(k => typeof s[k] === 'function'),
  }));
}

module.exports = { execute, list };
