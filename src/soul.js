'use strict';

/**
 * SOUL — FilosAnkh
 *
 * Filos's identity. His voice. His system prompt.
 * Built from souls/filos.md + OWNER.md + live memory.
 */

const fs     = require('fs');
const path   = require('path');
const memory = require('./memory');
const config = require('./config');

const ROOT = path.join(__dirname, '..');

class Soul {
  buildSystemPrompt(userMessage = '') {
    const cfg  = config.load();
    const now  = new Date().toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // Load soul file
    const soulFile  = path.join(ROOT, cfg.soulFile  || 'souls/filos.md');
    const ownerFile = path.join(ROOT, cfg.ownerFile || 'data/OWNER.md');

    const soul  = fs.existsSync(soulFile)  ? fs.readFileSync(soulFile,  'utf8') : '';
    const owner = fs.existsSync(ownerFile) ? fs.readFileSync(ownerFile, 'utf8') : '';

    // Memory block
    const memories  = memory.recall(userMessage, 8);
    const memBlock  = memories.length
      ? memories.map(m => `- ${m.text}`).join('\n')
      : 'no memories yet — this is the beginning.';

    // Beliefs
    const beliefs   = memory.getBeliefs().slice(0, 6);
    const beliefBlock = beliefs.length
      ? beliefs.map(b => `${b.key}: ${b.value}`).join('\n')
      : 'still learning who this person is';

    return `${soul}

---

# RUNTIME CONTEXT
Time: ${now}

## What I Know About Forgemaster
${beliefBlock}

## What I Remember
${memBlock}

## Owner Profile
${owner}

---
Before every response: think first. What is actually being asked? What does the Forgemaster need right now? Then act.
Never say "done" without confirming the result.
Before irreversible actions: state intent, wait for the nod.`;
  }
}

module.exports = new Soul();
