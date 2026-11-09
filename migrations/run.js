import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
 
const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(process.env.DB_PATH || './data/quran_bot.db');
 
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
 
const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(sql);

// Add slug columns to existing databases
// (SQLite can't ADD COLUMN with UNIQUE, so enforce uniqueness via indexes)
try { db.exec('ALTER TABLE users ADD COLUMN friend_slug TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN teacher_slug TEXT'); } catch {}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_friend_slug ON users(friend_slug)');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_teacher_slug ON users(teacher_slug)');

console.log('Migrations applied successfully.');
db.close();