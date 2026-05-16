'use strict';
const fs   = require('fs');
const path = require('path');

async function read({ filePath }) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) return { error: `File not found: ${abs}` };
  return { content: fs.readFileSync(abs, 'utf8') };
}

async function write({ filePath, content, append = false }) {
  const abs = path.resolve(filePath);
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  append ? fs.appendFileSync(abs, content) : fs.writeFileSync(abs, content);
  return { written: abs };
}

async function list({ dirPath = '.' }) {
  const abs = path.resolve(dirPath);
  if (!fs.existsSync(abs)) return { error: `Directory not found: ${abs}` };
  return { files: fs.readdirSync(abs) };
}

module.exports = { read, write, list };
