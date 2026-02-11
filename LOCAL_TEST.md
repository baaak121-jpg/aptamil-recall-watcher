# 로컬 테스트 가이드

## ✅ 해결: Vercel KV 오류

**오류 메시지:**
```
Error: @vercel/kv: Missing required environment variables 
KV_REST_API_URL and KV_REST_API_TOKEN
```

**해결 완료:**
- 로컬 환경에서는 메모리 저장소 자동 사용
- Vercel 배포 시에만 KV 사용
- 코드 수정 완료 (`src/store.ts`)

## 🚀 로컬 테스트 시작

### 1단계: 환경변수 설정

`.env` 파일에 필수 항목만 입력:

```bash
# 필수
TELEGRAM_BOT_TOKEN=여기에_봇_토큰_입력
OPENAI_API_KEY=여기에_OpenAI_키_입력

# 선택 (로컬에서는 불필요)
# KV_REST_API_URL=
# KV_REST_API_TOKEN=
CRON_SECRET=test_secret
```

### 2단계: 봇 실행

```bash
cd C:\Cursor\aptamil-recall-watcher
npm run dev
```

**성공 메시지:**
```
[Store] Using memory store (local development)
Starting bot in polling mode (local development)...
Bot is running. Press Ctrl+C to stop.
```

### 3단계: Telegram에서 테스트

1. **봇 검색**
   - Telegram 앱 열기
   - 검색: `@your_bot_username`

2. **개인 채팅 테스트**
   ```
   /help
   /sources
   ```

3. **그룹 채팅 테스트**
   - 그룹 생성
   - 봇 초대
   ```
   /setup
   /add
   /list
   ```

## 📊 로컬 vs Vercel 차이

| 기능 | 로컬 (메모리) | Vercel (KV) |
|------|--------------|-------------|
| 저장소 | 메모리 | Redis (KV) |
| 데이터 유지 | 재시작 시 삭제 | 영구 저장 |
| 설정 필요 | 없음 | KV 생성 필요 |
| 비용 | 무료 | 무료 (256MB) |

## ⚠️ 로컬 테스트 제한사항

### 메모리 저장소 사용

**특징:**
- 봇 재시작 시 모든 데이터 삭제
- 등록한 제품, 그룹 설정 모두 초기화
- 테스트용으로만 사용

**영향:**
```
npm run dev 실행
  ↓
/setup 실행 → 그룹 설정됨
/add 실행 → 제품 등록됨
  ↓
Ctrl+C (봇 종료)
  ↓
npm run dev 재실행
  ↓
모든 데이터 삭제됨 (초기화)
```

### 크론 테스트 불가

**로컬에서:**
- 크론 자동 실행 안 됨
- 수동 테스트만 가능

**해결:**
- Vercel 배포 후 크론 테스트

## 🧪 테스트 시나리오

### 시나리오 1: 기본 명령어 (5분)

```bash
# 1. 봇 실행
npm run dev

# 2. Telegram 개인 채팅
/help
/sources

# 3. 응답 확인
✅ 명령어 목록 표시
✅ 소스 링크 표시
```

### 시나리오 2: 그룹 기능 (10분)

```bash
# 1. 봇 실행
npm run dev

# 2. Telegram 그룹 생성 및 봇 초대

# 3. 그룹에서 명령어
/setup
→ ✅ 그룹 설정 완료

/add
→ ✅ 제품 선택 키보드 표시
→ 모델 선택
→ MHD 입력: 15-06-2026
→ ✅ 등록 완료

/list
→ ✅ 등록된 제품 표시

/remove 1
→ ✅ 삭제 완료
```

### 시나리오 3: 데이터 영속성 확인

```bash
# 1. 봇 실행
npm run dev

# 2. 제품 등록
/add → 제품 등록

# 3. 확인
/list → 제품 표시됨 ✅

# 4. 봇 재시작
Ctrl+C
npm run dev

# 5. 다시 확인
/list → 제품 없음 (메모리 초기화됨)
```

**결과:** 로컬에서는 데이터가 유지되지 않음 (정상)

## 🔍 로그 확인

### 정상 로그

```
[Store] Using memory store (local development)
Starting bot in polling mode (local development)...
Bot is running. Press Ctrl+C to stop.
[Store] Saved to memory store
```

### 오류 로그

**Telegram 토큰 오류:**
```
TELEGRAM_BOT_TOKEN is not set in .env
```
→ `.env` 파일에 토큰 입력

**OpenAI 키 오류:**
```
Error: Invalid API key
```
→ `.env` 파일에 올바른 키 입력

## 💡 팁

### 빠른 재시작

```bash
# PowerShell에서
Ctrl+C  # 봇 종료
↑ (위 화살표)  # 이전 명령어
Enter  # npm run dev 재실행
```

### 로그 저장

```bash
# 로그를 파일로 저장
npm run dev > test.log 2>&1
```

### 여러 터미널

- 터미널 1: 봇 실행 (`npm run dev`)
- 터미널 2: 로그 확인 (`tail -f test.log`)

## 🎯 로컬 테스트 완료 체크리스트

- [ ] `.env` 파일 설정
- [ ] `npm install` 완료
- [ ] `npm run dev` 실행 성공
- [ ] Telegram 봇 검색 성공
- [ ] `/help` 응답 확인
- [ ] 그룹 생성 및 봇 초대
- [ ] `/setup` 성공
- [ ] `/add` 제품 등록 성공
- [ ] `/list` 목록 표시 확인
- [ ] `/remove` 삭제 성공

**모두 체크되면 배포 준비 완료!** ✅

## 🚀 다음 단계: Vercel 배포

로컬 테스트 완료 후:

1. **GitHub 저장소 생성**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push
   ```

2. **Vercel 배포**
   - `DEPLOY_FREE.md` 참조
   - Vercel KV 생성
   - 환경변수 설정

3. **Webhook 설정**
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://your-project.vercel.app/api/telegram"
   ```

4. **GitHub Actions 설정**
   - Secrets 추가
   - 크론 활성화

## 🆘 문제 해결

### "Bot is not responding"

**체크:**
1. `npm run dev` 실행 중?
2. `.env` 파일에 토큰 입력됨?
3. 봇 username 정확함?

### "메모리 저장소 사용" 메시지

**정상:**
- 로컬 환경에서는 메모리 사용
- Vercel 배포 시 자동으로 KV 사용

### 데이터가 사라짐

**정상:**
- 로컬 메모리 저장소는 재시작 시 초기화
- Vercel 배포 후에는 영구 저장

## 📚 관련 문서

- `QUICKSTART.md` - 빠른 시작
- `DEPLOY_FREE.md` - 무료 배포
- `README.md` - 전체 가이드

---

**로컬 테스트 완료 후 Vercel 배포로 진행하세요!** 🚀
