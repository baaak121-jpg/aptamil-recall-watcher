# 완전 무료 배포 가이드 (OpenAI만 유료)

## 💰 비용 구조

```
✅ Telegram Bot:      $0/월 (무료)
💳 OpenAI API:        $0.50 ~ $2/월 (유료)
✅ Vercel Hobby:      $0/월 (무료)
✅ Vercel KV:         $0/월 (무료)
✅ GitHub Actions:    $0/월 (무료)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
총합:                 $0.50 ~ $2/월 (약 700원 ~ 2,700원)
```

## 🚀 배포 단계

### 1단계: GitHub 저장소 생성

```bash
cd C:\Cursor\aptamil-recall-watcher

# Git 초기화
git init

# .gitignore 확인 (.env는 제외됨)
git add .
git commit -m "Initial commit: Aptamil Recall Watcher v1.1.0"

# GitHub에 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/aptamil-recall-watcher.git
git branch -M main
git push -u origin main
```

### 2단계: Vercel 배포 (무료 Hobby 플랜)

#### 2-1. Vercel 계정 생성
1. [Vercel](https://vercel.com) 접속
2. "Sign Up" → GitHub 계정으로 가입
3. **Hobby 플랜 선택** (무료)

#### 2-2. 프로젝트 Import
1. Dashboard → "Add New..." → "Project"
2. GitHub 저장소 선택: `aptamil-recall-watcher`
3. "Import" 클릭

#### 2-3. 환경변수 설정
**Configure Project** 화면에서:

```
TELEGRAM_BOT_TOKEN=여기에_봇_토큰_입력
OPENAI_API_KEY=여기에_OpenAI_키_입력
CRON_SECRET=임의의_긴_문자열_생성
```

**CRON_SECRET 생성 방법:**
```bash
# PowerShell에서
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# 또는 온라인: https://www.random.org/strings/
```

4. "Deploy" 클릭

#### 2-4. 배포 URL 확인
배포 완료 후:
```
https://your-project-name.vercel.app
```

### 3단계: Vercel KV 생성 (무료)

1. Vercel Dashboard → Storage 탭
2. "Create Database" 클릭
3. **KV** 선택
4. Database Name: `aptamil-watcher-kv`
5. **Region**: Frankfurt (유럽, 독일과 가까움)
6. "Create" 클릭
7. "Connect to Project" → 프로젝트 선택
8. 자동으로 환경변수 추가됨:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### 4단계: Telegram Webhook 설정

```bash
# PowerShell에서
$BOT_TOKEN="여기에_봇_토큰"
$VERCEL_URL="https://your-project-name.vercel.app"

curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" `
  -H "Content-Type: application/json" `
  -d "{`"url`": `"$VERCEL_URL/api/telegram`"}"
```

**성공 응답:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

**확인:**
```bash
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
```

### 5단계: GitHub Actions 설정 (무료 크론)

#### 5-1. GitHub Secrets 설정
GitHub 저장소 → Settings → Secrets and variables → Actions

**New repository secret** 클릭하여 추가:

| Name | Value |
|------|-------|
| `VERCEL_URL` | `https://your-project-name.vercel.app` |
| `CRON_SECRET` | Vercel에 설정한 것과 동일한 값 |

#### 5-2. GitHub Actions 활성화
저장소 → Actions 탭 → "I understand my workflows, go ahead and enable them"

#### 5-3. 수동 테스트
Actions 탭 → "Daily Aptamil Recall Scan" → "Run workflow" → "Run workflow"

**성공 시:**
```
✅ Daily scan completed successfully!
```

### 6단계: 텔레그램 그룹 설정

1. Telegram에서 그룹 채팅방 생성
2. 봇을 그룹에 초대
3. 그룹에서 명령어 실행:

```
/setup
/add
/list
/sources
```

## 🧪 테스트

### 로컬 테스트
```bash
npm run dev
```

### Webhook 테스트
```bash
# 텔레그램에서 봇에게 메시지 전송
/help
```

### 크론 수동 실행
```bash
curl -X POST "https://your-project-name.vercel.app/api/cron" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### GitHub Actions 수동 실행
GitHub → Actions → "Daily Aptamil Recall Scan" → "Run workflow"

## 📊 무료 플랜 제한 확인

### Vercel Hobby (무료)
- ✅ Serverless Functions: 100GB-시간/월
- ✅ 실행 시간: 10초/요청
- ✅ 배포: 무제한
- ✅ 대역폭: 100GB/월
- ✅ 충분함: 하루 1회 크론 = 월 ~30초

### Vercel KV (무료)
- ✅ 저장소: 256MB
- ✅ 명령: 30,000/월
- ✅ 충분함: 하루 ~10개 명령 = 월 ~300개

### GitHub Actions (무료)
- ✅ 실행 시간: 2,000분/월
- ✅ 충분함: 하루 1회 = 월 ~30분

### OpenAI (유료)
- 💳 gpt-4o-mini: $0.150/1M input, $0.600/1M output
- 예상: 월 $0.50 ~ $2

## 🎯 배포 완료 체크리스트

### GitHub
- [ ] 저장소 생성 및 푸시
- [ ] Secrets 설정 (VERCEL_URL, CRON_SECRET)
- [ ] Actions 활성화

### Vercel
- [ ] Hobby 플랜 가입
- [ ] 프로젝트 배포
- [ ] 환경변수 설정 (TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, CRON_SECRET)
- [ ] KV 데이터베이스 생성 및 연결
- [ ] 배포 URL 확인

### Telegram
- [ ] Bot 생성 (BotFather)
- [ ] Webhook 설정
- [ ] 그룹 생성 및 봇 초대
- [ ] `/setup` 실행

### OpenAI
- [ ] API Key 발급
- [ ] 환경변수 설정

### 테스트
- [ ] 로컬 테스트 (`npm run dev`)
- [ ] Webhook 테스트 (텔레그램 명령어)
- [ ] 크론 수동 실행
- [ ] GitHub Actions 수동 실행
- [ ] 다음날 09:00 KST 자동 리포트 확인

## 🔧 문제 해결

### GitHub Actions 실패
**증상:** "Cron execution failed"

**해결:**
1. GitHub Secrets 확인 (VERCEL_URL, CRON_SECRET)
2. Vercel 환경변수 확인 (CRON_SECRET 일치)
3. Vercel 로그 확인 (Dashboard → Functions → Logs)

### Webhook 응답 없음
**증상:** 텔레그램 명령어에 봇이 응답 안 함

**해결:**
1. Webhook 설정 확인:
   ```bash
   curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
   ```
2. Vercel 로그 확인
3. 환경변수 확인 (TELEGRAM_BOT_TOKEN)

### KV 연결 오류
**증상:** "KV connection error"

**해결:**
1. Vercel KV가 프로젝트에 연결되었는지 확인
2. 환경변수 자동 추가 확인 (KV_REST_API_URL, KV_REST_API_TOKEN)
3. 재배포: `vercel --prod`

## 💡 비용 절감 팁

### 1. OpenAI 무료 크레딧 활용
- 신규 가입: $5 무료 크레딧 (3개월)
- 이 프로젝트로 6개월 이상 무료 사용 가능

### 2. 변경 감지 최적화 (이미 구현됨)
```typescript
// 변경 없으면 LLM 호출 안 함
if (changedSources.length === 0) {
  return '변경 사항 없음';  // 무료!
}
```

### 3. 모니터링
- Vercel Dashboard에서 사용량 확인
- GitHub Actions 사용 시간 확인
- OpenAI Usage 페이지에서 비용 확인

## 📈 예상 사용량

### 정상 운영 (월 기준)
```
Vercel Functions:     ~30초 (100GB-시간 중 0.001%)
Vercel KV:           ~300 명령 (30,000 중 1%)
GitHub Actions:      ~30분 (2,000분 중 1.5%)
OpenAI:              $0.50 ~ $2 (변경 빈도에 따라)
```

**모두 무료 플랜으로 충분합니다!** ✅

## 🎉 완료!

이제 완전 무료 (OpenAI만 유료) 플랜으로 운영됩니다!

**월 비용: 커피 한 잔 값 ($0.50 ~ $2)** ☕

## 📞 지원

- GitHub Issues: 버그 리포트
- `QUICKSTART.md`: 빠른 시작
- `FAQ.md`: 자주 묻는 질문
- `STATUS.md`: 프로젝트 상태

---

**마지막 업데이트**: 2026-02-11  
**플랜**: GitHub Actions + Vercel Hobby (무료)
