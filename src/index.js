import 'dotenv/config';
import { Telegraf, session } from 'telegraf';

import { userMiddleware } from './middleware/user.js';

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
  handlePair,
  handleUnpair,
  handleUnpairConfirm,
  handleUnpairCancel
} from './handlers/pairing.js';

const bot = new Telegraf(process.env.BOT_TOKEN);

// middleware
bot.use(session());
bot.use(userMiddleware);

// start
bot.start(handleStart);

// menu buttons
bot.command('menu', async (ctx) => {
  await ctx.reply('Menu:', {
  reply_markup: {
    keyboard: [
      ['📖 Log memorization', '📊 Progress'],
      ['👥 Add friend', '🎓 Add teacher'],
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
bot.command('pair', handlePair);
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

  if (text === '👥 Add friend') {
    return ctx.reply('Send your friend’s code:\n\nExample:\n/pair ABC123');
  }

  if (text === '🎓 Add teacher') {
    return ctx.reply('Send your teacher’s code:\n\n/pair ABC123');
  }

  if (text === '📖 Log memorization') {
    return ctx.reply('Send:\n\n/log 2 255 257\n\nOr full surah:\n/log 112');
  }

  return ctx.reply('Menu:', {
  reply_markup: {
    keyboard: [
      ['📖 Log memorization', '📊 Progress'],
      ['👥 Add friend', '🎓 Add teacher'],
      ['🔗 My friend code', '🔗 My teacher code'],
    ],
    resize_keyboard: true,
  },
});
});

// launch
bot.launch()
  .then(() => console.log('Bot started'))
  .catch((err) => console.error('Bot failed:', err.message));

// graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));