import 'dotenv/config';
import { Telegraf, session } from 'telegraf';

import { userMiddleware } from './middleware/user.js';
import { sessionStore } from './services/db.js';
import { startReminderScheduler } from './services/reminders.js';
import { mainMenu, matchMenuButton } from './utils/menu.js';
import { t } from './utils/i18n.js';

import {
  handleStart,
  handleLanguageChoice,
  handleCityChoice,
  handleCityInput,
  handleNameOk,
  handleNameEdit,
  handleNameInput,
} from './handlers/start.js';

import {
  handleSurahToggle,
  handlePageNav,
  handleOnboardingDone,
  handlePartial,
} from './handlers/onboarding.js';

import { handleLog, handleLogPrompt, logFromText, LOG_TEXT_RE } from './handlers/log.js';
import { handleProgress, handleHeart } from './handlers/progress.js';
import { handleInlineQuery } from './handlers/share.js';
import { handleReminder } from './handlers/reminder.js';
import {
  handleSettings, handleSettingsAction, handleSettingsCityInput, handleSettingsNameInput,
} from './handlers/settings.js';
import {
  handleMemorized, handleMemorizedAction, handleRemoveText, REMOVE_TEXT_RE,
} from './handlers/memorized.js';

import {
  handleGenerateTeacher,
  handleGenerateFriend,
  handleResetLink,
  handleUnpair,
  handleUnpairConfirm,
  handleUnpairCancel,
} from './handlers/pairing.js';

const bot = new Telegraf(process.env.BOT_TOKEN);

// middleware
bot.use(session({ store: sessionStore }));
bot.use(userMiddleware);

// setup
bot.start(handleStart);
bot.action(/^lang_/, handleLanguageChoice);
bot.action('name_ok', handleNameOk);
bot.action('name_edit', handleNameEdit);
bot.action(/^city_/, handleCityChoice);
bot.action(/^ob_surah_/, handleSurahToggle);
bot.action(/^ob_page_/, handlePageNav);
bot.action('ob_done', handleOnboardingDone);
bot.action('ob_noop', (ctx) => ctx.answerCbQuery());

// commands
bot.command('menu', (ctx) => ctx.reply(t(ctx.user?.language, 'menu_ready'), mainMenu(ctx.user?.language)));
bot.command('log', handleLog);
bot.command('partial', handlePartial);
bot.command('progress', handleProgress);
bot.command('settings', handleSettings);
bot.command('reminder', handleReminder);
bot.command('genteacher', handleGenerateTeacher);
bot.command('genfriend', handleGenerateFriend);
bot.command('resetlink', handleResetLink);
bot.command('unpair', handleUnpair);

// inline mode: share the progress card into any chat or channel
bot.on('inline_query', handleInlineQuery);

// inline buttons
bot.action('log_more', handleLogPrompt);
bot.action('heart', handleHeart);
bot.action(/^mem_/, handleMemorizedAction);
bot.command('memorized', (ctx) => handleMemorized(ctx, 1));
bot.command('heart', handleHeart);
bot.action(/^set_/, handleSettingsAction);
bot.action('unpair_yes', handleUnpairConfirm);
bot.action('unpair_no', handleUnpairCancel);

// plain text: typed answers, menu buttons, or a log like "2 255 257"
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const step = ctx.session?.step;

  const button = matchMenuButton(text);
  if (button && ['settings_city', 'settings_name'].includes(ctx.session?.step)) ctx.session.step = null;

  switch (button) {
    case 'log': return handleLogPrompt(ctx);
    case 'progress': return handleProgress(ctx);
    case 'settings': return handleSettings(ctx);
    case 'friend': return handleGenerateFriend(ctx);
    case 'teacher': return handleGenerateTeacher(ctx);
  }

  if (step === 'awaiting_name') return handleNameInput(ctx);
  if (step === 'awaiting_city') return handleCityInput(ctx);
  if (step === 'settings_name' && ctx.user) return handleSettingsNameInput(ctx);
  if (step === 'settings_city' && ctx.user) return handleSettingsCityInput(ctx);

  if (!ctx.user || !ctx.user.onboarding_done) {
    return ctx.reply(t(ctx.user?.language || 'en', 'setup_first'));
  }

  if (LOG_TEXT_RE.test(text)) return logFromText(ctx, text);
  if (REMOVE_TEXT_RE.test(text)) return handleRemoveText(ctx, text);

  // Anything else: show the menu with a hint
  return ctx.reply(t(ctx.user.language, 'menu_hint'), mainMenu(ctx.user.language));
});

// catch handler errors so one bad update can't crash the bot
bot.catch(async (err, ctx) => {
  console.error(`Error handling update ${ctx.update?.update_id}:`, err);
  try {
    await ctx.reply(t(ctx.user?.language || 'en', 'error_generic'));
  } catch {}
});

// Commands shown in Telegram's "Menu" button, per language
async function setCommands() {
  const make = (lang) => ['progress', 'settings', 'start'].map(command => ({
    command,
    description: t(lang, `cmd_${command}`),
  }));
  await bot.telegram.setMyCommands(make('en'));
  await bot.telegram.setMyCommands(make('ru'), { language_code: 'ru' });
  await bot.telegram.setMyCommands(make('kz'), { language_code: 'kk' });
}

// launch
const stopReminders = startReminderScheduler(bot.telegram);

bot.launch(() => {
  console.log('Bot started');
  setCommands().catch((err) => console.error('setMyCommands failed:', err.message));
}).catch((err) => console.error('Bot failed:', err.message));

// graceful stop
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    stopReminders();
    bot.stop(signal);
  });
}
