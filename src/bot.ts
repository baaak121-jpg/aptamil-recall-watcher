// src/bot.ts

import TelegramBot, { Message } from 'node-telegram-bot-api';
import { ConversationState, ProductModel, RegisteredItem } from './types';
import { PRODUCT_MODELS, getModelByKey, SOURCES } from './sources';
import {
  setGroupChatId,
  getGroupChatId,
  addItem,
  getItems,
  removeItem,
  getSources,
} from './store';
import { parseUserDate } from './parser';
import { v4 as uuidv4 } from 'uuid';

// 간단한 메모리 기반 conversation state (서버리스 환경에서는 제한적이지만 v1은 이것으로 충분)
const conversationStates = new Map<number, ConversationState>();

/**
 * 봇 명령어 핸들러
 */
export async function handleCommand(bot: TelegramBot, msg: Message): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  try {
    if (text.startsWith('/setup')) {
      await handleSetup(bot, chatId);
    } else if (text.startsWith('/add')) {
      await handleAddStart(bot, chatId);
    } else if (text.startsWith('/list')) {
      await handleList(bot, chatId);
    } else if (text.startsWith('/remove')) {
      await handleRemove(bot, chatId, text);
    } else if (text.startsWith('/sources')) {
      await handleSources(bot, chatId);
    } else if (text.startsWith('/report')) {
      await handleReport(bot, chatId);
    } else if (text.startsWith('/help')) {
      await handleHelp(bot, chatId);
    } else {
      // 일반 메시지 (conversation state 확인)
      await handleConversation(bot, msg);
    }
  } catch (error) {
    console.error('[Bot] Error handling command:', error);
    await bot.sendMessage(chatId, `오류가 발생했습니다: ${error}`);
  }
}

async function handleSetup(bot: TelegramBot, chatId: number): Promise<void> {
  console.log(`[Bot] Setup: Saving chat ID: ${chatId}`);
  await setGroupChatId(chatId);
  await bot.sendMessage(
    chatId,
    `✅ 이 그룹이 데일리 리포트 수신 그룹으로 설정되었습니다.\n매일 07:00 KST에 리포트가 전송됩니다.\n\n(Chat ID: ${chatId})`
  );
}

async function handleAddStart(bot: TelegramBot, chatId: number): Promise<void> {
  // 모델 선택 키보드 생성
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
  for (let i = 0; i < PRODUCT_MODELS.length; i += 2) {
    const row: TelegramBot.InlineKeyboardButton[] = [
      {
        text: PRODUCT_MODELS[i].label,
        callback_data: `model:${PRODUCT_MODELS[i].key}`,
      },
    ];
    if (i + 1 < PRODUCT_MODELS.length) {
      row.push({
        text: PRODUCT_MODELS[i + 1].label,
        callback_data: `model:${PRODUCT_MODELS[i + 1].key}`,
      });
    }
    keyboard.push(row);
  }

  await bot.sendMessage(chatId, '등록할 Aptamil 제품 모델을 선택하세요:', {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });

  conversationStates.set(chatId, {
    chat_id: chatId,
    step: 'awaiting_model',
  });
}

export async function handleCallbackQuery(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
): Promise<void> {
  const chatId = query.message?.chat.id;
  const data = query.data;

  if (!chatId || !data) return;

  try {
    if (data.startsWith('model:')) {
      const modelKey = data.substring(6);
      const model = getModelByKey(modelKey);

      if (!model) {
        await bot.answerCallbackQuery(query.id, { text: '모델을 찾을 수 없습니다.' });
        return;
      }

      conversationStates.set(chatId, {
        chat_id: chatId,
        step: 'awaiting_mhd',
        selected_model: model,
      });

      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(
        chatId,
        `선택한 모델: ${model.label}\n\nMHD(유통기한)를 입력하세요.\n형식: DD-MM-YYYY (예: 15-06-2026)`
      );
    }
  } catch (error) {
    console.error('[Bot] Error handling callback query:', error);
    await bot.answerCallbackQuery(query.id, { text: '오류가 발생했습니다.' });
  }
}

async function handleConversation(bot: TelegramBot, msg: Message): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  const state = conversationStates.get(chatId);
  if (!state) return;

  if (state.step === 'awaiting_mhd' && state.selected_model) {
    const mhd = parseUserDate(text);

    if (!mhd) {
      await bot.sendMessage(
        chatId,
        '❌ 잘못된 날짜 형식입니다.\nDD-MM-YYYY 형식으로 입력하세요. (예: 15-06-2026)'
      );
      return;
    }

    const item: RegisteredItem = {
      id: uuidv4(),
      model_key: state.selected_model.key,
      model_label: state.selected_model.label,
      mhd,
      created_at: new Date().toISOString(),
    };

    try {
      await addItem(item);
      await bot.sendMessage(
        chatId,
        `✅ 등록 완료!\n\n모델: ${item.model_label}\nMHD: ${item.mhd}`
      );
      conversationStates.delete(chatId);
    } catch (error) {
      await bot.sendMessage(chatId, `❌ 등록 실패: ${error}`);
    }
  }
}

async function handleList(bot: TelegramBot, chatId: number): Promise<void> {
  const items = await getItems();

  if (items.length === 0) {
    await bot.sendMessage(chatId, '등록된 제품이 없습니다.\n/add 명령어로 제품을 추가하세요.');
    return;
  }

  let message = '📋 *등록된 제품 목록*:\n\n';
  items.forEach((item, index) => {
    message += `${index + 1}. ${item.model_label}\n   MHD: ${item.mhd}\n   ID: \`${item.id}\`\n\n`;
  });

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

async function handleRemove(bot: TelegramBot, chatId: number, text: string): Promise<void> {
  const parts = text.split(' ');
  if (parts.length < 2) {
    await bot.sendMessage(chatId, '사용법: /remove <번호 또는 ID>\n\n/list로 목록을 확인하세요.');
    return;
  }

  const input = parts[1];
  const items = await getItems();

  // 번호로 삭제
  const index = parseInt(input, 10) - 1;
  if (!isNaN(index) && index >= 0 && index < items.length) {
    const item = items[index];
    await removeItem(item.id);
    await bot.sendMessage(chatId, `✅ 삭제 완료: ${item.model_label} (MHD: ${item.mhd})`);
    return;
  }

  // ID로 삭제
  const removed = await removeItem(input);
  if (removed) {
    await bot.sendMessage(chatId, '✅ 삭제 완료');
  } else {
    await bot.sendMessage(chatId, '❌ 해당 항목을 찾을 수 없습니다.');
  }
}

async function handleSources(bot: TelegramBot, chatId: number): Promise<void> {
  const sources = await getSources();

  let message = '🔗 모니터링 소스:\n\n';

  if (sources.length === 0) {
    // 초기 소스 표시
    SOURCES.forEach((source) => {
      const flag = getCountryFlag(source.country_code);
      message += `${flag} ${source.source_key}\n`;
      message += `${source.url}\n\n`;
    });
  } else {
    sources.forEach((source) => {
      const flag = getCountryFlag(source.country_code);
      const lastChecked = source.last_checked_at
        ? new Date(source.last_checked_at).toLocaleString('ko-KR')
        : '미확인';
      message += `${flag} ${source.source_key}\n`;
      message += `${source.url}\n`;
      message += `마지막 확인: ${lastChecked}\n\n`;
    });
  }

  await bot.sendMessage(chatId, message);
}

function getCountryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    DE: '🇩🇪',
    UK: '🇬🇧',
    IE: '🇮🇪',
    KR: '🇰🇷',
  };
  return flags[countryCode] || '🌐';
}

async function handleReport(bot: TelegramBot, chatId: number): Promise<void> {
  await bot.sendMessage(chatId, '📊 수동 리포트를 생성 중입니다...');
  
  try {
    // 크론 엔드포인트 호출
    const response = await fetch('https://aptamil-recall-watcher.vercel.app/api/cron', {
      method: 'POST',
    });
    
    if (response.ok) {
      await bot.sendMessage(chatId, '✅ 리포트가 전송되었습니다!');
    } else {
      await bot.sendMessage(chatId, '❌ 리포트 생성 실패. 잠시 후 다시 시도해주세요.');
    }
  } catch (error) {
    console.error('[Bot] Error triggering report:', error);
    await bot.sendMessage(chatId, '❌ 오류가 발생했습니다.');
  }
}

async function handleHelp(bot: TelegramBot, chatId: number): Promise<void> {
  const helpText = `
🍼 *Aptamil Recall Watcher*

*사용 가능한 명령어*:

/setup - 이 그룹을 데일리 리포트 수신 그룹으로 설정
/add - 제품 추가 (모델 + MHD)
/list - 등록된 제품 목록 보기
/remove <번호|ID> - 제품 삭제
/sources - 모니터링 소스 확인
/report - 즉시 리포트 생성 (수동)
/help - 도움말

*작동 방식*:
- 매일 07:00 KST에 공식 소스를 스캔합니다.
- 변경 사항이 없어도 데일리 리포트를 전송합니다.
- 등록한 MHD와 일치하는 리콜이 발견되면 ACTION 알림을 받습니다.

*MHD 입력 형식*: DD-MM-YYYY (예: 15-06-2026)
`;

  await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}

/**
 * 그룹 chat_id 가져오기 (크론에서 사용)
 */
export async function getConfiguredChatId(): Promise<number | null> {
  return await getGroupChatId();
}
