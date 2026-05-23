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
