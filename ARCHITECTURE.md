# 아키텍처 문서

## 시스템 개요

Aptamil Recall Watcher는 Telegram 봇 기반의 서버리스 모니터링 시스템입니다.

### 핵심 구성 요소

```
┌─────────────────┐
│  Telegram Bot   │ ← 사용자 인터페이스
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vercel Function │ ← Webhook Handler (api/telegram.ts)
│  (Webhook)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Bot Handler   │ ← 명령어 라우팅 (src/bot.ts)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Vercel KV     │ ← 영구 저장소
│  (Redis-like)   │
└─────────────────┘

┌─────────────────┐
│  Vercel Cron    │ ← 매일 09:00 KST
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cron Function   │ ← Daily Scan (api/cron.ts)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Scanner      │ ← 소스 스캔 (src/scanner.ts)
└────────┬────────┘
         │
         ├─→ Fetch HTML
         ├─→ Normalize (src/parser.ts)
         ├─→ Hash & Compare
         ├─→ Extract Dates
         └─→ Match Items
         │
         ▼
┌─────────────────┐
│      LLM        │ ← 요약 생성 (src/llm.ts)
│   (OpenAI)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Notifier      │ ← 리포트 전송 (src/notifier.ts)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Telegram Bot   │ ← 그룹 메시지
└─────────────────┘
```

## 데이터 플로우

### 1. 사용자 명령어 처리

```
사용자 → Telegram → Webhook → Bot Handler → KV Store
                                     ↓
                                  응답 메시지
                                     ↓
                                  Telegram
```

### 2. 데일리 스캔

```
Cron (09:00 KST)
  ↓
Load Items & Sources (KV)
  ↓
Scan All Sources (parallel)
  ├─→ Source 1: Fetch → Normalize → Hash → Extract Dates
  └─→ Source 2: Fetch → Normalize → Hash → Extract Dates
  ↓
Match Items (Exact match)
  ↓
Determine Risk Level (INFO/WATCH/ACTION)
  ↓
Generate Summary (LLM, if changed)
  ↓
Format Report
  ↓
Send to Telegram Group
```

## 모듈 구조

### src/types.ts
- 모든 타입 정의
- `ProductModel`, `RegisteredItem`, `Source`, `ScanResult`, `DailyReport` 등

### src/sources.ts
- 모니터링 소스 정의 (`SOURCES`)
- 제품 모델 리스트 (`PRODUCT_MODELS`)
- 하드코딩된 데이터 관리

### src/store.ts
- Vercel KV 추상화 레이어
- CRUD 함수: `loadStore`, `saveStore`, `addItem`, `removeItem` 등
- 단일 키 (`aptamil_watcher_data`)로 모든 데이터 저장

### src/parser.ts
- HTML 정규화: `normalizeHtml`
- 해시 생성: `generateHash`
- 날짜 추출: `extractDates`
- 유효성 검증: `isValidDate`, `parseUserDate`

### src/scanner.ts
- 소스 스캔: `scanSource`, `scanAllSources`
- 변경 감지 (해시 비교)
- 날짜 추출 및 매칭
- 에러 핸들링

### src/llm.ts
- OpenAI API 호출
- 3줄 요약 생성: `generateSummary`
- 변경 시에만 호출 (비용 최소화)

### src/notifier.ts
- 리포트 포맷팅: `formatDailyReport`
- Telegram 메시지 전송: `sendDailyReport`
- Markdown 형식 지원

### src/bot.ts
- 명령어 라우팅: `handleCommand`
- Conversation state 관리 (메모리 기반)
- 콜백 쿼리 처리: `handleCallbackQuery`
- 명령어 핸들러: `/setup`, `/add`, `/list`, `/remove`, `/sources`, `/help`

### src/local.ts
- 로컬 개발용 polling 모드
- Webhook 대신 long polling 사용

### api/telegram.ts
- Vercel Serverless Function
- Telegram Webhook 엔드포인트
- `POST /api/telegram`

### api/cron.ts
- Vercel Serverless Function
- 크론 엔드포인트
- `POST /api/cron` (매일 09:00 KST)

## 데이터 모델

### StoreData (Vercel KV)

```typescript
{
  group_chat_id: number | null,
  items: RegisteredItem[],
  sources: Source[],
  notices: NoticeSnapshot[]
}
```

### RegisteredItem

```typescript
{
  id: string,              // UUID
  model_key: string,       // 예: "pronutra_pre"
  model_label: string,     // 예: "Aptamil Pronutra PRE"
  mhd: string,             // DD-MM-YYYY
  created_at: string       // ISO timestamp
}
```

### Source

```typescript
{
  source_key: string,      // 예: "danone_de"
  url: string,
  last_hash: string | null,
  last_checked_at: string | null
}
```

### NoticeSnapshot

```typescript
{
  source_key: string,
  timestamp: string,
  hash: string,
  raw_text: string,        // 최대 5000자
  extracted_dates: string[]
}
```

## 위험도 라벨링 로직

```typescript
if (matched_count > 0) {
  risk_level = 'ACTION'    // 내 항목과 Exact match
} else if (changed_sources > 0 || uncertain_count > 0) {
  risk_level = 'WATCH'     // 변경 감지 또는 확인 필요
} else {
  risk_level = 'INFO'      // 변경 없음
}
```

## 매칭 로직

### Exact Match

```typescript
// 등록된 MHD가 추출된 날짜 리스트에 포함되는지 확인
for (const item of registeredItems) {
  if (extractedDates.includes(item.mhd)) {
    matched.push(item);
  }
}
```

### 확인 필요 (Uncertain)

- 변경 감지는 있으나 날짜 추출 실패
- 또는 파싱이 불완전한 경우

## 서버리스 제약 사항

### 1. Stateless
- 각 함수 호출은 독립적
- Conversation state는 메모리 기반 (제한적)
- 영구 데이터는 KV에 저장

### 2. Cold Start
- 첫 호출 시 지연 발생 가능
- 자주 사용되는 함수는 warm 상태 유지

### 3. 실행 시간 제한
- Webhook: 최대 10초
- Cron: 최대 60초
- 초과 시 타임아웃

### 4. 메모리 제한
- 각 함수: 1024MB
- 큰 HTML 파싱 시 주의

## 보안 고려사항

### 현재 구현 (v1)

- ✅ HTTPS 통신 (Telegram, OpenAI)
- ✅ 환경변수로 민감 정보 관리
- ⚠️ 그룹 권한 체크 없음 (누구나 명령어 실행 가능)
- ⚠️ Webhook secret 검증 없음

### 향후 개선 (v2)

- [ ] 그룹 관리자 권한 체크
- [ ] Webhook secret 검증
- [ ] Rate limiting
- [ ] 입력 검증 강화

## 비용 최적화

### LLM 호출 최소화
- 변경 감지 시에만 호출
- 변경 없을 때는 고정 문구 사용
- 모델: `gpt-4o-mini` (저비용)

### KV 저장소 최소화
- 최근 3개 스냅샷만 유지
- 불필요한 데이터 저장 안 함

### 함수 실행 시간 최소화
- 병렬 스캔 (`Promise.all`)
- 타임아웃 설정

## 확장성

### 다중 그룹 지원 (v3)

현재 구조를 다음과 같이 변경:

```typescript
// Before (v1)
{
  group_chat_id: number | null,
  items: RegisteredItem[]
}

// After (v3)
{
  groups: {
    [chat_id: string]: {
      items: RegisteredItem[],
      settings: GroupSettings
    }
  }
}
```

### 다중 소스 확장

`sources.ts`에 새 소스 추가:

```typescript
export const SOURCES: Source[] = [
  { source_key: 'danone_de', url: '...' },
  { source_key: 'aptaclub_de', url: '...' },
  { source_key: 'new_source', url: '...' },  // 추가
];
```

## 테스트 전략

### 단위 테스트
- `parser.test.ts`: HTML 정규화, 날짜 추출
- `scanner.test.ts`: 스캔 로직, 매칭

### 통합 테스트
- `integration.test.ts`: 실제 HTML fixture 사용

### E2E 테스트 (향후)
- Telegram Bot API 모킹
- 전체 플로우 테스트

## 모니터링

### 로그
- `console.log`: Vercel 대시보드에서 확인
- 에러 로그: `console.error`

### 메트릭 (향후)
- 스캔 성공률
- 매칭 통계
- 사용자 수

### 알림 (향후)
- 스캔 실패 시 관리자 알림
- 크론 실행 실패 시 알림

## 배포 전략

### 환경 분리 (향후)
- Development: `dev` 브랜치
- Staging: `staging` 브랜치
- Production: `main` 브랜치

### CI/CD (향후)
- GitHub Actions
- 자동 테스트 → 배포

### 롤백
- Vercel 대시보드에서 이전 배포로 롤백 가능
