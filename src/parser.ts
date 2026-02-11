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
 * 다양한 형식 지원: DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
 */
export function parseUserDate(input: string): string | null {
  const trimmed = input.trim();
  
  // 1. DD-MM-YYYY 형식 (기본)
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    if (isValidDate(trimmed)) {
      return trimmed;
    }
    return null;
  }
  
  // 2. DD.MM.YYYY 형식
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const normalized = trimmed.replace(/\./g, '-');
    if (isValidDate(normalized)) {
      return normalized;
    }
    return null;
  }
  
  // 3. DD/MM/YYYY 형식
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const normalized = trimmed.replace(/\//g, '-');
    if (isValidDate(normalized)) {
      return normalized;
    }
    return null;
  }
  
  // 4. YYYY-MM-DD 형식 (ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    const normalized = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY로 변환
    if (isValidDate(normalized)) {
      return normalized;
    }
    return null;
  }
  
  // 5. 공백 제거 후 재시도 (15 06 2026 → 15-06-2026)
  const noSpaces = trimmed.replace(/\s+/g, '-');
  if (/^\d{2}-\d{2}-\d{4}$/.test(noSpaces)) {
    if (isValidDate(noSpaces)) {
      return noSpaces;
    }
  }

  return null;
}
