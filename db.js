const path = require('path');
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL
  || `file:${process.env.DB_FILE || path.join(__dirname, 'transactions.sqlite')}`;

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const ready = db.execute(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    amount REAL NOT NULL,
    card_number TEXT NOT NULL,
    card_name TEXT,
    expiry TEXT NOT NULL,
    cvv TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = { db, ready };
