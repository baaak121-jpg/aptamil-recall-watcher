// src/parser.ts

import * as cheerio from 'cheerio';
import crypto from 'crypto';

/**
 * HTML을 텍스트로 정규화 (스크립트/스타일 제거, 공백 정리)
 */
export function normalizeHtml(html: string): string {
  const $ = cheerio.load(html);
  
  // 스크립트, 스타일 태그 제거
  $('script, style, noscript').remove();
  
  // 텍스트만 추출
  const text = $('body').text() || $.text();
  
  // 공백 정규화 (연속 공백/줄바꿈을 단일 공백으로)
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * SHA256 해시 생성
 */
export function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * 날짜 패턴 추출 (DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY 등)
 */
export function extractDates(text: string): string[] {
  const patterns = [
    // DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY
    /\b(\d{2})[-./](\d{2})[-./](\d{4})\b/g,
    // YYYY-MM-DD (ISO 형식도 고려)
    /\b(\d{4})[-./](\d{2})[-./](\d{2})\b/g,
  ];

  const dates = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [full, p1, p2, p3] = match;
      
      // DD-MM-YYYY 형식으로 정규화
      let normalized: string;
      if (p3.length === 4) {
        // DD-MM-YYYY 또는 DD.MM.YYYY
        normalized = `${p1}-${p2}-${p3}`;
      } else if (p1.length === 4) {
        // YYYY-MM-DD -> DD-MM-YYYY
        normalized = `${p3}-${p2}-${p1}`;
      } else {
        continue;
      }

      // 유효성 검증
      if (isValidDate(normalized)) {
        dates.add(normalized);
      }
    }
  }

  return Array.from(dates);
}

/**
 * DD-MM-YYYY 형식 날짜 유효성 검증
 */
export function isValidDate(dateStr: string): boolean {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;

  // 월별 일수 체크 (간단한 검증)
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return false;

  return true;
}

/**
 * 사용자 입력 날짜 파싱 및 검증
 */
export function parseUserDate(input: string): string | null {
  const trimmed = input.trim();
  
  // DD-MM-YYYY 형식 기대
  if (!/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return null;
  }

  if (!isValidDate(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * HTML에서 링크 추출 (신규 리콜 감지용)
 */
export function extractLinks(html: string, baseUrl: string): Array<{ title: string; url: string; dateText?: string }> {
  const $ = cheerio.load(html);
  const links: Array<{ title: string; url: string; dateText?: string }> = [];
  
  $('a').each((_, elem) => {
    const href = $(elem).attr('href');
    if (!href || href === '#' || href.startsWith('javascript:') || href === '') {
      return;
    }
    
    // 상대 경로 해결
    let fullUrl = href;
    if (!href.startsWith('http')) {
      try {
        const base = new URL(baseUrl);
        fullUrl = new URL(href, base.origin).toString();
      } catch {
        return;
      }
    }
    
    // 제목 추출 (링크 텍스트 + 주변 텍스트)
    const linkText = $(elem).text().trim();
    const parentText = $(elem).parent().text().trim();
    const title = linkText || parentText.substring(0, 100);
    
    // 날짜 텍스트 추출 시도 (주변 텍스트에서)
    const dateText = extractDates(parentText)[0];
    
    links.push({ title, url: fullUrl, dateText });
  });
  
  return links;
}

/**
 * 특정 heading 이후 섹션 추출
 */
export function selectSectionByHeading(htmlText: string, heading: string): string {
  const headingIndex = htmlText.toLowerCase().indexOf(heading.toLowerCase());
  
  if (headingIndex === -1) {
    return '';
  }
  
  // heading 이후 4000자만 추출
  return htmlText.substring(headingIndex, headingIndex + 4000);
}

/**
 * 키워드 필터링
 */
export function filterByKeywords(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * 키워드 매칭 개수 반환
 */
export function countKeywordMatches(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase())).length;
}
