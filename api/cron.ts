// api/cron.ts
// Vercel Serverless Function - Daily Cron Job (07:00 KST)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import TelegramBot from 'node-telegram-bot-api';
import { getConfiguredChatId } from '../src/bot';
import { getItems, getSources } from '../src/store';
import { scanAllSources } from '../src/scanner';
import { generateSummary } from '../src/llm';
import { sendDailyReport } from '../src/notifier';
import { DailyReport, RiskLevel, ScanResult, CountryResult, CountryCode } from '../src/types';
import { SOURCES, getTier1Sources, getTier1LinksByCountry } from '../src/sources';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron 인증 (선택적)
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Cron] Starting daily scan...');

    // 1. 설정 확인
    const chatId = await getConfiguredChatId();
    if (!chatId) {
      console.log('[Cron] No chat ID configured. Skipping.');
      return res.status(200).json({ message: 'No chat ID configured' });
    }

    // 2. 등록된 항목 가져오기
    const items = await getItems();

    // 3. 소스는 항상 코드의 SOURCES 사용 (KV 무시)
    const sources = SOURCES;
    
    // 4. 중복 실행 방지: 1시간 이내 실행 이력 확인
    const lastChecked = sources[0]?.last_checked_at;
    if (lastChecked) {
      const timeSinceLastRun = Date.now() - new Date(lastChecked).getTime();
      const oneHour = 60 * 60 * 1000;
      
      if (timeSinceLastRun < oneHour) {
        console.log(`[Cron] Already ran ${Math.floor(timeSinceLastRun / 1000 / 60)} minutes ago. Skipping.`);
        return res.status(200).json({ 
          message: 'Skipped: Already ran recently',
          lastRun: lastChecked,
          minutesAgo: Math.floor(timeSinceLastRun / 1000 / 60)
        });
      }
    }

    // 5. 스캔 실행 (모든 소스 스캔 - Tier 구분 없음)
    const scanResults = await scanAllSources(sources, items);

    // 6. 결과 분석
    const analysis = analyzeScanResults(scanResults, items);

    // 7. 국가별 결과 생성
    const countryResults = generateCountryResults(scanResults, items);

    // 8. LLM 요약 생성 (변경 시에만)
    const summary = await generateSummary(
      scanResults,
      analysis.matched_count,
      analysis.uncertain_count
    );

    // 9. 모든 소스 링크 추출
    const allLinks = sources.map((s) => s.url);

    // 10. 데일리 리포트 생성
    const report: DailyReport = {
      date: getKSTDate(),
      risk_level: analysis.risk_level,
      changed_sources: analysis.changed_sources,
      matched_count: analysis.matched_count,
      uncertain_count: analysis.uncertain_count,
      unmatched_count: analysis.unmatched_count,
      summary,
      source_links: allLinks,
      matched_items: analysis.matched_items,
      scan_results: scanResults,
      country_results: countryResults,
    };

    // 11. 텔레그램 전송
    const bot = new TelegramBot(BOT_TOKEN);
    await sendDailyReport(bot, chatId, report);

    console.log('[Cron] Daily scan completed successfully.');
    res.status(200).json({ message: 'Daily scan completed', report });
  } catch (error) {
    console.error('[Cron] Error:', error);
    
    // 실패해도 그룹에 에러 메시지 전송 시도
    try {
      const chatId = await getConfiguredChatId();
      if (chatId) {
        const bot = new TelegramBot(BOT_TOKEN);
        await bot.sendMessage(
          chatId,
          `🚨 *데일리 스캔 실패*\n\n오류: ${error}\n\n관리자에게 문의하세요.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (notifyError) {
      console.error('[Cron] Failed to send error notification:', notifyError);
    }

    res.status(500).json({ error: 'Cron job failed', details: String(error) });
  }
}

/**
 * 스캔 결과 분석 및 라벨링
 */
function analyzeScanResults(
  scanResults: ScanResult[],
  allItems: any[]
): {
  risk_level: RiskLevel;
  changed_sources: number;
  matched_count: number;
  uncertain_count: number;
  unmatched_count: number;
  matched_items: any[];
} {
  const changedSources = scanResults.filter((r) => r.changed).length;
  const allMatched = scanResults.flatMap((r) => r.matched_items);
  const allUncertain = scanResults.flatMap((r) => r.uncertain_items);

  const matched_count = allMatched.length;
  const uncertain_count = allUncertain.length;
  const unmatched_count = allItems.length - matched_count - uncertain_count;

  // 라벨 결정
  let risk_level: RiskLevel = '안전';
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
function generateCountryResults(
  scanResults: ScanResult[],
  allItems: any[]
): CountryResult[] {
  const countries: CountryCode[] = ['DE', 'UK', 'IE', 'KR'];
  const results: CountryResult[] = [];

  for (const countryCode of countries) {
    const countryScans = scanResults.filter((r) => r.country_code === countryCode);

    if (countryScans.length === 0) continue;

    const changed = countryScans.some((r) => r.changed);
    const matched = countryScans.flatMap((r) => r.matched_items);
    const uncertain = countryScans.flatMap((r) => r.uncertain_items);

    const matched_count = matched.length;
    const uncertain_count = uncertain.length;
    const unmatched_count = allItems.length - matched_count - uncertain_count;

    results.push({
      country_code: countryCode,
      changed,
      matched_count,
      uncertain_count,
      unmatched_count,
      tier1_links: getTier1LinksByCountry(countryCode),
    });
  }

  return results;
}

/**
 * KST 날짜 문자열 (YYYY-MM-DD)
 */
function getKSTDate(): string {
  const now = new Date();
  // UTC+9 (KST)
  const kstOffset = 9 * 60;
  const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
  return kstTime.toISOString().split('T')[0];
}
