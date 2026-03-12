import { Context, NextFunction } from 'grammy';

export async function requireAdmin(ctx: Context, next: NextFunction): Promise<void> {
  if (!ctx.from) {
    await ctx.reply('Could not determine your identity.');
    return;
  }
  const member = await ctx.getChatMember(ctx.from.id);
  if (member.status === 'administrator' || member.status === 'creator') {
    await next();
  } else {
    await ctx.reply('This command is for group admins only.');
  }
}
