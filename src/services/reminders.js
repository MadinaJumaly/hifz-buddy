import cron from 'node-cron';
import {
  getReminderUsers, getStreak, updateUser, getTeacherPairsForInactivityCheck,
} from './db.js';
import { localParts, previousDate, daysBetween } from '../utils/time.js';
import { t } from '../utils/i18n.js';

const INACTIVE_DAYS = 3;          // alert the teacher after this many days without a log
const ALERT_HOURS = [9, 21];      // only alert teachers between 09:00 and 21:59 their time

// Telegram error 403 = the user blocked the bot; stop messaging them
function isBlocked(err) {
  return err?.response?.error_code === 403;
}

// Daily reminder for students who turned it on and haven't logged today
export async function sendDueReminders(telegram, now = new Date()) {
  for (const user of getReminderUsers()) {
    const { date, time } = localParts(user.timezone, now);
    if (time < user.reminder_time) continue;
    if (user.last_reminded_date === date) continue;

    // Mark first so a send failure can't cause a retry every minute
    updateUser(user.id, { last_reminded_date: date });

    const streak = getStreak(user.id);
    if (streak?.last_log_date === date) continue; // already logged today

    const lang = user.language || 'en';
    let text = t(lang, 'reminder_message', { name: user.display_name });
    if (streak?.current_streak > 0 && streak.last_log_date === previousDate(date)) {
      text += '\n\n' + t(lang, 'reminder_streak', { n: streak.current_streak });
    }

    try {
      await telegram.sendMessage(user.telegram_id, text);
    } catch (err) {
      if (isBlocked(err)) updateUser(user.id, { reminder_enabled: 0 });
      else console.error(`Reminder to user ${user.id} failed:`, err.message);
    }
  }
}

// Tell a teacher once when their student has gone quiet for INACTIVE_DAYS.
// `teacher_alerted_for` remembers which last-active date we alerted about,
// so the next alert only happens after the student logs and goes quiet again.
export async function sendInactivityAlerts(telegram, now = new Date()) {
  for (const row of getTeacherPairsForInactivityCheck()) {
    const { date, hour } = localParts(row.teacher_timezone, now);
    if (hour < ALERT_HOURS[0] || hour > ALERT_HOURS[1]) continue;

    const days = daysBetween(row.last_active, date);
    if (days < INACTIVE_DAYS) continue;
    if (row.teacher_alerted_for === row.last_active) continue;

    updateUser(row.student_id, { teacher_alerted_for: row.last_active });

    try {
      await telegram.sendMessage(
        row.teacher_telegram_id,
        t(row.teacher_language || 'en', 'teacher_inactive_alert', {
          student: row.student_name,
          days,
        }),
      );
    } catch (err) {
      if (!isBlocked(err)) console.error(`Inactivity alert for student ${row.student_id} failed:`, err.message);
    }
  }
}

export function startReminderScheduler(telegram) {
  const run = (name, fn) => async () => {
    try {
      await fn(telegram);
    } catch (err) {
      console.error(`${name} job failed:`, err);
    }
  };

  const tasks = [
    cron.schedule('* * * * *', run('Reminder', sendDueReminders), { noOverlap: true }),
    cron.schedule('0 * * * *', run('Inactivity alert', sendInactivityAlerts), { noOverlap: true }),
  ];

  return () => tasks.forEach(task => task.stop());
}
