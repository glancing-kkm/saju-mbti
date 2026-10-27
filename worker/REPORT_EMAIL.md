# PDF 이메일 발송 설정

웹의 PDF 준비 창에서 이메일 주소를 입력해 같은 PDF를 첨부 발송합니다.
`POST /report-email-status`는 발송 설정 여부만 공개합니다. 발신 설정이 없으면 발송 버튼을 활성화하지 않습니다.

발송은 아래 중 한 가지를 설정합니다. 발신 주소는 해당 서비스에서 검증한 도메인에 속해야 합니다.

## Cloudflare Email Service

1. Cloudflare Email Sending에 발신 도메인을 등록·검증합니다. 현재 Wrangler 로그인은 이메일 도메인 조회에 `Unauthorized (2036)`을 반환하므로 이메일 관리 권한이 있는 계정에서 설정해야 합니다.
2. `wrangler.toml`에 아래 바인딩을 추가합니다.

```toml
[[send_email]]
name = "EMAIL"
```

3. 검증한 발신 주소를 `REPORT_EMAIL_FROM`으로 설정합니다. 예: `report@본인도메인`.
4. 기존 `PAID_TOKEN_SECRET`, `SAJU_QNA_CACHE` 바인딩을 유지해 Worker를 배포합니다.

## 기존 Resend 계정이 있는 경우

`RESEND_API_KEY`를 Worker 비밀키로, 검증한 발신 주소를 `REPORT_EMAIL_FROM`으로 설정합니다. 키를 소스 코드나 프런트엔드에 넣지 않습니다. Cloudflare EMAIL 바인딩이 함께 있으면 Cloudflare를 먼저 사용합니다.

## 검증

- `node tools/reading-story-email-regression.js`는 서명·PDF 상품·파일·주소 검증, 첨부 내용, 실패 미차감, 재시도, 횟수 제한을 모의 메일 서비스로 확인합니다. 실제 메일은 보내지 않습니다.
- 실발송 검증은 운영자가 소유한 수신 주소로 정상 결제한 PDF 준비 창에서 진행합니다. 공급자의 발송 성공은 받은편지함 도착을 보장하지 않으므로 받은편지함과 스팸함을 확인합니다.
- PDF 상품만 발송할 수 있으며 주문당 3회입니다. 성공한 요청만 횟수에 포함합니다. 같은 주문·주소·PDF의 24시간 내 재시도에는 중복 방지 기록을 사용합니다. KV의 일관성 특성상 동시 요청의 정확히 한 번 전송까지 보장하지는 않습니다.
- PDF는 최대 12MB입니다. 서버에 주소와 PDF를 보관하지 않고, 발송 공급자에게 전달합니다. 서버 KV에는 사용 횟수와 중복 방지용 해시만 남깁니다.
