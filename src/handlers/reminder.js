import { updateUser } from '../services/db.js';
import { localParts, parseTime } from '../utils/time.js';
import { t } from '../utils/i18n.js';

// /reminder            → show status
// /reminder on | off   → enable / disable
// /reminder 20:30      → set time and enable
export async function handleReminder(ctx) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user || !ctx.user.onboarding_done) {
    return ctx.reply(t(lang, 'error_generic'));
  }

  const user = ctx.user;
  const arg = (ctx.message.text.split(/\s+/)[1] || '').toLowerCase();
  const vars = { time: user.reminder_time, tz: user.timezone };

  if (!arg) {
    return ctx.reply(t(lang, user.reminder_enabled ? 'reminder_status_on' : 'reminder_status_off', vars));
  }

  if (arg === 'off') {
    updateUser(user.id, { reminder_enabled: 0 });
    return ctx.reply(t(lang, 'reminder_off'));
  }

  const time = arg === 'on' ? user.reminder_time : parseTime(arg);
  if (!time) return ctx.reply(t(lang, 'reminder_invalid'));

  const fields = { reminder_enabled: 1, reminder_time: time };

  // If that time has already passed today, start tomorrow instead of firing right away
  const now = localParts(user.timezone);
  if (now.time >= time) fields.last_reminded_date = now.date;

  updateUser(user.id, fields);
  return ctx.reply(t(lang, 'reminder_on', { time, tz: user.timezone }));
}
