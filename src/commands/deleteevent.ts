import { Context } from 'grammy';
import Database from 'better-sqlite3';
import { getEventById, deleteEvent } from '../db';

export function makeDeleteEventHandler(db: Database.Database) {
  return async (ctx: Context): Promise<void> => {
    const arg = ctx.match?.toString().trim();
    const id = arg ? parseInt(arg, 10) : NaN;

    if (isNaN(id) || id <= 0) {
      await ctx.reply('Usage: /deleteevent <id>\nGet the ID from /listevents');
      return;
    }

    const event = getEventById(db, id);
    if (!event) {
      await ctx.reply(`No event found with ID ${id}.`);
      return;
    }

    deleteEvent(db, id);
    await ctx.reply(`Deleted: *${event.name}* (${event.start_date})`, {
      parse_mode: 'Markdown',
    });
  };
}
