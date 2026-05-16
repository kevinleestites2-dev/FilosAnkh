'use strict';

/**
 * MEMORY — FilosAnkh
 *
 * Three-layer memory system. Identical to AnubisAnkh.
 * DB file: data/filos.db
 *
 * LAYER 1 — PERSISTENT (beliefs + long-term facts)
 * LAYER 2 — DAILY (today's events)
 * LAYER 3 — DISCUSSION (recent conversation turns)
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_DIR  = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'filos.db');

let _db = null;

function db() {
  if (_db) return _db;
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  _db = new Database(DB_PATH);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      text         TEXT    NOT NULL,
      tags         TEXT    DEFAULT '[]',
      confidence   REAL    DEFAULT 1.0,
      created_at   INTEGER DEFAULT (strftime('%s','now')),
      updated_at   INTEGER DEFAULT (strftime('%s','now')),
      access_count INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS beliefs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      key        TEXT    NOT NULL UNIQUE,
      value      TEXT    NOT NULL,
      confidence REAL    DEFAULT 1.0,
      source     TEXT    DEFAULT 'observed',
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS daily (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT    NOT NULL,
      event      TEXT    NOT NULL,
      importance REAL    DEFAULT 0.5,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      role       TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_memories_confidence ON memories(confidence DESC);
    CREATE INDEX IF NOT EXISTS idx_daily_date          ON daily(date);
    CREATE INDEX IF NOT EXISTS idx_conversations_time  ON conversations(created_at DESC);
  `);

  return _db;
}

// LAYER 1 — Persistent
function store(text, tags = [], confidence = 1.0) {
  db().prepare(`INSERT INTO memories (text, tags, confidence) VALUES (?, ?, ?)`).run(text, JSON.stringify(tags), confidence);
}

function recall(query = '', limit = 8) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (!words.length) {
    return db().prepare(`SELECT * FROM memories ORDER BY access_count DESC, created_at DESC LIMIT ?`).all(limit);
  }
  const conditions = words.map(() => `LOWER(text) LIKE ?`).join(' OR ');
  const params     = words.map(w => `%${w}%`);
  const rows = db().prepare(`SELECT * FROM memories WHERE ${conditions} ORDER BY confidence DESC, access_count DESC LIMIT ?`).all(...params, limit);
  if (rows.length) {
    const ids = rows.map(r => r.id).join(',');
    db().exec(`UPDATE memories SET access_count = access_count + 1 WHERE id IN (${ids})`);
  }
  return rows;
}

function recallRelevant(query) {
  const rows = recall(query, 6);
  if (!rows.length) return '';
  return rows.map(m => `- ${m.text}`).join('\n');
}

function forget(id) { db().prepare(`DELETE FROM memories WHERE id = ?`).run(id); }

function believe(key, value, confidence = 1.0, source = 'observed') {
  db().prepare(`
    INSERT INTO beliefs (key, value, confidence, source, updated_at)
    VALUES (?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(key) DO UPDATE SET
      value=excluded.value, confidence=excluded.confidence,
      source=excluded.source, updated_at=strftime('%s','now')
  `).run(key, value, confidence, source);
}

function getBeliefs() { return db().prepare(`SELECT * FROM beliefs ORDER BY confidence DESC`).all(); }
function getBelief(key) { return db().prepare(`SELECT * FROM beliefs WHERE key = ?`).get(key); }
function forgetBelief(key) { db().prepare(`DELETE FROM beliefs WHERE key = ?`).run(key); }

// LAYER 2 — Daily
function today() { return new Date().toISOString().slice(0, 10); }

function logDaily(event, importance = 0.5) {
  db().prepare(`INSERT INTO daily (date, event, importance) VALUES (?, ?, ?)`).run(today(), event, importance);
}

function getToday(limit = 20) {
  return db().prepare(`SELECT * FROM daily WHERE date = ? ORDER BY importance DESC, created_at ASC LIMIT ?`).all(today(), limit);
}

function getDailyRange(daysBack = 3) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - daysBack);
  return db().prepare(`
    SELECT date, GROUP_CONCAT(event, ' | ') as events
    FROM daily WHERE date >= ?
    GROUP BY date ORDER BY date DESC
  `).all(cutoff.toISOString().slice(0, 10));
}

function compactOldDaily() {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
  const old = db().prepare(`SELECT date, GROUP_CONCAT(event, '. ') as events FROM daily WHERE date < ? GROUP BY date`).all(cutoff.toISOString().slice(0, 10));
  for (const row of old) {
    store(`[${row.date}] ${row.events}`, ['daily', 'compacted'], 0.7);
    db().prepare(`DELETE FROM daily WHERE date = ?`).run(row.date);
  }
}

// LAYER 3 — Discussion
function addMessage(role, content) {
  db().prepare(`INSERT INTO conversations (role, content) VALUES (?, ?)`).run(role, content);
  if (role === 'user' && content.length > 30) logDaily(`user said: "${content.slice(0, 100)}"`, 0.4);
}

function getHistory(limit = 20) {
  return db().prepare(`SELECT role, content FROM conversations ORDER BY created_at DESC LIMIT ?`).all(limit).reverse();
}

function clearHistory() { db().prepare(`DELETE FROM conversations`).run(); }

function pruneDiscussion(keepLast = 200) {
  db().prepare(`DELETE FROM conversations WHERE id NOT IN (SELECT id FROM conversations ORDER BY created_at DESC LIMIT ?)`).run(keepLast);
}

function addDiscussion(text) { addMessage('user', text); }

// Unified
function buildMemoryBlock(query = '', opts = {}) {
  const { persistentLimit = 6, episodicLimit = 6, dailyDays = 2 } = opts;
  const beliefs  = getBeliefs().slice(0, persistentLimit).map(b => `${b.key}: ${b.value} (${Math.round(b.confidence * 100)}%)`).join('\n') || 'still learning';
  const episodic = recall(query, episodicLimit).map(m => `- ${m.text}`).join('\n') || 'nothing relevant surfaced';
  const daily    = getDailyRange(dailyDays);
  const dailyBlock = daily.length ? daily.map(d => `[${d.date}] ${d.events}`).join('\n') : 'nothing logged today';
  return { persistent: beliefs, episodic, daily: dailyBlock, formatted: `### Persistent\n${beliefs}\n\n### Episodic\n${episodic}\n\n### Daily\n${dailyBlock}` };
}

module.exports = {
  store, recall, recallRelevant, forget,
  believe, getBeliefs, getBelief, forgetBelief,
  logDaily, getToday, getDailyRange, compactOldDaily,
  addMessage, addDiscussion, getHistory, clearHistory, pruneDiscussion,
  buildMemoryBlock, db,
};
