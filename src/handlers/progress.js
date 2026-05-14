import { getTotalAyahs, getProgressBySurah, getStreak } from '../services/db.js';
import { getSurah } from '../data/quran.js';
import { t } from '../utils/i18n.js';

export async function handleProgress(ctx) {
  const lang = ctx.user?.language || 'en';

  if (!ctx.user) return ctx.reply(t(lang, 'error_generic'));

  const total = getTotalAyahs(ctx.user.id);
  const streak = getStreak(ctx.user.id);
  const bySurah = getProgressBySurah(ctx.user.id);

  if (total === 0) {
    return ctx.reply(t(lang, 'progress_empty'));
  }

  // Build Juz' breakdown
  /* const juzMap = {};
  for (const row of bySurah) {
    const s = getSurah(row.surah_number);
    if (!s) continue;
    if (!juzMap[s.juz]) juzMap[s.juz] = { done: 0, total: 0 };
    juzMap[s.juz].done += row.ayahs_done;
  } */

  // Total ayahs per juz (precomputed from quran data)
  /* const { default: surahs } = await import('../data/quran.js');
  for (const s of surahs) {
    if (!juzMap[s.juz]) juzMap[s.juz] = { done: 0, total: 0 };
    juzMap[s.juz].total += s.ayahs;
  } */

  const lines = [
    t(lang, 'progress_header'),
    '',
    t(lang, 'progress_total', { count: total }),
    t(lang, 'progress_streak', {
      current: streak.current_streak,
      longest: streak.longest_streak,
    }),
    '',
  ];

  /* for (const juz of Object.keys(juzMap).sort((a, b) => a - b)) {
    const { done, total: juzTotal } = juzMap[juz];
    if (done > 0) {
      lines.push(t(lang, 'progress_juz', { n: juz, done, total: juzTotal }));
    }
  } */

  await ctx.reply(lines.join('\n'));
}