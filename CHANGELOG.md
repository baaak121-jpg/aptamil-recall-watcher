# Changelog

All notable changes to Aptamil Recall Watcher will be documented in this file.

## [1.6.0] - 2026-02-21

### Added
- **IMAGE_OCR 파싱 전략**: Vision API를 사용한 이미지 OCR 기능
- **forceOcr 파라미터**: 이미지 변경 여부와 관계없이 강제 OCR 실행 옵션
- **KR 압타밀 안심 프로그램 소스**: 이미지 기반 제조일자 정보 모니터링
- **`/report` 명령어 개선**: 즉시 OCR 실행하여 최신 정보 확인
- **제품 추가/삭제 후 자동 확인**: `/add`, `/remove` 후 KR 소스 즉시 스캔

### Changed
- **크론 시간 변경**: KST 07:00 → KST 08:00 (UTC 23:00)
- **OCR 실행 로직**:
  - 정기 크론: 이미지 URL 변경 시에만 OCR (비용 절감)
  - 제품 추가/삭제: 항상 OCR 실행 (즉시 확인)
  - 수동 리포트: 항상 OCR 실행 (사용자 요청)
- **이미지 다운로드 방식**: base64 인코딩으로 Vision API 타임아웃 문제 해결

### Technical
- `extractTextFromImage()`: 단일 이미지 OCR (GPT-4o-mini Vision)
- `extractTextFromImages()`: 여러 이미지 병렬 OCR
- `extractImageUrls()`: HTML에서 이미지 URL 추출
- `resolveImageUrl()`: 상대 경로를 절대 URL로 변환
- `scanImageOcr()`: IMAGE_OCR 전략 구현

### Tests
- `sources.test.ts`: IMAGE_OCR 전략 검증 추가
- `scanner.test.ts`: llm 모듈 모킹 추가

## [1.1.0] - 2026-02-11

### Added
- **국가별 소스 확장**: 독일(DE), 영국(UK), 아일랜드(IE), 한국(KR) 4개국 지원
- **Tier 1/2 소스 구분**: Tier 1만 자동 판정, Tier 2는 참고 링크만
- **국가별 결과 섹션**: 데일리 리포트에 국가별 변경 감지 및 매칭 결과 표시
- **파싱 전략 정의**: HTML_TEXT, TABLE_DATES, CHECKER_LINK 3가지 전략
- **신뢰도 라벨**: Official, Regulator, OfficialStore 구분
- **국가별 헬퍼 함수**: `getTier1Sources()`, `getSourcesByCountry()`, `getTier1LinksByCountry()`
- **국가 이모지**: 🇩🇪 🇬🇧 🇮🇪 🇰🇷 플래그 표시
- **소스 가이드 문서**: `SOURCES.md` 추가

### Changed
- `Source` 타입에 `country_code`, `tier`, `parse_strategy`, `reliability_label`, `notes` 필드 추가
- `ScanResult` 타입에 `country_code`, `tier` 필드 추가
- `DailyReport` 타입에 `country_results` 필드 추가
- LLM 요약에 국가별 정보 포함
- 데일리 리포트 메시지 포맷에 국가별 섹션 추가
- 크론 로직에서 Tier 1 소스만 스캔하도록 변경

### Sources
- **DE**: Danone DE, Aptaclub DE (TODO: URL 확인 필요)
- **UK**: Aptaclub UK, UK FSA
- **IE**: FSAI
- **KR**: NutriciaStore Korea (Tier 1), MFDS (Tier 2)

### Tests
- `sources.test.ts` 추가: 국가별 소스 검증 테스트
- `scanner.test.ts` 업데이트: 새로운 Source 타입 반영

### Documentation
- `SOURCES.md`: 국가별 소스 상세 가이드
- `README.md`: 국가별 소스 정보 업데이트
- `TODO.md`: 소스 URL 확인 체크리스트 추가
- `CHANGELOG.md`: 변경 이력 문서 추가

## [1.0.0] - 2026-02-11

### Added
- 텔레그램 봇 기본 명령어: `/setup`, `/add`, `/list`, `/remove`, `/sources`, `/help`
- Vercel KV 저장소 구현
- 소스 스캔 및 변경 감지 (SHA256 해시 기반)
- HTML 정규화 및 날짜 추출 파서
- Exact match 매칭 로직
- LLM 기반 3줄 요약 (OpenAI gpt-4o-mini)
- 위험도 라벨링 (INFO/WATCH/ACTION)
- 데일리 리포트 포맷팅 및 전송
- Vercel 크론 설정 (매일 09:00 KST)
- 단위 테스트 (parser, scanner, integration)
- 로컬 테스트용 polling 모드
- Webhook 설정 스크립트
- 크론 테스트 스크립트

### Documentation
- `README.md`: 기본 사용 가이드
- `DEPLOYMENT.md`: 배포 가이드
- `ARCHITECTURE.md`: 시스템 아키텍처
- `TODO.md`: 향후 개선 사항
- `FAQ.md`: 자주 묻는 질문

### Initial Sources
- 독일(DE) 2개 소스 (Danone DE, Aptaclub DE)

## [Unreleased]

### Planned for v2
- 그룹 관리자 권한 체크
- Webhook secret 검증
- Rate limiting
- 다중 그룹 지원 준비

### Planned for v3
- 다중 그룹 지원
- 개인 DM 지원
- 모델 매핑 개선
- LOT 번호 지원

### Planned for v4
- 테이블 구조 파싱 (TABLE_DATES 전략 구현)
- PDF 파싱 지원
- 소스별 커스텀 파서
- 다국어 키워드 인식

---

## Version Format

- **Major.Minor.Patch** (Semantic Versioning)
- **Major**: 주요 기능 변경 또는 호환성 깨짐
- **Minor**: 새로운 기능 추가 (하위 호환)
- **Patch**: 버그 수정 및 개선

## Categories

- **Added**: 새로운 기능
- **Changed**: 기존 기능 변경
- **Deprecated**: 곧 제거될 기능
- **Removed**: 제거된 기능
- **Fixed**: 버그 수정
- **Security**: 보안 관련 변경
