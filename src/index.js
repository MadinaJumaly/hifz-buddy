import 'dotenv/config';
import { Telegraf, session } from 'telegraf';

import { userMiddleware } from './middleware/user.js';
import { sessionStore } from './services/db.js';

import {
  handleStart,
  handleLanguageChoice,
  handleNameInput,
  handleTimezoneInput
} from './handlers/start.js';

import {
  handleSurahToggle,
  handlePageNav,
  handleOnboardingDone,
  handlePartial
} from './handlers/onboarding.js';

import { handleLog } from './handlers/log.js';
import { handleProgress } from './handlers/progress.js';

import {
  handleGenerateTeacher,
  handleGenerateFriend,
  handleResetLink,
  handleUnpair,
  handleUnpairConfirm,
  handleUnpairCancel
} from './handlers/pairing.js';

const bot = new Telegraf(process.env.BOT_TOKEN);

// middleware
bot.use(session({ store: sessionStore }));
bot.use(userMiddleware);

// start
bot.start(handleStart);

// menu buttons
bot.command('menu', async (ctx) => {
  await ctx.reply('Menu:', {
  reply_markup: {
    keyboard: [
      ['📖 Log memorization', '📊 Progress'],
      ['🔗 My friend code', '🔗 My teacher code'],
    ],
    resize_keyboard: true,
  },
});
});

// onboarding flow
bot.action(/^lang_/, handleLanguageChoice);
bot.action(/^ob_surah_/, handleSurahToggle);
bot.action(/^ob_page_/, handlePageNav);
bot.action('ob_done', handleOnboardingDone);
bot.action('ob_noop', (ctx) => ctx.answerCbQuery());

// commands
bot.command('log', handleLog);
bot.command('partial', handlePartial);
bot.command('progress', handleProgress);

bot.command('genteacher', handleGenerateTeacher);
bot.command('genfriend', handleGenerateFriend);
bot.command('resetlink', handleResetLink);
bot.command('unpair', handleUnpair);

// unpair confirmation
bot.action('unpair_yes', handleUnpairConfirm);
bot.action('unpair_no', handleUnpairCancel);

// text steps (name, timezone)
bot.on('text', async (ctx) => {
  const text = ctx.message.text;

  if (ctx.session?.step === 'awaiting_name') return handleNameInput(ctx);
  if (ctx.session?.step === 'awaiting_timezone') return handleTimezoneInput(ctx);

  if (text === '📊 Progress') return handleProgress(ctx);
  if (text === '🔗 My friend code') return handleGenerateFriend(ctx);
  if (text === '🔗 My teacher code') return handleGenerateTeacher(ctx);

  if (text === '📖 Log memorization') {
    return ctx.reply('Send:\n\n/log 2 255 257\n\nOr full surah:\n/log 112');
  }

  return ctx.reply('Menu:', {
  reply_markup: {
    keyboard: [
      ['📖 Log memorization', '📊 Progress'],
      ['🔗 My friend code', '🔗 My teacher code'],
    ],
    resize_keyboard: true,
  },
});
});

// catch handler errors so one bad update can't crash the bot
bot.catch(async (err, ctx) => {
  console.error(`Error handling update ${ctx.update?.update_id}:`, err);
  try {
    const { t } = await import('./utils/i18n.js');
    await ctx.reply(t(ctx.user?.language || 'en', 'error_generic'));
  } catch {}
});

// launch
bot.launch()
  .then(() => console.log('Bot started'))
  .catch((err) => console.error('Bot failed:', err.message));

// graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));