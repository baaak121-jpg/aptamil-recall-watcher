// src/matcher.ts
// OCR 결과와 등록된 제품 매칭 로직

import { RegisteredItem } from './types';
import { extractDates } from './parser';
import { PRODUCT_NAME_MAPPING } from './sources';

/**
 * OCR 텍스트에서 제품별 MHD 추출
 */
export interface ProductMhdGroup {
  koreanName: string;
  englishKey?: string;
  mhdList: string[];
}

/**
 * OCR 텍스트 파싱 (제품명 + MHD 그룹화)
 */
export function parseOcrProducts(ocrText: string): ProductMhdGroup[] {
  const products: ProductMhdGroup[] = [];
  const blocks = ocrText.split('---').filter(b => b.trim());
  
  for (const block of blocks) {
    const nameMatch = block.match(/제품명:\s*(.+)/);
    const mhdMatch = block.match(/MHD:\s*(.+)/);
    
    if (nameMatch && mhdMatch) {
      const koreanName = nameMatch[1].trim();
      const mhdText = mhdMatch[1].trim();
      
      // 쉼표로 구분된 날짜들 추출
      const mhdList = mhdText
        .split(',')
        .map(d => d.trim())
        .filter(d => /\d{2}-\d{2}-\d{4}/.test(d));
      
      // 한글명으로 영어 키 찾기
      const englishKey = findEnglishKey(koreanName);
      
      products.push({
        koreanName,
        englishKey,
        mhdList,
      });
    }
  }
  
  return products;
}

/**
 * 한글 제품명으로 영어 키 찾기
 */
function findEnglishKey(koreanName: string): string | undefined {
  const lowerKorean = koreanName.toLowerCase();
  
  for (const [key, koreanVariants] of Object.entries(PRODUCT_NAME_MAPPING)) {
    for (const variant of koreanVariants) {
      if (lowerKorean.includes(variant.toLowerCase())) {
        return key;
      }
    }
  }
  
  return undefined;
}

/**
 * OCR 텍스트에서 모든 MHD 추출 (중복 제거)
 */
export function extractAllMhdsFromOcr(ocrText: string): string[] {
  const allDates = extractDates(ocrText);
  const uniqueDates = [...new Set(allDates)];
  return uniqueDates.sort();
}

/**
 * 등록된 제품과 OCR 결과 매칭 (제품명 + 날짜 조합)
 */
export function matchOcrResults(
  ocrText: string,
  registeredItems: RegisteredItem[]
): {
  matched: RegisteredItem[];
  notFound: RegisteredItem[];
} {
  const ocrProducts = parseOcrProducts(ocrText);
  const matched: RegisteredItem[] = [];
  const notFound: RegisteredItem[] = [];
  
  for (const item of registeredItems) {
    let found = false;
    
    // 제품명 + 날짜 조합으로 매칭
    for (const ocrProduct of ocrProducts) {
      // 1. 영어 키가 일치하는지 확인
      if (ocrProduct.englishKey === item.model_key) {
        // 2. 해당 제품의 MHD 리스트에 사용자의 MHD가 있는지 확인
        if (ocrProduct.mhdList.includes(item.mhd)) {
          matched.push(item);
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      notFound.push(item);
    }
  }
  
  return { matched, notFound };
}
