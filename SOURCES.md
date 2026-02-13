# 모니터링 소스 가이드

## 국가별 소스 전략

Aptamil Recall Watcher는 4개국(DE, UK, IE, KR)의 공식 소스를 모니터링합니다.

### 원칙

1. **공식/규제기관/공식 스토어 우선**
2. **국가별 Tier 1 소스 1~3개로 제한** (개발량 최소화)
3. **Tier 1만 자동 판정에 사용**, Tier 2는 참고 링크만
4. **파싱 실패 시 WATCH 처리** + 링크 제공

## 국가별 소스 상세

### 🇩🇪 독일 (DE)

#### Tier 1

**1. Danone/Nutricia Germany 공식 리콜 페이지**
- URL: `https://www.danone.de/rueckrufe` (TODO: 확인 필요)
- 파싱 전략: `HTML_TEXT`
- 신뢰도: `Official`
- 설명: Danone 독일 공식 웹사이트의 리콜 섹션
- 주의: 실제 URL 확인 필요. 가능한 대체 URL:
  - `https://www.danone.de/produktrueckrufe`
  - `https://www.aptamil.de/rueckrufe`

**2. Aptaclub DE 공식 공지/리콜 페이지**
- URL: `https://www.aptaclub.de/wichtige-informationen` (TODO: 확인 필요)
- 파싱 전략: `HTML_TEXT`
- 신뢰도: `Official`
- 설명: Aptaclub 독일 공식 사이트의 중요 정보 섹션
- 주의: 실제 URL 확인 필요

### 🇬🇧 영국 (UK)

#### Tier 1

**1. Aptaclub UK Important Product Information**
- URL: `https://www.aptaclub.co.uk/important-product-information`
- 파싱 전략: `CHECKER_LINK`
- 신뢰도: `Official`
- 설명: Aptaclub UK 공식 리콜 체커 페이지
- 특징: 
  - 배치 번호 조회 도구 포함
  - 자동 판정 어려울 수 있으나 링크 제공 필수
  - 변경 감지 시 WATCH 처리

**2. UK Food Standards Agency (FSA)**
- URL: `https://www.food.gov.uk/news-alerts/search/alerts`
- 파싱 전략: `TABLE_DATES`
- 신뢰도: `Regulator`
- 설명: 영국 식품 규제 기관의 공식 리콜 알림
- 특징:
  - FSA-PRIN-xx-2026 형태의 문서 번호
  - 테이블 형식으로 제품 정보 제공
  - Best before 날짜 추출 가능

### 🇮🇪 아일랜드 (IE)

#### Tier 1

**1. Food Safety Authority of Ireland (FSAI)**
- URL: `https://www.fsai.ie/news_centre/food_alerts.html`
- 파싱 전략: `TABLE_DATES`
- 신뢰도: `Regulator`
- 설명: 아일랜드 식품안전청 공식 리콜 공지
- 특징:
  - 테이블 형식으로 리콜 정보 제공
  - Expiry date 명시
  - 제품명, 배치 번호, 날짜 포함

### 🇰🇷 한국 (KR)

#### Tier 1

**1. NutriciaStore Korea 공지사항**
- URL: `https://www.nutriciastore.co.kr/board/notice`
- 파싱 전략: `HTML_TEXT`
- 신뢰도: `OfficialStore`
- 설명: Nutricia 한국 공식 온라인 스토어 공지사항
- 특징:
  - 리콜/안전 안내 게시 시 해시 변경 감지 중심
  - 페이지 구조 변경 가능성 높음
  - v1은 변경 감지 + WATCH 처리 중심
  - 파싱은 가능한 범위에서만

#### Tier 2 (참고 링크만)

**2. MFDS (식품의약품안전처)**
- URL: `https://www.mfds.go.kr/brd/m_99/list.do`
- 파싱 전략: `HTML_TEXT`
- 신뢰도: `Regulator`
- 설명: 식약처 보도자료/공지
- 특징:
  - Tier 2로 자동 판정에 사용 안 함
  - 근거 링크로만 제공
  - 해당 이슈 관련 안내 페이지 참고용

## 파싱 전략 설명

### HTML_TEXT
- 일반 HTML 텍스트 추출
- 스크립트/스타일 제거 후 본문 텍스트만 추출
- 날짜 패턴 정규식으로 추출
- 사용: 대부분의 공지 페이지

### TABLE_DATES
- 표/리스트 구조에서 날짜 추출에 집중
- Expiry date, Best before 등의 키워드 주변 날짜 우선
- 테이블 행 단위로 파싱
- 사용: FSA, FSAI 등 규제기관

### CHECKER_LINK
- 공식 체커 페이지 (배치 번호 조회 도구 등)
- 자동 판정 어려움
- 변경 감지 시 WATCH + 링크 제공
- 사용: Aptaclub UK

## 소스 추가 가이드

새로운 국가/소스를 추가하려면:

1. `src/types.ts`의 `CountryCode` 타입에 국가 코드 추가
2. `src/sources.ts`의 `SOURCES` 배열에 소스 정의 추가
3. `src/notifier.ts`의 `getCountryFlag()` 함수에 국기 이모지 추가
4. 테스트 실행 및 파싱 결과 확인

### 예시: 프랑스(FR) 추가

```typescript
// src/types.ts
export type CountryCode = 'DE' | 'UK' | 'IE' | 'KR' | 'FR';

// src/sources.ts
{
  source_key: 'danone_fr',
  country_code: 'FR',
  tier: 1,
  url: 'https://www.danone.fr/rappels',
  parse_strategy: 'HTML_TEXT',
  reliability_label: 'Official',
  notes: 'Danone France 공식 리콜 페이지',
  last_hash: null,
  last_checked_at: null,
}

// src/notifier.ts
function getCountryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    DE: '🇩🇪',
    UK: '🇬🇧',
    IE: '🇮🇪',
    KR: '🇰🇷',
    FR: '🇫🇷',  // 추가
  };
  return flags[countryCode] || '🌐';
}
```

## 소스 URL 확인 방법

### 1. 공식 웹사이트 방문
- 제조사 공식 웹사이트 (Danone, Nutricia, Aptamil)
- "Recall", "Rückruf", "Product Safety" 등의 키워드 검색

### 2. 규제기관 웹사이트
- 각 국가의 식품안전청/식약처 웹사이트
- "Food Alerts", "Product Recalls" 섹션 확인

### 3. URL 검증
- 실제 페이지 접근 가능 여부 확인
- HTML 구조 확인 (개발자 도구)
- 날짜 정보 포함 여부 확인

### 4. 테스트
- 로컬에서 `npm run dev` 실행
- 크론 수동 실행: `scripts/test-cron.sh`
- 파싱 결과 확인

## 파싱 실패 대응

### v1 전략: 보수적 접근

1. **변경 감지 우선**
   - 해시 비교로 변경 감지
   - 파싱 실패해도 변경 사실은 알림

2. **WATCH 처리**
   - 파싱 실패 시 WATCH 라벨
   - "공식 링크에서 수동 확인 필요" 문구 포함

3. **링크 제공**
   - 항상 Tier 1 링크 제공
   - 사용자가 직접 확인 가능

4. **에러 로깅**
   - 파싱 실패 로그 기록
   - 향후 개선에 활용

## 유지보수

### 정기 확인 사항

- [ ] 소스 URL 유효성 (월 1회)
- [ ] 파싱 성공률 (주 1회)
- [ ] 새로운 리콜 공지 형식 (발견 시)
- [ ] 웹사이트 구조 변경 (발견 시)

### 소스 URL 변경 시

1. `src/sources.ts` 업데이트
2. 로컬 테스트
3. 재배포
4. 다음날 리포트 확인

## 참고 자료

- [UK FSA Product Recalls](https://www.food.gov.uk/news-alerts/search/alerts)
- [FSAI Food Alerts](https://www.fsai.ie/news_centre/food_alerts.html)
- [MFDS 식약처](https://www.mfds.go.kr/)
- [Aptaclub UK](https://www.aptaclub.co.uk/)
- [NutriciaStore Korea](https://www.nutriciastore.co.kr/)
