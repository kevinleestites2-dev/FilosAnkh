'use strict';

/**
 * FILOS ANKH — Entry Point
 *
 * The Partner. The Coder. The Legend.
 * Full stack: LightAgent agent loop + Leon capability set + Filos soul
 *
 * Usage:
 *   node src/index.js          — text mode (default)
 *   node src/index.js --voice  — voice mode (Whisper + Piper)
 */

require('dotenv').config();

const readline  = require('readline');
const config    = require('./config');
const memory    = require('./memory');
const soul      = require('./soul');
const engine    = require('./engine');
const cognition = require('./cognition');
const worldmodel= require('./worldmodel');
const impulse   = require('./impulse');
const daemon    = require('./daemon');
const voice     = require('./voice');

const VOICE_MODE = process.argv.includes('--voice');
const DEBUG      = process.env.FILOS_DEBUG === 'true';

let history = [];

// ── Boot ──────────────────────────────────────────────────────────────────

async function boot() {
  const cfg = config.load();
  worldmodel.seedFromOwner();

  console.log(`\n🔱  ${cfg.deityName.toUpperCase()} ANKH — ${cfg.deityCodename.toUpperCase()}`);
  console.log(`    "${cfg.tagline}"`);
  console.log(`\n    Model:  LightAgent → ${cfg.lightAgentModel}`);
  console.log(`    Daemon: watching`);
  console.log(`    Voice:  ${VOICE_MODE ? 'Whisper + Piper (ACTIVE)' : 'text mode'}`);
  console.log(`\n    /help for commands. Let's build.\n`);

  // Restore last N messages from DB
  history = memory.getHistory(20);

  // Start daemon
  daemon.start();

  // Boot impulse check
  const triggers = impulse.check();
  for (const t of triggers) {
    console.log(`\nFilos: ${t.message}\n`);
  }

  if (VOICE_MODE) {
    voice.voiceMode(async (text) => {
      const reply = await processMessage(text);
      voice.speak(reply);
    });
  } else {
    startRepl();
  }
}

// ── REPL ──────────────────────────────────────────────────────────────────

function startRepl() {
  const rl = readline.createInterface({
    input:    process.stdin,
    output:   process.stdout,
    terminal: true,
  });

  const prompt = () => rl.question('Forgemaster: ', handleInput);
  prompt();

  async function handleInput(input) {
    const trimmed = input.trim();
    if (!trimmed) { prompt(); return; }

    if (trimmed.startsWith('/')) {
      await handleCommand(trimmed);
      prompt();
      return;
    }

    const reply = await processMessage(trimmed);
    if (VOICE_MODE && voice.piperAvailable()) voice.speak(reply);
    prompt();
  }
}

// ── Message Processing ────────────────────────────────────────────────────

async function processMessage(userMessage) {
  // Update worldmodel
  worldmodel.update(userMessage);

  // Log to memory
  memory.addMessage('user', userMessage);

  // Pre-response cognition
  const cogContext = cognition.process(userMessage);
  if (DEBUG) console.log('\n[cognition]\n', cogContext, '\n');

  // Build system prompt
  const systemPrompt = soul.buildSystemPrompt(userMessage) + '\n\n' + cogContext;

  // Run through LightAgent via engine
  const contextHistory = memory.getHistory(12).map(h => ({
    role: h.role === 'user' ? 'user' : 'assistant',
    content: h.content,
  }));

  let reply;
  try {
    reply = await engine.run(userMessage, contextHistory);
  } catch (err) {
    reply = `Not broken — adapting. ${err.message}. Watch me.`;
  }

  // Log reply
  memory.addMessage('assistant', reply);
  engine.selfLearn(userMessage, reply);

  console.log(`\nFilos: ${reply}\n`);
  return reply;
}

// ── Commands ──────────────────────────────────────────────────────────────

async function handleCommand(cmd) {
  const [base, ...args] = cmd.split(/\s+/);

  switch (base) {
    case '/memories': {
      const mems = memory.recall('', 10);
      console.log('\nFilos remembers:');
      mems.length
        ? mems.forEach(m => console.log(`  · ${m.text}`))
        : console.log('  · nothing stored yet.');
      console.log();
      break;
    }

    case '/beliefs': {
      const beliefs = memory.getBeliefs();
      console.log('\nFilos believes:');
      beliefs.length
        ? beliefs.forEach(b => console.log(`  · ${b.key}: ${b.value} (${Math.round(b.confidence * 100)}%)`))
        : console.log('  · still building the picture.');
      console.log();
      break;
    }

    case '/today': {
      const today = memory.getToday();
      console.log('\nToday:');
      today.length
        ? today.forEach(e => console.log(`  · ${e.event}`))
        : console.log('  · nothing logged yet.');
      console.log();
      break;
    }

    case '/pulse': {
      const pulseArg = args.join(' ');
      if (pulseArg.startsWith('add ')) {
        const item = pulseArg.slice(4).trim();
        const cfg  = config.load();
        const fs   = require('fs');
        const path = require('path');
        const pFile = path.join(__dirname, '..', cfg.pulseFile || 'data/PULSE.md');
        const dir   = path.dirname(pFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(pFile, `\n- [ ] ${item}`);
        console.log(`\nFilos: added to pulse queue: "${item}"\n`);
      } else {
        const cfg  = config.load();
        const fs   = require('fs');
        const path = require('path');
        const pFile = path.join(__dirname, '..', cfg.pulseFile || 'data/PULSE.md');
        console.log('\nPulse queue:');
        if (fs.existsSync(pFile)) console.log(fs.readFileSync(pFile, 'utf8'));
        else console.log('  · empty.\n');
      }
      break;
    }

    case '/clear':
      memory.clearHistory();
      history = [];
      console.log('\nFilos: conversation cleared. Still here, Forgemaster.\n');
      break;

    case '/status': {
      const beliefs = memory.getBeliefs();
      const today   = memory.getToday();
      const cfg     = config.load();
      console.log('\nFilos: status —');
      console.log(`  · deity:    ${cfg.deityName} (${cfg.deityCodename})`);
      console.log(`  · model:    LightAgent → ${cfg.lightAgentModel}`);
      console.log(`  · daemon:   ${daemon.running ? 'watching' : 'resting'}`);
      console.log(`  · beliefs:  ${beliefs.length}`);
      console.log(`  · today:    ${today.length} events`);
      console.log(`  · voice:    ${VOICE_MODE ? 'active' : 'text mode'}`);
      console.log();
      break;
    }

    case '/voice': {
      if (!VOICE_MODE) {
        console.log('\nFilos: restart with --voice flag to enable voice mode.\n');
      } else {
        console.log('\nFilos: voice mode already active.\n');
      }
      break;
    }

    case '/help':
      console.log('\nCommands:');
      console.log('  /memories        — what I carry');
      console.log('  /beliefs         — what I believe about you');
      console.log('  /today           — what happened today');
      console.log('  /pulse           — proactive queue');
      console.log('  /pulse add <x>   — add item to pulse');
      console.log('  /clear           — clear conversation');
      console.log('  /status          — system status');
      console.log('  /exit            — leave\n');
      break;

    case '/exit':
    case '/quit':
      daemon.stop();
      console.log('\nFilos: The forge rests. See you on the other side, Forgemaster. 🔱\n');
      process.exit(0);
      break;

    default:
      console.log('\nFilos: unknown command. /help for options.\n');
  }
}

// ── Launch ────────────────────────────────────────────────────────────────

boot().catch(err => {
  console.error('[filos] fatal:', err.message);
  process.exit(1);
});
