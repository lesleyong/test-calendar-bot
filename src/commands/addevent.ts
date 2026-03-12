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

function parseKV(arg: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /([\w-]+)=(.+?)(?=\s+[\w-]+=|$)/g;
  let m;
  while ((m = regex.exec(arg)) !== null) {
    result[m[1]] = m[2].trim();
  }
  return result;
}

function formatEvent(e: { name: string; start_date: string; start_time: string | null; end_date: string | null; end_time: string | null; description: string | null }): string {
  const start = e.start_time ? `${e.start_date} ${e.start_time}` : e.start_date;
  const end = e.end_date ? (e.end_time ? `${e.end_date} ${e.end_time}` : e.end_date) : null;
  const dateLine = end ? `${start} → ${end}` : start;
  return `*${e.name}*\nDate: ${dateLine}${e.description ? `\nDescription: ${e.description}` : ''}`;
}

const USAGE = `Usage:
\`/addevent name=... date=... [time=...] [end-date=...] [end-time=...] [desc=...]\`

Example:
\`/addevent name=Team Lunch date=2026-03-20 time=08:00 end-date=2026-03-20 end-time=13:00 desc=At the usual place\`

• \`date\` / \`end-date\`: YYYY-MM-DD (e.g. 2026-03-20)
• \`time\` / \`end-time\`: HH:MM 24h (e.g. 14:30)`;

export function makeAddEventHandler(db: Database.Database) {
  return async (ctx: Context): Promise<void> => {
    const arg = ctx.match?.toString().trim() ?? '';

    if (arg.length === 0) {
      await ctx.reply(USAGE, { parse_mode: 'Markdown' });
      return;
    }

    const kv = parseKV(arg);
    const name = kv['name'];
    const startDate = kv['date'];
    const startTime = kv['time'] ?? null;
    const endDate = kv['end-date'] ?? null;
    const endTime = kv['end-time'] ?? null;
    const description = kv['desc'] ?? null;

    if (!name || !startDate) {
      await ctx.reply(`Missing required fields: \`name\` and \`date\`.\n\n${USAGE}`, { parse_mode: 'Markdown' });
      return;
    }

    if (!isValidFutureDate(startDate)) {
      await ctx.reply('Invalid `date`. Use YYYY-MM-DD and ensure it is today or in the future.', { parse_mode: 'Markdown' });
      return;
    }
    if (startTime && !isValidTime(startTime)) {
      await ctx.reply('Invalid `time`. Use HH:MM format (e.g. 14:30).', { parse_mode: 'Markdown' });
      return;
    }
    if (endDate) {
      if (!isValidDate(endDate) || isBefore(parseISO(endDate), parseISO(startDate))) {
        await ctx.reply('Invalid `end-date`. Use YYYY-MM-DD and ensure it is on or after the start date.', { parse_mode: 'Markdown' });
        return;
      }
    }
    if (endTime && !isValidTime(endTime)) {
      await ctx.reply('Invalid `end-time`. Use HH:MM format (e.g. 18:00).', { parse_mode: 'Markdown' });
      return;
    }

    const userId = ctx.from!.id;
    const event = insertEvent(db, name, startDate, startTime, endDate, endTime, description, userId);
    await ctx.reply(`Event added!\n\n${formatEvent(event)}`, { parse_mode: 'Markdown' });
  };
}
