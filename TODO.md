# TODO: 향후 개선 사항

## v1 완료 항목

- [x] 텔레그램 봇 명령어 구현 (/setup, /add, /list, /remove, /sources, /help, /report)
- [x] Vercel KV 저장소 구현
- [x] 소스 스캔 및 변경 감지 (해시 기반)
- [x] 날짜 추출 파서 (DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY)
- [x] 제품명 + 날짜 조합 매칭 로직 (IMAGE_OCR용)
- [x] LLM 기반 3줄 요약 (변경 시에만)
- [x] 위험도 라벨링 (INFO/WATCH/ACTION)
- [x] 데일리 리포트 포맷팅 및 전송
- [x] Vercel 크론 설정 (08:00 KST)
- [x] 단위 테스트 (parser, scanner)
- [x] 국가별 소스 확장 (DE, UK, IE, KR)
- [x] Tier 1/2 소스 구분
- [x] 국가별 결과 섹션 추가
- [x] 파싱 전략 정의 (HTML_TEXT, TABLE_DATES, CHECKER_LINK, IMAGE_OCR)
- [x] IMAGE_OCR 전략 구현 (Vision API, gpt-4o)
- [x] 한글-영어 제품명 매핑 (PRODUCT_NAME_MAPPING)
- [x] 압타밀 프로푸트라 제품군 OCR 추출 및 매칭

## v2 보안 개선

- [ ] 그룹 관리자 권한 체크
  - `/setup`, `/add`, `/remove` 명령어는 관리자만 실행 가능
  - Telegram Bot API의 `getChatMember` 사용
- [ ] Webhook secret 검증
  - `X-Telegram-Bot-Api-Secret-Token` 헤더 검증
- [ ] Rate limiting
  - 동일 사용자의 과도한 명령어 실행 방지

## v3 기능 확장

- [ ] 다중 그룹 지원
  - 여러 그룹에서 독립적으로 제품 등록 및 리포트 수신
  - KV 저장소 구조 변경 필요 (group_id를 키로 사용)
- [ ] 개인 DM 지원
  - 그룹이 아닌 개인 채팅에서도 사용 가능
  - 사용자별 제품 등록 및 알림
- [ ] 모델 매핑 개선
  - 공지에서 모델명 추출 및 매칭
  - 유사 모델명 처리 (fuzzy matching)
- [ ] LOT 번호 지원
  - MHD뿐만 아니라 LOT 번호도 등록 및 매칭
- [ ] 알림 설정 커스터마이징
  - 알림 시간 변경
  - 위험도별 알림 on/off
- [ ] 웹 대시보드 (선택)
  - 등록된 제품 관리 UI
  - 스캔 히스토리 조회

## v4 파서 개선

- [ ] 더 정교한 HTML 파싱
  - 테이블 구조 인식 (TABLE_DATES 전략 구현)
  - PDF 파싱 지원 (일부 소스는 PDF로 제공)
- [ ] 다국어 지원
  - 영어, 독일어, 한국어 키워드 인식
  - "Best before", "Expiry date", "MHD", "유통기한" 등
- [ ] 소스별 커스텀 파서
  - 각 소스의 HTML 구조에 맞는 전용 파서
  - CHECKER_LINK 전략 구현 (Aptaclub UK)
- [ ] 국가별 날짜 형식 지원
  - UK/IE: DD/MM/YYYY
  - DE: DD.MM.YYYY
  - KR: YYYY-MM-DD 또는 YYYY.MM.DD

## v5 모니터링 및 운영

- [ ] 에러 알림
  - 스캔 실패 시 관리자에게 알림
  - OpenAI API 실패 시 fallback 처리
- [ ] 헬스 체크 엔드포인트
  - `/api/health`로 시스템 상태 확인
- [ ] 로깅 개선
  - 구조화된 로그 (JSON)
  - 외부 로깅 서비스 연동 (Sentry, Datadog 등)
- [ ] 메트릭 수집
  - 스캔 성공률
  - 매칭 통계
  - 사용자 수

## 기술 부채

- [ ] Conversation state를 KV에 저장
  - 현재는 메모리 기반 (서버리스 환경에서 제한적)
  - `/add` 플로우가 여러 함수 호출에 걸쳐 있을 때 문제 발생 가능
- [ ] 타입 안정성 개선
  - `any` 타입 제거
  - 더 엄격한 타입 체크
- [ ] 에러 핸들링 개선
  - 일관된 에러 응답 형식
  - 사용자 친화적인 에러 메시지
- [ ] 테스트 커버리지 확대
  - 통합 테스트 추가
  - E2E 테스트 (Telegram Bot API 모킹)

## 소스 URL 확인 (긴급)

### 독일 (DE)
- [ ] Danone 독일 공식 리콜 페이지 URL 확인
  - 현재: `https://www.danone.de/rueckrufe` (TODO)
  - 실제 URL로 교체 필요
- [ ] Aptaclub DE 공식 공지/리콜 페이지 URL 확인
  - 현재: `https://www.aptaclub.de/wichtige-informationen` (TODO)
  - 실제 URL로 교체 필요

### 영국 (UK)
- [x] Aptaclub UK: `https://www.aptaclub.co.uk/important-product-information`
- [x] UK FSA: `https://www.food.gov.uk/news-alerts/search/alerts`

### 아일랜드 (IE)
- [x] FSAI: `https://www.fsai.ie/news_centre/food_alerts.html`

### 한국 (KR)
- [x] 압타밀 안심 프로그램 (IMAGE_OCR): `https://www.nutriciastore.co.kr/main/html.php?htmid=mypage/aptamil_program.html`
- [x] NutriciaStore Korea: `https://www.nutriciastore.co.kr/board/notice`
- [x] MFDS (Tier 2): `https://www.mfds.go.kr/brd/m_99/list.do`

### 추가 소스 조사
- [ ] 독일 정부 기관 (BVL 등)
- [ ] 유럽 식품안전청 (EFSA)

## 문서화

- [ ] API 문서 작성
  - 각 엔드포인트 상세 설명
  - 요청/응답 예시
- [ ] 아키텍처 다이어그램
  - 시스템 구조도
  - 데이터 플로우
- [ ] 기여 가이드
  - 코드 스타일
  - PR 프로세스

## 성능 최적화

- [ ] 병렬 스캔 최적화
  - 현재는 `Promise.all` 사용
  - 실패한 소스가 전체 스캔을 막지 않도록 개선
- [ ] 캐싱 전략
  - 변경되지 않은 소스는 스킵 (옵션)
  - LLM 요약 캐싱
- [ ] KV 읽기/쓰기 최적화
  - 불필요한 저장소 접근 최소화

## 배포 자동화

- [ ] CI/CD 파이프라인
  - GitHub Actions로 자동 테스트 및 배포
- [ ] 환경별 배포 (dev, staging, prod)
- [ ] 롤백 전략
