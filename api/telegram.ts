// api/telegram.ts
// Vercel Serverless Function - Telegram Webhook Handler

import type { VercelRequest, VercelResponse } from '@vercel/node';
import TelegramBot from 'node-telegram-bot-api';
import { handleCommand, handleCallbackQuery } from '../src/bot';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;

    // Bot 인스턴스 생성 (webhook 모드)
    const bot = new TelegramBot(BOT_TOKEN);

    // 메시지 처리
    if (update.message) {
      await handleCommand(bot, update.message);
    }

    // 콜백 쿼리 처리
    if (update.callback_query) {
      await handleCallbackQuery(bot, update.callback_query);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
