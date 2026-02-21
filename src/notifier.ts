// src/notifier.ts

import TelegramBot from 'node-telegram-bot-api';
import { DailyReport, RiskLevel, CountryResult } from './types';
import { parseOcrProducts } from './matcher';
import { getModelByKey } from './sources';

/**
 * 데일리 리포트 메시지 포맷팅
 */
export function formatDailyReport(report: DailyReport): string {
  const emoji = getRiskEmoji(report.risk_level);
  const header = `${emoji} Aptamil Recall Watcher — ${report.date} (KST)\n\n`;

  const riskLine = `📊 상태: ${report.risk_level}\n`;
  const changeLine = `🔄 변경 감지: ${report.changed_sources > 0 ? '있음' : '없음'}\n`;
  const matchLine = `🍼 내 제품 MHD 이슈사항 여부:\n해당 ${report.matched_count}개 / 확인필요 ${report.uncertain_count}개 / 미해당 ${report.unmatched_count}개\n`;

  // IMAGE_OCR 결과 최우선 표기
  const ocrSection = formatOcrResults(report.scan_results);

  const summarySection = `\n📝 요약:\n${report.summary}\n`;

  return (
    header +
    riskLine +
    changeLine +
    matchLine +
    ocrSection +
    summarySection
  );
}

/**
 * IMAGE_OCR 결과 포맷팅 (최우선 표기)
 */
function formatOcrResults(scanResults: any[]): string {
  const ocrResult = scanResults.find(r => r.source_key === 'nutricia_kr_aptamil_program');
  
  if (!ocrResult) return '';
  
  let section = `\n🇰🇷 KR 뉴트리시아 안심 프로그램:\n`;
  
  if (ocrResult.error) {
    section += `❌ OCR 오류: ${ocrResult.error}\n`;
  } else {
    section += `✅ OCR 실행: ${ocrResult.ocrExecuted ? '예' : '아니오'}\n`;
    section += `📅 추출된 MHD: ${ocrResult.extracted_dates?.length || 0}개\n\n`;
    
    // OCR 텍스트가 있으면 제품별로 파싱해서 표시
    if (ocrResult.ocrText) {
      const products = parseOcrProducts(ocrResult.ocrText);
      
      if (products.length > 0) {
        section += `📋 제품별 추출 결과:\n`;
        products.forEach((product, idx) => {
          // 영문 키가 있으면 영문 라벨 사용, 없으면 한글명 사용
          let displayName = product.koreanName;
          if (product.englishKey) {
            const model = getModelByKey(product.englishKey);
            if (model) {
              displayName = `${model.label} (${product.englishKey})`;
            }
          }
          
          section += `\n${idx + 1}. ${displayName}\n`;
          if (product.mhdList.length > 0) {
            section += `   MHD (${product.mhdList.length}개): ${product.mhdList.join(', ')}\n`;
          } else {
            section += `   MHD: 없음\n`;
          }
        });
        section += `\n`;
      }
    }
    
    if (ocrResult.matched_items.length > 0) {
      section += `🚨 매칭된 제품: ${ocrResult.matched_items.length}개\n`;
      ocrResult.matched_items.forEach((item: any) => {
        section += `   • ${item.model_key} (MHD: ${item.mhd})\n`;
      });
    } else if (ocrResult.uncertain_items.length > 0) {
      section += `⚠️ 확인 필요: ${ocrResult.uncertain_items.length}개\n`;
    } else {
      section += `✅ 등록된 제품 중 리콜 대상 없음\n`;
    }
    
    section += `🔗 ${ocrResult.source_url}\n`;
  }
  
  return section;
}


function getRiskEmoji(level: RiskLevel): string {
  switch (level) {
    case '위험':
      return '🚨';
    case '확인필요':
      return '⚠️';
    case '안전':
      return '🍼';
    default:
      return '🍼';
  }
}

/**
 * 텔레그램 그룹에 데일리 리포트 전송
 */
export async function sendDailyReport(
  bot: TelegramBot,
  chatId: number,
  report: DailyReport
): Promise<void> {
  const message = formatDailyReport(report);

  try {
    // Markdown 제거 - URL 특수문자 문제 방지
    await bot.sendMessage(chatId, message, {
      disable_web_page_preview: true,
    });
    console.log(`[Notifier] Daily report sent to chat ${chatId}`);
  } catch (error) {
    console.error('[Notifier] Error sending daily report:', error);
    throw error;
  }
}
