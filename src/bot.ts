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

  console.log(`[Bot] Received message from chat ${chatId}: "${text}"`);

  try {
    if (text.startsWith('/setup')) {
      await handleSetup(bot, chatId);
    } else if (text.startsWith('/add')) {
      // /add 모델번호 MHD 형식 체크
      const parts = text.split(/\s+/);
      if (parts.length === 3) {
        await handleAddDirect(bot, chatId, parts[1], parts[2]);
      } else {
        await handleAddStart(bot, chatId);
      }
    } else if (text.startsWith('/list')) {
      await handleList(bot, chatId);
    } else if (text.startsWith('/remove')) {
      await handleRemove(bot, chatId, text);
    } else if (text.startsWith('/sources')) {
      await handleSources(bot, chatId);
    } else if (text.startsWith('/help')) {
      await handleHelp(bot, chatId);
    } else if (text.startsWith('/cancel')) {
      await handleCancel(bot, chatId);
    } else if (!text.startsWith('/')) {
      // 일반 메시지 (conversation state 확인)
      console.log(`[Bot] Checking conversation state for chat ${chatId}`);
      console.log(`[Bot] Current states:`, Array.from(conversationStates.keys()));
      await handleConversation(bot, msg);
    }
  } catch (error) {
    console.error('[Bot] Error handling command:', error);
    await bot.sendMessage(chatId, `오류가 발생했습니다: ${error}`);
  }
}

async function handleSetup(bot: TelegramBot, chatId: number): Promise<void> {
  await setGroupChatId(chatId);
  await bot.sendMessage(
    chatId,
    '✅ 이 그룹이 데일리 리포트 수신 그룹으로 설정되었습니다.\n매일 09:00 KST에 리포트가 전송됩니다.'
  );
}

async function handleAddStart(bot: TelegramBot, chatId: number): Promise<void> {
  const parts = await bot.sendMessage(
    chatId,
    `제품을 등록하려면 다음 형식으로 입력하세요:

/add <모델번호> <MHD>

예시:
/add 1 15-06-2026
/add 5 20.07.2026

사용 가능한 모델 번호:
${PRODUCT_MODELS.map((m, i) => `${i + 1}. ${m.label}`).join('\n')}

또는 키보드로 선택:`,
    {
      reply_markup: {
        inline_keyboard: createModelKeyboard(),
      },
    }
  );

  conversationStates.set(chatId, {
    chat_id: chatId,
    step: 'awaiting_model',
  });
}

function createModelKeyboard(): TelegramBot.InlineKeyboardButton[][] {
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
  return keyboard;
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
        `✅ 선택한 모델: ${model.label}\n\n📅 MHD(유통기한)를 입력하세요.\n\n형식: DD-MM-YYYY (예: 15-06-2026)\n또는: 15.06.2026, 15/06/2026, 2026-06-15\n\n취소하려면 /cancel 입력`
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
  if (!state) {
    console.log(`[Bot] No conversation state for chat ${chatId}, message: "${text}"`);
    return;
  }
  
  console.log(`[Bot] Conversation state: ${state.step}, chat: ${chatId}, message: "${text}"`);

  if (state.step === 'awaiting_mhd' && state.selected_model) {
    console.log(`[Bot] Parsing date input: "${text}"`);
    const mhd = parseUserDate(text);

    if (!mhd) {
      console.log(`[Bot] Date parsing failed for: "${text}"`);
      await bot.sendMessage(
        chatId,
        `❌ 잘못된 날짜 형식입니다.

입력하신 값: "${text}"

지원하는 형식:
• DD-MM-YYYY (예: 15-06-2026)
• DD.MM.YYYY (예: 15.06.2026)
• DD/MM/YYYY (예: 15/06/2026)
• YYYY-MM-DD (예: 2026-06-15)

💡 그냥 메시지로 입력하세요 (답장 불필요)
취소하려면 /cancel`
      );
      return;
    }

    console.log(`[Bot] Date parsed successfully: "${mhd}"`);

    const item: RegisteredItem = {
      id: uuidv4(),
      model_key: state.selected_model.key,
      model_label: state.selected_model.label,
      mhd,
      created_at: new Date().toISOString(),
    };

    try {
      await addItem(item);
      console.log(`[Bot] Item added successfully: ${item.model_label} (${item.mhd})`);
      await bot.sendMessage(
        chatId,
        `✅ 등록 완료!\n\n모델: ${item.model_label}\nMHD: ${item.mhd}`
      );
      conversationStates.delete(chatId);
    } catch (error) {
      console.error(`[Bot] Error adding item:`, error);
      await bot.sendMessage(chatId, `❌ 등록 실패: ${error}`);
      // 에러 발생 시에도 state 유지 (재시도 가능)
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

  let message = '🔗 *모니터링 소스*:\n\n';

  if (sources.length === 0) {
    // 초기 소스 표시
    SOURCES.forEach((source) => {
      message += `- ${source.source_key}\n  ${source.url}\n\n`;
    });
  } else {
    sources.forEach((source) => {
      const lastChecked = source.last_checked_at
        ? new Date(source.last_checked_at).toLocaleString('ko-KR')
        : '미확인';
      message += `- ${source.source_key}\n  ${source.url}\n  마지막 확인: ${lastChecked}\n\n`;
    });
  }

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

async function handleAddDirect(
  bot: TelegramBot,
  chatId: number,
  modelInput: string,
  mhdInput: string
): Promise<void> {
  // 모델 번호 또는 키로 찾기
  const modelIndex = parseInt(modelInput, 10) - 1;
  let model: ProductModel | undefined;

  if (!isNaN(modelIndex) && modelIndex >= 0 && modelIndex < PRODUCT_MODELS.length) {
    model = PRODUCT_MODELS[modelIndex];
  } else {
    model = getModelByKey(modelInput);
  }

  if (!model) {
    await bot.sendMessage(chatId, `❌ 모델을 찾을 수 없습니다: "${modelInput}"\n\n/add 명령어로 모델 목록을 확인하세요.`);
    return;
  }

  const mhd = parseUserDate(mhdInput);
  if (!mhd) {
    await bot.sendMessage(
      chatId,
      `❌ 잘못된 날짜 형식입니다: "${mhdInput}"\n\n예시: /add 1 15-06-2026`
    );
    return;
  }

  const item: RegisteredItem = {
    id: uuidv4(),
    model_key: model.key,
    model_label: model.label,
    mhd,
    created_at: new Date().toISOString(),
  };

  try {
    await addItem(item);
    await bot.sendMessage(chatId, `✅ 등록 완료!\n\n모델: ${item.model_label}\nMHD: ${item.mhd}`);
  } catch (error) {
    await bot.sendMessage(chatId, `❌ 등록 실패: ${error}`);
  }
}

async function handleCancel(bot: TelegramBot, chatId: number): Promise<void> {
  const state = conversationStates.get(chatId);
  
  if (!state) {
    await bot.sendMessage(chatId, '진행 중인 작업이 없습니다.');
    return;
  }
  
  conversationStates.delete(chatId);
  await bot.sendMessage(chatId, '✅ 취소되었습니다.');
}

async function handleHelp(bot: TelegramBot, chatId: number): Promise<void> {
  const helpText = `
🍼 *Aptamil Recall Watcher*

*사용 가능한 명령어*:

/setup - 이 그룹을 데일리 리포트 수신 그룹으로 설정
/add - 제품 추가 (키보드 선택)
/add <번호> <MHD> - 직접 입력 (예: /add 1 15-06-2026)
/list - 등록된 제품 목록 보기
/remove <번호|ID> - 제품 삭제
/sources - 모니터링 소스 확인
/cancel - 진행 중인 작업 취소
/help - 도움말

*작동 방식*:
- 매일 09:00 KST에 공식 소스를 스캔합니다.
- 변경 사항이 없어도 데일리 리포트를 전송합니다.
- 등록한 MHD와 일치하는 리콜이 발견되면 ACTION 알림을 받습니다.

*MHD 입력 형식*: DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY 등
`;

  await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}

/**
 * 그룹 chat_id 가져오기 (크론에서 사용)
 */
export async function getConfiguredChatId(): Promise<number | null> {
  return await getGroupChatId();
}
