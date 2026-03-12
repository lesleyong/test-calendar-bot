import cron from 'node-cron';
import { Bot, Context } from 'grammy';
import Database from 'better-sqlite3';
import { addDays, format, getDay } from 'date-fns';
import {
  getSettings,
  getEventsOnDate,
  hasReminderBeenSent,
  logReminder,
  getUpcomingEvents,
} from './db';

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

async function checkPreEventReminders(bot: Bot<Context>, db: Database.Database, groupChatId: string): Promise<void> {
  try {
    const settings = getSettings(db);
    const targetDate = format(addDays(new Date(), settings.reminder_days), 'yyyy-MM-dd');
    const events = getEventsOnDate(db, targetDate);

    for (const event of events) {
      if (!hasReminderBeenSent(db, event.id, 'pre_event')) {
        const desc = event.description ? `\n${event.description}` : '';
        await bot.api.sendMessage(
          groupChatId,
          `Reminder: *${event.name}* is in *${settings.reminder_days} day(s)* (${event.start_date})!${desc}`,
          { parse_mode: 'Markdown' }
        );
        logReminder(db, event.id, 'pre_event');
        console.log(`[scheduler] Pre-event reminder sent for event ID ${event.id}`);
      }
    }
  } catch (err) {
    console.error('[scheduler] Error in pre-event reminder check:', err);
  }
}

async function checkNudge(bot: Bot<Context>, db: Database.Database, groupChatId: string): Promise<void> {
  try {
    const settings = getSettings(db);
    if (!settings.nudge_enabled || !settings.nudge_weekday || !settings.nudge_time) return;

    const now = new Date();
    const currentWeekday = WEEKDAY_NAMES[getDay(now)];
    const currentTime = format(now, 'HH:mm');

    if (currentWeekday !== settings.nudge_weekday || currentTime !== settings.nudge_time) return;

    const upcoming = getUpcomingEvents(db);
    if (upcoming.length > 0) return;

    if (!hasReminderBeenSent(db, null, 'nudge')) {
      await bot.api.sendMessage(
        groupChatId,
        `Hey! No upcoming events are booked. Time to plan the next one? Use /addevent to get started!`
      );
      logReminder(db, null, 'nudge');
      console.log('[scheduler] Nudge sent — no upcoming events');
    }
  } catch (err) {
    console.error('[scheduler] Error in nudge check:', err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initScheduler(bot: Bot<any>, db: Database.Database, groupChatId: string): cron.ScheduledTask[] {
  const tz = process.env.TZ ?? 'UTC';

  // Pre-event reminder: daily at 09:00
  const reminderJob = cron.schedule('0 9 * * *', () => {
    checkPreEventReminders(bot, db, groupChatId);
  }, { timezone: tz });

  // Nudge check: every minute
  const nudgeJob = cron.schedule('* * * * *', () => {
    checkNudge(bot, db, groupChatId);
  }, { timezone: tz });

  console.log(`[scheduler] Initialized (timezone: ${tz})`);
  return [reminderJob, nudgeJob];
}
