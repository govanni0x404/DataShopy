// Test-only stand-in for expo-sqlite, backed by a real in-memory SQLite
// engine (better-sqlite3), so src/database/db.js can be tested against
// actual SQL semantics instead of a shallow jest.fn() stub.
const Database = require('better-sqlite3');

const wrap = (raw) => ({
  execSync: (sql) => {
    raw.exec(sql);
  },
  runSync: (sql, params = []) => raw.prepare(sql).run(...params),
  getAllSync: (sql, params = []) => {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('PRAGMA')) return raw.pragma(sql.trim().replace(/^PRAGMA\s+/i, ''));
    return raw.prepare(sql).all(...params);
  },
  getFirstSync: (sql, params = []) => raw.prepare(sql).get(...params) || null,
});

module.exports = {
  openDatabaseSync: () => wrap(new Database(':memory:')),
};
