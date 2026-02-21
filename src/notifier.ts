// src/notifier.ts

import TelegramBot from 'node-telegram-bot-api';
import { DailyReport, RiskLevel, CountryResult } from './types';

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

  // 국가별 결과 섹션
  const countrySection = formatCountryResults(report.country_results);

  const summarySection = `\n📝 요약:\n${report.summary}\n`;

  // 즉시 확인 필요 섹션 (매칭 + 확인필요 포함)
  const actionSection = formatActionSection(report);

  // 모든 모니터링 소스 표기 (현행화된 5개만)
  const linksSection = formatMonitoringSources(report.source_links);

  return (
    header +
    riskLine +
    changeLine +
    matchLine +
    ocrSection +
    countrySection +
    summarySection +
    actionSection +
    linksSection
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
    section += `📅 추출된 MHD: ${ocrResult.extracted_dates?.length || 0}개\n`;
    
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

/**
 * 국가별 결과 포맷팅 (KR 제외)
 */
function formatCountryResults(countryResults: CountryResult[]): string {
  // KR은 IMAGE_OCR 섹션에서만 표기하므로 제외
  const filteredResults = countryResults.filter(r => r.country_code !== 'KR');
  
  if (filteredResults.length === 0) return '';

  let section = `\n🌍 국가별 결과:\n`;

  for (const result of filteredResults) {
    const flag = getCountryFlag(result.country_code);
    const changeStatus = result.changed ? '변경 감지' : '변경 없음';
    const counts = `해당 ${result.matched_count} / 확인필요 ${result.uncertain_count}`;

    section += `${flag} ${result.country_code}: ${changeStatus}, ${counts}\n`;
  }

  return section;
}

/**
 * 즉시 확인 필요 섹션 (매칭 + 확인필요 항목 모두 포함)
 */
function formatActionSection(report: DailyReport): string {
  const allAlertItems = [...report.matched_items];
  
  // 확인필요 항목도 추가
  const uncertainItems = report.scan_results.flatMap(r => r.uncertain_items);
  
  if (allAlertItems.length === 0 && uncertainItems.length === 0) {
    return '';
  }
  
  let section = `\n🚨 즉시 확인 필요:\n\n`;
  
  // 매칭된 제품 (위험)
  if (allAlertItems.length > 0) {
    section += `⚠️ 리콜 대상 제품:\n`;
    for (const item of allAlertItems) {
      section += `📦 ${item.model_label}\n`;
      section += `   MHD: ${item.mhd}\n`;
      
      // 이 제품을 감지한 소스 찾기
      const matchedSources = report.scan_results.filter(result => 
        result.matched_items.some(matched => matched.id === item.id)
      );
      
      if (matchedSources.length > 0) {
        section += `   감지 소스:\n`;
        matchedSources.forEach(source => {
          const flag = getCountryFlag(source.country_code);
          section += `   ${flag} ${source.source_key}\n`;
          section += `   ${source.source_url}\n`;
        });
      }
      section += `\n`;
    }
  }
  
  // 확인 필요 항목
  if (uncertainItems.length > 0) {
    section += `⚠️ 확인 필요 항목:\n`;
    for (const item of uncertainItems) {
      section += `📦 ${item.model_key || item.model_label}\n`;
      section += `   MHD: ${item.mhd}\n\n`;
    }
  }
  
  section += `⚠️ 해당 제품 사용을 즉시 중단하고 공식 안내를 확인하세요.\n`;
  
  return section;
}

/**
 * 모니터링 소스 포맷팅 (현행화된 5개만)
 */
function formatMonitoringSources(sourceLinks: string[]): string {
  if (sourceLinks.length === 0) return '';
  
  return `\n🔗 모니터링 소스:\n${sourceLinks.map((link) => `• ${link}`).join('\n')}\n`;
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
