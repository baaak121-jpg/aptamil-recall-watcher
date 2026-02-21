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
  const ocrExecuted = scanResults.some((r) => r.ocrExecuted);

  // 변경사항이 없고 OCR도 실행되지 않았을 때만 "변경 없음" 메시지
  if (changedSources.length === 0 && !ocrExecuted) {
    return '✅ 변경 사항 없음. 모든 소스가 이전 스캔과 동일합니다.\n✅ 정기 모니터링이 정상적으로 작동 중입니다.\n✅ 다음 스캔은 내일 08:00 KST에 실행됩니다.';
  }

  // 변경된 소스 정보 요약 (국가별 그룹화)
  const sourceInfoParts = [];
  
  if (changedSources.length > 0) {
    sourceInfoParts.push('변경 감지된 소스:');
    changedSources.forEach((r) => {
      const dateCount = r.extracted_dates?.length || 0;
      sourceInfoParts.push(`- [${r.country_code}] ${r.source_key}: 변경 감지, MHD ${dateCount}개 추출`);
    });
  }
  
  if (ocrExecuted) {
    const ocrResult = scanResults.find(r => r.ocrExecuted);
    if (ocrResult) {
      const dateCount = ocrResult.extracted_dates?.length || 0;
      sourceInfoParts.push(`\nOCR 실행됨:`);
      sourceInfoParts.push(`- [KR] 뉴트리시아 안심 프로그램: MHD ${dateCount}개 추출`);
    }
  }
  
  const sourceInfo = sourceInfoParts.join('\n');

  const prompt = `당신은 Aptamil 분유 리콜 모니터링 봇입니다. 다음 스캔 결과를 3줄 이내로 요약하세요.

스캔 결과:
${sourceInfo}

매칭 결과:
- 내 등록 항목과 일치: ${matchedCount}개
- 확인 필요: ${uncertainCount}개

요약 규칙:
1. 변경된 소스나 OCR 실행 내용을 간결히 설명
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
    
    // Fallback 요약
    let fallback = '';
    if (changedSources.length > 0) {
      fallback += `변경 감지됨 (${changedSources.length}개 소스). `;
    }
    if (ocrExecuted) {
      fallback += 'KR 소스 OCR 실행 완료. ';
    }
    if (matchedCount > 0) {
      fallback += `매칭 ${matchedCount}개 발견 - 즉시 확인 필요.`;
    } else if (uncertainCount > 0) {
      fallback += `확인 필요 ${uncertainCount}개.`;
    } else {
      fallback += '등록된 제품 중 리콜 대상 없음.';
    }
    
    return fallback;
  }
}

/**
 * Vision API를 사용한 이미지 OCR (제품 정보 추출)
 * 이미지를 먼저 다운로드한 후 base64로 인코딩하여 전송
 */
export async function extractTextFromImage(imageUrl: string): Promise<string> {
  try {
    // 이미지 다운로드
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AptamilRecallWatcher/1.0)',
      },
    });
    
    if (!imageResponse.ok) {
      console.error(`[LLM] Failed to download image: ${imageResponse.status}`);
      return '';
    }
    
    // ArrayBuffer로 변환 후 base64 인코딩
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    
    // Content-Type 감지
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const base64Url = `data:${contentType};base64,${base64Image}`;
    
    console.log(`[LLM] Image downloaded: ${buffer.length} bytes, type: ${contentType}`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `이 이미지에서 **"압타밀 프로푸트라"** 제품만 찾아서 추출하세요.

**작업**:
1. 이미지에서 "압타밀 프로푸트라" 또는 "Aptamil Profutura" 텍스트가 있는 섹션을 찾으세요
2. 해당 섹션의 모든 제품을 다음 형식으로 출력:

---
제품명: [제품명 전체]
MHD: [날짜1], [날짜2], ...
---

**출력 예시**:
---
제품명: 압타밀 프로푸트라 뉴로마인드 PRE 1단계 800g (독일내수용)
MHD: 17-12-2026, 15-03-2027, 22-04-2027, 01-06-2027, 22-07-2027, 07-09-2027, 15-09-2027
---
---
제품명: 압타밀 프로푸트라 뉴로마인드 1단계 800g (독일내수용)
MHD: 21-04-2027, 01-06-2027, 21-07-2027, 07-09-2027, 16-09-2027
---
---
제품명: 압타밀 프로푸트라 뉴로마인드 2단계 800g (독일내수용)
MHD: 19-01-2027, 16-02-2027, 17-04-2027, 06-06-2027, 27-06-2027, 20-07-2027
---

**날짜 읽기 - 매우 중요**:
⚠️ 날짜 형식: DD-MM-YYYY (일-월-년)
⚠️ 예시:
   - 이미지에 "01.06.2027" → 출력: "01-06-2027" (6월 1일)
   - 이미지에 "06.06.2027" → 출력: "06-06-2027" (6월 6일)
⚠️ 각 날짜를 두 번 확인하세요
⚠️ 월(MM)과 일(DD)을 절대 혼동하지 마세요

**검증**:
- 각 날짜를 읽은 후 다시 한 번 확인하세요
- 의심스러운 날짜는 이미지를 다시 보고 정확히 읽으세요

**중요**:
- "압타밀 프로푸트라" 제품만 추출하세요 (프로누트라, 탭스 등은 제외)
- 제품명: 정확히 전체 복사 (단계, 용량, 출처 포함)
- 프로푸트라 섹션의 모든 제품을 빠짐없이 추출하세요`
            },
            {
              type: 'image_url',
              image_url: { 
                url: base64Url,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('[LLM] Error extracting text from image:', error);
    return '';
  }
}

/**
 * 여러 이미지를 병렬로 OCR 처리
 */
export async function extractTextFromImages(imageUrls: string[]): Promise<string[]> {
  console.log(`[LLM] Starting OCR for ${imageUrls.length} images`);
  
  const results = await Promise.all(
    imageUrls.map(url => extractTextFromImage(url))
  );
  
  console.log(`[LLM] OCR completed: ${results.filter(r => r).length}/${imageUrls.length} successful`);
  
  return results;
}

// ScanResult 타입 임포트를 위한 참조
import { ScanResult } from './types';
