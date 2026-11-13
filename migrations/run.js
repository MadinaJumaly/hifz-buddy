// Optional: the bot also runs these migrations on startup (see src/services/migrate.js).
import Database from 'better-sqlite3';
import 'dotenv/config';
import { migrate } from '../src/services/migrate.js';

const db = new Database(process.env.DB_PATH || './data/quran_bot.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

migrate(db);

console.log('Migrations applied successfully.');
db.close();
