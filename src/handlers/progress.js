import { Markup } from 'telegraf';
import { getTotalAyahs, getProgressBySurah, getStreak, getAyahsLoggedSince } from '../services/db.js';
import { getSurah } from '../data/quran.js';
import { t } from '../utils/i18n.js';
import { nextGoal, goalBar, escapeHtml, shareButton } from '../utils/progress.js';
import { localDate, previousDate } from '../utils/time.js';

// Full surahs memorized, and whether all of Juz Amma (surahs 78–114) is done
export function surahStats(studentId) {
  const done = new Set(
    getProgressBySurah(studentId)
      .filter(row => row.ayahs_done >= (getSurah(row.surah_number)?.ayahs ?? Infinity))
      .map(row => row.surah_number),
  );
  let juzAmma = true;
  for (let n = 78; n <= 114; n++) if (!done.has(n)) { juzAmma = false; break; }
  return { surahs: done.size, juzAmma };
}

// Current streak, or 0 if the last log was before yesterday (user's local time)
export function liveStreak(user) {
  const streak = getStreak(user.id);
  const today = localDate(user.timezone);
  const alive = streak.last_log_date === today || streak.last_log_date === previousDate(today);
  return { current: alive ? streak.current_streak : 0, best: streak.longest_streak };
}

export async function handleProgress(ctx) {
  const user = ctx.user;
  const lang = user?.language || 'en';
  if (!user || !user.onboarding_done) return ctx.reply(t(lang, 'setup_first'));

  const ayahs = getTotalAyahs(user.id);
  if (ayahs === 0) return ctx.reply(t(lang, 'progress_empty'));

  const { surahs, juzAmma } = surahStats(user.id);
  const streak = liveStreak(user);
  const week = getAyahsLoggedSince(user.id, 7);
  const goal = nextGoal(ayahs);

  const lines = [
    `<b>${escapeHtml(user.display_name)}</b>`,
    '',
    t(lang, 'progress_main', { surahs, ayahs }),
    t(lang, 'progress_by_heart'),
    '',
  ];

  if (goal) {
    lines.push(goalBar(ayahs, goal), t(lang, 'progress_next', { goal, left: goal - ayahs }));
  } else {
    lines.push(t(lang, 'progress_complete'));
  }

  // Only good news below — nothing is shown as a zero
  const badges = [];
  if (juzAmma) badges.push(t(lang, 'progress_juz_amma'));
  if (week > 0) badges.push(t(lang, 'progress_week', { n: week }));
  if (badges.length) lines.push('', badges.join('  ·  '));

  lines.push('');
  if (streak.current > 0) {
    let s = t(lang, 'progress_streak_on', { n: streak.current });
    if (streak.best > streak.current) s += t(lang, 'progress_streak_best', { n: streak.best });
    lines.push(s);
  } else {
    lines.push(t(lang, 'progress_streak_start'));
  }

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([shareButton(ctx, lang, { surahs, ayahs })]),
  });
}
