// src/local.ts
// 로컬 테스트용 Polling 모드

import TelegramBot from 'node-telegram-bot-api';
import { handleCommand, handleCallbackQuery } from './bot';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set in .env');
  process.exit(1);
}

console.log('Starting bot in polling mode (local development)...');

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on('message', async (msg) => {
  try {
    await handleCommand(bot, msg);
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

bot.on('callback_query', async (query) => {
  try {
    await handleCallbackQuery(bot, query);
  } catch (error) {
    console.error('Error handling callback query:', error);
  }
});

console.log('Bot is running. Press Ctrl+C to stop.');
