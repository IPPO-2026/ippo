# 초기 버전 검증 기록

검증일: 2026-09-19. 합성 문장만 사용했습니다. 서비스 배포나 실제 AI 추론에 성공했다는 기록이 아닙니다.

같은 날 제공된 IPPO 로고 기반으로 화면을 갱신한 후 타입 검사·76개 테스트·빌드·배포 dry run·두 화면 검증 스크립트를 통과했습니다. 390 px와 1440 px의 한국어·일본어 화면, 미션·설정 화면을 확인했고 로고 이미지 로드와 가로 넘침 여부를 점검했습니다. 제공 SVG·심벌 PNG와 저장소 원본의 SHA-256이 동일함을 확인했습니다. 문서의 화면 캡처는 이 민트 브랜드 버전입니다.

| 항목 | 결과 |
|---|---|
| TypeScript 프런트엔드·Worker 검사 | 통과 |
| Vitest API·정책 테스트 | 76개 통과 |
| 실제 SQLite 조건부 UPSERT·동시 요청·일일 초기화·만료 정리 | 테스트 통과 |
| Vite 프로덕션 빌드 | 통과 |
| 체험·실제 AI 설정 Wrangler dry run | 둘 다 통과. 업로드·원격 리소스 생성 없음 |
| 로컬 Worker에서 1440×1000·390×844 화면 | 일본어·한국어 가로 넘침 없음 |
| 화면 기본 흐름 | 체험 대화, 기본 비저장, 선택 저장·재접속, 미션 완료, 지역별 도움 링크, 내보내기·삭제 통과 |
| 브라우저 오류 | 기본 흐름의 콘솔 오류·페이지 오류 없음 |
| 실제 AI 모드의 모의 API 계약 | 동의 전 차단, 429 안내, 잘못된 demo 응답 거부, 문맥 제한, 삭제 시 늦은 응답 차단 통과 |
| 공개 클라우드 배포·실제 Qwen3 응답 | 미실행 |
| 실제 iOS/Android 기기·참가자·양 언어 응답 적합성 | 미검증 |

## 재현

Node.js 24, Google Chrome headless에서 로컬 Worker `http://127.0.0.1:8787`를 대상으로 검증했습니다.

```bash
npm ci
npm run check
npx wrangler deploy --dry-run
npx wrangler deploy --dry-run --config wrangler.live.example.jsonc
npm run dev:api
```

다른 터미널에서:

```bash
PLAYWRIGHT_CHROME_CHANNEL=chrome npm run test:ui
PLAYWRIGHT_CHROME_CHANNEL=chrome npm run test:ui:live-contract
```

설치된 Chrome이 없으면 `npx playwright install chromium` 후 `PLAYWRIGHT_CHROME_CHANNEL` 없이 실행합니다. `IPPO_TEST_URL` 환경 변수로 테스트 주소를 바꿀 수 있습니다. `test:ui`는 초기화된 테스트 브라우저의 체험 모드를 전제로 하며, live 계약 검사는 config·Turnstile·채팅 API를 모의 응답으로 대체합니다. 이는 실제 공급자 통합 검증을 대신하지 않습니다.

GitHub CI는 타입 검사·76개 테스트·빌드·체험 dry run을 수행합니다. 화면 검사는 위 스크립트로 별도 실행합니다. 스크린샷은 `artifacts/`에 생성하고, 개인정보가 없는 초기 화면만 `docs/preview-*.png`에 보관했습니다.
