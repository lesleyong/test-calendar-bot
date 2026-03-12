import { Context } from 'grammy';
import Database from 'better-sqlite3';
import { getSettings } from '../db';

export function makeSettingsHandler(db: Database.Database) {
  return async (ctx: Context): Promise<void> => {
    const s = getSettings(db);
    const nudge = s.nudge_enabled
      ? `Every ${s.nudge_weekday} at ${s.nudge_time}`
      : 'Not configured (use /setnudge to set)';
    await ctx.reply(
      `⚙️ *Current Settings*\n\n` +
      `Reminder offset: *${s.reminder_days} day(s)* before event\n` +
      `Booking nudge: ${nudge}`,
      { parse_mode: 'Markdown' }
    );
  };
}
