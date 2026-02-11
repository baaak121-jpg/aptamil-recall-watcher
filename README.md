# Aptamil Recall Watcher

Telegram 봇 기반 Aptamil 분유 리콜 모니터링 시스템. 매일 공식 소스를 스캔하고 등록된 제품의 MHD(유통기한)와 매칭하여 그룹 채팅방으로 알림을 전송합니다.

## 주요 기능

- ✅ 텔레그램 그룹 채팅방으로 매일 09:00 KST 자동 리포트 전송
- ✅ Aptamil 제품 모델 + MHD 등록/관리
- ✅ 4개국 공식 소스 모니터링 (DE, UK, IE, KR)
- ✅ 국가별 Tier 1 소스 자동 스캔 (공식/규제기관/공식 스토어)
- ✅ Exact match 기반 보수적 매칭
- ✅ 변경 감지 시 LLM 기반 3줄 요약
- ✅ 위험도 라벨링 (INFO/WATCH/ACTION)
- ✅ 국가별 결과 섹션 포함

## 기술 스택

- **언어**: TypeScript (Node 18+)
- **배포**: Vercel (Serverless Functions + Cron)
- **저장소**: Vercel KV
- **봇**: Telegram Bot API (Webhook)
- **LLM**: OpenAI GPT-4o-mini

## 프로젝트 구조

```
.
├── src/
│   ├── types.ts          # 타입 정의
│   ├── sources.ts        # 모니터링 소스 및 제품 모델 정의
│   ├── store.ts          # Vercel KV 저장소 추상화
│   ├── parser.ts         # HTML 정규화 및 날짜 추출
│   ├── scanner.ts        # 소스 스캔 및 매칭 로직
│   ├── llm.ts            # OpenAI 요약 생성
│   ├── notifier.ts       # 텔레그램 메시지 포맷팅 및 전송
│   ├── bot.ts            # 텔레그램 명령어 핸들러
│   └── local.ts          # 로컬 테스트용 polling 모드
├── api/
│   ├── telegram.ts       # Webhook 엔드포인트
│   └── cron.ts           # 크론 엔드포인트 (매일 09:00 KST)
├── tests/
│   ├── parser.test.ts    # 파서 단위 테스트
│   └── scanner.test.ts   # 스캐너 단위 테스트
├── vercel.json           # Vercel 설정 (크론 포함)
├── package.json
├── tsconfig.json
└── README.md
```

## 💰 비용 (최적화 완료)

**완전 무료 플랜 (OpenAI만 유료):**
- ✅ Telegram Bot: 무료
- 💳 OpenAI API: 월 $0.10 ~ $0.50 (약 130원 ~ 670원) ⭐
- ✅ Vercel Hobby: 무료
- ✅ Vercel KV: 무료
- ✅ GitHub Actions: 무료

**총 비용: 연간 커피 1~2잔 값!** ☕

**최적화 기능:**
- ✅ 변경 없으면 LLM 호출 0회 (고정 템플릿)
- ✅ 변경 있어도 하루 1회만 호출
- ✅ 입력 토큰 2,000 제한 (강제 truncate)
- ✅ 출력 토큰 150 제한

자세한 내용은 `COST_ANALYSIS.md` 참조

## 설치 및 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env` 파일을 생성하고 다음 내용을 입력합니다:

```env
# Telegram Bot Token (BotFather에서 발급)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Cron Secret (선택, 크론 엔드포인트 보안용)
CRON_SECRET=optional_cron_secret
```

### 3. Telegram Bot 생성

1. Telegram에서 [@BotFather](https://t.me/BotFather)와 대화 시작
2. `/newbot` 명령어로 새 봇 생성
3. 봇 이름과 username 설정
4. 발급받은 토큰을 `.env`의 `TELEGRAM_BOT_TOKEN`에 입력

### 4. Vercel 프로젝트 생성

1. [Vercel](https://vercel.com)에 로그인
2. 새 프로젝트 생성 (GitHub 연동 권장)
3. 환경변수 설정:
   - `TELEGRAM_BOT_TOKEN`
   - `OPENAI_API_KEY`
   - `CRON_SECRET` (선택)

### 5. Vercel KV 설정

1. Vercel 프로젝트 대시보드에서 "Storage" 탭 선택
2. "Create Database" → "KV" 선택
3. 데이터베이스 생성 (자동으로 환경변수 연결됨)

### 6. 배포

```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# 배포
vercel --prod
```

배포 후 생성된 URL을 확인합니다 (예: `https://your-project.vercel.app`)

### 7. Telegram Webhook 설정

배포된 URL로 webhook을 설정합니다:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-project.vercel.app/api/telegram"}'
```

성공 시 다음과 같은 응답을 받습니다:

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### 8. Vercel Cron 설정 확인

`vercel.json`에 크론이 설정되어 있습니다:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**주의**: Vercel의 크론은 UTC 기준입니다. `0 0 * * *`는 UTC 00:00 (KST 09:00)에 실행됩니다.

KST 09:00에 정확히 실행하려면 UTC 00:00으로 설정하면 됩니다 (현재 설정 유지).

## 로컬 테스트

로컬에서 polling 모드로 봇을 테스트할 수 있습니다:

```bash
npm run dev
```

**주의**: 로컬 테스트 시에는 webhook을 비활성화해야 합니다:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

테스트 완료 후 다시 webhook을 설정하세요.

## 사용 방법

### 1. 그룹 채팅방 설정

1. Telegram에서 그룹 채팅방 생성
2. 봇을 그룹에 초대
3. 그룹에서 `/setup` 명령어 실행

```
/setup
```

응답: `✅ 이 그룹이 데일리 리포트 수신 그룹으로 설정되었습니다.`

### 2. 제품 등록

```
/add
```

1. 인라인 키보드에서 제품 모델 선택
2. MHD(유통기한) 입력 (형식: `DD-MM-YYYY`, 예: `15-06-2026`)

### 3. 등록된 제품 확인

```
/list
```

등록된 모든 제품과 MHD를 확인할 수 있습니다.

### 4. 제품 삭제

```
/remove <번호 또는 ID>
```

예시:
```
/remove 1
```

### 5. 모니터링 소스 확인

```
/sources
```

현재 모니터링 중인 소스 URL과 마지막 확인 시간을 표시합니다.

### 6. 도움말

```
/help
```

## 명령어 목록

| 명령어 | 설명 |
|--------|------|
| `/setup` | 현재 그룹을 데일리 리포트 수신 그룹으로 설정 |
| `/add` | 제품 추가 (모델 + MHD) |
| `/list` | 등록된 제품 목록 보기 |
| `/remove <번호\|ID>` | 제품 삭제 |
| `/sources` | 모니터링 소스 확인 |
| `/help` | 도움말 |

## 데일리 리포트 형식

매일 09:00 KST에 다음 형식의 리포트가 전송됩니다:

```
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

### 위험도 라벨

- **INFO** (🍼): 변경 없음 또는 내 항목과 비매칭만 존재
- **WATCH** (⚠️): 변경 감지 있으나 파싱 불완전/확인 필요 존재
- **ACTION** (🚨): 내 등록 항목 중 Exact match 1개 이상 존재

**ACTION** 시 추가 메시지:

```
⚠️ 즉시 확인 필요:
- Aptamil Pronutra PRE (MHD: 15-06-2026)

🚨 해당 제품 사용을 즉시 중단하고 공식 안내를 확인하세요.
```

## 테스트

단위 테스트 실행:

```bash
npm test
```

주요 테스트:
- `tests/parser.test.ts`: HTML 정규화, 날짜 추출, 유효성 검증
- `tests/scanner.test.ts`: 소스 스캔, 변경 감지, 매칭 로직

## 모니터링 소스

현재 모니터링 중인 국가별 Tier 1 소스:

### 🇩🇪 독일 (DE)
1. **Danone DE**: `https://www.danone.de/newsroom/press-releases-list/rueckruf-vereinzelter-aptamil-chargen-de.html` ✅
2. **Aptaclub DE**: `https://www.aptaclub.de/stellungnahme.html` ✅

### 🇬🇧 영국 (UK)
1. **Aptaclub UK**: `https://www.aptaclub.co.uk/important-product-information`
2. **UK FSA**: `https://www.food.gov.uk/news-alerts/search/alerts`

### 🇮🇪 아일랜드 (IE)
1. **FSAI**: `https://www.fsai.ie/news_centre/food_alerts.html`

### 🇰🇷 한국 (KR)
1. **NutriciaStore Korea**: `https://www.nutriciastore.co.kr/board/notice`
2. **MFDS (Tier 2)**: `https://www.mfds.go.kr/brd/m_99/list.do` (참고 링크만)

**참고**: 독일 소스 URL은 확인 완료되었습니다. 다른 국가 소스도 정기적으로 URL 유효성을 확인하세요.

## 제품 모델 리스트

현재 지원하는 Aptamil 모델 (독일 내수용):

- Aptamil Pronutra PRE
- Aptamil Pronutra 1, 2, 3
- Aptamil Profutura PRE
- Aptamil Profutura 1, 2, 3
- Aptamil HA PRE, 1, 2
- Aptamil Comfort
- Aptamil AR (Anti-Reflux)
- Aptamil Lactose Free
- Aptamil Pepti

모델 추가/수정은 `src/sources.ts`의 `PRODUCT_MODELS` 배열을 편집하세요.

## 트러블슈팅

### 1. 봇이 응답하지 않음

- Webhook이 올바르게 설정되었는지 확인:
  ```bash
  curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
  ```
- Vercel 로그 확인: Vercel 대시보드 → Functions → Logs

### 2. 크론이 실행되지 않음

- Vercel 대시보드에서 Cron 설정 확인
- `vercel.json`의 크론 경로가 올바른지 확인
- Vercel Pro 플랜이 필요할 수 있음 (무료 플랜은 제한적)

### 3. KV 연결 오류

- Vercel KV가 프로젝트에 연결되었는지 확인
- 환경변수 `KV_REST_API_URL`, `KV_REST_API_TOKEN`이 설정되었는지 확인

### 4. LLM 요약 실패

- `OPENAI_API_KEY`가 올바르게 설정되었는지 확인
- OpenAI API 사용량 한도 확인
- 실패 시 기본 문구로 대체되므로 리포트는 정상 전송됨

## 보안 고려사항

### v1 제한사항

- 그룹에서 누구나 명령어 실행 가능 (관리자 권한 체크 없음)
- 단일 그룹만 지원

### v2 개선 사항 (TODO)

- [ ] 그룹 관리자 권한 체크 추가
- [ ] 다중 그룹 지원
- [ ] 사용자별 제품 등록 (개인 DM 지원)
- [ ] Webhook secret 검증 강화

## 라이선스

MIT

## 기여

이슈 및 PR 환영합니다!

## 연락처

문의사항은 GitHub Issues를 통해 남겨주세요.
