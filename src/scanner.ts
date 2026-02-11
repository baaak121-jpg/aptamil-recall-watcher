// src/scanner.ts

import { Source, ScanResult, RegisteredItem, NoticeSnapshot } from './types';
import { normalizeHtml, generateHash, extractDates } from './parser';
import { updateSource, addNoticeSnapshot } from './store';

/**
 * 단일 소스 스캔 (fetch -> normalize -> hash -> compare -> parse)
 */
export async function scanSource(
  source: Source,
  registeredItems: RegisteredItem[]
): Promise<ScanResult> {
  try {
    // Fetch
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AptamilRecallWatcher/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Normalize
    const normalized = normalizeHtml(html);

    // Hash
    const currentHash = generateHash(normalized);

    // 변경 감지
    const changed = source.last_hash !== null && source.last_hash !== currentHash;

    // 날짜 추출
    const extractedDates = extractDates(normalized);

    // 매칭
    const { matched, uncertain } = matchItems(extractedDates, registeredItems, changed);

    // 소스 업데이트
    const updatedSource: Source = {
      ...source,
      last_hash: currentHash,
      last_checked_at: new Date().toISOString(),
    };
    await updateSource(updatedSource);

    // 변경 시 스냅샷 저장
    if (changed) {
      const snapshot: NoticeSnapshot = {
        source_key: source.source_key,
        timestamp: new Date().toISOString(),
        hash: currentHash,
        raw_text: normalized.substring(0, 5000), // 최대 5000자만 저장
        extracted_dates: extractedDates,
      };
      await addNoticeSnapshot(snapshot);
    }

    return {
      source_key: source.source_key,
      country_code: source.country_code,
      tier: source.tier,
      changed,
      extracted_dates: extractedDates,
      matched_items: matched,
      uncertain_items: uncertain,
    };
  } catch (error) {
    console.error(`[Scanner] Error scanning ${source.source_key}:`, error);
    return {
      source_key: source.source_key,
      country_code: source.country_code,
      tier: source.tier,
      changed: false,
      error: error instanceof Error ? error.message : String(error),
      extracted_dates: [],
      matched_items: [],
      uncertain_items: [],
    };
  }
}

/**
 * 매칭 로직 (보수적 Exact match)
 */
function matchItems(
  extractedDates: string[],
  registeredItems: RegisteredItem[],
  changed: boolean
): { matched: RegisteredItem[]; uncertain: RegisteredItem[] } {
  const matched: RegisteredItem[] = [];
  const uncertain: RegisteredItem[] = [];

  if (extractedDates.length === 0) {
    // 변경 감지는 있으나 날짜 추출 실패 -> 모든 항목을 "확인 필요"로
    if (changed) {
      return { matched: [], uncertain: registeredItems };
    }
    return { matched: [], uncertain: [] };
  }

  // Exact match: 등록된 MHD가 추출된 날짜 리스트에 포함되는지
  for (const item of registeredItems) {
    if (extractedDates.includes(item.mhd)) {
      matched.push(item);
    }
  }

  // v1: 모델 매핑 불완전 시에도, MHD 매칭이 있으면 ACTION으로 처리
  // 추가 로직 없음 (모델 정보는 나중에 확장 가능)

  return { matched, uncertain };
}

/**
 * 모든 소스 스캔
 */
export async function scanAllSources(
  sources: Source[],
  registeredItems: RegisteredItem[]
): Promise<ScanResult[]> {
  const results = await Promise.all(
    sources.map((source) => scanSource(source, registeredItems))
  );
  return results;
}
