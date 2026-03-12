import { Context } from 'grammy';
import Database from 'better-sqlite3';
import { updateNudge } from '../db';

const VALID_WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function makeSetNudgeHandler(db: Database.Database) {
  return async (ctx: Context): Promise<void> => {
    const arg = ctx.match?.toString().trim() ?? '';
    const parts = arg.split(/\s+/);

    if (parts.length < 2) {
      await ctx.reply(
        'Usage: /setnudge <weekday> <HH:MM>\nExample: /setnudge friday 18:00'
      );
      return;
    }

    const weekday = parts[0].toLowerCase();
    const time = parts[1];

    if (!VALID_WEEKDAYS.includes(weekday)) {
      await ctx.reply(`Invalid weekday. Use one of: ${VALID_WEEKDAYS.join(', ')}`);
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(time)) {
      await ctx.reply('Invalid time format. Use HH:MM (e.g. 18:00)');
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    if (hours > 23 || minutes > 59) {
      await ctx.reply('Invalid time. Hours must be 0-23, minutes 0-59.');
      return;
    }

    updateNudge(db, weekday, time);
    await ctx.reply(
      `Nudge set: every *${weekday}* at *${time}* if no upcoming events are booked.`,
      { parse_mode: 'Markdown' }
    );
  };
}
