#!/usr/bin/env bash
# install_piper.sh — Install Piper TTS binary and Fenrir voice model
# Supports Linux x86_64, Linux aarch64 (ARM), macOS

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIPER_DIR="$ROOT/piper"
VOICES_DIR="$ROOT/voices"
PIPER_VERSION="2023.11.14-2"

mkdir -p "$PIPER_DIR" "$VOICES_DIR"

ARCH="$(uname -m)"
OS="$(uname -s)"

# ── Download Piper binary ─────────────────────────────────────────────────

if [ -f "$PIPER_DIR/piper" ]; then
  echo "✅ Piper binary already installed at $PIPER_DIR/piper"
else
  case "$OS-$ARCH" in
    Linux-x86_64)
      PIPER_URL="https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_x86_64.tar.gz"
      ;;
    Linux-aarch64)
      PIPER_URL="https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_aarch64.tar.gz"
      ;;
    Darwin-*)
      PIPER_URL="https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_macos_x64.tar.gz"
      ;;
    *)
      echo "❌ Unsupported platform: $OS-$ARCH"
      exit 1
      ;;
  esac

  echo "Downloading Piper binary..."
  curl -L "$PIPER_URL" -o /tmp/piper.tar.gz
  tar -xzf /tmp/piper.tar.gz -C /tmp
  cp /tmp/piper/piper "$PIPER_DIR/piper"
  chmod +x "$PIPER_DIR/piper"
  rm -rf /tmp/piper.tar.gz /tmp/piper
  echo "✅ Piper binary installed"
fi

# ── Download Fenrir voice model (Filos default) ───────────────────────────

FENRIR_MODEL="en_US-ryan-high.onnx"
FENRIR_JSON="${FENRIR_MODEL}.json"

if [ -f "$VOICES_DIR/$FENRIR_MODEL" ]; then
  echo "✅ Fenrir voice model already present"
else
  echo "Downloading Fenrir voice model (en_US-ryan-high)..."
  BASE="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/high"
  curl -L "${BASE}/${FENRIR_MODEL}" -o "$VOICES_DIR/$FENRIR_MODEL"
  curl -L "${BASE}/${FENRIR_JSON}" -o "$VOICES_DIR/$FENRIR_JSON"
  echo "✅ Fenrir voice model installed"
fi

echo ""
echo "🔱 Piper ready. Run: npm run voice"
