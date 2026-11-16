import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import 'dotenv/config';
import { localDate, previousDate } from '../utils/time.js';
import { migrate } from './migrate.js';

const dbPath = process.env.DB_PATH || './data/quran_bot.db';
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
migrate(db);

// ── bot sessions (persisted so restarts don't lose onboarding state) ──

export const sessionStore = {
  get(key) {
    const row = db.prepare('SELECT data FROM sessions WHERE key = ?').get(key);
    return row ? JSON.parse(row.data) : undefined;
  },
  set(key, value) {
    db.prepare(`
      INSERT INTO sessions (key, data) VALUES (?, ?)
      ON CONFLICT (key) DO UPDATE SET data = excluded.data, updated_at = datetime('now')
    `).run(key, JSON.stringify(value));
  },
  delete(key) {
    db.prepare('DELETE FROM sessions WHERE key = ?').run(key);
  },
};

// ── users ────────────────────────────────────────────────────

export function getUserByTelegramId(telegramId) {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
}

export function createUser({ telegramId, displayName, language, timezone }) {
  const stmt = db.prepare(`
    INSERT INTO users (telegram_id, display_name, language, timezone)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(telegramId, displayName, language || 'en', timezone || 'UTC');
  db.prepare('INSERT INTO streaks (student_id) VALUES (?)').run(result.lastInsertRowid);
  return getUserByTelegramId(telegramId);
}

export function updateUser(id, fields) {
  const allowed = [
    'display_name', 'language', 'timezone', 'reminder_enabled', 'onboarding_done',
    'reminder_time', 'last_reminded_date', 'teacher_alerted_for', 'city', 'card_file_id',
  ];
  const sets = Object.keys(fields)
    .filter(k => allowed.includes(k))
    .map(k => `${k} = ?`)
    .join(', ');
  const vals = Object.keys(fields)
    .filter(k => allowed.includes(k))
    .map(k => fields[k]);
  if (!sets) return;
  db.prepare(`UPDATE users SET ${sets} WHERE id = ?`).run(...vals, id);
}

// ── invite slugs (permanent, per user) ───────────────────────

function generateSlug() {
  return Math.random().toString(36).substring(2, 9);
}

export function getOrCreateSlug(userId, type) {
  const col = type === 'teacher' ? 'teacher_slug' : 'friend_slug';
  const user = db.prepare(`SELECT ${col} FROM users WHERE id = ?`).get(userId);
  if (user[col]) return user[col];
  const slug = generateSlug();
  db.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(slug, userId);
  return slug;
}

export function resetSlug(userId, type) {
  const col = type === 'teacher' ? 'teacher_slug' : 'friend_slug';
  const slug = generateSlug();
  db.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(slug, userId);
  return slug;
}

export function getUserBySlug(slug, type) {
  const col = type === 'teacher' ? 'teacher_slug' : 'friend_slug';
  return db.prepare(`SELECT * FROM users WHERE ${col} = ?`).get(slug);
}

// ── pairs ────────────────────────────────────────────────────

export function getActiveTeacher(studentId) {
  return db.prepare(`
    SELECT u.* FROM teacher_pairs tp
    JOIN users u ON u.id = tp.teacher_id
    WHERE tp.student_id = ? AND tp.active = 1
  `).get(studentId);
}

export function getActiveFriends(studentId) {
  return db.prepare(`
    SELECT u.* FROM friend_pairs fp
    JOIN users u ON u.id = fp.friend_id
    WHERE fp.student_id = ? AND fp.active = 1
  `).all(studentId);
}

export function pairTeacher(studentId, teacherId) {
  db.prepare(`
    INSERT INTO teacher_pairs (student_id, teacher_id)
    VALUES (?, ?)
    ON CONFLICT (student_id, teacher_id) DO UPDATE SET active = 1
  `).run(studentId, teacherId);
}

export function pairFriend(studentId, friendId) {
  db.prepare(`
    INSERT INTO friend_pairs (student_id, friend_id)
    VALUES (?, ?)
    ON CONFLICT (student_id, friend_id) DO UPDATE SET active = 1
  `).run(studentId, friendId);
}

export function unpairTeacher(studentId) {
  db.prepare(`
    UPDATE teacher_pairs SET active = 0
    WHERE student_id = ? AND active = 1
  `).run(studentId);
}

// ── pair requests ────────────────────────────────────────────

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// Returns the new request id, or null if one is already pending
export function createPairRequest(requesterId, ownerId, type) {
  const result = db.prepare(`
    INSERT OR IGNORE INTO pair_requests (requester_id, owner_id, type)
    VALUES (?, ?, ?)
  `).run(requesterId, ownerId, type);
  return result.changes ? Number(result.lastInsertRowid) : null;
}

export function getPairRequest(id) {
  return db.prepare('SELECT * FROM pair_requests WHERE id = ?').get(id);
}

export function setPairRequestStatus(id, status) {
  db.prepare('UPDATE pair_requests SET status = ? WHERE id = ?').run(status, id);
}

// ── memorized ayahs ──────────────────────────────────────────

export function logAyahs({ studentId, surahNumber, ayahFrom, ayahTo, source = 'self_logged' }) {
  db.prepare(`
    INSERT INTO memorized_ayahs (student_id, surah_number, ayah_from, ayah_to, source)
    VALUES (?, ?, ?, ?, ?)
  `).run(studentId, surahNumber, ayahFrom, ayahTo, source);
}

export function hasOverlap(studentId, surahNumber, ayahFrom, ayahTo) {
  const row = db.prepare(`
    SELECT id FROM memorized_ayahs
    WHERE student_id = ?
      AND surah_number = ?
      AND ayah_from <= ?
      AND ayah_to >= ?
    LIMIT 1
  `).get(studentId, surahNumber, ayahTo, ayahFrom);

  return !!row;
}

export function getTotalAyahs(studentId) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(ayah_to - ayah_from + 1), 0) as total
    FROM memorized_ayahs WHERE student_id = ?
  `).get(studentId);
  return row.total;
}

function surahRows(studentId, surahNumber) {
  return db.prepare(`
    SELECT * FROM memorized_ayahs WHERE student_id = ? AND surah_number = ? ORDER BY ayah_from
  `).all(studentId, surahNumber);
}

// Remove ayahs from..to of a surah. Rows that only partly overlap are split, keeping
// their source and logged_at. Returns how many ayahs were removed.
export const removeAyahs = db.transaction((studentId, surahNumber, from, to) => {
  let removed = 0;
  const insert = db.prepare(`
    INSERT INTO memorized_ayahs (student_id, surah_number, ayah_from, ayah_to, source, logged_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const row of surahRows(studentId, surahNumber)) {
    if (row.ayah_to < from || row.ayah_from > to) continue;
    removed += Math.min(row.ayah_to, to) - Math.max(row.ayah_from, from) + 1;
    db.prepare('DELETE FROM memorized_ayahs WHERE id = ?').run(row.id);
    if (row.ayah_from < from) insert.run(studentId, surahNumber, row.ayah_from, from - 1, row.source, row.logged_at);
    if (row.ayah_to > to) insert.run(studentId, surahNumber, to + 1, row.ayah_to, row.source, row.logged_at);
  }
  return removed;
});

// Mark ayahs from..to as memorized, adding only the gaps that aren't recorded yet.
// Returns how many ayahs were added.
export const addMissingAyahs = db.transaction((studentId, surahNumber, from, to, source = 'onboarding') => {
  let added = 0;
  let cursor = from;
  const add = (a, b) => {
    if (a > b) return;
    logAyahs({ studentId, surahNumber, ayahFrom: a, ayahTo: b, source });
    added += b - a + 1;
  };
  for (const row of surahRows(studentId, surahNumber)) {
    if (row.ayah_to < cursor) continue;
    if (row.ayah_from > to) break;
    add(cursor, Math.min(row.ayah_from - 1, to));
    cursor = Math.max(cursor, row.ayah_to + 1);
  }
  add(cursor, to);
  return added;
});

// All memorized ranges, oldest first (last row = most recent log)
export function getMemorizedRanges(studentId) {
  return db.prepare(`
    SELECT surah_number, ayah_from, ayah_to FROM memorized_ayahs
    WHERE student_id = ? ORDER BY id
  `).all(studentId);
}

// Ayahs logged (not from onboarding) in the last `days` days
export function getAyahsLoggedSince(studentId, days) {
  return db.prepare(`
    SELECT COALESCE(SUM(ayah_to - ayah_from + 1), 0) AS n
    FROM memorized_ayahs
    WHERE student_id = ? AND source = 'self_logged'
      AND logged_at >= datetime('now', ?)
  `).get(studentId, `-${days} days`).n;
}

export function getProgressBySurah(studentId) {
  return db.prepare(`
    SELECT surah_number,
           SUM(ayah_to - ayah_from + 1) as ayahs_done
    FROM memorized_ayahs
    WHERE student_id = ?
    GROUP BY surah_number
    ORDER BY surah_number
  `).all(studentId);
}

// ── streaks ──────────────────────────────────────────────────

export function getStreak(studentId) {
  return db.prepare('SELECT * FROM streaks WHERE student_id = ?').get(studentId);
}

export function updateStreak(studentId, timezone = 'UTC') {
  const streak = getStreak(studentId);
  const today = localDate(timezone);
  const yesterday = previousDate(today);

  if (streak.last_log_date === today) return streak;

  let newCurrent = streak.last_log_date === yesterday
    ? streak.current_streak + 1
    : 1;
  let newLongest = Math.max(newCurrent, streak.longest_streak);

  db.prepare(`
    UPDATE streaks SET current_streak = ?, longest_streak = ?, last_log_date = ?
    WHERE student_id = ?
  `).run(newCurrent, newLongest, today, studentId);

  return { ...streak, current_streak: newCurrent, longest_streak: newLongest };
}

// ── milestones ───────────────────────────────────────────────

export function hasMilestone(studentId, key) {
  return !!db.prepare(
    'SELECT id FROM milestones WHERE student_id = ? AND milestone_key = ?'
  ).get(studentId, key);
}

export function saveMilestone(studentId, key) {
  db.prepare(`
    INSERT OR IGNORE INTO milestones (student_id, milestone_key) VALUES (?, ?)
  `).run(studentId, key);
}

// ── reminders & inactivity alerts (used by services/reminders.js) ──

export function getReminderUsers() {
  return db.prepare(
    'SELECT * FROM users WHERE reminder_enabled = 1 AND onboarding_done = 1'
  ).all();
}

// Active teacher pairs with the student's last activity date
// (last log, or the pairing date if they never logged)
export function getTeacherPairsForInactivityCheck() {
  return db.prepare(`
    SELECT stu.id                AS student_id,
           stu.display_name      AS student_name,
           stu.teacher_alerted_for,
           COALESCE(s.last_log_date, date(tp.paired_at)) AS last_active,
           tch.telegram_id       AS teacher_telegram_id,
           tch.language          AS teacher_language,
           tch.timezone          AS teacher_timezone
    FROM teacher_pairs tp
    JOIN users stu ON stu.id = tp.student_id
    JOIN users tch ON tch.id = tp.teacher_id
    LEFT JOIN streaks s ON s.student_id = stu.id
    WHERE tp.active = 1
  `).all();
}

export default db;