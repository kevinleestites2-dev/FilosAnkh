'use strict';

/**
 * SKILL_MATCHER — FilosAnkh
 *
 * Maps user intents to skills before hitting the LightAgent loop.
 * Fast path for known patterns.
 */

const PATTERNS = [
  { pattern: /run|execute|bash|shell|command:/i,        skill: 'shell',      action: 'run' },
  { pattern: /search|look up|find out|what is|who is/i, skill: 'web_search', action: 'search' },
  { pattern: /read file|open file|show file/i,           skill: 'file',       action: 'read' },
  { pattern: /write file|save to file|create file/i,     skill: 'file',       action: 'write' },
  { pattern: /http get|fetch url|curl/i,                 skill: 'http',       action: 'get' },
  { pattern: /http post|post to/i,                       skill: 'http',       action: 'post' },
];

function match(userMessage) {
  for (const p of PATTERNS) {
    if (p.pattern.test(userMessage)) {
      return { skill: p.skill, action: p.action };
    }
  }
  return null;
}

module.exports = { match };
