# 2026-11-17 AI 모델 교체

## 선택 근거

기존 `@cf/qwen/qwen3-30b-a3b-fp8`은 Cloudflare의 2026-11-20 중단 대상이다. 공식 대체 권장 목록 중 `@cf/google/gemma-4-26b-a4b-it`을 선택했다. 같은 목록의 Qwen 3.8 대비 단가는 낮지만, 실제 한국어·일본어 품질 우위는 별도 평가가 필요하다.

- [중단 공지](https://developers.cloudflare.com/changelog/post/2026-11-05-planned-model-deprecations/)
- [Gemma 4 모델 및 API](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/)
- [요금과 무료 할당량](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [공식 추론 채널 형식](https://ai.google.dev/gemma/docs/core/prompt-formatting-gemma4)

11월 17일 확인한 가격은 입력/출력 100만 토큰당 각각 $0.10/$0.30이다. 이 모델은 paid-only 목록에 없고 무료 10,000 Neurons/일 범위에서 사용할 수 있다. 모델 호출 횟수가 무료 할당량과 일대일 대응하지는 않는다. 플랜 변경·유료 대체 모델·자동 재호출은 추가하지 않았다.

## 변경 내용

- 모델·옵션을 `worker/ai-config.json`으로 모았다. 평가 준비 스크립트도 같은 설정과 해시를 읽는다.
- 새 API의 `max_completion_tokens: 384`를 사용한다. `enable_thinking: false`, `clear_thinking: true`, `store: false`를 명시한다.
- 오래된 `/no_think` 지시를 제거했다. 존대체를 언어별로 맞추고, 상황을 지어내거나 공감 문구·질문·괜찮다는 표현을 반복하지 않도록 지침을 보완했다. 미션 간격·거절·안전 규칙은 유지한다.
- 내부 thought 채널을 제거하고, 잘린 응답·도구 호출·필터 종료·길이 초과는 완성된 답변처럼 표시하지 않는다.
- 서버 30초·브라우저 45초 제한과 시간 초과 안내를 구분한다. 서버 응답 종료가 공급자 연산 중단을 뜻하지는 않으며 기존 사용량 예약 정책은 유지한다.
- 8초부터 지연 안내를 표시한다. 대기 중 다음 초안 입력, 중지 후 늦은 응답 차단, 실패 메시지 재시도 시 초안 보존을 검증했다. 모션 감소 설정에서도 상태 문구로 진행을 이해할 수 있다.

## 검증과 배포 상태

- `npm run check`: 타입 검사·101개 테스트·프로덕션/PWA 빌드 통과.
- `npm run eval:prepare`: 24개 합성 사례와 새 모델 설정·정책 해시의 준비 양식 생성. 모델 호출 없음.
- 로컬 한·일 390/1440px 화면, 모의 API의 지연·중지·시간 초과·재시도·초안 보존, 실제 SW 설치·업데이트·오프라인 회귀 검사 통과.
- 실제 AI 구성의 Wrangler dry run 통과. 이 검사는 업로드·배포가 아니다.
- **실제 Gemma 4 추론 및 운영 배포는 Cloudflare 재인증 대기 중이며 아직 수행하지 않았다.** 완료 후 이 항목을 실제 결과로 갱신한다. 기존 Qwen 연결 기록을 새 모델의 품질 검증으로 재사용하지 않는다.

배포 후 `/api/health`의 `model`이 새 ID인지 확인하고, 합성 한국어·일본어 실제 응답과 미션 요청/거절을 점검한다. 자동 검사와 소수 합성 샘플이 사람의 종합 언어·안전 평가(#2)를 대체하지 않는다.
