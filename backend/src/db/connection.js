const path = require('node:path');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = path.join(__dirname, '..', '..', 'encurtador.sqlite');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    avatar     TEXT    NOT NULL,
    created_at TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS links (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    code         TEXT    NOT NULL UNIQUE,
    original_url TEXT    NOT NULL,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    created_at   TEXT    NOT NULL
  );
`;

/**
 * Abre o banco SQLite e garante que o schema existe.
 * Caminho: argumento > variável de ambiente DB_PATH > arquivo padrão em /backend.
 * Use ':memory:' para um banco isolado em memória (testes).
 */
function openDatabase(dbPath = process.env.DB_PATH || DEFAULT_DB_PATH) {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.exec(SCHEMA);
  return db;
}

module.exports = { openDatabase, DEFAULT_DB_PATH };
