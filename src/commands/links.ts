import { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';

const LINKS = [
  { label: 'ActiveSG', url: 'https://activesg.gov.sg/home' },
  { label: 'Play!Pickle', url: 'https://mobileapp.courtreserve.com/Online/Portal/Navigate/13455?nodeItem=9' },
];

export async function handleLink(ctx: Context): Promise<void> {
  const keyboard = new InlineKeyboard();
  for (const link of LINKS) {
    keyboard.url(link.label, link.url).row();
  }
  await ctx.reply('Useful links:', { reply_markup: keyboard });
}
