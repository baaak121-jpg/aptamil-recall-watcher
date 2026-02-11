// src/llm.ts

import OpenAI from 'openai';

// OpenAI 클라이언트 지연 초기화
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// 최대 입력 토큰 수 (비용 절감)
const MAX_INPUT_TOKENS = 2000;

// 하루 최대 LLM 호출 횟수
const MAX_DAILY_CALLS = 1;

// 마지막 호출 날짜 추적 (메모리 기반, 서버리스 환경에서는 제한적)
let lastCallDate: string | null = null;
let dailyCallCount = 0;

/**
 * LLM을 사용한 3줄 요약 + 위험도 판단 (보수적)
 * 변경 감지 시에만 호출, 하루 1회 제한
 */
export async function generateSummary(
  scanResults: ScanResult[],
  matchedCount: number,
  uncertainCount: number
): Promise<string> {
  const changedSources = scanResults.filter((r) => r.changed);

  // 변경 없음 -> 고정 템플릿 (LLM 호출 0회)
  if (changedSources.length === 0) {
    return getFixedTemplate('no_change');
  }

  // 하루 1회 제한 체크
  const today = new Date().toISOString().split('T')[0];
  if (lastCallDate === today && dailyCallCount >= MAX_DAILY_CALLS) {
    console.log('[LLM] Daily call limit reached. Using fallback template.');
    return getFallbackTemplate(changedSources, matchedCount, uncertainCount);
  }

  // 변경된 소스 정보 요약 (국가별 그룹화) - 토큰 제한 적용
  const sourceInfo = changedSources
    .map((r) => {
      const dates = r.extracted_dates.length > 0 
        ? r.extracted_dates.slice(0, 5).join(', ')  // 최대 5개 날짜만
        : '날짜 추출 실패';
      return `- [${r.country_code}] ${r.source_key}: 변경. MHD: ${dates}`;
    })
    .join('\n');

  const prompt = `Aptamil 분유 리콜 모니터링 봇입니다. 3줄 이내로 요약하세요.

스캔 결과:
${sourceInfo}

매칭: 일치 ${matchedCount}개, 확인필요 ${uncertainCount}개

요약 (3줄):`;

  // 프롬프트 토큰 제한 (truncate)
  const truncatedPrompt = truncateToTokenLimit(prompt, MAX_INPUT_TOKENS);

  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: truncatedPrompt }],
      max_tokens: 150,  // 3줄 요약에 충분
      temperature: 0.3,
    });

    // 호출 카운트 업데이트
    if (lastCallDate !== today) {
      lastCallDate = today;
      dailyCallCount = 1;
    } else {
      dailyCallCount++;
    }

    return response.choices[0]?.message?.content?.trim() || getFallbackTemplate(changedSources, matchedCount, uncertainCount);
  } catch (error) {
    console.error('[LLM] Error generating summary:', error);
    return getFallbackTemplate(changedSources, matchedCount, uncertainCount);
  }
}

/**
 * 고정 템플릿 (변경 없음)
 */
function getFixedTemplate(type: 'no_change'): string {
  const templates = {
    no_change: '✅ 변경 사항 없음. 모든 소스가 이전 스캔과 동일합니다.\n✅ 정기 모니터링이 정상적으로 작동 중입니다.\n✅ 다음 스캔은 내일 09:00 KST에 실행됩니다.',
  };
  return templates[type];
}

/**
 * Fallback 템플릿 (LLM 호출 실패 또는 제한 초과 시)
 */
function getFallbackTemplate(
  changedSources: ScanResult[],
  matchedCount: number,
  uncertainCount: number
): string {
  const countries = [...new Set(changedSources.map((r) => r.country_code))].join(', ');
  
  let line1 = `${changedSources.length}개 소스에서 변경 감지됨 (${countries}).`;
  
  let line2 = '';
  if (matchedCount > 0) {
    line2 = `⚠️ 등록된 제품 ${matchedCount}개가 일치합니다. 즉시 확인 필요!`;
  } else if (uncertainCount > 0) {
    line2 = `확인 필요 항목 ${uncertainCount}개. 수동 확인 권장.`;
  } else {
    line2 = '등록된 제품과 일치하는 항목 없음.';
  }
  
  let line3 = '자세한 내용은 아래 근거 링크를 확인하세요.';
  
  return `${line1}\n${line2}\n${line3}`;
}

/**
 * 프롬프트를 토큰 제한에 맞게 truncate
 * 간단한 추정: 1 토큰 ≈ 4 characters (영어 기준)
 * 한글은 더 많은 토큰 사용하므로 보수적으로 1 토큰 ≈ 2 characters
 */
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedCharsPerToken = 2; // 보수적 추정 (한글 고려)
  const maxChars = maxTokens * estimatedCharsPerToken;
  
  if (text.length <= maxChars) {
    return text;
  }
  
  // 마지막 줄바꿈 위치에서 자르기 (문장 단위 유지)
  const truncated = text.substring(0, maxChars);
  const lastNewline = truncated.lastIndexOf('\n');
  
  if (lastNewline > maxChars * 0.8) {
    return truncated.substring(0, lastNewline) + '\n\n(내용 생략)';
  }
  
  return truncated + '...(생략)';
}

// ScanResult 타입 임포트를 위한 참조
import { ScanResult } from './types';
