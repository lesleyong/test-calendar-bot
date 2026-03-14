import { Context } from 'grammy';

export async function handleStart(ctx: Context): Promise<void> {
  console.log(`[start] chat ID: ${ctx.chat?.id}`);
  await ctx.reply(
    `👋 Hi\\! I'm your group event reminder bot\\.\n\n` +
    `*Commands:*\n` +
    `/addevent — Add an event\n` +
    `/listevents — Show upcoming events\n` +
    `/links — Useful booking links\n` +
    `/setreminder — Set reminder for events\n` +
    `/setnudge — Set a nudge to book an event\n`,
    { parse_mode: 'MarkdownV2' }
  );
}
