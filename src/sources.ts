// src/sources.ts

import { ProductModel, Source } from './types';

/**
 * 국가별 Tier 1 소스 정의
 * 원칙: 공식/규제기관/공식 스토어 우선, 국가별 최소 1~3개
 */
export const SOURCES: Source[] = [
  // ========== DE (독일) - Tier 1 ==========
  // 정부 공식 소스 (신규 추가)
  {
    source_key: 'lebensmittelwarnung_de',
    country_code: 'DE',
    tier: 1,
    url: 'https://www.lebensmittelwarnung.de/bvl-lmw-de/liste/alle/deutschlandweit/10/0',
    parse_strategy: 'LIST_ITEMS',
    reliability_label: 'Regulator',
    keywords: ['aptamil', 'milumil', 'säuglingsnahrung'],
    notes: 'Tier 1: 독일 정부 식품 경고 시스템. 목록에서 신규 항목 감지',
    last_hash: null,
    last_checked_at: null,
  },
  
  // ========== DE (독일) - Tier 1 (실제 리콜 페이지) ==========
  {
    source_key: 'danone_de_recall',
    country_code: 'DE',
    tier: 1,
    url: 'https://www.danone.de/newsroom/press-releases-list/rueckruf-vereinzelter-aptamil-chargen-de.html',
    parse_strategy: 'HTML_TEXT',
    reliability_label: 'Official',
    keywords: ['aptamil', 'profutura', 'pronutra', 'rückruf'],
    notes: 'Tier 1: 실제 리콜 공지 페이지. 키워드 필터 + 해시 비교',
    last_hash: null,
    last_checked_at: null,
  },
  {
    source_key: 'aptaclub_de_statement',
    country_code: 'DE',
    tier: 1,
    url: 'https://www.aptaclub.de/stellungnahme.html',
    parse_strategy: 'HTML_TEXT',
    reliability_label: 'Official',
    keywords: ['aptamil', 'profutura', 'pronutra', 'rückruf'],
    notes: 'Tier 1: 공식 성명서. 키워드 필터 + 해시 비교',
    last_hash: null,
    last_checked_at: null,
  },

  // ========== UK (영국) - Tier 1 ==========
  {
    source_key: 'fsa_uk_hub',
    country_code: 'UK',
    tier: 1,
    url: 'https://www.food.gov.uk/safety-hygiene/infant-formula-recalls',
    parse_strategy: 'SECTION_HASH',
    reliability_label: 'Regulator',
    sectionHeading: 'Affected products',
    keywords: ['aptamil', 'cow & gate', 'cow and gate'],
    notes: 'Tier 1: FSA 분유 리콜 허브. "Affected products" 섹션만 감시',
    last_hash: null,
    last_checked_at: null,
  },
  {
    source_key: 'fsa_uk_news_alerts',
    country_code: 'UK',
    tier: 1,
    url: 'https://www.food.gov.uk/news-alerts/search/alerts',
    parse_strategy: 'LIST_ITEMS',
    reliability_label: 'Regulator',
    keywords: ['aptamil', 'cow & gate', 'cow and gate', 'infant formula', 'danone'],
    notes: 'Tier 1: FSA 뉴스 알럿 목록. 신규 항목 감지',
    last_hash: null,
    last_checked_at: null,
  },
  
  // ========== UK (영국) - Tier 1 (증거용) ==========
  {
    source_key: 'fsa_uk_alert_example',
    country_code: 'UK',
    tier: 1,
    url: 'https://www.food.gov.uk/news-alerts/alert/fsa-prin-05-2026',
    parse_strategy: 'CONTENT_KEYWORD',
    reliability_label: 'Regulator',
    keywords: ['aptamil', 'cow & gate', 'recall'],
    notes: 'Tier 2: 개별 알럿 예시. 증거용',
    last_hash: null,
    last_checked_at: null,
  },

  // ========== IE (아일랜드) - Tier 1 ==========
  {
    source_key: 'fsai_ie_food_alerts',
    country_code: 'IE',
    tier: 1,
    url: 'https://www.fsai.ie/news-alerts/food',
    parse_strategy: 'LIST_ITEMS',
    reliability_label: 'Regulator',
    keywords: ['aptamil', 'cow gate', 'danone', 'infant formula'],
    notes: 'Tier 1: FSAI 식품 알럿 목록. 신규 항목 감지',
    last_hash: null,
    last_checked_at: null,
  },
  
  // ========== IE (아일랜드) - Tier 1 (증거용) ==========
  {
    source_key: 'fsai_ie_alert_example',
    country_code: 'IE',
    tier: 1,
    url: 'https://www.fsai.ie/news-and-alerts/food-alerts/danone-recall-of-batches-of-aptamil-and-cow-gate-i',
    parse_strategy: 'CONTENT_KEYWORD',
    reliability_label: 'Regulator',
    keywords: ['aptamil', 'cow gate', 'recall'],
    notes: 'Tier 2: 개별 알럿 예시. 증거용',
    last_hash: null,
    last_checked_at: null,
  },

  // ========== KR (한국) - Tier 1 (IMAGE_OCR) ==========
  {
    source_key: 'nutricia_kr_aptamil_program',
    country_code: 'KR',
    tier: 1,
    url: 'https://www.nutriciastore.co.kr/main/html.php?htmid=mypage/aptamil_program.html',
    parse_strategy: 'IMAGE_OCR',
    reliability_label: 'OfficialStore',
    imageSelector: 'img[src*="/data/editor/board/"]',
    notes: 'Tier 1: 압타밀 안심 프로그램. 이미지 OCR로 제조일자 추출',
    last_hash: null,
    last_checked_at: null,
  },
  
  // ========== KR (한국) - Tier 1 (공지사항 목록) ==========
  {
    source_key: 'nutricia_kr_notice',
    country_code: 'KR',
    tier: 1,
    url: 'https://www.nutriciastore.co.kr/board/list.php?bdId=notice',
    parse_strategy: 'LIST_ITEMS',
    reliability_label: 'OfficialStore',
    keywords: ['압타밀', 'aptamil', '리콜', '회수'],
    notes: 'Tier 1: NutriciaStore 공지사항. 목록에서 신규 항목 감지',
    last_hash: null,
    last_checked_at: null,
  },
  
  // ========== KR (한국) - Tier 1 (참고용) ==========
  {
    source_key: 'mfds_kr',
    country_code: 'KR',
    tier: 1,
    url: 'https://www.mfds.go.kr/brd/m_99/list.do',
    parse_strategy: 'HTML_TEXT',
    reliability_label: 'Regulator',
    keywords: ['압타밀', 'aptamil'],
    notes: 'Tier 2: MFDS 보도자료. 키워드 필터 적용',
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
