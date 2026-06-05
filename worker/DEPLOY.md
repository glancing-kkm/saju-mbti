# 사주 채팅 Worker 배포 가이드

5가지 질문 채팅 기능을 사용하려면 Cloudflare Worker를 배포하고 URL을 사이트에 연결해야 합니다.

총 소요 시간: **약 15분**

---

## 0. 필요한 것

- 이메일 계정 (Cloudflare 가입용)
- 결제 카드 (Anthropic API 사용량 결제용 — Cloudflare Worker는 무료 한도로 충분)

---

## 1. Anthropic API 키 발급

1. https://console.anthropic.com 접속 → 가입 또는 로그인
2. **Settings → Billing** 에서 결제 수단 등록 + 크레딧 충전 (최소 $5 권장)
3. **Settings → API Keys → Create Key** 클릭
4. 이름 입력 (예: `saju-chat`) → **Create**
5. 표시되는 키(`sk-ant-api03-...`)를 **즉시 복사**해서 안전한 곳에 저장
   - ⚠️ 한 번만 표시됩니다. 잊으면 새 키를 발급받아야 합니다.

---

## 2. Cloudflare 계정 생성 + Worker 배포

### 방법 A: 웹 대시보드 (추천 — CLI 설치 불필요)

1. https://dash.cloudflare.com 접속 → 가입 (무료 플랜)
2. 왼쪽 메뉴 → **Workers & Pages** → **Create application** → **Create Worker**
3. Worker 이름 입력 (예: `saju-chat`) → **Deploy**
4. **Edit code** 클릭
5. 기본으로 들어있는 코드를 모두 지우고, `worker/saju-chat-worker.js` 파일의 내용을 복사해서 붙여넣기
6. **Save and deploy**
7. 상단에 표시되는 URL을 복사 (예: `https://saju-chat.your-subdomain.workers.dev`)

### 환경변수 등록 (Anthropic API 키)

1. Worker 페이지에서 **Settings** 탭 → **Variables and Secrets**
2. **Add variable** 클릭
3. **Type** = **Secret** 선택 (중요! Plaintext 아님)
4. **Variable name** = `ANTHROPIC_API_KEY`
5. **Value** = 1단계에서 받은 키(`sk-ant-api03-...`) 붙여넣기
6. **Deploy**

### 방법 B: Wrangler CLI (Node.js 사용 가능한 분만)

```sh
npm install -g wrangler
cd worker
wrangler login
wrangler secret put ANTHROPIC_API_KEY
# 프롬프트에 API 키 붙여넣고 Enter
wrangler deploy
```

배포 후 출력되는 URL을 복사합니다.

---

## 3. 사이트와 연결

1. `index.html` 을 편집기로 열기
2. 다음 줄을 찾기 (Ctrl+F / Cmd+F 로 `WORKER_URL` 검색):
   ```js
   const WORKER_URL='';
   ```
3. 따옴표 안에 2단계에서 복사한 Worker URL을 입력:
   ```js
   const WORKER_URL='https://saju-chat.your-subdomain.workers.dev';
   ```
4. 저장 → GitHub에 푸시 (또는 본인 호스팅에 업로드)

---

## 4. 동작 확인

1. 배포된 사이트 열기
2. 사주 분석 → **자세한 사주** 탭 → 잠금 해제
3. 맨 아래 **💬 사주에 대해 직접 물어보기** 카드까지 스크롤
4. 질문 입력 후 **🔮 질문하기**
5. 5~10초 후 AI 답변이 표시되면 성공 ✅

---

## 5. 비용 관리

### Anthropic API (실제 비용)

- 모델: **Claude Opus 4.7** (`claude-opus-4-7`)
- 사주 컨텍스트(약 1500 토큰)는 prompt cache 적용 → 5번 질문해도 컨텍스트는 첫 1번만 풀비용
- 1명 × 5회 질문 ≈ **약 $0.05~0.15**
- 100명 사용 시 ≈ **$5~15**, 1,000명 ≈ **$50~150**
- Anthropic 콘솔 → **Usage** 에서 실시간 사용량 확인

### Cloudflare Workers (사실상 무료)

- 무료 플랜: 하루 100,000 요청 (5회 × 20,000명 = 100,000)
- 초과 시: 1백만 요청당 $0.30

### 사용량 제어

API 키 발급 시 `Spend limit`을 설정하면 한도 초과 시 자동 차단됩니다.
Anthropic 콘솔 → **Settings → Limits** 에서 월별 한도(예: $50) 설정 권장.

---

## 6. 보안 권장사항

### CORS 좁히기

`saju-chat-worker.js` 의 `CORS_HEADERS` 에서:
```js
'Access-Control-Allow-Origin': '*',
```
를 본인 도메인으로 좁힙니다:
```js
'Access-Control-Allow-Origin': 'https://glancing-kkm.github.io',
```
이러면 다른 사이트에서는 Worker를 호출할 수 없습니다.

### 추가 보안 (선택)

- Cloudflare → Worker → **Settings → Triggers** 에서 Custom Domain 등록
- Cloudflare → **Security → Rate Limiting** 으로 IP당 분당 요청 수 제한

---

## 7. 5회 제한 정책

현재는 **브라우저 localStorage** 로 5회를 카운트합니다.

- 시크릿 창·다른 기기·캐시 삭제 시 다시 5회 사용 가능
- 진짜 엄격한 제한이 필요하면 → Cloudflare KV로 IP별 카운트 (별도 작업 필요)
- 결제 시스템 연동 시 → 사용자 계정별 카운트로 변경 (별도 작업)

---

## 문제 해결

| 증상 | 원인 / 해결 |
|------|-------------|
| "채팅이 아직 설정되지 않았습니다" | `index.html` 의 `WORKER_URL` 미입력. 3단계 다시 확인. |
| "역술가 응답을 받지 못했습니다" | Worker 로그 확인 → 외부 모델 API 키 잘못됨 / 크레딧 부족 / 모델 ID 오타 |
| CORS 에러 | Worker 의 `CORS_HEADERS` 의 Origin 이 사이트 도메인과 다름 |
| 401 Unauthorized | `ANTHROPIC_API_KEY` 환경변수 미등록 또는 오타 |
| "5회 한도 소진" | 정상 동작. 캐시 삭제 시 초기화. |

Worker 로그 보기: Cloudflare → Worker → **Logs** 탭에서 실시간 확인 가능.

---

# 카카오페이 결제 Worker 배포 가이드

토스가 아닌 **카카오페이 직접 API** 방식입니다. SDK 없이 서버사이드 redirect 흐름.

## 1. 카카오페이 가맹점 신청

1. https://biz.kakaopay.com 접속 → **가맹점 신청**
2. 사업자 등록증·정산 계좌 등 서류 제출
3. 승인 후 **개발자센터** 진입
4. **SECRET KEY** + **CID** 발급
   - 테스트 단계만 사용 시: CID = `TC0ONETIME` (가맹점 등록 없이 즉시 테스트 가능)
   - 운영 결제: 정식 CID 발급 필수

## 2. Worker 배포 (Wrangler CLI)

```sh
cd worker
wrangler deploy --config wrangler.kakao-payment.toml
```

웹 대시보드 사용 시: `worker/kakao-payment-worker.js` 내용을 새 Worker에 복사.

## 3. 시크릿 등록 (3종)

```sh
wrangler secret put KAKAO_SECRET_KEY --config wrangler.kakao-payment.toml
# → biz.kakaopay.com > 개발자센터 > SECRET KEY

wrangler secret put KAKAO_CID --config wrangler.kakao-payment.toml
# → TC0ONETIME (테스트) 또는 발급받은 정식 CID

wrangler secret put ALLOWED_ORIGIN --config wrangler.kakao-payment.toml
# → 예: https://saju-mbti-9h1.pages.dev
```

## 4. index.html 연결

`index.html`의 `KAKAO_PAYMENT_BASE` 상수를 배포된 Worker URL로 교체:
```js
const KAKAO_PAYMENT_BASE='https://kakao-payment-worker.your-subdomain.workers.dev';
```
뒤에 `/ready`, `/approve`는 워커가 자동으로 라우팅합니다 (URL에 포함하지 말 것).

## 5. 결제 흐름

1. 사용자가 「카카오페이로 결제하기」 클릭
2. 브라우저 → Worker `/ready` POST → 카카오페이 API → `{tid, next_redirect_url}` 반환
3. 브라우저 → next_redirect_url로 redirect → 카카오페이 앱/웹에서 결제 진행
4. 결제 완료 후 `approval_url?pg_token=xxx`로 돌아옴
5. 브라우저 → Worker `/approve` POST → 카카오페이 API 승인 호출 → 결제 확정
6. sessionStorage의 tid·orderId 정보로 검증 (세션 끊기면 영수증 기반 수동 처리)

## 6. 문제 해결

| 증상 | 원인 / 해결 |
|------|-------------|
| "결제 서버가 아직 배포되지 않았습니다" | `KAKAO_PAYMENT_BASE`가 example URL 그대로. 4단계 다시 확인. |
| "준비 실패" `KAKAO_REJECTED` | SECRET KEY·CID 미등록 또는 오타. 3단계 다시 확인. |
| "결제 정보가 만료되었습니다" | 결제 도중 브라우저 종료 또는 다른 기기에서 콜백. 영수증 기반 수동 환불·재처리. |
| CORS 에러 | `ALLOWED_ORIGIN`이 실제 사이트 도메인과 다름. 콤마로 여러 개 등록 가능. |
| 금액 불일치 `AMOUNT_MISMATCH` | 클라이언트가 보낸 amount와 worker의 `CATEGORY_PRICE` 차이. 가격 변경 시 양쪽 다 수정 필수. |

---

# 후기 → 2,000원 할인 쿠폰 시스템 운영 가이드

## 1. KV namespace 생성 (1회만)

```sh
wrangler kv:namespace create REVIEWS_KV --config wrangler.kakao-payment.toml
wrangler kv:namespace create REVIEWS_KV --preview --config wrangler.kakao-payment.toml
```

출력된 `id` / `preview_id`를 `worker/wrangler.kakao-payment.toml`의 주석 처리된 `[[kv_namespaces]]` 블록에 채워 넣고 주석을 해제합니다:

```toml
[[kv_namespaces]]
binding = "REVIEWS_KV"
id = "abcd1234…"
preview_id = "efgh5678…"
```

이후 `wrangler deploy --config wrangler.kakao-payment.toml` 재실행.

## 2. ADMIN_TOKEN 시크릿 등록

```sh
wrangler secret put ADMIN_TOKEN --config wrangler.kakao-payment.toml
# → 16자 이상 무작위 문자열 (생성: openssl rand -hex 24)
```

이 토큰은 `/admin/reviews` 조회 시 필요. 운영자만 보관.

## 3. KV 후기 조회 (CLI)

```sh
# 대기 중인 후기 목록 (최신순으로 인덱싱됨)
wrangler kv:key list --binding REVIEWS_KV --prefix "review_idx:pending:" \
  --config wrangler.kakao-payment.toml

# 개별 후기 본문
wrangler kv:key get --binding REVIEWS_KV "review:male_갑자을축병인정묘:1719000000000" \
  --config wrangler.kakao-payment.toml

# rate limit 상태 확인
wrangler kv:key list --binding REVIEWS_KV --prefix "ratelimit:review:" \
  --config wrangler.kakao-payment.toml

# 차단된 사주ID 목록
wrangler kv:key list --binding REVIEWS_KV --prefix "review_blocked:" \
  --config wrangler.kakao-payment.toml
```

## 4. 후기 검토 흐름

1. **조회**: 위 CLI 또는 `GET /admin/reviews?token=XXX&status=pending` 호출
2. **검토**: 후기 본문·별점·카테고리 확인. 욕설·광고·허위 의심 시 거절
3. **승인** (현재 수동 방식): 좋은 후기를 골라 `index.html`의 `REVIEWS` 배열에 직접 추가
   ```js
   {stars:5, cat:'인생총운', text:'…', name:'김** 님', date:'2026.06.05'}
   ```
4. **거절**: KV에서 `review_blocked:{sajuId}` 키를 `1`로 추가 → 해당 사주는 재작성 불가
   ```sh
   wrangler kv:key put --binding REVIEWS_KV "review_blocked:male_갑자을축병인정묘" "1" \
     --config wrangler.kakao-payment.toml
   ```

## 5. 클라이언트 측 동작

- **자격**: 결제 후 24시간 이내 (`saju_paid_tokens_v1`) **또는** 7일 이내 (`saju_review_eligible_v1`)에만 후기 작성 가능
- **중복 방지**: 사주ID 기준 1회만 (`saju_review_submitted_v1` + 서버 KV `review_submitted:{sajuId}`)
- **쿠폰 발급**: 후기 작성 즉시 `saju_review_coupon_v1`에 30일 유효 쿠폰 저장
- **차감**: 다음 결제 시 결제액 > 쿠폰액인 경우에만 자동 적용 (daypick 1,500원·chatpack1 1,000원은 제외)
- **카테고리 무관**: 어느 카테고리에서 발급되었든 다른 카테고리 결제에 사용 가능

## 6. 어뷰징 방지 (3중 레이어)

| 레이어 | 키 | 한도 |
|---|---|---|
| 사주ID | `ratelimit:review:saju:{sajuId}` | 10분 1회 |
| 사용자ID | `ratelimit:review:user:{partnerUserId}` | 10분 1회 |
| IP | `ip_review_count:{ip}:{date}` | 24시간 5건 |

추가로 결제 토큰 없는 사주ID는 클라이언트 측에서 폼 자체가 노출되지 않음.

## 7. 문제 해결

| 증상 | 원인 / 해결 |
|------|-------------|
| "후기 시스템이 일시 점검 중입니다" | `REVIEWS_KV` 바인딩 미설정. 1단계 다시 확인. |
| "이미 후기를 작성하신 사주입니다" | 정상. 같은 사주는 1회만 작성 가능. |
| "결제 후 운세를 보신 분만 후기 작성이 가능해요" | 미결제·자격 만료. 결제 후 7일 이내 작성 가능. |
| "잠시 후 다시 시도해 주세요" | Rate limit. 10분 후 재시도. |
| "오늘 후기 작성 한도를 초과했습니다" | 같은 IP에서 24시간 5건 초과. 다음 날 재시도. |
| 쿠폰이 결제 모달에 표시 안 됨 | 결제액이 쿠폰액(2,000원) 이하. daypick·chatpack1는 적용 불가. |
