import { Markup } from 'telegraf';
import { createUser, getUserByTelegramId, updateUser } from '../services/db.js';
import { t } from '../utils/i18n.js';

// Step 1: /start (also handles deep-link invites: ?start=friend_CODE / ?start=teacher_CODE)
export async function handleStart(ctx) {
  const existing = getUserByTelegramId(ctx.from.id);
  const payload = ctx.startPayload || '';
  const inviteMatch = payload.match(/^(friend|teacher)_([A-Z0-9]+)$/i);

  if (existing && existing.onboarding_done) {
    const lang = existing.language;
    if (inviteMatch) {
      ctx.user = existing;
      const { applyInvite } = await import('./pairing.js');
      await applyInvite(ctx, inviteMatch[1].toLowerCase(), inviteMatch[2]);
      return;
    }
    return ctx.reply(`${t(lang, 'progress_header')}\n\n${t(lang, 'log_usage')}`);
  }

  // New user — store pending invite so it applies after onboarding
  ctx.session = { ...(ctx.session || {}), step: null, selectedSurahs: [], currentOnboardingPage: 1 };
  if (inviteMatch) {
    ctx.session.pendingInvite = payload;
  }

  // Language selection first
  await ctx.reply(
    '🌙 Welcome / Добро пожаловать / Қош келдіңіз\n\nChoose your language:',
    Markup.inlineKeyboard([
      [
        Markup.button.callback('English', 'lang_en'),
        Markup.button.callback('Русский', 'lang_ru'),
        Markup.button.callback('Қазақша', 'lang_kz'),
      ],
    ])
  );
}

// Step 2: Language chosen → ask name
export async function handleLanguageChoice(ctx) {
  const lang = ctx.callbackQuery.data.split('_')[1];
  await ctx.answerCbQuery();

  // Store pending lang in session via chat data
  ctx.session = ctx.session || {};
  ctx.session.pendingLang = lang;
  ctx.session.step = 'awaiting_name';

  await ctx.editMessageText(t(lang, 'welcome'));
}

// Step 3: Name received → ask timezone
export async function handleNameInput(ctx) {
  const lang = ctx.session?.pendingLang || 'en';
  const name = ctx.message.text.trim();
  if (!name || name.length > 60) return ctx.reply('Please enter a valid name.');

  ctx.session.pendingName = name;
  ctx.session.step = 'awaiting_timezone';

  await ctx.reply(t(lang, 'ask_timezone', { name }));
}

// Step 4: Timezone received → create user → start onboarding
export async function handleTimezoneInput(ctx) {
  const lang = ctx.session?.pendingLang || 'en';
  const city = ctx.message.text.trim();

  // Resolve timezone from city name using a simple map
  const tz = resolveTimezone(city) || 'UTC';

  // A user who abandoned onboarding earlier already has a row — update it
  // instead of inserting a duplicate (telegram_id is UNIQUE).
  let user = getUserByTelegramId(ctx.from.id);
  if (user) {
    updateUser(user.id, {
      display_name: ctx.session.pendingName,
      language: lang,
      timezone: tz,
    });
    user = getUserByTelegramId(ctx.from.id);
  } else {
    user = createUser({
      telegramId: ctx.from.id,
      displayName: ctx.session.pendingName,
      language: lang,
      timezone: tz,
    });
  }

  ctx.user = user;
  ctx.session.step = 'onboarding_surah';

  await ctx.reply(t(lang, 'ask_baseline'));

  // Trigger surah selector
  const { sendSurahSelector } = await import('./onboarding.js');
  await sendSurahSelector(ctx, 1);
}

// Simple city → IANA timezone map for common Muslim-majority cities
function resolveTimezone(city) {
  const map = {
    almaty: 'Asia/Almaty',
    astana: 'Asia/Almaty',
    nur: 'Asia/Almaty',
    shymkent: 'Asia/Almaty',
    tashkent: 'Asia/Tashkent',
    moscow: 'Europe/Moscow',
    москва: 'Europe/Moscow',
    dubai: 'Asia/Dubai',
    riyadh: 'Asia/Riyadh',
    cairo: 'Africa/Cairo',
    istanbul: 'Europe/Istanbul',
    london: 'Europe/London',
    paris: 'Europe/Paris',
    berlin: 'Europe/Berlin',
    jakarta: 'Asia/Jakarta',
    karachi: 'Asia/Karachi',
    lahore: 'Asia/Karachi',
    dhaka: 'Asia/Dhaka',
    kuala: 'Asia/Kuala_Lumpur',
    ankara: 'Europe/Istanbul',
    tehran: 'Asia/Tehran',
    baghdad: 'Asia/Baghdad',
    beirut: 'Asia/Beirut',
    amman: 'Asia/Amman',
    doha: 'Asia/Qatar',
    kuwait: 'Asia/Kuwait',
  };
  return map[city.toLowerCase().split(/\s/)[0]] || null;
}