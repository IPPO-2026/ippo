# 이야기에서 작은 한 걸음으로

2026-09-19 사용자 요청에 따라 앱 범위를 **대화 → 문맥에 맞는 작은 미션 → 시작/완료 또는 미루기**로 정리했습니다.

- 사이드바, 하단 탭, 에너지 점수, 독립 미션 목록, 별도 설정 페이지를 제거했습니다.
- 답변 아래에 필요한 경우만 미션 카드를 보여줍니다. 대화를 시작하기 전에 임의의 미션을 표시하지 않습니다.
- 진행 중 미션은 입력창 위에서 다시 찾을 수 있습니다. 완료·미루기는 점수나 연속일 수 없이 조용히 표시합니다.
- 언어·도움 지역·선택 저장·삭제·설치 안내는 상단 메뉴에 모았습니다.
- 대화와 미션 상태는 기본 메모리에만 남습니다. 저장 선택 시 최근 60개 메시지와 해당 미션 상태를 기기에 저장합니다. 독립 에너지/미션 저장값은 더 이상 사용하지 않습니다.

## AI와 미션의 연결

실제 AI는 답변과 함께 선택적 `[[mission:tidy]]` 등의 식별자를 출력합니다. Worker는 water/music/window/tidy/walk만 허용하고 문장에서 식별자를 제거합니다. 알 수 없는 값, 복수 제안, 빈 답변은 카드로 만들지 않습니다. 카드의 제목·설명·시간은 검토 가능한 한·일 고정 카탈로그입니다. 따라서 카드가 모든 문장을 자유 생성하는 것은 아닙니다.

모델에는 매번 미션을 제안하지 않고, 거절·위기 상황에서 미션을 제안하지 않도록 지시합니다. 프롬프트는 완전한 안전 보장이 아니며 실제 참가자 대상 평가는 별도 필요합니다. 체험 모드는 기기 안에서 규칙에 따라 예시 답변과 미션을 선택하고 체험임을 표시합니다.

## 서버리스 선택

Cloudflare Workers Static Assets + Workers AI + D1 + Turnstile을 한 계정·한 출처로 운영합니다. 기존 Worker의 AI/DB 바인딩을 그대로 사용하므로 별도 API 프록시나 공급자 API 키가 필요하지 않습니다. Netlify·Vercel도 정적 앱 호스팅은 가능하지만 이 프로젝트에는 AI 백엔드를 추가로 연결하거나 이전하는 작업이 필요합니다.

운영 URL: https://ippo.hyscodebase.workers.dev

Cloudflare 대시보드에서 Workers Free / Current plan을 직접 확인했습니다. 유료 전환하지 않았습니다. 무료 한도는 계정 전체에 적용되며 무제한 사용을 뜻하지 않습니다. [Workers AI 요금](https://developers.cloudflare.com/workers-ai/platform/pricing/), [정적 자산 호스팅](https://developers.cloudflare.com/workers/static-assets/), [Netlify 요금](https://www.netlify.com/pricing/), [Vercel Hobby](https://vercel.com/docs/plans/hobby)
