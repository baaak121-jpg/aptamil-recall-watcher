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
import { scanSource } from './scanner';
import { formatDailyReport } from './notifier';

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
    `✅ 이 그룹이 데일리 리포트 수신 그룹으로 설정되었습니다.\n\n매일 08:00 KST에 리포트가 전송됩니다.\n/report 명령어로 즉시 확인도 가능합니다.\n\n(Chat ID: ${chatId})`
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
        `✅ 등록 완료!\n\n모델: ${item.model_label}\nMHD: ${item.mhd}\n\n💡 /report 명령어로 현재 리콜 상태를 확인할 수 있습니다.`
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
  await bot.sendMessage(chatId, '📊 수동 리포트를 생성 중입니다...\n(IMAGE_OCR이 포함되어 30-60초 소요될 수 있습니다)');
  
  try {
    // 전체 스캔 실행 (크론과 동일)
    await generateFullReport(bot, chatId);
  } catch (error) {
    console.error('[Bot] Error generating report:', error);
    await bot.sendMessage(chatId, `❌ 리포트 생성 중 오류 발생: ${error}`);
  }
}

/**
 * 전체 리포트 생성 (크론과 동일, IMAGE_OCR 최우선 표기)
 */
async function generateFullReport(bot: TelegramBot, chatId: number): Promise<void> {
  const { getItems, getSources } = await import('./store');
  const { scanAllSources, scanSource } = await import('./scanner');
  const { generateSummary } = await import('./llm');
  const { sendDailyReport } = await import('./notifier');
  const { SOURCES, getTier1LinksByCountry } = await import('./sources');
  
  try {
    // 1. 등록된 항목 가져오기
    const items = await getItems();
    
    // 2. 소스 가져오기
    let sources = await getSources();
    if (sources.length === 0) {
      sources = SOURCES;
    }
    
    // 3. KR IMAGE_OCR 소스를 forceOcr=true로 스캔
    const krOcrSource = sources.find((s: any) => s.source_key === 'nutricia_kr_aptamil_program');
    const otherSources = sources.filter((s: any) => s.source_key !== 'nutricia_kr_aptamil_program');
    
    let allScanResults = [];
    
    // KR OCR 소스 먼저 스캔 (forceOcr=true)
    if (krOcrSource) {
      const krResult = await scanSource(krOcrSource, items, true);
      allScanResults.push(krResult);
    }
    
    // 나머지 소스 스캔
    const otherResults = await scanAllSources(otherSources, items);
    allScanResults = [...allScanResults, ...otherResults];
    
    // 4. 결과 분석
    const analysis = analyzeResults(allScanResults, items);
    
    // 5. 국가별 결과 생성
    const countryResults = await generateCountryResults(allScanResults, items);
    
    // 6. LLM 요약 생성
    const summary = await generateSummary(
      allScanResults,
      analysis.matched_count,
      analysis.uncertain_count
    );
    
    // 7. 리포트 생성 및 전송
    const report = {
      date: new Date().toISOString().split('T')[0],
      risk_level: analysis.risk_level,
      changed_sources: analysis.changed_sources,
      matched_count: analysis.matched_count,
      uncertain_count: analysis.uncertain_count,
      unmatched_count: analysis.unmatched_count,
      summary,
      source_links: sources.map(s => s.url),
      matched_items: analysis.matched_items,
      scan_results: allScanResults,
      country_results: countryResults,
    };
    
    await sendDailyReport(bot, chatId, report);
    
  } catch (error) {
    console.error('[Bot] Error generating full report:', error);
    throw error;
  }
}

/**
 * 스캔 결과 분석
 */
function analyzeResults(scanResults: any[], allItems: any[]): any {
  const changedSources = scanResults.filter((r) => r.changed).length;
  const allMatched = scanResults.flatMap((r) => r.matched_items);
  const allUncertain = scanResults.flatMap((r) => r.uncertain_items);

  const matched_count = allMatched.length;
  const uncertain_count = allUncertain.length;
  const unmatched_count = allItems.length - matched_count - uncertain_count;

  let risk_level = '안전';
  if (matched_count > 0) {
    risk_level = '위험';
  } else if (changedSources > 0 || uncertain_count > 0) {
    risk_level = '확인필요';
  }

  return {
    risk_level,
    changed_sources: changedSources,
    matched_count,
    uncertain_count,
    unmatched_count,
    matched_items: allMatched,
  };
}

/**
 * 국가별 결과 생성
 */
async function generateCountryResults(scanResults: any[], allItems: any[]): Promise<any[]> {
  const { getTier1LinksByCountry } = await import('./sources');
  const countries = ['KR']; // KR만 모니터링
  const results = [];

  for (const countryCode of countries) {
    const countryScans = scanResults.filter((r: any) => r.country_code === countryCode);
    if (countryScans.length === 0) continue;

    const changed = countryScans.some((r: any) => r.changed);
    const matched = countryScans.flatMap((r: any) => r.matched_items);
    const uncertain = countryScans.flatMap((r: any) => r.uncertain_items);

    results.push({
      country_code: countryCode,
      changed,
      matched_count: matched.length,
      uncertain_count: uncertain.length,
      unmatched_count: allItems.length - matched.length - uncertain.length,
      tier1_links: getTier1LinksByCountry(countryCode),
    });
  }

  return results;
}

/**
 * KR 소스 즉시 스캔 (제품 추가/삭제/수동 리포트 시 호출)
 */
async function checkKrSourceAfterUpdate(bot: TelegramBot, chatId: number): Promise<void> {
  try {
    const items = await getItems();
    const sources = await getSources();
    
    // KR IMAGE_OCR 소스 찾기
    const krSource = sources.find(s => s.source_key === 'nutricia_kr_aptamil_program') 
      || SOURCES.find(s => s.source_key === 'nutricia_kr_aptamil_program');
    
    if (!krSource) {
      await bot.sendMessage(chatId, '⚠️ KR 소스를 찾을 수 없습니다.');
      return;
    }
    
    // forceOcr=true로 즉시 스캔
    const result = await scanSource(krSource, items, true);
    
    // 결과 메시지 생성
    let message = '✅ 확인 완료!\n\n';
    
    if (result.error) {
      message += `❌ 스캔 오류: ${result.error}`;
    } else if (result.matched_items.length > 0) {
      message += `🚨 주의: 등록된 제품이 리콜 대상일 수 있습니다!\n\n`;
      result.matched_items.forEach(item => {
        message += `- ${item.model_label} (MHD: ${item.mhd})\n`;
      });
      message += `\n🔗 확인: ${krSource.url}`;
    } else if (result.uncertain_items.length > 0) {
      message += `⚠️ 확인 필요한 항목이 있습니다.\n\n`;
      result.uncertain_items.forEach(item => {
        message += `- ${item.model_label} (MHD: ${item.mhd})\n`;
      });
      message += `\n🔗 확인: ${krSource.url}`;
    } else {
      message += `✅ 등록된 제품 중 리콜 대상이 없습니다.\n`;
      message += `📅 추출된 MHD: ${result.extracted_dates.length}개\n`;
      message += `🖼️ OCR 실행: ${result.ocrExecuted ? '예' : '아니오'}`;
    }
    
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('[Bot] Error checking KR source:', error);
    await bot.sendMessage(chatId, `⚠️ 확인 중 오류 발생: ${error}`);
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
/report - 즉시 리포트 생성 (IMAGE_OCR 실행)
/help - 도움말

*작동 방식*:
- 매일 08:00 KST에 공식 소스를 스캔합니다.
- 변경 사항이 없어도 데일리 리포트를 전송합니다.
- 등록한 MHD와 일치하는 리콜이 발견되면 ACTION 알림을 받습니다.
- /report 명령어 시 KR 소스를 즉시 확인합니다 (IMAGE_OCR).

*MHD 입력 형식*: DD-MM-YYYY (예: 15-06-2026)
`;

  await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}

/**
 * 그룹 chat_id 가져오기 (크론에서 사용)
 * 환경변수 우선, 없으면 Store에서 가져오기
 */
export async function getConfiguredChatId(): Promise<number | null> {
  // 환경변수에서 먼저 확인
  const envChatId = process.env.TELEGRAM_GROUP_CHAT_ID;
  if (envChatId) {
    const chatId = parseInt(envChatId, 10);
    if (!isNaN(chatId)) {
      console.log(`[Bot] Using chat ID from environment: ${chatId}`);
      return chatId;
    }
  }
  
  // Store에서 가져오기
  const chatId = await getGroupChatId();
  console.log(`[Bot] Using chat ID from store: ${chatId}`);
  return chatId;
}
