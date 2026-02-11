// src/test-cron.ts
// 로컬에서 크론 함수 테스트

import TelegramBot from 'node-telegram-bot-api';
import { getConfiguredChatId } from './bot';
import { getItems, getSources } from './store';
import { scanAllSources } from './scanner';
import { generateSummary } from './llm';
import { sendDailyReport } from './notifier';
import { DailyReport, RiskLevel, ScanResult, CountryResult, CountryCode } from './types';
import { SOURCES, getTier1Sources, getTier1LinksByCountry } from './sources';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

async function testCron() {
  try {
    console.log('[Test Cron] Starting manual daily scan...\n');

    // 1. 설정 확인
    const chatId = await getConfiguredChatId();
    if (!chatId) {
      console.log('[Test Cron] ❌ No chat ID configured. Run /setup first.');
      return;
    }
    console.log(`[Test Cron] ✅ Chat ID: ${chatId}\n`);

    // 2. 등록된 항목 가져오기
    const items = await getItems();
    console.log(`[Test Cron] ✅ Registered items: ${items.length}`);
    items.forEach((item) => {
      console.log(`  - ${item.model_label} (MHD: ${item.mhd})`);
    });
    console.log('');

    // 3. 소스 가져오기
    let sources = await getSources();
    if (sources.length === 0) {
      sources = SOURCES;
    }
    const tier1Sources = getTier1Sources();
    console.log(`[Test Cron] ✅ Scanning ${tier1Sources.length} Tier 1 sources...\n`);

    // 4. 스캔 실행
    const scanResults = await scanAllSources(tier1Sources, items);

    // 결과 출력
    console.log('[Test Cron] Scan results:');
    scanResults.forEach((result) => {
      console.log(`  [${result.country_code}] ${result.source_key}:`);
      console.log(`    - Changed: ${result.changed}`);
      console.log(`    - Extracted dates: ${result.extracted_dates.length}`);
      console.log(`    - Matched items: ${result.matched_items.length}`);
      console.log(`    - Uncertain items: ${result.uncertain_items.length}`);
      if (result.error) {
        console.log(`    - Error: ${result.error}`);
      }
    });
    console.log('');

    // 5. 결과 분석
    const analysis = analyzeScanResults(scanResults, items);
    console.log('[Test Cron] Analysis:');
    console.log(`  - Risk level: ${analysis.risk_level}`);
    console.log(`  - Changed sources: ${analysis.changed_sources}`);
    console.log(`  - Matched: ${analysis.matched_count}`);
    console.log(`  - Uncertain: ${analysis.uncertain_count}`);
    console.log(`  - Unmatched: ${analysis.unmatched_count}`);
    console.log('');

    // 6. 국가별 결과 생성
    const countryResults = generateCountryResults(scanResults, items);

    // 7. LLM 요약 생성
    console.log('[Test Cron] Generating summary...');
    const summary = await generateSummary(
      scanResults,
      analysis.matched_count,
      analysis.uncertain_count
    );
    console.log(`[Test Cron] Summary: ${summary}\n`);

    // 8. Tier 1 링크만 추출
    const tier1Links = tier1Sources.map((s) => s.url);

    // 9. 데일리 리포트 생성
    const report: DailyReport = {
      date: getKSTDate(),
      risk_level: analysis.risk_level,
      changed_sources: analysis.changed_sources,
      matched_count: analysis.matched_count,
      uncertain_count: analysis.uncertain_count,
      unmatched_count: analysis.unmatched_count,
      summary,
      source_links: tier1Links,
      matched_items: analysis.matched_items,
      scan_results: scanResults,
      country_results: countryResults,
    };

    // 10. 텔레그램 전송
    console.log('[Test Cron] Sending daily report to Telegram...\n');
    const bot = new TelegramBot(BOT_TOKEN);
    await sendDailyReport(bot, chatId, report);

    console.log('[Test Cron] ✅ Daily scan completed successfully!\n');
  } catch (error) {
    console.error('[Test Cron] ❌ Error:', error);
  }
}

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

function getKSTDate(): string {
  const now = new Date();
  const kstOffset = 9 * 60;
  const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
  return kstTime.toISOString().split('T')[0];
}

// 실행
testCron().then(() => process.exit(0));
