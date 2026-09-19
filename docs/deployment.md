# 무료 호스팅과 실제 AI 연결

확인일: **2026-09-19**. 이 문서는 배포 가능한 구성을 설명합니다. 현재 운영 주소는 https://ippo.hyscodebase.workers.dev 이며 실제 AI 모드가 배포되어 있습니다. 아래는 재현·재배포 절차입니다.

## 1. 선택한 구성

React + Vite 정적 화면과 API Worker를 한 번에 배포하는 **Workers Static Assets**를 사용합니다. `workers.dev` 기본 HTTPS 주소를 쓰면 도메인 구입이 필요 없습니다. API는 `/api/*`에만 Worker 우선 라우팅을 적용합니다. [공식 개요](https://developers.cloudflare.com/workers/static-assets/), [SPA 라우팅](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)

| 구성 | 무료 한도 | 이 앱의 사용 |
|---|---|---|
| 정적 자산 | 무료·무제한 요청, 저장 추가 비용 없음 | HTML/CSS/JS/아이콘 |
| Worker | 계정당 100,000 요청/일, CPU 10 ms/요청 | 설정·채팅 API |
| Workers AI | 계정당 10,000 neurons/일 | Qwen3 대화 |
| D1 | 500만 rows read/일, 10만 rows written/일 | 요청 횟수 제한 |
| D1 저장 | DB당 500 MB, 계정 합계 5 GB | 단기 익명 카운터만 |

출처: [정적 자산 요금](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Workers 한도](https://developers.cloudflare.com/workers/platform/limits/), [AI 요금](https://developers.cloudflare.com/workers-ai/platform/pricing/), [D1 요금](https://developers.cloudflare.com/d1/platform/pricing/), [D1 한도](https://developers.cloudflare.com/d1/platform/limits/).

**Workers Free를 유지**하며 Paid로 업그레이드하거나 AI Gateway 선불 결제를 구성하지 않습니다. 무료 AI/D1 한도 초과 시 오류로 중단되며, 유료 한도 초과 과금으로 자동 전환하지 않습니다. 이미 유료인 계정을 사용한다면 이 전제는 성립하지 않습니다. 계정 플랜을 직접 확인하세요. 커스텀 도메인, 유료 모델, 이미지/음성 생성, SMS/메일, 앱스토어 등록비는 이 무료 구성에 포함되지 않습니다.

## 2. AI 비용 예산

모델: `@cf/qwen/qwen3-30b-a3b-fp8`. 한국어·일본어를 지원하는 Qwen3 계열입니다. 언어 지원은 응답 적합성 검증을 대신하지 않습니다. 현재 Cloudflare 모델 스키마의 `choices[0].message.content`와 기존 `response` 형식을 처리합니다. [모델 API](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/), [Qwen 공식 소개](https://qwenlm.github.io/blog/qwen3/)

입력 100만 tokens당 4,625 neurons, 출력 100만 tokens당 30,475 neurons 기준:

```text
예시 1회 = 입력 1,500 tokens × 0.004625
         + 출력 384 tokens × 0.030475
         = 약 18.64 neurons
60회 = 약 1,119 neurons
```

이는 가정에 따른 계산입니다. 한국어·일본어 글자 수는 token 수와 같지 않고 시스템 프롬프트·내부 추론·계정의 다른 사용량이 영향을 줍니다. 정확한 소비량은 Cloudflare 대시보드에서 확인합니다. [공식 모델 요금](https://developers.cloudflare.com/workers-ai/platform/pricing/)

현재 제한: 메시지당 1,000자, 최근 최대 8개 메시지·총 3,200자, 출력 최대 384 tokens, 전체 하루 60회, IP별 하루 6회. AI와 앱 일일 제한은 **UTC 00:00 = 한·일 오전 09:00**에 초기화됩니다. 대화 속 미션에는 일일 초기화·연속일 점수를 적용하지 않습니다.

D1의 조건부 UPSERT로 각 카운터를 원자적으로 증가시킵니다. AI 호출 전에 슬롯을 예약하며 모델 오류·연결 해제 시에도 환불하지 않습니다. 전체 한도에 막힌 요청은 IP 슬롯을 소비할 수 있습니다. 같은 Wi-Fi/NAT의 사용자는 IP 한도를 공유하고, IPv6 변경/프록시를 사용하는 방문자는 개인 한도를 우회할 수 있습니다. 전체 한도는 별도로 유지됩니다. 정밀 사용자별 과금/인증 시스템은 후속 범위입니다.

## 3. 체험 화면 배포

```bash
npm ci
npm run check
npx wrangler login
npx wrangler whoami
npm run deploy:demo
```

로그인과 계정 선택은 소유자가 수행합니다. 출력된 `https://ippo.<subdomain>.workers.dev`가 실제 배포 주소입니다. 이 예시 주소 자체가 배포되었다는 뜻은 아닙니다.

기본 `wrangler.jsonc`에는 AI/D1 바인딩이 없습니다. 체험 답변은 고정 문구이며 AI가 생성하지 않습니다. 실제 AI가 이미 운영 중인 같은 Worker 이름에 `deploy:demo`를 실행하면 체험 모드로 바뀌므로 설정을 확인합니다.

## 4. 실제 AI 활성화

### A. 계정·D1·Turnstile 준비

Workers **Free** 계정에서 진행합니다. Turnstile 위젯을 만들고 실제 배포 호스트를 허용 목록에 등록합니다. 공개 site key와 비공개 secret key를 구분합니다.

```bash
cp wrangler.live.example.jsonc wrangler.live.jsonc
npx wrangler d1 create ippo-budget
```

생성 결과의 DB ID를 `wrangler.live.jsonc`의 `database_id`에, Turnstile 공개 site key를 `TURNSTILE_SITE_KEY`에 넣습니다. 파일은 Git에서 제외됩니다. 마이그레이션을 적용합니다.

```bash
npx wrangler d1 migrations apply ippo-budget --remote --config wrangler.live.jsonc
npx wrangler secret put TURNSTILE_SECRET_KEY --config wrangler.live.jsonc
npx wrangler secret put IP_HASH_SECRET --config wrangler.live.jsonc
```

`IP_HASH_SECRET`에는 비밀번호 관리자 등에서 생성한 **32자 이상 고엔트로피 무작위 값**을 입력합니다. 터미널 명령 인수·소스·공개 이슈에 비밀값을 넣지 않습니다. 이 키로 원본 IP 대신 날짜별 HMAC 식별자를 만듭니다.

### B. 검증·배포

```bash
npm run check
npx wrangler whoami
npx wrangler deploy --dry-run --config wrangler.live.jsonc
npm run deploy:live
```

AI 바인딩은 개발 환경에서도 실제 원격 호출을 합니다. 별도 동의 없이 실제 개인정보로 테스트하지 않습니다. 초기 개발은 기본 체험 설정을 사용합니다. [로컬 개발 바인딩 안내](https://developers.cloudflare.com/workers/local-development/)

### C. 배포 후 확인

- `/api/health`와 `/api/config`에서 `live` 확인. 이 값만으로 추론 성공이 증명되지는 않습니다.
- 데스크톱 1440 px/모바일 390 px, 한국어/일본어, UI 언어와 지역의 조합을 확인합니다.
- 동의 전 전송 차단, Turnstile 검증, 합성 문장으로 실제 응답 수신을 확인합니다.
- API의 타 출처 요청·변조 입력·DB 장애·모델 실패가 차단/오류로 표시되는지 확인합니다.
- 개인/전체 한도 초과 시 429와 재시도 시간 확인. 미션은 계속 사용 가능해야 합니다.
- Cloudflare 대시보드에서 neuron 사용량과 Free 플랜 상태를 확인합니다.
- 대화 삭제·저장 선택 해제, 새로고침 후 잔존 여부를 확인합니다.

실제 참가자 대상 공개에 앞서 [개인정보와 안전](privacy-and-safety.md)의 한일 문구·응답·데이터 처리 검토를 완료합니다.

## 5. 운영과 복구

API 응답은 `no-store`이며 대화 내용·IP·비밀값을 코드에서 로그로 출력하지 않습니다. 플랫폼 자체 처리와 운영자가 별도로 켠 로그는 별개입니다. D1에는 날짜별 전역/익명 IP 카운터와 만료시각만 남깁니다. 매일 UTC 자정 작업이 만료 데이터를 제거합니다. 정상 실행 시 생성 후 최대 약 48시간 보관하며, 작업 장애 시 복구 후 삭제합니다.

문제 발생 시 `CHAT_MODE: "demo"` 구성으로 배포해 AI 전송을 끕니다. 데이터베이스를 사용할 수 없거나 필수 비밀값이 빠진 상태에서는 실제 AI 요청을 열어 주지 않습니다. 과금 문제를 피하려고 유료 공급자로 자동 전환하는 동작은 없습니다.

GitHub Actions는 타입 검사·테스트·빌드·체험 배포 dry run만 실행합니다. Cloudflare 자격증명 없이 작동하고 **자동 배포하지 않습니다**. 배포 권한을 추가할 때는 별도의 environment 승인/범위가 좁은 토큰을 사용합니다.
