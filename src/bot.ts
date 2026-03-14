import 'dotenv/config';
import { Bot } from 'grammy';
import { Context } from 'grammy';
import { initDb } from './db';
import { initScheduler } from './scheduler';
import { handleStart } from './commands/start';
import { makeSettingsHandler } from './commands/settings';
import { makeListEventsHandler } from './commands/listevents';
import { makeDeleteEventHandler } from './commands/deleteevent';
import { makeAddEventHandler } from './commands/addevent';
import { makeSetReminderHandler } from './commands/setreminder';
import { makeSetNudgeHandler } from './commands/setnudge';
import { requireAdmin } from './middleware/adminGuard';
import { handleLink } from './commands/links';

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;
const DB_PATH = process.env.DB_PATH ?? './data/bot.db';

if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required in .env');
if (!GROUP_CHAT_ID) console.warn('[bot] GROUP_CHAT_ID not set — scheduler reminders will not work. Check stdout for chat ID after sending /start.');

const db = initDb(DB_PATH);
const bot = new Bot<Context>(BOT_TOKEN);

// Commands
bot.command('start', handleStart);
bot.command('settings', makeSettingsHandler(db));
bot.command('listevents', makeListEventsHandler(db));
bot.command('deleteevent', makeDeleteEventHandler(db));
bot.command('addevent', makeAddEventHandler(db));

bot.command('links', handleLink);

// Admin-only commands
bot.command('setreminder', requireAdmin, makeSetReminderHandler(db));
bot.command('setnudge', requireAdmin, makeSetNudgeHandler(db));

// Error handler
bot.catch((err) => {
  console.error('[bot] Unhandled error:', err.message, err.error);
});

// Start scheduler if GROUP_CHAT_ID is configured
let scheduledTasks: import('node-cron').ScheduledTask[] = [];
if (GROUP_CHAT_ID) {
  scheduledTasks = initScheduler(bot, db, GROUP_CHAT_ID);
}

// Graceful shutdown
function shutdown() {
  console.log('[bot] Shutting down...');
  bot.stop();
  for (const task of scheduledTasks) task.stop();
  db.close();
  process.exit(0);
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

bot.start({
  onStart: () => console.log('[bot] Bot started successfully'),
});

bot.api.setMyCommands([
  { command: 'listevents', description: 'Show upcoming events' },
  { command: 'links',      description: 'Show useful booking links' },
]);
