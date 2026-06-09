let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.warn('[db] better-sqlite3 unavailable, logging disabled:', e.message);
}

const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'router.db');

let db;
let dbAvailable = false;

function getDb() {
  if (!Database) return null;
  if (!db) {
    try {
      db = new Database(DB_PATH);
      db.pragma('journal_mode = WAL');
      initSchema();
      dbAvailable = true;
    } catch (e) {
      console.warn('[db] Failed to open database:', e.message);
      db = null;
    }
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      model TEXT,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      status INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function logRequest({ provider, model, promptTokens, completionTokens, status }) {
  try {
    const database = getDb();
    if (!database) return;
    const stmt = database.prepare(`
      INSERT INTO request_log (provider, model, prompt_tokens, completion_tokens, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(provider, model || null, promptTokens || null, completionTokens || null, status || 200);
  } catch (e) {
    console.warn('[db] logRequest failed:', e.message);
  }
}

function getStats() {
  try {
    const database = getDb();
    if (!database) return [];
    return database.prepare(`
      SELECT provider, COUNT(*) as total, AVG(status) as avg_status
      FROM request_log
      GROUP BY provider
      ORDER BY total DESC
    `).all();
  } catch (e) {
    console.warn('[db] getStats failed:', e.message);
    return [];
  }
}

module.exports = { getDb, logRequest, getStats };
