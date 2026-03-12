import { Context } from 'grammy';

export async function handleStart(ctx: Context): Promise<void> {
  console.log(`[start] chat ID: ${ctx.chat?.id}`);
  await ctx.reply(
    `👋 Hi\\! I'm your group event reminder bot\\.\n\n` +
    `*Commands:*\n` +
    `/addevent \\<name\\> \\<YYYY\\-MM\\-DD\\> \\[description\\] — Add an event\n` +
    `/addevent — Add an event step by step\n` +
    `/listevents — Show upcoming events\n` +
    `/deleteevent \\<id\\> — Delete an event\n` +
    `/settings — Show current settings\n\n` +
    `*Admin only:*\n` +
    `/setreminder \\<days\\> — Set reminder offset \\(default: 3 days\\)\n` +
    `/setnudge \\<weekday\\> \\<HH:MM\\> — Set weekly nudge schedule`,
    { parse_mode: 'MarkdownV2' }
  );
}
