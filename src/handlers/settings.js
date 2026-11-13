import { Markup } from 'telegraf';
import { getUserByTelegramId, updateUser } from '../services/db.js';
import { getCityButton, resolveTimezone } from '../data/cities.js';
import { LANGUAGE_NAMES, mainMenu } from '../utils/menu.js';
import { t } from '../utils/i18n.js';
import { languageKeyboard, cityKeyboard } from './start.js';
import { setReminder } from './reminder.js';
import { handleGenerateFriend, handleGenerateTeacher } from './pairing.js';

// One settings message that is edited in place. Each row shows the current value.

const REMINDER_TIMES = ['06:00', '07:00', '08:00', '12:00', '18:00', '20:00', '21:00', '22:00'];

function cityLabel(user) {
  return user.city || user.timezone.split('/').pop().replace(/_/g, ' ');
}

function settingsView(user) {
  const lang = user.language;
  const reminder = user.reminder_enabled
    ? t(lang, 'settings_reminder_on', { time: user.reminder_time })
    : t(lang, 'settings_reminder_off');

  return {
    text: t(lang, 'settings_title'),
    keyboard: Markup.inlineKeyboard([
      [Markup.button.callback(t(lang, 'settings_city', { city: cityLabel(user) }), 'set_city')],
      [Markup.button.callback(t(lang, 'settings_lang', { lang: LANGUAGE_NAMES[lang] }), 'set_lang')],
      [Markup.button.callback(reminder, 'set_rem')],
      [
        Markup.button.callback(t(lang, 'settings_invite_friend'), 'set_friend'),
        Markup.button.callback(t(lang, 'settings_teacher_link'), 'set_teacher'),
      ],
    ]),
  };
}

function backRow(lang) {
  return [Markup.button.callback(`← ${t(lang, 'back')}`, 'set_back')];
}

async function show(ctx, text, keyboard) {
  if (ctx.callbackQuery) return ctx.editMessageText(text, keyboard);
  return ctx.reply(text, keyboard);
}

function reload(ctx) {
  ctx.user = getUserByTelegramId(ctx.from.id);
  return ctx.user;
}

export async function handleSettings(ctx) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user || !ctx.user.onboarding_done) return ctx.reply(t(lang, 'setup_first'));
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  if (ctx.session) ctx.session.step = null;

  const { text, keyboard } = settingsView(ctx.user);
  await show(ctx, text, keyboard);
}

// All settings buttons: set_<action>[_<value>]
export async function handleSettingsAction(ctx) {
  const user = ctx.user;
  if (!user) return ctx.answerCbQuery();
  const lang = user.language;
  const [, action, value] = ctx.callbackQuery.data.match(/^set_([a-z]+)(?:_(.+))?$/) || [];

  switch (action) {
    case 'back':
      return handleSettings(ctx);

    case 'city':
      await ctx.answerCbQuery();
      return show(ctx, t(lang, 'settings_choose_city'), cityKeyboard(lang, 'set_cityset_', [backRow(lang)]));

    case 'cityset': {
      if (value === 'other') {
        await ctx.answerCbQuery();
        ctx.session.step = 'settings_city';
        return show(ctx, t(lang, 'city_type_prompt'), Markup.inlineKeyboard([backRow(lang)]));
      }
      const city = getCityButton(value);
      if (city) updateUser(user.id, { city: city[lang] || city.en, timezone: city.tz });
      reload(ctx);
      return handleSettings(ctx);
    }

    case 'lang':
      await ctx.answerCbQuery();
      return show(ctx, t(lang, 'settings_language'), {
        reply_markup: {
          inline_keyboard: [...languageKeyboard('set_langset_').reply_markup.inline_keyboard, backRow(lang)],
        },
      });

    case 'langset': {
      if (!LANGUAGE_NAMES[value]) return ctx.answerCbQuery();
      updateUser(user.id, { language: value });
      reload(ctx);
      await handleSettings(ctx);
      // Refresh the bottom menu so its buttons switch language too
      return ctx.reply(t(value, 'settings_done'), mainMenu(value));
    }

    case 'rem': {
      await ctx.answerCbQuery();
      const timeButtons = REMINDER_TIMES.map(time =>
        Markup.button.callback(
          user.reminder_enabled && user.reminder_time === time ? `✓ ${time}` : time,
          `set_remset_${time}`,
        ));
      const rows = [];
      for (let i = 0; i < timeButtons.length; i += 4) rows.push(timeButtons.slice(i, i + 4));
      rows.push([Markup.button.callback(t(lang, 'reminder_off_btn'), 'set_remset_off')]);
      rows.push(backRow(lang));
      return show(ctx, t(lang, 'settings_choose_reminder'), Markup.inlineKeyboard(rows));
    }

    case 'remset':
      if (value === 'off') updateUser(user.id, { reminder_enabled: 0 });
      else if (REMINDER_TIMES.includes(value)) setReminder(user, value);
      reload(ctx);
      return handleSettings(ctx);

    case 'friend':
      await ctx.answerCbQuery();
      return handleGenerateFriend(ctx);

    case 'teacher':
      await ctx.answerCbQuery();
      return handleGenerateTeacher(ctx);

    default:
      return ctx.answerCbQuery();
  }
}

// City typed after tapping "Other" in settings
export async function handleSettingsCityInput(ctx) {
  const lang = ctx.user.language;
  const cityName = ctx.message.text.trim().slice(0, 60);
  const tz = resolveTimezone(cityName);
  ctx.session.step = null;

  if (!tz) {
    await ctx.reply(t(lang, 'city_not_found'));
    return handleSettings(ctx);
  }
  updateUser(ctx.user.id, { city: cityName, timezone: tz });
  reload(ctx);
  return handleSettings(ctx);
}
