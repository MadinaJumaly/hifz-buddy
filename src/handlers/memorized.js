import { Markup } from 'telegraf';
import surahs, { validateAyahRange, getSurah } from '../data/quran.js';
import { getProgressBySurah, removeAyahs, addMissingAyahs } from '../services/db.js';
import { t } from '../utils/i18n.js';
import { escapeHtml } from '../utils/progress.js';
import { juzStats, juzLines } from './progress.js';

// "📚 My memorization": review the surah list and fix what's marked as memorized.
// Tap a surah: not/partly memorized → fully memorized; fully memorized → removed.
// Text "-2 1 5" removes just those ayahs; "-112" removes a whole surah.

const PAGE_SIZE = 10;

export const REMOVE_TEXT_RE = /^\s*-\s*\d{1,3}(\s+\d{1,3}\s+\d{1,3})?\s*$/;

function doneBySurah(studentId) {
  return new Map(getProgressBySurah(studentId).map(r => [r.surah_number, r.ayahs_done]));
}

function view(user, page) {
  const lang = user.language;
  const done = doneBySurah(user.id);
  const totalPages = Math.ceil(surahs.length / PAGE_SIZE);
  page = Math.min(Math.max(1, page), totalPages);

  const rows = surahs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(s => {
    const n = done.get(s.n) || 0;
    const mark = n >= s.ayahs ? '✓ ' : n > 0 ? `◐ ${n}/${s.ayahs} · ` : '';
    return [Markup.button.callback(`${mark}${s.n}. ${s.ar} (${s[lang] || s.en})`, `mem_t_${s.n}_${page}`)];
  });

  const nav = [];
  if (page > 1) nav.push(Markup.button.callback('◀', `mem_p_${page - 1}`));
  nav.push(Markup.button.callback(`${page}/${totalPages}`, 'mem_noop'));
  if (page < totalPages) nav.push(Markup.button.callback('▶', `mem_p_${page + 1}`));
  rows.push(nav);
  rows.push([Markup.button.callback(`← ${t(lang, 'back')}`, 'set_back')]);

  return { text: t(lang, 'mem_title'), keyboard: Markup.inlineKeyboard(rows) };
}

export async function handleMemorized(ctx, page = 1) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user || !ctx.user.onboarding_done) return ctx.reply(t(lang, 'setup_first'));
  const { text, keyboard } = view(ctx.user, page);
  if (ctx.callbackQuery) return ctx.editMessageText(text, keyboard);
  return ctx.reply(text, keyboard);
}

// mem_p_<page> | mem_t_<surah>_<page> | mem_noop
export async function handleMemorizedAction(ctx) {
  const user = ctx.user;
  if (!user) return ctx.answerCbQuery();
  const lang = user.language;
  const [, kind, a, b] = ctx.callbackQuery.data.match(/^mem_([a-z]+)(?:_(\d+))?(?:_(\d+))?$/) || [];

  if (kind === 'p') {
    await ctx.answerCbQuery();
    return handleMemorized(ctx, Number(a));
  }

  if (kind === 't') {
    const s = getSurah(Number(a));
    if (!s) return ctx.answerCbQuery();
    const done = doneBySurah(user.id).get(s.n) || 0;
    const name = s[lang] || s.en;

    if (done >= s.ayahs) {
      removeAyahs(user.id, s.n, 1, s.ayahs);
      await ctx.answerCbQuery(t(lang, 'mem_toast_removed', { name }));
    } else {
      addMissingAyahs(user.id, s.n, 1, s.ayahs);
      await ctx.answerCbQuery(t(lang, 'mem_toast_added', { name }));
    }
    return handleMemorized(ctx, Number(b) || 1);
  }

  return ctx.answerCbQuery();
}

// "-2 1 5" or "-112"
export async function handleRemoveText(ctx, text) {
  const lang = ctx.user.language;
  const args = text.replace('-', ' ').trim().split(/\s+/).map(Number);

  let surahNum, from, to;
  if (args.length === 1) {
    surahNum = args[0];
    const s = getSurah(surahNum);
    if (!s) return ctx.reply(t(lang, 'log_invalid_surah'));
    [from, to] = [1, s.ayahs];
  } else {
    [surahNum, from, to] = args;
  }

  const check = validateAyahRange(surahNum, from, to);
  if (!check.valid) {
    if (check.error === 'invalid_surah') return ctx.reply(t(lang, 'log_invalid_surah'));
    return ctx.reply(t(lang, 'log_invalid_range', {
      surah: `${check.surah.ar} — ${check.surah[lang] || check.surah.en}`,
      total: check.surah.ayahs,
    }));
  }

  const removed = removeAyahs(ctx.user.id, surahNum, from, to);
  if (removed === 0) return ctx.reply(t(lang, 'mem_nothing'));

  const juz = juzStats(ctx.user.id);
  const lines = [
    escapeHtml(t(lang, 'mem_removed', {
      ar: check.surah.ar, name: check.surah[lang] || check.surah.en, from, to, n: removed,
    })),
    '',
    ...juzLines(lang, juz.current),
  ];
  return ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
}
