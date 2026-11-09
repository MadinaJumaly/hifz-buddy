-- ─────────────────────────────────────────
-- users
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id   INTEGER NOT NULL UNIQUE,
  display_name  TEXT    NOT NULL,
  language      TEXT    NOT NULL DEFAULT 'en' CHECK (language IN ('kz','en','ru')),
  timezone      TEXT    NOT NULL DEFAULT 'UTC',
  reminder_enabled INTEGER NOT NULL DEFAULT 0,
  onboarding_done  INTEGER NOT NULL DEFAULT 0,
  registered_at TEXT    NOT NULL DEFAULT (datetime('now')),
  friend_slug   TEXT    UNIQUE,
  teacher_slug  TEXT    UNIQUE
);

-- ─────────────────────────────────────────
-- invite_codes
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invite_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_type TEXT    NOT NULL CHECK (invite_type IN ('teacher','friend')),
  code        TEXT    NOT NULL UNIQUE,
  expires_at  TEXT    NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────
-- teacher_pairs  (one student : one active teacher)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_pairs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paired_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  active     INTEGER NOT NULL DEFAULT 1,
  UNIQUE (student_id, teacher_id)
);

-- enforce one active teacher per student at DB level
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_active_teacher
  ON teacher_pairs (student_id)
  WHERE active = 1;

-- ─────────────────────────────────────────
-- friend_pairs  (one student : many friends)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friend_pairs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paired_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  active     INTEGER NOT NULL DEFAULT 1,
  UNIQUE (student_id, friend_id)
);

-- ─────────────────────────────────────────
-- memorized_ayahs
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memorized_ayahs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  surah_number INTEGER NOT NULL CHECK (surah_number BETWEEN 1 AND 114),
  ayah_from    INTEGER NOT NULL CHECK (ayah_from >= 1),
  ayah_to      INTEGER NOT NULL CHECK (ayah_to >= ayah_from),
  source       TEXT    NOT NULL CHECK (source IN ('onboarding','self_logged')),
  logged_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memorized_student
  ON memorized_ayahs (student_id, surah_number);

-- ─────────────────────────────────────────
-- streaks
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streaks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_log_date  TEXT
);

-- ─────────────────────────────────────────
-- milestones
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_key TEXT    NOT NULL,
  achieved_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, milestone_key)
);