import {
  logAyahs, hasOverlap, getTotalAyahs,
  updateStreak, getActiveTeacher, getActiveFriends,
  hasMilestone, saveMilestone,
} from '../services/db.js';
import { validateAyahRange, getSurahName, getSurah } from '../data/quran.js';
import { t } from '../utils/i18n.js';

const MILESTONES = [50, 100, 200, 300, 500, 1000];

export async function handleLog(ctx) {
  const lang = ctx.user?.language || 'en';

  if (!ctx.user || !ctx.user.onboarding_done) {
    return ctx.reply('Please complete setup first with /start');
  }

  const args = ctx.message.text.split(' ').slice(1).map(s => s.trim());

  // /log 112  →  full surah shorthand
  // /log 2 255 257  →  range
  let surahNum, ayahFrom, ayahTo;

  if (args.length === 1) {
    surahNum = parseInt(args[0]);
    const s = getSurah(surahNum);
    if (!s) return ctx.reply(t(lang, 'log_invalid_surah'));
    ayahFrom = 1;
    ayahTo = s.ayahs;
  } else if (args.length === 3) {
    [surahNum, ayahFrom, ayahTo] = args.map(Number);
  } else {
    return ctx.reply(t(lang, 'log_usage'));
  }

  const check = validateAyahRange(surahNum, ayahFrom, ayahTo);
  if (!check.valid) {
    if (check.error === 'invalid_surah')
      return ctx.reply(t(lang, 'log_invalid_surah'));
    return ctx.reply(t(lang, 'log_invalid_range', {
      surah: getSurahName(check.surah, lang),
      total: check.surah.ayahs,
    }));
  }

  if (hasOverlap(ctx.user.id, surahNum, ayahFrom, ayahTo)) {
  return ctx.reply(t(lang, 'log_duplicate'));
}

  // Save
  logAyahs({
    studentId: ctx.user.id,
    surahNumber: surahNum,
    ayahFrom,
    ayahTo,
    source: 'self_logged',
  });

  // Confirm to student
  await ctx.reply(t(lang, 'log_success', {
    ar: check.surah.ar,
    name: check.surah[lang] || check.surah.en,
    from: ayahFrom,
    to: ayahTo,
  }));

  // Notify teacher + friends
  await notifyContacts(ctx, check.surah, ayahFrom, ayahTo, lang);

  // Update streak
  updateStreak(ctx.user.id);

  // Check milestones
  await checkMilestones(ctx, lang);
}

async function notifyContacts(ctx, surah, from, to, studentLang) {
  const teacher = getActiveTeacher(ctx.user.id);
  const friends = getActiveFriends(ctx.user.id);
  const recipients = [...(teacher ? [teacher] : []), ...friends];

  if (recipients.length === 0) return;

  for (const r of recipients) {
    const lang = r.language || 'en';

    const text = t(lang, 'notify_teacher', {
      student: ctx.user.display_name,
      ar: surah.ar,
      name: surah[lang] || surah.en,
      n: surah.n,
      from,
      to,
    });

    try {
      await ctx.telegram.sendMessage(r.telegram_id, text);
    } catch {}
  }

  await ctx.reply(t(studentLang, 'log_notified'));
}

async function checkMilestones(ctx, lang) {
  const total = getTotalAyahs(ctx.user.id);
  const name = ctx.user.display_name;

  // Ayah count milestones
  for (const threshold of MILESTONES) {
    if (total >= threshold && !hasMilestone(ctx.user.id, `ayahs_${threshold}`)) {
      saveMilestone(ctx.user.id, `ayahs_${threshold}`);
      const key = threshold === 50 ? 'milestone_50'
                : threshold === 100 ? 'milestone_100'
                : null;
      if (key) await ctx.reply(t(lang, key, { name }));
    }
  }

  // Khatm
  if (total >= 6236 && !hasMilestone(ctx.user.id, 'khatm')) {
    saveMilestone(ctx.user.id, 'khatm');
    await ctx.reply(t(lang, 'milestone_khatm', { name }));
  }
}