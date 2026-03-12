import { Context } from 'grammy';
import Database from 'better-sqlite3';
import { insertEvent } from '../db';
import { isValid, parseISO, isAfter, startOfDay, format, isBefore } from 'date-fns';

function isValidFutureDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = parseISO(dateStr);
  if (!isValid(date)) return false;
  const today = startOfDay(new Date());
  return isAfter(date, today) || format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
}

function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  return isValid(parseISO(dateStr));
}

function isValidTime(timeStr: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [h, m] = timeStr.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function formatEvent(e: { name: string; start_date: string; start_time: string | null; end_date: string | null; end_time: string | null; description: string | null }): string {
  const start = e.start_time ? `${e.start_date} ${e.start_time}` : e.start_date;
  const end = e.end_date ? (e.end_time ? `${e.end_date} ${e.end_time}` : e.end_date) : null;
  const dateLine = end ? `${start} → ${end}` : start;
  return `*${e.name}*\nDate: ${dateLine}${e.description ? `\nDescription: ${e.description}` : ''}`;
}

export function makeAddEventHandler(db: Database.Database) {
  return async (ctx: Context): Promise<void> => {
    const arg = ctx.match?.toString().trim() ?? '';

    if (arg.length === 0) {
      await ctx.reply(
        'Usage: /addevent <name> <start-date> [start-time] [end-date] [end-time] [description]\n\nDate format: YYYY-MM-DD (e.g. 2026-03-15)\nTime format: HH:MM 24h (e.g. 14:30)'
      );
      return;
    }

    // /addevent <name> <YYYY-MM-DD> [HH:MM] [end-YYYY-MM-DD] [end-HH:MM] [description]
    const match = arg.match(
      /^(.+?)\s+(\d{4}-\d{2}-\d{2})(\s+\d{2}:\d{2})?(\s+\d{4}-\d{2}-\d{2})?(\s+\d{2}:\d{2})?(?:\s+(.+))?$/
    );
    if (!match) {
      await ctx.reply(
        'Usage: /addevent <name> <start-date> [start-time] [end-date] [end-time] [description]\n\nDate format: YYYY-MM-DD (e.g. 2026-03-15)\nTime format: HH:MM 24h (e.g. 14:30)'
      );
      return;
    }

    const [, name, startDate, startTimeRaw, endDateRaw, endTimeRaw, descriptionRaw] = match;
    const startTime = startTimeRaw?.trim() || null;
    const endDate = endDateRaw?.trim() || null;
    const endTime = endTimeRaw?.trim() || null;
    const description = descriptionRaw?.trim() || null;

    if (!isValidFutureDate(startDate)) {
      await ctx.reply('Invalid start date. Use YYYY-MM-DD format and ensure the date is today or in the future.');
      return;
    }
    if (startTime && !isValidTime(startTime)) {
      await ctx.reply('Invalid start time. Use HH:MM format (e.g. 14:30).');
      return;
    }
    if (endDate) {
      if (!isValidDate(endDate) || isBefore(parseISO(endDate), parseISO(startDate))) {
        await ctx.reply('Invalid end date. Use YYYY-MM-DD format and ensure it is on or after the start date.');
        return;
      }
    }
    if (endTime && !isValidTime(endTime)) {
      await ctx.reply('Invalid end time. Use HH:MM format (e.g. 18:00).');
      return;
    }

    const userId = ctx.from!.id;
    const event = insertEvent(db, name.trim(), startDate, startTime, endDate, endTime, description, userId);
    await ctx.reply(`Event added!\n\n${formatEvent(event)}`, { parse_mode: 'Markdown' });
  };
}
