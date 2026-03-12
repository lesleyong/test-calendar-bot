import { Context } from 'grammy';
import Database from 'better-sqlite3';
import { getUpcomingEvents } from '../db';

export function makeListEventsHandler(db: Database.Database) {
  return async (ctx: Context): Promise<void> => {
    const events = getUpcomingEvents(db);
    if (events.length === 0) {
      await ctx.reply('No upcoming events. Use /addevent to add one!');
      return;
    }
    const lines = events.map((e) => {
      const start = e.start_time ? `${e.start_date} ${e.start_time}` : e.start_date;
      const end = e.end_date ? (e.end_time ? `${e.end_date} ${e.end_time}` : e.end_date) : null;
      const when = end ? `${start} → ${end}` : start;
      const desc = e.description ? `\n${e.description}` : '';
      return `[${e.id}] *${e.name}*\n🗓 ${when}${desc}`;
    });
    await ctx.reply(`📅 *Upcoming Events*\n\n${lines.join('\n\n')}`, {
      parse_mode: 'Markdown',
    });
  };
}
