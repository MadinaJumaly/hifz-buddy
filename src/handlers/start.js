import { Markup } from 'telegraf';
import { createUser, getUserByTelegramId, updateUser } from '../services/db.js';
import { CITY_BUTTONS, getCityButton, resolveTimezone } from '../data/cities.js';
import { LANGUAGE_NAMES, mainMenu } from '../utils/menu.js';
import { t } from '../utils/i18n.js';

// Setup flow: language → confirm name → city → already-memorized surahs → done.
// The name defaults to the Telegram first name; the user confirms it with one tap or types another.

const INVITE_RE = /^(friend|teacher)_([A-Z0-9]+)$/i;

export function languageKeyboard(prefix) {
  return Markup.inlineKeyboard(
    Object.entries(LANGUAGE_NAMES).map(([code, name]) => [Markup.button.callback(name, `${prefix}${code}`)])
  );
}

export function cityKeyboard(lang, prefix, extraRows = []) {
  const buttons = CITY_BUTTONS.map(c => Markup.button.callback(c[lang] || c.en, `${prefix}${c.key}`));
  buttons.push(Markup.button.callback(t(lang, 'city_other'), `${prefix}other`));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return Markup.inlineKeyboard([...rows, ...extraRows]);
}

// /start (also handles deep-link invites: ?start=friend_CODE / ?start=teacher_CODE)
export async function handleStart(ctx) {
  const existing = getUserByTelegramId(ctx.from.id);
  const payload = ctx.startPayload || '';
  const inviteMatch = payload.match(INVITE_RE);

  if (existing && existing.onboarding_done) {
    const lang = existing.language;
    ctx.user = existing;
    if (inviteMatch) {
      const { applyInvite } = await import('./pairing.js');
      return applyInvite(ctx, inviteMatch[1].toLowerCase(), inviteMatch[2]);
    }
    // Came from "Create your card" in the inline share list
    if (payload === 'card') {
      const { handleProgress } = await import('./progress.js');
      return handleProgress(ctx);
    }
    return ctx.reply(t(lang, 'welcome_back', { name: existing.display_name }), mainMenu(lang));
  }

  // New (or unfinished) user — start fresh, keep a pending invite for after setup
  ctx.session = { step: null, selectedSurahs: [], currentOnboardingPage: 1 };
  if (inviteMatch) ctx.session.pendingInvite = payload;

  await ctx.reply(
    '🇰🇿 Тілді таңдаңыз\n🇷🇺 Выберите язык\n🇬🇧 Choose your language',
    languageKeyboard('lang_'),
  );
}

// Clean up a typed name; null if unusable
export function cleanName(text) {
  const name = String(text).replace(/\s+/g, ' ').trim();
  if (!name || name.startsWith('/') || [...name].length > 40) return null;
  return name;
}

function telegramName(ctx) {
  return cleanName(ctx.from.first_name || '') || cleanName(ctx.from.username || '') || null;
}

// Language chosen → short intro + "is this your name?"
export async function handleLanguageChoice(ctx) {
  await ctx.answerCbQuery();
  const lang = ctx.callbackQuery.data.split('_')[1];

  ctx.session = ctx.session || {};
  ctx.session.pendingLang = lang;
  ctx.session.step = null;

  const name = telegramName(ctx);
  if (!name) {
    ctx.session.step = 'awaiting_name';
    return ctx.editMessageText(`${t(lang, 'welcome')}\n\n${t(lang, 'name_prompt')}`);
  }

  await ctx.editMessageText(`${t(lang, 'welcome')}\n\n${t(lang, 'name_confirm', { name })}`,
    Markup.inlineKeyboard([
      [Markup.button.callback(`✅ ${name}`, 'name_ok')],
      [Markup.button.callback(t(lang, 'name_other_btn'), 'name_edit')],
    ]));
}

// "✅ Madina"
export async function handleNameOk(ctx) {
  await ctx.answerCbQuery();
  const lang = ctx.session?.pendingLang || 'en';
  ctx.session.pendingName = telegramName(ctx);
  ctx.session.step = null;
  await ctx.editMessageText(t(lang, 'ask_city'), cityKeyboard(lang, 'city_'));
}

// "✏️ Another name"
export async function handleNameEdit(ctx) {
  await ctx.answerCbQuery();
  const lang = ctx.session?.pendingLang || 'en';
  ctx.session.step = 'awaiting_name';
  await ctx.editMessageText(t(lang, 'name_prompt'));
}

// Typed name during setup
export async function handleNameInput(ctx) {
  const lang = ctx.session?.pendingLang || 'en';
  const name = cleanName(ctx.message.text);
  if (!name) return ctx.reply(t(lang, 'name_invalid'));
  ctx.session.pendingName = name;
  ctx.session.step = null;
  await ctx.reply(t(lang, 'ask_city'), cityKeyboard(lang, 'city_'));
}

// City button tapped during setup
export async function handleCityChoice(ctx) {
  await ctx.answerCbQuery();
  const lang = ctx.session?.pendingLang || 'en';
  const key = ctx.callbackQuery.data.slice('city_'.length);

  if (key === 'other') {
    ctx.session.step = 'awaiting_city';
    return ctx.editMessageText(t(lang, 'city_type_prompt'));
  }

  const city = getCityButton(key);
  if (!city) return;
  await finishProfile(ctx, lang, city[lang] || city.en, city.tz);
}

// City typed during setup ("Other")
export async function handleCityInput(ctx) {
  const lang = ctx.session?.pendingLang || 'en';
  const cityName = ctx.message.text.trim().slice(0, 60);
  const tz = resolveTimezone(cityName);
  if (!tz) await ctx.reply(t(lang, 'city_unknown'));
  await finishProfile(ctx, lang, cityName, tz || 'UTC');
}

// Create (or update, if setup was abandoned earlier) the user, then ask for surahs
async function finishProfile(ctx, lang, city, tz) {
  const displayName = ctx.session?.pendingName || telegramName(ctx) || 'Friend';

  let user = getUserByTelegramId(ctx.from.id);
  if (user) {
    updateUser(user.id, { display_name: displayName, language: lang, timezone: tz, city });
  } else {
    user = createUser({ telegramId: ctx.from.id, displayName, language: lang, timezone: tz });
    updateUser(user.id, { city });
  }
  ctx.user = getUserByTelegramId(ctx.from.id);
  ctx.session.step = 'onboarding_surah';

  const { sendSurahSelector } = await import('./onboarding.js');
  await sendSurahSelector(ctx, 1);
}
