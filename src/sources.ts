// src/sources.ts

import { ProductModel, Source } from './types';

/**
 * 국가별 Tier 1 소스 정의
 * 원칙: 공식/규제기관/공식 스토어 우선, 국가별 최소 1~3개
 */
export const SOURCES: Source[] = [
  // ========== DE (독일) ==========
  {
    source_key: 'danone_de',
    country_code: 'DE',
    tier: 1,
    url: 'https://www.danone.de/newsroom/press-releases-list/rueckruf-vereinzelter-aptamil-chargen-de.html',
    parse_strategy: 'HTML_TEXT',
    reliability_label: 'Official',
    notes: 'Danone 독일 공식 Aptamil 리콜 공지 페이지 (확인 완료)',
    last_hash: null,
    last_checked_at: null,
  },
  {
    source_key: 'aptaclub_de',
    country_code: 'DE',
    tier: 1,
    url: 'https://www.aptaclub.de/stellungnahme.html',
    parse_strategy: 'HTML_TEXT',
    reliability_label: 'Official',
    notes: 'Aptaclub DE 공식 성명/리콜 페이지 (확인 완료)',
    last_hash: null,
    last_checked_at: null,
  },

  // ========== UK (영국) ==========
  {
    source_key: 'aptaclub_uk',
    country_code: 'UK',
    tier: 1,
    url: 'https://www.aptaclub.co.uk/important-product-information',
    parse_strategy: 'CHECKER_LINK',
    reliability_label: 'Official',
    notes: 'Aptaclub UK 공식 리콜 체커 페이지. 자동 판정 어려울 수 있으나 링크 제공 필수',
    last_hash: null,
    last_checked_at: null,
  },
  {
    source_key: 'fsa_uk',
    country_code: 'UK',
    tier: 1,
    url: 'https://www.food.gov.uk/news-alerts/search/alerts',
    parse_strategy: 'TABLE_DATES',
    reliability_label: 'Regulator',
    notes: 'UK Food Standards Agency 제품 리콜 공지. FSA-PRIN-xx-2026 형태 문서 포함',
    last_hash: null,
    last_checked_at: null,
  },

  // ========== IE (아일랜드) ==========
  {
    source_key: 'fsai_ie',
    country_code: 'IE',
    tier: 1,
    url: 'https://www.fsai.ie/news_centre/food_alerts.html',
    parse_strategy: 'TABLE_DATES',
    reliability_label: 'Regulator',
    notes: 'Food Safety Authority of Ireland 공식 리콜 공지. 테이블/expiry date 포함',
    last_hash: null,
    last_checked_at: null,
  },

  // ========== KR (한국) ==========
  {
    source_key: 'nutricia_kr',
    country_code: 'KR',
    tier: 1,
    url: 'https://www.nutriciastore.co.kr/board/notice',
    parse_strategy: 'HTML_TEXT',
    reliability_label: 'OfficialStore',
    notes: 'NutriciaStore Korea 공지사항. 리콜/안전 안내 게시 시 해시 변경 감지 중심',
    last_hash: null,
    last_checked_at: null,
  },
  {
    source_key: 'mfds_kr',
    country_code: 'KR',
    tier: 2,
    url: 'https://www.mfds.go.kr/brd/m_99/list.do',
    parse_strategy: 'HTML_TEXT',
    reliability_label: 'Regulator',
    notes: 'MFDS(식약처) 보도자료/공지. Tier 2로 참고 링크만 포함',
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
