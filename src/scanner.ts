// src/scanner.ts

import { Source, ScanResult, RegisteredItem, NoticeSnapshot } from './types';
import { 
  normalizeHtml, 
  generateHash, 
  extractDates,
  extractLinks,
  selectSectionByHeading,
  filterByKeywords,
  countKeywordMatches,
  extractImageUrls,
  resolveImageUrl
} from './parser';
import { updateSource, addNoticeSnapshot } from './store';
import { extractTextFromImages } from './llm';
import { matchOcrResults } from './matcher';

/**
 * 단일 소스 스캔 (fetch -> normalize -> hash -> compare -> parse)
 */
export async function scanSource(
  source: Source,
  registeredItems: RegisteredItem[],
  forceOcr: boolean = false
): Promise<ScanResult> {
  try {
    // 전략별 분기
    switch (source.parse_strategy) {
      case 'URL_CHECK':
        return await scanUrlCheck(source, registeredItems);
      case 'LIST_ITEMS':
        return await scanListItems(source, registeredItems);
      case 'SECTION_HASH':
        return await scanSectionHash(source, registeredItems);
      case 'CONTENT_KEYWORD':
        return await scanContentKeyword(source, registeredItems);
      case 'IMAGE_OCR':
        return await scanImageOcr(source, registeredItems, forceOcr);
      case 'HTML_TEXT':
      default:
        return await scanHtmlText(source, registeredItems);
    }
  } catch (error) {
    console.error(`[Scanner] Error scanning ${source.source_key}:`, error);
    return {
      source_key: source.source_key,
      source_url: source.url,
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
 * URL_CHECK 전략: URL 존재 여부로 리콜 감지 (개별 공지형)
 */
async function scanUrlCheck(
  source: Source,
  registeredItems: RegisteredItem[]
): Promise<ScanResult> {
  const response = await fetch(source.url, {
    method: 'HEAD',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AptamilRecallWatcher/1.0)',
    },
  });

  const urlExists = response.ok;
  const wasCheckedBefore = source.last_hash !== null;
  
  // URL이 새로 생성되었거나, 이전에 없었는데 지금 있으면 변경으로 감지
  const changed = urlExists && (!wasCheckedBefore || source.last_hash === 'NOT_FOUND');

  let extractedDates: string[] = [];
  let matched: RegisteredItem[] = [];
  let uncertain: RegisteredItem[] = [];

  // URL이 존재하면 내용 가져와서 날짜 추출
  if (urlExists) {
    const htmlResponse = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AptamilRecallWatcher/1.0)',
      },
    });
    const html = await htmlResponse.text();
    const normalized = normalizeHtml(html);
    extractedDates = extractDates(normalized);
    
    const matchResult = matchItems(extractedDates, registeredItems, changed);
    matched = matchResult.matched;
    uncertain = matchResult.uncertain;
  }

  // 소스 업데이트
  const updatedSource: Source = {
    ...source,
    last_hash: urlExists ? 'EXISTS' : 'NOT_FOUND',
    last_checked_at: new Date().toISOString(),
  };
  await updateSource(updatedSource);

  // 변경 시 스냅샷 저장
  if (changed && urlExists) {
    const snapshot: NoticeSnapshot = {
      source_key: source.source_key,
      timestamp: new Date().toISOString(),
      hash: 'EXISTS',
      raw_text: `URL activated: ${source.url}`,
      extracted_dates: extractedDates,
    };
    await addNoticeSnapshot(snapshot);
  }

  return {
    source_key: source.source_key,
    source_url: source.url,
    country_code: source.country_code,
    tier: source.tier,
    changed,
    extracted_dates: extractedDates,
    matched_items: matched,
    uncertain_items: uncertain,
  };
}

/**
 * HTML_TEXT 전략: 해시 비교로 변경 감지 (허브/목록형)
 * 옵션: sectionHeading, keywords 지원
 */
async function scanHtmlText(
  source: Source,
  registeredItems: RegisteredItem[]
): Promise<ScanResult> {
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
  let normalized = normalizeHtml(html);
  
  // sectionHeading이 있으면 해당 섹션만 추출
  if (source.sectionHeading) {
    normalized = selectSectionByHeading(normalized, source.sectionHeading);
    console.log(`[Scanner] ${source.source_key}: Using section "${source.sectionHeading}", length: ${normalized.length}`);
  }
  
  // 키워드 필터링 (옵션)
  const keywords = source.keywords || [];
  const keywordMatches = keywords.length > 0 ? countKeywordMatches(normalized, keywords) : -1;
  
  // 키워드가 설정되어 있고 매칭이 0이면 변경 없음으로 처리 (오탐 방지)
  if (keywords.length > 0 && keywordMatches === 0) {
    console.log(`[Scanner] ${source.source_key}: No keyword matches, skipping hash comparison`);
    return {
      source_key: source.source_key,
      source_url: source.url,
      country_code: source.country_code,
      tier: source.tier,
      changed: false,
      extracted_dates: [],
      matched_items: [],
      uncertain_items: [],
      keywordMatches: 0,
    };
  }

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
    source_url: source.url,
    country_code: source.country_code,
    tier: source.tier,
    changed,
    extracted_dates: extractedDates,
    matched_items: matched,
    uncertain_items: uncertain,
    keywordMatches: keywordMatches >= 0 ? keywordMatches : undefined,
  };
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
 * LIST_ITEMS 전략: 목록에서 항목 추출 후 diff (신규 리콜 감지)
 */
async function scanListItems(
  source: Source,
  registeredItems: RegisteredItem[]
): Promise<ScanResult> {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AptamilRecallWatcher/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  
  // HTML이 비어있으면 소스 장애
  if (!html || html.length < 100) {
    console.warn(`[Scanner] ${source.source_key}: Empty HTML response`);
    return {
      source_key: source.source_key,
      source_url: source.url,
      country_code: source.country_code,
      tier: source.tier,
      changed: false,
      error: 'Empty response',
      extracted_dates: [],
      matched_items: [],
      uncertain_items: [],
    };
  }

  // 링크 추출
  const links = extractLinks(html, source.url);
  
  // 키워드 필터링
  const keywords = source.keywords || [];
  const filteredLinks = links.filter(link => 
    filterByKeywords(link.title + ' ' + link.url, keywords)
  );
  
  console.log(`[Scanner] ${source.source_key}: Found ${links.length} links, ${filteredLinks.length} after keyword filter`);
  
  // items 해시 생성 (url + title 조합)
  const itemsText = filteredLinks
    .map(link => `${link.url}|${link.title}`)
    .sort()
    .join('\n');
  const currentHash = generateHash(itemsText);
  
  // 변경 감지
  const changed = source.last_hash !== null && source.last_hash !== currentHash;
  
  // 날짜 추출
  const extractedDates = filteredLinks.flatMap(link => 
    extractDates(link.title + ' ' + (link.dateText || ''))
  );
  
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
      raw_text: itemsText.substring(0, 5000),
      extracted_dates: extractedDates,
    };
    await addNoticeSnapshot(snapshot);
  }
  
  return {
    source_key: source.source_key,
    source_url: source.url,
    country_code: source.country_code,
    tier: source.tier,
    changed,
    extracted_dates: extractedDates,
    matched_items: matched,
    uncertain_items: uncertain,
    newItems: changed ? filteredLinks.slice(0, 5) : undefined,
    keywordMatches: filteredLinks.length,
  };
}

/**
 * SECTION_HASH 전략: 특정 섹션만 해시 비교 (오탐 방지)
 */
async function scanSectionHash(
  source: Source,
  registeredItems: RegisteredItem[]
): Promise<ScanResult> {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AptamilRecallWatcher/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const normalized = normalizeHtml(html);
  
  // 섹션 추출
  const sectionHeading = source.sectionHeading || '';
  const sectionText = sectionHeading 
    ? selectSectionByHeading(normalized, sectionHeading)
    : normalized;
  
  console.log(`[Scanner] ${source.source_key}: Section length: ${sectionText.length}`);
  
  // 키워드 필터링
  const keywords = source.keywords || [];
  const keywordMatches = countKeywordMatches(sectionText, keywords);
  
  // 키워드 매칭이 0이면 변경 없음으로 처리 (오탐 방지)
  if (keywords.length > 0 && keywordMatches === 0) {
    console.log(`[Scanner] ${source.source_key}: No keyword matches, skipping`);
    return {
      source_key: source.source_key,
      source_url: source.url,
      country_code: source.country_code,
      tier: source.tier,
      changed: false,
      extracted_dates: [],
      matched_items: [],
      uncertain_items: [],
      keywordMatches: 0,
    };
  }
  
  // 해시 생성
  const currentHash = generateHash(sectionText);
  
  // 변경 감지
  const changed = source.last_hash !== null && source.last_hash !== currentHash;
  
  // 날짜 추출
  const extractedDates = extractDates(sectionText);
  
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
      raw_text: sectionText.substring(0, 5000),
      extracted_dates: extractedDates,
    };
    await addNoticeSnapshot(snapshot);
  }
  
  return {
    source_key: source.source_key,
    source_url: source.url,
    country_code: source.country_code,
    tier: source.tier,
    changed,
    extracted_dates: extractedDates,
    matched_items: matched,
    uncertain_items: uncertain,
    keywordMatches,
  };
}

/**
 * CONTENT_KEYWORD 전략: 키워드 매칭 점수 기반 (개별 공지 대체)
 */
async function scanContentKeyword(
  source: Source,
  registeredItems: RegisteredItem[]
): Promise<ScanResult> {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AptamilRecallWatcher/1.0)',
    },
  });

  const urlExists = response.ok;
  
  if (!urlExists) {
    // URL이 없으면 변경 없음
    const updatedSource: Source = {
      ...source,
      last_hash: 'NOT_FOUND',
      last_checked_at: new Date().toISOString(),
    };
    await updateSource(updatedSource);
    
    return {
      source_key: source.source_key,
      source_url: source.url,
      country_code: source.country_code,
      tier: source.tier,
      changed: false,
      extracted_dates: [],
      matched_items: [],
      uncertain_items: [],
      keywordMatches: 0,
    };
  }
  
  const html = await response.text();
  const normalized = normalizeHtml(html);
  
  // 키워드 매칭
  const keywords = source.keywords || ['aptamil', 'rückruf', 'recall'];
  const keywordMatches = countKeywordMatches(normalized, keywords);
  
  console.log(`[Scanner] ${source.source_key}: Keyword matches: ${keywordMatches}`);
  
  // 2개 이상 매칭 시 이벤트 발생
  const hasSignificantMatch = keywordMatches >= 2;
  
  // 이전 상태와 비교
  const wasActive = source.last_hash === 'ACTIVE';
  const changed = hasSignificantMatch && !wasActive;
  
  // 날짜 추출
  const extractedDates = hasSignificantMatch ? extractDates(normalized) : [];
  
  // 매칭
  const { matched, uncertain } = matchItems(extractedDates, registeredItems, changed);
  
  // 소스 업데이트
  const updatedSource: Source = {
    ...source,
    last_hash: hasSignificantMatch ? 'ACTIVE' : 'INACTIVE',
    last_checked_at: new Date().toISOString(),
  };
  await updateSource(updatedSource);
  
  // 변경 시 스냅샷 저장
  if (changed) {
    const snapshot: NoticeSnapshot = {
      source_key: source.source_key,
      timestamp: new Date().toISOString(),
      hash: 'ACTIVE',
      raw_text: normalized.substring(0, 5000),
      extracted_dates: extractedDates,
    };
    await addNoticeSnapshot(snapshot);
  }
  
  return {
    source_key: source.source_key,
    source_url: source.url,
    country_code: source.country_code,
    tier: source.tier,
    changed,
    extracted_dates: extractedDates,
    matched_items: matched,
    uncertain_items: uncertain,
    keywordMatches,
  };
}

/**
 * IMAGE_OCR 전략: 이미지 URL 변경 감지 + Vision API OCR
 */
async function scanImageOcr(
  source: Source,
  registeredItems: RegisteredItem[],
  forceOcr: boolean = false
): Promise<ScanResult> {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AptamilRecallWatcher/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  
  // 이미지 URL 추출
  const imageUrls = extractImageUrls(html, source.imageSelector);
  
  // 절대 URL로 변환
  const absoluteImageUrls = imageUrls.map(url => resolveImageUrl(url, source.url));
  
  console.log(`[Scanner] ${source.source_key}: Found ${absoluteImageUrls.length} images`);
  
  // 이미지 URL 리스트로 해시 생성
  const imageUrlsText = absoluteImageUrls.sort().join('\n');
  const currentHash = generateHash(imageUrlsText);
  
  // 변경 감지
  const changed = source.last_hash !== null && source.last_hash !== currentHash;
  
  // OCR 실행 조건: forceOcr=true OR 변경 감지 OR 첫 실행
  const shouldRunOcr = forceOcr || changed || source.last_hash === null;
  
  console.log(`[Scanner] ${source.source_key}: Changed=${changed}, ForceOCR=${forceOcr}, ShouldRunOCR=${shouldRunOcr}`);
  
  let extractedDates: string[] = [];
  let ocrTexts: string[] = [];
  let fullOcrText = '';
  let matched: RegisteredItem[] = [];
  let uncertain: RegisteredItem[] = [];
  
  if (shouldRunOcr && absoluteImageUrls.length > 0) {
    console.log(`[Scanner] ${source.source_key}: Running OCR on ${absoluteImageUrls.length} images`);
    
    // Vision API로 OCR 실행
    ocrTexts = await extractTextFromImages(absoluteImageUrls);
    
    // 모든 OCR 결과 합치기
    fullOcrText = ocrTexts.join('\n\n---\n\n');
    
    // 모든 OCR 결과에서 날짜 추출
    extractedDates = extractDates(fullOcrText);
    
    console.log(`[Scanner] ${source.source_key}: Extracted ${extractedDates.length} dates from OCR`);
    
    // OCR 실패 체크: 이미지가 변경되었는데 날짜를 추출하지 못한 경우
    if (changed && extractedDates.length === 0) {
      console.log(`[Scanner] ${source.source_key}: OCR failed - image changed but no dates extracted`);
      matched = [];
      uncertain = registeredItems; // 모든 항목을 확인필요로
    } else {
      // 제품명 + 날짜 조합으로 매칭
      const matchResult = matchOcrResults(fullOcrText, registeredItems);
      matched = matchResult.matched;
      // notFound는 리콜 대상이 아니므로 uncertain이 아님
      uncertain = [];
      
      console.log(`[Scanner] ${source.source_key}: Matched ${matched.length} items, Not in recall list ${matchResult.notFound.length} items`);
    }
  } else {
    console.log(`[Scanner] ${source.source_key}: Skipping OCR (no change detected)`);
    matched = [];
    uncertain = [];
  }
  
  // 소스 업데이트
  const updatedSource: Source = {
    ...source,
    last_hash: currentHash,
    last_checked_at: new Date().toISOString(),
  };
  await updateSource(updatedSource);
  
  // 변경 시 스냅샷 저장
  if (changed || forceOcr) {
    const snapshot: NoticeSnapshot = {
      source_key: source.source_key,
      timestamp: new Date().toISOString(),
      hash: currentHash,
      raw_text: ocrTexts.join('\n\n---\n\n').substring(0, 5000),
      extracted_dates: extractedDates,
    };
    await addNoticeSnapshot(snapshot);
  }
  
  return {
    source_key: source.source_key,
    source_url: source.url,
    country_code: source.country_code,
    tier: source.tier,
    changed,
    extracted_dates: extractedDates,
    matched_items: matched,
    uncertain_items: uncertain,
    ocrExecuted: shouldRunOcr,
    imageUrls: absoluteImageUrls,
    ocrText: fullOcrText || undefined,
  };
}

/**
 * 모든 소스 스캔
 */
export async function scanAllSources(
  sources: Source[],
  registeredItems: RegisteredItem[],
  forceOcr: boolean = false
): Promise<ScanResult[]> {
  const results = await Promise.all(
    sources.map((source) => scanSource(source, registeredItems, forceOcr))
  );
  return results;
}
