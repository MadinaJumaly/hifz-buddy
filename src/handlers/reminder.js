import { updateUser } from '../services/db.js';
import { localParts, parseTime } from '../utils/time.js';
import { t } from '../utils/i18n.js';

// Turn the reminder on at `time` (HH:MM). If that time already passed today,
// the first reminder comes tomorrow instead of right away.
export function setReminder(user, time) {
  const fields = { reminder_enabled: 1, reminder_time: time };
  const now = localParts(user.timezone);
  if (now.time >= time) fields.last_reminded_date = now.date;
  updateUser(user.id, fields);
}

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

  setReminder(user, time);
  return ctx.reply(t(lang, 'reminder_on', { time, tz: user.timezone }));
}
