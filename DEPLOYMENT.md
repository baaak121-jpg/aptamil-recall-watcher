# 배포 가이드

## Vercel 배포 단계별 가이드

### 1단계: Vercel 계정 생성 및 프로젝트 연결

1. [Vercel](https://vercel.com) 가입
2. GitHub 계정 연동
3. 이 저장소를 GitHub에 푸시
4. Vercel에서 "New Project" 클릭
5. GitHub 저장소 선택 및 Import

### 2단계: 환경변수 설정

Vercel 프로젝트 대시보드에서:

1. Settings → Environment Variables
2. 다음 변수 추가:

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `TELEGRAM_BOT_TOKEN` | BotFather에서 발급받은 토큰 | ✅ |
| `OPENAI_API_KEY` | OpenAI API 키 | ✅ |
| `CRON_SECRET` | 크론 엔드포인트 보안용 (임의 문자열) | ⚠️ 권장 |

### 3단계: Vercel KV 데이터베이스 생성

1. Vercel 프로젝트 대시보드 → Storage 탭
2. "Create Database" 클릭
3. "KV" 선택
4. 데이터베이스 이름 입력 (예: `aptamil-watcher-kv`)
5. "Create" 클릭
6. 자동으로 환경변수 연결됨 (`KV_REST_API_URL`, `KV_REST_API_TOKEN`)

### 4단계: 배포

```bash
# Vercel CLI로 배포
vercel --prod

# 또는 GitHub에 푸시하면 자동 배포
git push origin main
```

### 5단계: Webhook 설정

배포 완료 후 생성된 URL로 Telegram webhook 설정:

```bash
# YOUR_BOT_TOKEN을 실제 토큰으로 교체
# YOUR_VERCEL_URL을 실제 Vercel URL로 교체
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<YOUR_VERCEL_URL>/api/telegram"}'
```

성공 응답 예시:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### 6단계: Webhook 확인

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

응답 예시:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-project.vercel.app/api/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

### 7단계: 크론 작동 확인

Vercel 대시보드에서:

1. Settings → Cron Jobs
2. 크론이 등록되었는지 확인
3. 다음날 09:00 KST에 자동 실행됨

**수동 테스트** (선택):

```bash
# CRON_SECRET을 설정한 경우
curl -X POST "https://<YOUR_VERCEL_URL>/api/cron" \
  -H "Authorization: Bearer <YOUR_CRON_SECRET>"

# CRON_SECRET을 설정하지 않은 경우
curl -X POST "https://<YOUR_VERCEL_URL>/api/cron"
```

## KST 09:00 크론 설정 설명

Vercel의 크론은 UTC 기준으로 동작합니다.

- **KST 09:00** = **UTC 00:00** (한국은 UTC+9)
- `vercel.json`의 `"schedule": "0 0 * * *"`는 UTC 00:00 (= KST 09:00)

만약 다른 시간으로 변경하려면:

| KST 시간 | UTC 시간 | Cron 표현식 |
|----------|----------|-------------|
| 06:00 | 21:00 (전날) | `0 21 * * *` |
| 09:00 | 00:00 | `0 0 * * *` |
| 12:00 | 03:00 | `0 3 * * *` |
| 18:00 | 09:00 | `0 9 * * *` |

## 로컬 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. `.env` 파일 생성

```env
TELEGRAM_BOT_TOKEN=your_bot_token
OPENAI_API_KEY=your_openai_key
```

### 3. Vercel KV 로컬 에뮬레이션 (선택)

Vercel KV는 로컬에서 Redis 에뮬레이터가 필요합니다:

```bash
# Redis 설치 (macOS)
brew install redis

# Redis 실행
redis-server

# .env에 추가
KV_REST_API_URL=http://localhost:6379
KV_REST_API_TOKEN=local_token
```

또는 Vercel의 실제 KV를 사용:

```bash
# Vercel CLI로 환경변수 가져오기
vercel env pull .env.local
```

### 4. 로컬 실행

```bash
npm run dev
```

**주의**: 로컬 실행 시 webhook을 비활성화해야 합니다:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

## 문제 해결

### Webhook이 작동하지 않음

1. Webhook 정보 확인:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

2. Vercel 함수 로그 확인:
   - Vercel 대시보드 → Functions → Logs

3. Webhook 재설정:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://<YOUR_VERCEL_URL>/api/telegram"}'
   ```

### 크론이 실행되지 않음

1. Vercel Pro 플랜 필요 여부 확인 (무료 플랜은 제한적)
2. `vercel.json`의 크론 설정 확인
3. Vercel 대시보드에서 크론 로그 확인

### KV 연결 오류

1. Vercel KV가 프로젝트에 연결되었는지 확인
2. 환경변수 확인:
   ```bash
   vercel env ls
   ```
3. 필요 시 KV 재연결:
   - Storage → KV → Connect to Project

### 비용 최적화

- **LLM 호출**: 변경 감지 시에만 호출 (현재 구현됨)
- **Vercel 함수**: 메모리 1024MB, 최대 실행 시간 60초 (필요 시 조정)
- **KV 저장소**: 최소 데이터만 저장 (최근 3개 스냅샷만 유지)

## 모니터링 소스 URL 업데이트

`src/sources.ts` 파일에서 실제 URL 확인 및 업데이트:

```typescript
export const SOURCES: Source[] = [
  {
    source_key: 'danone_de',
    url: 'https://www.danone.de/rueckrufe', // TODO: 실제 URL 확인
    last_hash: null,
    last_checked_at: null,
  },
  {
    source_key: 'aptaclub_de',
    url: 'https://www.aptaclub.de/wichtige-informationen', // TODO: 실제 URL 확인
    last_hash: null,
    last_checked_at: null,
  },
];
```

**확인 방법**:
1. Danone 독일 공식 웹사이트 방문
2. 리콜/공지 페이지 찾기
3. URL 복사 후 `sources.ts`에 업데이트
4. 재배포

## 배포 체크리스트

- [ ] Telegram Bot 생성 완료
- [ ] Vercel 프로젝트 생성 완료
- [ ] 환경변수 설정 완료 (`TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`)
- [ ] Vercel KV 생성 및 연결 완료
- [ ] 배포 완료 (Vercel URL 확인)
- [ ] Webhook 설정 완료 (getWebhookInfo로 확인)
- [ ] 크론 등록 확인 (Vercel 대시보드)
- [ ] 소스 URL 업데이트 (`src/sources.ts`)
- [ ] 테스트 그룹에서 `/setup` 실행
- [ ] 테스트 제품 등록 (`/add`)
- [ ] 다음날 09:00 KST 리포트 수신 확인

## 추가 리소스

- [Vercel 문서](https://vercel.com/docs)
- [Vercel KV 문서](https://vercel.com/docs/storage/vercel-kv)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [OpenAI API](https://platform.openai.com/docs)
