import { Markup } from 'telegraf';
import {
  getTotalAyahs, getProgressBySurah, getStreak, getAyahsLoggedSince, getMemorizedRanges,
} from '../services/db.js';
import { juzProgress, currentJuz } from '../data/juz.js';
import { getSurah } from '../data/quran.js';
import { t } from '../utils/i18n.js';
import { bar, escapeHtml, shareButton } from '../utils/progress.js';
import { localDate, previousDate } from '../utils/time.js';
import { updateUser } from '../services/db.js';
import { renderCard } from '../services/card.js';
import { renderHeart, formatPercent } from '../services/heart.js';

// Number of fully memorized surahs
export function surahStats(studentId) {
  const surahs = getProgressBySurah(studentId)
    .filter(row => row.ayahs_done >= (getSurah(row.surah_number)?.ayahs ?? Infinity)).length;
  return { surahs };
}

// Per-juz progress, finished juz numbers, and the juz to show a bar for
export function juzStats(studentId) {
  const ranges = getMemorizedRanges(studentId);
  const progress = juzProgress(ranges);
  return {
    progress,
    completed: progress.filter(j => j.done >= j.total).map(j => j.n),
    current: currentJuz(progress, ranges[ranges.length - 1]),
  };
}

// "▰▰▰▰▱▱▱▱▱▱\nJuz 2 — 69 ayahs to go" (or the whole-Quran line when everything is done)
export function juzLines(lang, current) {
  if (!current) return [t(lang, 'progress_complete')];
  return [bar(current.done, current.total), t(lang, 'juz_left', { n: current.n, left: current.total - current.done })];
}

// Current streak, or 0 if the last log was before yesterday (user's local time)
export function liveStreak(user) {
  const streak = getStreak(user.id);
  const today = localDate(user.timezone);
  const alive = streak.last_log_date === today || streak.last_log_date === previousDate(today);
  return { current: alive ? streak.current_streak : 0, best: streak.longest_streak };
}

// Render the user's card and send it as a photo with `caption` (HTML) and a Share button.
// Falls back to a plain text message if rendering or uploading fails.
export async function sendCard(ctx, { caption, headline } = {}) {
  const user = ctx.user;
  const lang = user.language;
  const ayahs = getTotalAyahs(user.id);
  const { surahs } = surahStats(user.id);
  const juz = juzStats(user.id);
  const keyboard = Markup.inlineKeyboard([[
    shareButton(ctx, lang, { surahs, ayahs }),
    Markup.button.callback(t(lang, 'heart_btn'), 'heart'),
  ]]);

  try {
    const png = renderCard({
      lang,
      name: user.display_name,
      ayahs,
      surahs,
      juzDone: juz.completed.length,
      streak: liveStreak(user).current,
      juz: juz.progress,
      botUsername: ctx.botInfo.username,
      timezone: user.timezone,
      headline,
    });
    const msg = await ctx.replyWithPhoto({ source: png, filename: 'hifz.png' }, {
      caption, parse_mode: 'HTML', ...keyboard,
    });
    const fileId = msg?.photo?.[msg.photo.length - 1]?.file_id;
    if (fileId) updateUser(user.id, { card_file_id: fileId });
  } catch (err) {
    console.error('Card failed, sending text instead:', err.message);
    await ctx.reply(caption, { parse_mode: 'HTML', ...keyboard });
  }
}

// "🤍 My heart" button: the heart card, filled with gold by how much is memorized
export async function handleHeart(ctx) {
  const user = ctx.user;
  const lang = user?.language || 'en';
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  if (!user || !user.onboarding_done) return ctx.reply(t(lang, 'setup_first'));

  const ayahs = getTotalAyahs(user.id);
  const { surahs } = surahStats(user.id);
  const caption = t(lang, 'heart_caption', { pct: formatPercent(ayahs) });
  const keyboard = Markup.inlineKeyboard([shareButton(ctx, lang, { surahs, ayahs })]);

  try {
    const png = renderHeart({
      lang, name: user.display_name, ayahs, botUsername: ctx.botInfo.username, timezone: user.timezone,
    });
    const msg = await ctx.replyWithPhoto({ source: png, filename: 'my-heart.png' }, {
      caption, parse_mode: 'HTML', ...keyboard,
    });
    // Newest image is what inline Share posts
    const fileId = msg?.photo?.[msg.photo.length - 1]?.file_id;
    if (fileId) updateUser(user.id, { card_file_id: fileId });
  } catch (err) {
    console.error('Heart card failed:', err.message);
    await ctx.reply(t(lang, 'error_generic'));
  }
}

export async function handleProgress(ctx) {
  const user = ctx.user;
  const lang = user?.language || 'en';
  if (!user || !user.onboarding_done) return ctx.reply(t(lang, 'setup_first'));

  const ayahs = getTotalAyahs(user.id);
  if (ayahs === 0) return ctx.reply(t(lang, 'progress_empty'));

  const { surahs } = surahStats(user.id);
  const juz = juzStats(user.id);
  const streak = liveStreak(user);
  const week = getAyahsLoggedSince(user.id, 7);

  // Caption under the card image
  const lines = [
    t(lang, surahs > 0 ? 'progress_main' : 'progress_main_ayahs', { surahs, ayahs }),
    t(lang, 'progress_by_heart'),
    '',
  ];

  lines.push(...juzLines(lang, juz.current));

  // Only good news below — nothing is shown as a zero
  const badges = [];
  if (juz.completed.length) badges.push(t(lang, 'progress_juz_done', { n: juz.completed.length }));
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

  await sendCard(ctx, { caption: lines.join('\n') });
}
