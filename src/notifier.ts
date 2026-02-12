// src/notifier.ts

import TelegramBot from 'node-telegram-bot-api';
import { DailyReport, RiskLevel, CountryResult } from './types';

/**
 * 데일리 리포트 메시지 포맷팅
 */
export function formatDailyReport(report: DailyReport): string {
  const emoji = getRiskEmoji(report.risk_level);
  const header = `${emoji} *Aptamil Recall Watcher — ${report.date} (KST)*\n\n`;

  const riskLine = `📊 *상태*: ${report.risk_level}\n`;
  const changeLine = `🔄 *변경 감지*: ${report.changed_sources > 0 ? '있음' : '없음'}\n`;
  const matchLine = `🍼 *내 제품 MHD 이슈사항 여부*:\n해당 ${report.matched_count}개 / 확인필요 ${report.uncertain_count}개 / 미해당 ${report.unmatched_count}개\n`;

  // 국가별 결과 섹션
  const countrySection = formatCountryResults(report.country_results);

  const summarySection = `\n📝 *요약*:\n${report.summary}\n`;

  // 모든 모니터링 소스 표기
  const linksSection = `\n🔗 *모니터링 소스*:\n${report.source_links.map((link) => `• ${link}`).join('\n')}\n`;

  let actionSection = '';
  if (report.risk_level === '위험' && report.matched_items.length > 0) {
    actionSection = `\n⚠️ *즉시 확인 필요*:\n`;
    actionSection += report.matched_items
      .map((item) => `- ${item.model_label} (MHD: ${item.mhd})`)
      .join('\n');
    actionSection += `\n\n🚨 *해당 제품 사용을 즉시 중단하고 공식 안내를 확인하세요.*\n`;
  }

  return (
    header +
    riskLine +
    changeLine +
    matchLine +
    countrySection +
    summarySection +
    linksSection +
    actionSection
  );
}

/**
 * 국가별 결과 포맷팅
 */
function formatCountryResults(countryResults: CountryResult[]): string {
  if (countryResults.length === 0) return '';

  let section = `\n🌍 *국가별 결과*:\n`;

  for (const result of countryResults) {
    const flag = getCountryFlag(result.country_code);
    const changeStatus = result.changed ? '변경 감지' : '변경 없음';
    const counts = `해당 ${result.matched_count} / 확인필요 ${result.uncertain_count}`;

    section += `${flag} *${result.country_code}*: ${changeStatus}, ${counts}\n`;
  }

  return section;
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
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
    console.log(`[Notifier] Daily report sent to chat ${chatId}`);
  } catch (error) {
    console.error('[Notifier] Error sending daily report:', error);
    throw error;
  }
}
