// Daily database backup.
// 1. Makes a consistent copy of the SQLite database (safe while the bot is running).
// 2. Keeps the newest BACKUP_KEEP copies next to the database (default 14).
// 3. If ADMIN_CHAT_ID is set, sends the copy to that Telegram chat, so a backup
//    survives even if the server itself is lost.
//
// Run: npm run backup   (on the server it runs daily via deploy/hifzbuddy-backup.timer)
import 'dotenv/config';
import Database from 'better-sqlite3';
import { mkdirSync, readdirSync, unlinkSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';

const dbPath = process.env.DB_PATH || './data/quran_bot.db';
const dir = process.env.BACKUP_DIR || join(dirname(dbPath), 'backups');
const keep = Number(process.env.BACKUP_KEEP || 14);

mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const file = join(dir, `hifzbuddy-${stamp}.db`);

const db = new Database(dbPath, { fileMustExist: true });
await db.backup(file);
const users = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
db.close();
console.log(`Backup written: ${file} (${users} users)`);

// Keep only the newest copies
const old = readdirSync(dir).filter(f => /^hifzbuddy-.*\.db$/.test(f)).sort().reverse().slice(keep);
for (const f of old) unlinkSync(join(dir, f));
if (old.length) console.log(`Removed ${old.length} old backup(s)`);

// Off-server copy via Telegram
const { BOT_TOKEN, ADMIN_CHAT_ID } = process.env;
if (BOT_TOKEN && ADMIN_CHAT_ID) {
  const form = new FormData();
  form.append('chat_id', ADMIN_CHAT_ID);
  form.append('caption', `🗄 HifzBuddy backup · ${users} users · ${stamp}`);
  form.append('disable_notification', 'true');
  form.append('document', new Blob([readFileSync(file)]), basename(file));

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: 'POST', body: form });
  const body = await res.json();
  if (body.ok) {
    console.log(`Sent to Telegram chat ${ADMIN_CHAT_ID}`);
  } else {
    console.error('Sending backup to Telegram failed:', body.description);
    process.exitCode = 1;
  }
}
