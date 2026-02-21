// src/sources.ts

import { ProductModel, Source } from './types';

/**
 * 국가별 Tier 1 소스 정의
 * 원칙: 공식/규제기관/공식 스토어 우선, 국가별 최소 1~3개
 */
export const SOURCES: Source[] = [
  // ========== KR (한국) - IMAGE_OCR ==========
  {
    source_key: 'nutricia_kr_aptamil_program',
    country_code: 'KR',
    tier: 1,
    url: 'https://www.nutriciastore.co.kr/main/html.php?htmid=mypage/aptamil_program.html',
    parse_strategy: 'IMAGE_OCR',
    reliability_label: 'OfficialStore',
    imageSelector: 'img[src*="/data/editor/board/"]',
    notes: '뉴트리시아 안심 프로그램. Vision API로 이미지 OCR',
    last_hash: null,
    last_checked_at: null,
  },
];

// 독일 내수용 Aptamil 모델 리스트 (하드코딩)
export const PRODUCT_MODELS: ProductModel[] = [
  { key: 'pronutra_pre', label: 'Aptamil Pronutra PRE' },
  { key: 'pronutra_1', label: 'Aptamil Pronutra 1' },
  { key: 'pronutra_2', label: 'Aptamil Pronutra 2' },
  { key: 'pronutra_3', label: 'Aptamil Pronutra 3' },
  { key: 'profutura_pre', label: 'Aptamil Profutura PRE' },
  { key: 'profutura_1', label: 'Aptamil Profutura 1' },
  { key: 'profutura_2', label: 'Aptamil Profutura 2' },
  { key: 'profutura_3', label: 'Aptamil Profutura 3' },
  { key: 'ha_pre', label: 'Aptamil HA PRE' },
  { key: 'ha_1', label: 'Aptamil HA 1' },
  { key: 'ha_2', label: 'Aptamil HA 2' },
  { key: 'comfort', label: 'Aptamil Comfort' },
  { key: 'ar', label: 'Aptamil AR (Anti-Reflux)' },
  { key: 'lactose_free', label: 'Aptamil Lactose Free' },
  { key: 'pepti', label: 'Aptamil Pepti' },
];

// 한글-영어 제품명 매핑 (KR 이미지 OCR용)
export const PRODUCT_NAME_MAPPING: Record<string, string[]> = {
  'pronutra_pre': ['압타밀 프로누트라 어드밴스 HMO PRE', '프로누트라 PRE'],
  'pronutra_1': ['압타밀 프로누트라 어드밴스 HMO 1단계', '프로누트라 1단계', '프로누트라 1'],
  'pronutra_2': ['압타밀 프로누트라 어드밴스 HMO 2단계', '프로누트라 2단계', '프로누트라 2'],
  'pronutra_3': ['압타밀 프로누트라 어드밴스 HMO 3단계', '프로누트라 3단계', '프로누트라 3'],
  'profutura_pre': ['압타밀 프로푸트라 뉴로마인드 PRE', '압타밀 프로푸트라 듀오어드밴스 PRE단계', '프로푸트라 PRE'],
  'profutura_1': ['압타밀 프로푸트라 뉴로마인드 1단계', '압타밀 프로푸트라 듀오어드밴스 1단계', '프로푸트라 1단계', '프로푸트라 1'],
  'profutura_2': ['압타밀 프로푸트라 뉴로마인드 2단계', '압타밀 프로푸트라 듀오어드밴스 2단계', '프로푸트라 2단계', '프로푸트라 2'],
  'profutura_3': ['압타밀 프로푸트라 뉴로마인드 3단계', '압타밀 프로푸트라 듀오어드밴스 3단계', '프로푸트라 3단계', '프로푸트라 3'],
  'ha_pre': ['압타밀 HA PRE', 'HA PRE단계'],
  'ha_1': ['압타밀 HA 1단계', 'HA 1'],
  'ha_2': ['압타밀 HA 2단계', 'HA 2'],
  'comfort': ['압타밀 컴포트', '컴포트'],
  'ar': ['압타밀 AR', 'AR'],
  'pepti': ['압타밀 펩티', '펩티'],
};

export function getModelByKey(key: string): ProductModel | undefined {
  return PRODUCT_MODELS.find((m) => m.key === key);
}

/**
 * Tier 1 소스만 필터링
 */
export function getTier1Sources(): Source[] {
  return SOURCES.filter((s) => s.tier === 1);
}

/**
 * 국가별 소스 필터링
 */
export function getSourcesByCountry(countryCode: string): Source[] {
  return SOURCES.filter((s) => s.country_code === countryCode);
}

/**
 * 국가별 Tier 1 링크 추출
 */
export function getTier1LinksByCountry(countryCode: string): string[] {
  return SOURCES.filter((s) => s.country_code === countryCode && s.tier === 1).map((s) => s.url);
}
