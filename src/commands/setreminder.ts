import { Context } from 'grammy';
import Database from 'better-sqlite3';
import { updateReminderDays } from '../db';

export function makeSetReminderHandler(db: Database.Database) {
  return async (ctx: Context): Promise<void> => {
    const arg = ctx.match?.toString().trim();
    const days = arg ? parseInt(arg, 10) : NaN;

    if (isNaN(days) || days < 0 || days > 365) {
      await ctx.reply('Usage: /setreminder <days>\nExample: /setreminder 3 (sends reminder 3 days before event)');
      return;
    }

    updateReminderDays(db, days);
    await ctx.reply(`Reminder set to *${days} day(s)* before each event.`, {
      parse_mode: 'Markdown',
    });
  };
}
