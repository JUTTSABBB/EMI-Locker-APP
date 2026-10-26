// Tiny data layer around a local SQLite file. No server process to run — the DB is
// just a file in server/data/. In a later step we move sensitive fields to encrypted
// storage; for Step 1 we keep it simple so the loop is easy to confirm.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'emilocker.db'));
db.pragma('journal_mode = WAL');

// One row per financed phone. The SERVER is the source of truth for lock state —
// the phone never decides on its own whether it is paid.
db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id       TEXT UNIQUE NOT NULL,   -- stable ID reported by the phone
    customer_name   TEXT NOT NULL,
    cnic            TEXT NOT NULL,           -- consent/KYC record captured at sale
    plan            TEXT NOT NULL,           -- e.g. "12 months x 5000"
    support_number  TEXT NOT NULL,
    lock_state      TEXT NOT NULL DEFAULT 'UNLOCKED',  -- UNLOCKED | LOCKED
    paid_until      TEXT,                    -- ISO date; after this, device is overdue
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_checkin    TEXT
  );
`);

module.exports = db;
