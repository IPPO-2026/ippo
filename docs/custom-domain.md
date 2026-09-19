# ippo.kro.kr 연결

외부 DNS에서 CNAME으로 연결할 수 있도록 Cloudflare Pages 프로젝트 `ippo-app`을 준비했습니다. 화면은 Pages가 제공하고 `/api/*`는 Service Binding으로 기존 `ippo` Worker에 전달합니다. 원래 요청의 URL·Origin·클라이언트 IP를 유지하여 동일 출처 검사, Turnstile 호스트 검사, 일일 한도를 그대로 사용합니다. AI·DB·비밀키는 기존 Worker에서 관리합니다.

## 사용자가 입력할 DNS

| 항목 | 값 |
| --- | --- |
| 종류 | CNAME |
| 최종 호스트 | ippo.kro.kr |
| 대상 | ippo-app.pages.dev |
| TTL | 자동 또는 300초 |

`kro.kr` 아래 호스트를 입력하는 화면이면 이름은 `ippo`입니다. `ippo.kro.kr` 자체의 DNS 관리 화면이면 루트 표시인 `@` 또는 빈칸을 사용합니다. 핵심은 생성된 레코드의 전체 이름이 정확히 `ippo.kro.kr`이어야 한다는 것입니다. 대상에는 `https://`나 `/`를 붙이지 않습니다. 같은 이름의 A/AAAA/CNAME이 이미 있으면 해당 호스트의 레코드만 교체하고 다른 호스트/MX/TXT는 유지합니다.

Cloudflare 측 커스텀 도메인 등록과 Turnstile 허용 목록 반영은 완료했습니다. DNS 반영·인증서 발급 전에는 연결 완료로 간주하지 않습니다. 최종 사용 주소는 `https://ippo.kro.kr`입니다. DNS 공급자의 URL 포워딩/프레임 포워딩이 아닌 CNAME 방식으로 설정합니다.

## 배포

```bash
npm run deploy:live   # AI Worker 코드가 바뀐 경우
npm run deploy:pages  # 새 도메인의 화면 배포
```

기존 Workers 주소도 계속 사용할 수 있습니다. 브라우저 저장·PWA 설치는 출처별로 분리되므로 기존 workers.dev에 저장된 대화나 설치 앱이 새 도메인으로 자동 이전되지는 않습니다. 새 주소에서 다시 설치하세요.

검증: Pages의 `/api/health`와 `/api/config`에서 live 확인. 도메인 DNS 반영 후 HTTPS·인증·실제 대화·설치 동작을 추가 확인합니다.

[Cloudflare 외부 DNS의 Pages 도메인 연결](https://developers.cloudflare.com/pages/configuration/custom-domains/)
