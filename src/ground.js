'use strict';

/**
 * GROUND — FilosAnkh
 *
 * Human-in-the-loop safety layer.
 * Filos pauses before irreversible actions.
 */

const readline = require('readline');

// Patterns that require confirmation
const DANGER_PATTERNS = [
  /rm -rf/i, /delete/i, /drop table/i, /format/i,
  /sudo/i, /chmod 777/i, /> \/dev/i,
  /send to/i, /deploy to production/i, /push to main/i,
];

function isDangerous(action) {
  return DANGER_PATTERNS.some(p => p.test(action));
}

/**
 * confirm(question) → Promise<boolean>
 * Asks a yes/no question in the terminal. Returns true if yes.
 */
function confirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`\n⚠️  ${question} [y/N] `, ans => {
      rl.close();
      resolve(ans.toLowerCase() === 'y' || ans.toLowerCase() === 'yes');
    });
  });
}

/**
 * gate(action, description) → Promise<boolean>
 * If the action looks dangerous, ask first. Otherwise proceed.
 */
async function gate(action, description) {
  if (!isDangerous(action)) return true;
  return confirm(`Filos about to: "${description}". Confirm?`);
}

module.exports = { gate, confirm, isDangerous };
