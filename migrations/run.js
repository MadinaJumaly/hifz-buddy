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
 
console.log('Migrations applied successfully.');
db.close();