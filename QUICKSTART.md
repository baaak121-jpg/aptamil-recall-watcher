# 빠른 시작 가이드

## ✅ 완료된 작업

- [x] 프로젝트 구조 생성
- [x] 4개국 소스 정의 (DE, UK, IE, KR)
- [x] 독일 소스 URL 확인 완료
- [x] 테스트 통과 (43개 테스트 모두 성공)

## 🚀 로컬 테스트 시작하기

### 1. 환경 변수 설정

`.env` 파일을 열고 실제 값으로 교체하세요:

```bash
# Telegram Bot Token (BotFather에서 발급)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# OpenAI API Key
OPENAI_API_KEY=sk-proj-...your-key-here...
```

### 2. Telegram Bot 생성

1. Telegram에서 [@BotFather](https://t.me/BotFather) 검색
2. `/newbot` 명령어 입력
3. 봇 이름 입력 (예: "Aptamil Recall Watcher")
4. 봇 username 입력 (예: "aptamil_recall_bot")
5. 발급받은 토큰을 `.env`의 `TELEGRAM_BOT_TOKEN`에 입력

### 3. OpenAI API Key 발급

1. [OpenAI Platform](https://platform.openai.com/api-keys) 접속
2. "Create new secret key" 클릭
3. 발급받은 키를 `.env`의 `OPENAI_API_KEY`에 입력

### 4. 로컬 실행

```bash
npm run dev
```

성공 시 다음 메시지가 표시됩니다:
```
Starting bot in polling mode (local development)...
Bot is running. Press Ctrl+C to stop.
```

### 5. 봇 테스트

1. Telegram에서 봇을 검색 (username으로)
2. 그룹 채팅방 생성
3. 봇을 그룹에 초대
4. 명령어 테스트:

```
/help
/setup
/add
/list
/sources
```

## 📦 Vercel 배포

### 1. Vercel 프로젝트 생성

```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# 로그인
vercel login

# 배포
vercel --prod
```

### 2. Vercel KV 생성

1. Vercel 대시보드 → Storage → Create Database
2. KV 선택
3. 데이터베이스 이름 입력 (예: `aptamil-watcher-kv`)
4. Create 클릭
5. 자동으로 환경변수 연결됨

### 3. 환경변수 설정

Vercel 대시보드 → Settings → Environment Variables에서:

- `TELEGRAM_BOT_TOKEN`: 봇 토큰
- `OPENAI_API_KEY`: OpenAI 키
- `CRON_SECRET`: 임의 문자열 (선택)

### 4. Webhook 설정

배포 완료 후:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<YOUR_VERCEL_URL>/api/telegram"}'
```

또는 스크립트 사용:

```bash
chmod +x scripts/set-webhook.sh
./scripts/set-webhook.sh <BOT_TOKEN> <VERCEL_URL>
```

### 5. 크론 확인

Vercel 대시보드 → Settings → Cron Jobs에서 크론이 등록되었는지 확인

- Path: `/api/cron`
- Schedule: `0 0 * * *` (UTC 00:00 = KST 09:00)

## 🧪 테스트

### 단위 테스트

```bash
npm test
```

### 크론 수동 실행

```bash
curl -X POST "https://<YOUR_VERCEL_URL>/api/cron" \
  -H "Authorization: Bearer <YOUR_CRON_SECRET>"
```

또는 스크립트 사용:

```bash
./scripts/test-cron.sh <VERCEL_URL> <CRON_SECRET>
```

## 📝 확인된 소스 URL

### ✅ 독일 (DE)
1. Danone: `https://www.danone.de/newsroom/press-releases-list/rueckruf-vereinzelter-aptamil-chargen-de.html`
2. Aptaclub: `https://www.aptaclub.de/stellungnahme.html`

### ✅ 영국 (UK)
1. Aptaclub UK: `https://www.aptaclub.co.uk/important-product-information`
2. UK FSA: `https://www.food.gov.uk/news-alerts/search/alerts`

### ✅ 아일랜드 (IE)
1. FSAI: `https://www.fsai.ie/news_centre/food_alerts.html`

### ✅ 한국 (KR)
1. NutriciaStore: `https://www.nutriciastore.co.kr/board/notice`
2. MFDS (Tier 2): `https://www.mfds.go.kr/brd/m_99/list.do`

## 🐛 문제 해결

### "TELEGRAM_BOT_TOKEN is not set in .env"

→ `.env` 파일에 실제 봇 토큰을 입력하세요.

### "OPENAI_API_KEY is not set"

→ `.env` 파일에 실제 OpenAI API 키를 입력하세요.

### npm 경고 메시지

다음 경고들은 무시해도 됩니다 (deprecated 패키지들):
- `har-validator`, `inflight`, `rimraf`, `glob`, `request` 등
- 기능에는 영향 없음

### 보안 취약점 경고

```bash
npm audit fix
```

주요 취약점이 있다면:
```bash
npm audit fix --force
```

## 📚 추가 문서

- `README.md`: 전체 사용 가이드
- `DEPLOYMENT.md`: 상세 배포 가이드
- `SOURCES.md`: 소스 추가/관리 가이드
- `ARCHITECTURE.md`: 시스템 구조
- `FAQ.md`: 자주 묻는 질문
- `TODO.md`: 향후 개선 사항

## 🎉 완료!

이제 Aptamil Recall Watcher가 준비되었습니다!

매일 오전 9시(KST)에 자동으로 4개국 소스를 스캔하고, 
등록한 제품의 MHD와 일치하는 리콜이 발견되면 
텔레그램 그룹으로 알림을 받게 됩니다.

문의사항은 GitHub Issues로 남겨주세요!
