import { Markup } from 'telegraf';
import {
  logAyahs, hasOverlap, getTotalAyahs,
  updateStreak, getActiveTeacher, getActiveFriends,
  hasMilestone, saveMilestone,
} from '../services/db.js';
import { validateAyahRange, getSurahName, getSurah } from '../data/quran.js';
import { t } from '../utils/i18n.js';
import {
  GOALS, TOTAL_AYAHS, nextGoal, goalBar, escapeHtml, shareButton,
} from '../utils/progress.js';
import { surahStats } from './progress.js';

// Plain-text log: "2 255 257" (surah, from, to) or "112" (whole surah)
export const LOG_TEXT_RE = /^\s*\d{1,3}(\s+\d{1,3}\s+\d{1,3})?\s*$/;

// "📖 Log" button / "Log more" → explain the format
export async function handleLogPrompt(ctx) {
  const lang = ctx.user?.language || 'en';
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  if (!ctx.user || !ctx.user.onboarding_done) return ctx.reply(t(lang, 'setup_first'));
  return ctx.reply(t(lang, 'log_prompt'));
}

// /log 2 255 257
export async function handleLog(ctx) {
  const args = ctx.message.text.split(/\s+/).slice(1).join(' ');
  if (!args) return handleLogPrompt(ctx);
  return logFromText(ctx, args);
}

export async function logFromText(ctx, text) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user || !ctx.user.onboarding_done) return ctx.reply(t(lang, 'setup_first'));

  const args = text.trim().split(/\s+/).map(Number);
  let surahNum, ayahFrom, ayahTo;

  if (args.length === 1) {
    surahNum = args[0];
    const s = getSurah(surahNum);
    if (!s) return ctx.reply(t(lang, 'log_invalid_surah'));
    ayahFrom = 1;
    ayahTo = s.ayahs;
  } else if (args.length === 3) {
    [surahNum, ayahFrom, ayahTo] = args;
  } else {
    return ctx.reply(t(lang, 'log_prompt'));
  }

  const check = validateAyahRange(surahNum, ayahFrom, ayahTo);
  if (!check.valid) {
    if (check.error === 'invalid_surah') return ctx.reply(t(lang, 'log_invalid_surah'));
    return ctx.reply(t(lang, 'log_invalid_range', {
      surah: getSurahName(check.surah, lang),
      total: check.surah.ayahs,
    }));
  }

  if (hasOverlap(ctx.user.id, surahNum, ayahFrom, ayahTo)) {
    return ctx.reply(t(lang, 'log_duplicate'));
  }

  logAyahs({ studentId: ctx.user.id, surahNumber: surahNum, ayahFrom, ayahTo, source: 'self_logged' });

  const notified = await notifyContacts(ctx, check.surah, ayahFrom, ayahTo);
  const streak = updateStreak(ctx.user.id, ctx.user.timezone);
  const total = getTotalAyahs(ctx.user.id);

  // One summary message: what was saved, progress to the next goal, streak
  const goal = nextGoal(total);
  const lines = [
    escapeHtml(t(lang, 'log_success', {
      ar: check.surah.ar,
      name: check.surah[lang] || check.surah.en,
      from: ayahFrom,
      to: ayahTo,
    })),
    '',
  ];
  if (goal) lines.push(goalBar(total, goal), t(lang, 'log_goal', { goal, left: goal - total }));
  if (streak.current_streak > 0) lines.push('', t(lang, 'log_streak', { n: streak.current_streak }));
  if (notified > 0) lines.push('', escapeHtml(t(lang, 'log_notified')));

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([Markup.button.callback(t(lang, 'log_more'), 'log_more')]),
  });

  await celebrateGoals(ctx, lang, total);
}

// Returns how many people were notified
async function notifyContacts(ctx, surah, from, to) {
  const teacher = getActiveTeacher(ctx.user.id);
  const friends = getActiveFriends(ctx.user.id);
  const recipients = [
    ...(teacher ? [{ user: teacher, key: 'notify_teacher' }] : []),
    ...friends.map(f => ({ user: f, key: 'notify_friend' })),
  ];

  let sent = 0;
  for (const { user: r, key } of recipients) {
    const lang = r.language || 'en';
    try {
      await ctx.telegram.sendMessage(r.telegram_id, t(lang, key, {
        student: ctx.user.display_name,
        ar: surah.ar,
        name: surah[lang] || surah.en,
        n: surah.n,
        from,
        to,
      }));
      sent++;
    } catch {}
  }
  return sent;
}

// Celebrate the highest newly reached goal (one message, even if several were passed)
async function celebrateGoals(ctx, lang, total) {
  const userId = ctx.user.id;
  const name = escapeHtml(ctx.user.display_name);

  const fresh = GOALS.filter(g => total >= g && !hasMilestone(userId, `ayahs_${g}`));
  fresh.forEach(g => saveMilestone(userId, `ayahs_${g}`));
  if (fresh.length === 0) return;

  const { surahs } = surahStats(userId);
  const share = Markup.inlineKeyboard([shareButton(ctx, lang, { surahs, ayahs: total })]);

  if (total >= TOTAL_AYAHS && !hasMilestone(userId, 'khatm')) {
    saveMilestone(userId, 'khatm');
    return ctx.reply(t(lang, 'milestone_khatm', { name: ctx.user.display_name }), share);
  }

  const goal = fresh[fresh.length - 1];
  await ctx.reply(t(lang, 'milestone_goal', { goal, name }), { parse_mode: 'HTML', ...share });
}
