const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'router.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
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
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO request_log (provider, model, prompt_tokens, completion_tokens, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(provider, model || null, promptTokens || null, completionTokens || null, status || 200);
}

function getStats() {
  const database = getDb();
  return database.prepare(`
    SELECT provider, COUNT(*) as total, AVG(status) as avg_status
    FROM request_log
    GROUP BY provider
    ORDER BY total DESC
  `).all();
}

module.exports = { getDb, logRequest, getStats };
