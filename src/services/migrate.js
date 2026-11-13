import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), '../../migrations/schema.sql');

// Idempotent: safe to run on every start. New databases get the full schema;
// existing ones get any columns added since they were created.
export function migrate(db) {
  db.exec(readFileSync(schemaPath, 'utf8'));

  const addColumn = (sql) => { try { db.exec(sql); } catch {} }; // ignore "duplicate column"

  // invite slugs (SQLite can't ADD COLUMN ... UNIQUE, so uniqueness comes from indexes)
  addColumn('ALTER TABLE users ADD COLUMN friend_slug TEXT');
  addColumn('ALTER TABLE users ADD COLUMN teacher_slug TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_friend_slug ON users(friend_slug)');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_teacher_slug ON users(teacher_slug)');

  // reminders
  addColumn("ALTER TABLE users ADD COLUMN reminder_time TEXT NOT NULL DEFAULT '20:00'");
  addColumn('ALTER TABLE users ADD COLUMN last_reminded_date TEXT');
  addColumn('ALTER TABLE users ADD COLUMN teacher_alerted_for TEXT');

  // city name shown in settings
  addColumn('ALTER TABLE users ADD COLUMN city TEXT');
}
