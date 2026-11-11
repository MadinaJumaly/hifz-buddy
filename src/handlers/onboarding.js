import { Markup } from 'telegraf';
import surahs from '../data/quran.js';
import { t } from '../utils/i18n.js';
import { logAyahs, updateUser, saveMilestone, hasOverlap } from '../services/db.js';

const PAGE_SIZE = 10; // surahs per page

export async function sendSurahSelector(ctx, page = 1) {
  const lang = ctx.user?.language || ctx.session?.pendingLang || 'en';
  const selected = ctx.session?.selectedSurahs || [];

  const totalPages = Math.ceil(surahs.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const pageSurahs = surahs.slice(start, start + PAGE_SIZE);

  const buttons = pageSurahs.map(s => {
    const isSelected = selected.includes(s.n);
    const label = `${isSelected ? '✓ ' : ''}${s.n}. ${s.ar} (${s[lang] || s.en})`;
    return [Markup.button.callback(label, `ob_surah_${s.n}`)];
  });

  // Navigation + actions row
  const navRow = [];
  if (page > 1) navRow.push(Markup.button.callback('◀', `ob_page_${page - 1}`));
  navRow.push(Markup.button.callback(`${page}/${totalPages}`, 'ob_noop'));
  if (page < totalPages) navRow.push(Markup.button.callback('▶', `ob_page_${page + 1}`));
  buttons.push(navRow);
  buttons.push([
    Markup.button.callback(t(lang, 'done'), 'ob_done'),
  ]);

  const text = `${t(lang, 'ask_baseline')}\n\n_Selected: ${selected.length} surahs_`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  } else {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }
}

// Toggle surah selection
export async function handleSurahToggle(ctx) {
  await ctx.answerCbQuery();
  const surahNum = parseInt(ctx.callbackQuery.data.split('_')[2]);
  ctx.session = ctx.session || {};
  ctx.session.selectedSurahs = ctx.session.selectedSurahs || [];

  const idx = ctx.session.selectedSurahs.indexOf(surahNum);
  if (idx >= 0) {
    ctx.session.selectedSurahs.splice(idx, 1);
  } else {
    ctx.session.selectedSurahs.push(surahNum);
  }

  // Re-render current page
  const page = ctx.session.currentOnboardingPage || 1;
  await sendSurahSelector(ctx, page);
}

// Page navigation
export async function handlePageNav(ctx) {
  await ctx.answerCbQuery();
  const page = parseInt(ctx.callbackQuery.data.split('_')[2]);
  ctx.session.currentOnboardingPage = page;
  await sendSurahSelector(ctx, page);
}

// Done — save selected full surahs, then ask for partials
export async function handleOnboardingDone(ctx) {
  await ctx.answerCbQuery();
  const lang = ctx.user?.language || ctx.session?.pendingLang || 'en';
  const selected = ctx.session?.selectedSurahs || [];

  // Save each selected surah as fully memorized
  for (const surahNum of selected) {
    const s = surahs.find(x => x.n === surahNum);
    if (!s) continue;
    logAyahs({
      studentId: ctx.user.id,
      surahNumber: s.n,
      ayahFrom: 1,
      ayahTo: s.ayahs,
      source: 'onboarding',
    });
  }

  // Mark onboarding done
  updateUser(ctx.user.id, { onboarding_done: 1 });

  const totalAyahs = selected.reduce((acc, n) => {
    const s = surahs.find(x => x.n === n);
    return acc + (s ? s.ayahs : 0);
  }, 0);

  const thresholds = [50, 100, 200, 300, 500, 1000];

    for (const threshold of thresholds) {
    if (totalAyahs >= threshold) {
        saveMilestone(ctx.user.id, `ayahs_${threshold}`);
    }
    }

    if (totalAyahs >= 6236) {
    saveMilestone(ctx.user.id, 'khatm');
    }

  await ctx.editMessageText(
    t(lang, 'onboarding_done', { count: totalAyahs }) +
    '\n\n' + t(lang, 'ask_partial')
  );

  await ctx.reply('Open menu:', {
    reply_markup: {
      keyboard: [
        ['📖 Log memorization', '📊 Progress'],
        ['🔗 My friend code', '🔗 My teacher code'],
      ],
      resize_keyboard: true,
    },
  });

  // Apply a pending deep-link invite if the user arrived via one
  const pendingInvite = ctx.session.pendingInvite;
  ctx.session.step = null;
  ctx.session.pendingInvite = null;

  if (pendingInvite) {
    const inviteMatch = pendingInvite.match(/^(friend|teacher)_([A-Z0-9]+)$/i);
    if (inviteMatch) {
      const { applyInvite } = await import('./pairing.js');
      await applyInvite(ctx, inviteMatch[1].toLowerCase(), inviteMatch[2]);
    }
  }
}

// /partial command for onboarding partial surahs
export async function handlePartial(ctx) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user) return ctx.reply(t(lang, 'error_generic'));

  const args = ctx.message.text.split(' ').slice(1).map(Number);
  const [surahNum, from, to] = args;

  if (!surahNum || !from || !to) {
    return ctx.reply(t(lang, 'log_usage'));
  }

  const { validateAyahRange, getSurahName } = await import('../data/quran.js');
  const check = validateAyahRange(surahNum, from, to);
  if (!check.valid) {
    if (check.error === 'invalid_surah') return ctx.reply(t(lang, 'log_invalid_surah'));
    return ctx.reply(t(lang, 'log_invalid_range', {
      surah: getSurahName(check.surah, lang),
      total: check.surah.ayahs,
    }));
  }

  if (hasOverlap(ctx.user.id, surahNum, from, to)) {
    return ctx.reply(t(lang, 'log_duplicate'));
  }

  logAyahs({
    studentId: ctx.user.id,
    surahNumber: surahNum,
    ayahFrom: from,
    ayahTo: to,
    source: 'onboarding',
  });

  await ctx.reply(t(lang, 'log_success', {
    ar: check.surah.ar,
    name: check.surah[lang] || check.surah.en,
    from,
    to,
  }));
}