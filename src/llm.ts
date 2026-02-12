// src/llm.ts

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * LLM을 사용한 3줄 요약 + 위험도 판단 (보수적)
 * 변경 감지 시에만 호출
 */
export async function generateSummary(
  scanResults: ScanResult[],
  matchedCount: number,
  uncertainCount: number
): Promise<string> {
  const changedSources = scanResults.filter((r) => r.changed);

  if (changedSources.length === 0) {
    // 변경 없음 -> 고정 문구 (LLM 호출 안 함)
    return '✅ 변경 사항 없음. 모든 소스가 이전 스캔과 동일합니다.\n✅ 정기 모니터링이 정상적으로 작동 중입니다.\n✅ 다음 스캔은 내일 07:00 KST에 실행됩니다.';
  }

  // 변경된 소스 정보 요약 (국가별 그룹화)
  const sourceInfo = changedSources
    .map((r) => {
      const dates = r.extracted_dates.length > 0 ? r.extracted_dates.join(', ') : '날짜 추출 실패';
      return `- [${r.country_code}] ${r.source_key}: 변경 감지됨. 추출된 MHD: ${dates}`;
    })
    .join('\n');

  const prompt = `당신은 Aptamil 분유 리콜 모니터링 봇입니다. 다음 스캔 결과를 3줄 이내로 요약하세요.

스캔 결과 (국가별):
${sourceInfo}

매칭 결과:
- 내 등록 항목과 일치: ${matchedCount}개
- 확인 필요: ${uncertainCount}개

요약 규칙:
1. 변경된 소스를 국가별로 간결히 설명 (DE, UK, IE, KR)
2. 매칭된 항목이 있으면 "즉시 확인 필요" 강조
3. 확인 필요 항목이 있으면 "수동 확인 권장" 언급
4. 3줄 이내로 작성 (각 줄은 한 문장)

요약:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() || '요약 생성 실패';
  } catch (error) {
    console.error('[LLM] Error generating summary:', error);
    return `변경 감지됨 (${changedSources.length}개 소스). LLM 요약 실패.`;
  }
}

// ScanResult 타입 임포트를 위한 참조
import { ScanResult } from './types';
