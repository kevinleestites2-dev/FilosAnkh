'use strict';

/**
 * VOICE — FilosAnkh
 *
 * Whisper (STT) + Piper (TTS) — fully local, sovereign, no cloud.
 * Same stack as AnubisAnkh. Adapted for Filos.
 *
 * STT: openai-whisper via Python subprocess
 * TTS: Piper binary (installed by scripts/install_piper.sh)
 * Voice: Fenrir (deep male) — same as Thoth in Anubis config
 */

const { execSync, spawn } = require('child_process');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const config = require('./config');

const ROOT        = path.join(__dirname, '..');
const PIPER_DIR   = path.join(ROOT, 'piper');
const PIPER_BIN   = path.join(PIPER_DIR, 'piper');
const MODELS_DIR  = path.join(ROOT, 'voices');

// Voice model map — Fenrir is default for Filos
const VOICE_MODELS = {
  Fenrir: 'en_US-ryan-high.onnx',     // deep, commanding
  Charon: 'en_US-arctic-medium.onnx', // mysterious, ancient (for deity switch)
};

function piperAvailable() { return fs.existsSync(PIPER_BIN); }
function whisperAvailable() {
  try { execSync('python3 -c "import whisper"', { stdio: 'ignore' }); return true; } catch { return false; }
}

// ── STT — Whisper ─────────────────────────────────────────────────────────

/**
 * transcribe(audioFilePath) → string
 * Uses whisper CLI to transcribe an audio file to text.
 */
function transcribe(audioFilePath) {
  if (!whisperAvailable()) throw new Error('Whisper not installed. Run: pip install openai-whisper');

  const script = `
import whisper, json, sys
model = whisper.load_model("base")
result = model.transcribe(sys.argv[1])
print(result["text"].strip())
`.trim();

  const tmpScript = path.join(os.tmpdir(), 'filos_whisper.py');
  fs.writeFileSync(tmpScript, script);
  const text = execSync(`python3 "${tmpScript}" "${audioFilePath}"`, { encoding: 'utf8', timeout: 30000 });
  return text.trim();
}

/**
 * listenOnce(durationSec) → string
 * Records from mic for durationSec seconds, then transcribes.
 * Requires sox or arecord on system.
 */
function listenOnce(durationSec = 5) {
  const tmpWav = path.join(os.tmpdir(), `filos_mic_${Date.now()}.wav`);

  // Try sox first, then arecord
  const recorded = (() => {
    try {
      execSync(`sox -d -r 16000 -c 1 "${tmpWav}" trim 0 ${durationSec}`, { timeout: (durationSec + 5) * 1000 });
      return true;
    } catch {}
    try {
      execSync(`arecord -d ${durationSec} -f S16_LE -r 16000 "${tmpWav}"`, { timeout: (durationSec + 5) * 1000 });
      return true;
    } catch {}
    return false;
  })();

  if (!recorded) throw new Error('No audio capture available. Install sox or arecord.');

  const text = transcribe(tmpWav);
  try { fs.unlinkSync(tmpWav); } catch {}
  return text;
}

// ── TTS — Piper ───────────────────────────────────────────────────────────

/**
 * speak(text) → void
 * Converts text to speech and plays it.
 */
function speak(text, voiceName) {
  if (!piperAvailable()) {
    console.log(`[filos:voice] Piper not installed. Run: npm run install:piper`);
    return;
  }

  const cfg   = config.load();
  const voice = voiceName || cfg.voiceName || 'Fenrir';
  const model = VOICE_MODELS[voice] || VOICE_MODELS.Fenrir;
  const modelPath = path.join(MODELS_DIR, model);

  if (!fs.existsSync(modelPath)) {
    console.log(`[filos:voice] Voice model not found: ${modelPath}`);
    console.log('[filos:voice] Run: npm run install:piper to download voice models.');
    return;
  }

  const tmpWav = path.join(os.tmpdir(), `filos_tts_${Date.now()}.wav`);

  try {
    // Generate wav
    execSync(
      `echo "${text.replace(/"/g, "'")}" | "${PIPER_BIN}" --model "${modelPath}" --output_file "${tmpWav}"`,
      { timeout: 15000 }
    );

    // Play wav — try aplay, then play (sox), then afplay (mac)
    const played = (() => {
      for (const cmd of [`aplay "${tmpWav}"`, `play "${tmpWav}"`, `afplay "${tmpWav}"`]) {
        try { execSync(cmd, { timeout: 30000 }); return true; } catch {}
      }
      return false;
    })();

    if (!played) console.log(`[filos:voice] Could not play audio. File at: ${tmpWav}`);
    else try { fs.unlinkSync(tmpWav); } catch {}

  } catch (err) {
    console.error('[filos:voice] TTS error:', err.message);
  }
}

// ── Voice Loop ────────────────────────────────────────────────────────────

/**
 * voiceMode(onTranscript) → void
 * Continuous listen → transcribe → callback loop.
 * Caller provides callback(text) to process the transcript.
 */
function voiceMode(onTranscript, listenDuration = 6) {
  console.log('\n[filos:voice] Voice mode active. Speak now. Ctrl+C to exit.\n');
  const loop = async () => {
    try {
      const text = listenOnce(listenDuration);
      if (text && text.length > 2) {
        console.log(`\nForgemaster: ${text}`);
        await onTranscript(text);
      }
    } catch (err) {
      console.error('[filos:voice] Listen error:', err.message);
    }
    setTimeout(loop, 500);
  };
  loop();
}

module.exports = { speak, transcribe, listenOnce, voiceMode, piperAvailable, whisperAvailable };
