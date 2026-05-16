'use strict';
const { execSync } = require('child_process');

async function run({ command, timeout = 10000, cwd = process.cwd() }) {
  try {
    const out = execSync(command, { encoding: 'utf8', timeout, cwd });
    return { stdout: out.trim(), exit: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || err.message, exit: err.status || 1 };
  }
}

module.exports = { run };
