# 국가별 소스 확장 구현 완료 요약

## 변경 사항 개요

기존 독일(DE) 전용 모니터링 시스템을 **4개국(DE, UK, IE, KR)** 으로 확장했습니다.

## 주요 변경 파일

### 1. 타입 정의 확장 (`src/types.ts`)

```typescript
// 추가된 타입
export type CountryCode = 'DE' | 'UK' | 'IE' | 'KR';
export type ParseStrategy = 'HTML_TEXT' | 'TABLE_DATES' | 'CHECKER_LINK';
export type ReliabilityLabel = 'Official' | 'Regulator' | 'OfficialStore';

// Source 인터페이스 확장
export interface Source {
  source_key: string;
  country_code: CountryCode;        // 추가
  tier: 1 | 2;                      // 추가
  url: string;
  parse_strategy: ParseStrategy;    // 추가
  reliability_label: ReliabilityLabel; // 추가
  notes?: string;                   // 추가
  last_hash: string | null;
  last_checked_at: string | null;
}

// ScanResult에 국가 정보 추가
export interface ScanResult {
  source_key: string;
  country_code: CountryCode;        // 추가
  tier: 1 | 2;                      // 추가
  changed: boolean;
  error?: string;
  extracted_dates: string[];
  matched_items: RegisteredItem[];
  uncertain_items: RegisteredItem[];
}

// 국가별 결과 타입 추가
export interface CountryResult {
  country_code: CountryCode;
  changed: boolean;
  matched_count: number;
  uncertain_count: number;
  unmatched_count: number;
  tier1_links: string[];
}

// DailyReport에 국가별 결과 추가
export interface DailyReport {
  // ... 기존 필드
  country_results: CountryResult[]; // 추가
}
```

### 2. 소스 정의 확장 (`src/sources.ts`)

**국가별 Tier 1 소스 7개 정의:**

| 국가 | 소스 | Tier | 신뢰도 | 파싱 전략 |
|------|------|------|--------|-----------|
| 🇩🇪 DE | Danone DE | 1 | Official | HTML_TEXT |
| 🇩🇪 DE | Aptaclub DE | 1 | Official | HTML_TEXT |
| 🇬🇧 UK | Aptaclub UK | 1 | Official | CHECKER_LINK |
| 🇬🇧 UK | UK FSA | 1 | Regulator | TABLE_DATES |
| 🇮🇪 IE | FSAI | 1 | Regulator | TABLE_DATES |
| 🇰🇷 KR | NutriciaStore KR | 1 | OfficialStore | HTML_TEXT |
| 🇰🇷 KR | MFDS | 2 | Regulator | HTML_TEXT |

**추가된 헬퍼 함수:**
```typescript
getTier1Sources(): Source[]
getSourcesByCountry(countryCode: string): Source[]
getTier1LinksByCountry(countryCode: string): string[]
```

### 3. 스캐너 업데이트 (`src/scanner.ts`)

- `ScanResult`에 `country_code`, `tier` 필드 포함
- 기존 로직 유지 (변경 없음)

### 4. 알림 메시지 확장 (`src/notifier.ts`)

**국가별 결과 섹션 추가:**
```
🌍 국가별 결과:
🇩🇪 DE: 변경 없음, 해당 0 / 확인필요 0
🇬🇧 UK: 변경 없음, 해당 0 / 확인필요 0
🇮🇪 IE: 변경 없음, 해당 0 / 확인필요 0
🇰🇷 KR: 변경 없음, 해당 0 / 확인필요 0
```

**추가된 함수:**
```typescript
formatCountryResults(countryResults: CountryResult[]): string
getCountryFlag(countryCode: string): string
```

### 5. 크론 로직 업데이트 (`api/cron.ts`)

**주요 변경:**
- Tier 1 소스만 스캔 (`getTier1Sources()`)
- 국가별 결과 생성 (`generateCountryResults()`)
- Tier 1 링크만 메시지에 포함

**추가된 함수:**
```typescript
generateCountryResults(scanResults: ScanResult[], allItems: any[]): CountryResult[]
```

### 6. LLM 요약 업데이트 (`src/llm.ts`)

- 소스 정보에 국가 코드 포함: `[DE] danone_de: ...`
- 프롬프트에 "국가별로 간결히 설명" 추가

## 새로운 문서

### 1. `SOURCES.md` (신규)
- 국가별 소스 상세 가이드
- 파싱 전략 설명
- 소스 추가 가이드
- URL 확인 방법
- 유지보수 체크리스트

### 2. `CHANGELOG.md` (신규)
- v1.0.0: 초기 릴리스 (독일 전용)
- v1.1.0: 국가별 소스 확장

### 3. 업데이트된 문서
- `README.md`: 국가별 소스 정보 추가
- `TODO.md`: 국가별 URL 확인 체크리스트
- `DEPLOYMENT.md`: 소스 URL 확인 방법 추가

## 테스트

### 1. `tests/sources.test.ts` (신규)
- 국가별 소스 존재 확인
- Tier 1 소스 검증
- 파싱 전략 유효성 검증
- 신뢰도 라벨 검증
- 국가별 링크 추출 테스트

### 2. 업데이트된 테스트
- `tests/scanner.test.ts`: 새로운 Source 타입 반영

## 파싱 전략

### HTML_TEXT (기본)
- 일반 HTML 텍스트 추출
- 스크립트/스타일 제거
- 날짜 패턴 정규식 추출
- **사용**: Danone DE, Aptaclub DE, NutriciaStore KR, MFDS

### TABLE_DATES (향후 구현)
- 표/리스트 구조에서 날짜 추출
- Expiry date, Best before 키워드 주변 우선
- **사용**: UK FSA, FSAI

### CHECKER_LINK (향후 구현)
- 공식 체커 페이지 (배치 번호 조회)
- 자동 판정 어려움 → WATCH + 링크 제공
- **사용**: Aptaclub UK

## 데일리 리포트 예시

```markdown
🍼 Aptamil Recall Watcher — 2026-02-11 (KST)

📊 위험도: INFO
🔄 변경 감지: 없음
✅ 내 MHD 결과: 해당 0개 / 확인필요 0개 / 비해당 3개

🌍 국가별 결과:
🇩🇪 DE: 변경 없음, 해당 0 / 확인필요 0
🇬🇧 UK: 변경 없음, 해당 0 / 확인필요 0
🇮🇪 IE: 변경 없음, 해당 0 / 확인필요 0
🇰🇷 KR: 변경 없음, 해당 0 / 확인필요 0

📝 요약:
변경 사항 없음. 모든 소스가 이전 스캔과 동일합니다.

🔗 근거 링크 (Tier 1):
- https://www.danone.de/rueckrufe
- https://www.aptaclub.de/wichtige-informationen
- https://www.aptaclub.co.uk/important-product-information
- https://www.food.gov.uk/news-alerts/search/alerts
- https://www.fsai.ie/news_centre/food_alerts.html
- https://www.nutriciastore.co.kr/board/notice
```

## 배포 전 체크리스트

### 긴급 (배포 전 필수)
- [ ] **독일 소스 URL 확인**
  - `https://www.danone.de/rueckrufe` (TODO)
  - `https://www.aptaclub.de/wichtige-informationen` (TODO)

### 확인 완료 (배포 가능)
- [x] 영국 소스 URL
- [x] 아일랜드 소스 URL
- [x] 한국 소스 URL

### 테스트
- [x] 단위 테스트 작성 (`sources.test.ts`)
- [x] 기존 테스트 업데이트
- [ ] 로컬 테스트 실행 (`npm test`)
- [ ] 크론 수동 실행 테스트

### 문서
- [x] `SOURCES.md` 작성
- [x] `CHANGELOG.md` 작성
- [x] `README.md` 업데이트
- [x] `TODO.md` 업데이트

## 개발량 최소화 원칙 준수

✅ **기존 구조 유지**
- 기존 파일 구조 그대로 유지
- 핵심 로직 변경 최소화
- 타입 확장만으로 대부분 처리

✅ **소스 수 제한**
- 국가별 1~3개 소스만
- Tier 1만 자동 판정
- Tier 2는 참고 링크만

✅ **파싱 실패 대응**
- 변경 감지 우선 (해시 비교)
- 파싱 실패 시 WATCH 처리
- 항상 링크 제공

✅ **점진적 개선**
- v1: 변경 감지 + 기본 파싱
- v2: 보안 개선
- v3: 다중 그룹 지원
- v4: 고급 파싱 (TABLE_DATES, CHECKER_LINK)

## 향후 개선 사항

### v2 (보안)
- 그룹 관리자 권한 체크
- Webhook secret 검증
- Rate limiting

### v3 (기능)
- 다중 그룹 지원
- 개인 DM 지원
- 모델 매핑 개선
- LOT 번호 지원

### v4 (파서)
- TABLE_DATES 전략 구현
- CHECKER_LINK 전략 구현
- PDF 파싱 지원
- 다국어 키워드 인식

## 실행 방법

### 로컬 테스트
```bash
npm install
npm test
npm run dev
```

### 배포
```bash
vercel --prod
```

### 크론 수동 실행
```bash
./scripts/test-cron.sh https://your-project.vercel.app
```

## 문의 및 지원

- GitHub Issues: 버그 리포트 및 기능 제안
- `SOURCES.md`: 소스 추가/변경 가이드
- `FAQ.md`: 자주 묻는 질문
- `DEPLOYMENT.md`: 배포 가이드

---

**구현 완료일**: 2026-02-11  
**버전**: v1.1.0  
**개발자**: Cursor AI Assistant
