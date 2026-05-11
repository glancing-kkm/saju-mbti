# 천지인 사주 — 결제 흐름 설계

## 1. 개요

- **PG**: 토스페이먼츠 (한국 신용카드·계좌이체·간편결제 통합)
- **상품 구조**: 카테고리별 단건 결제 4종 (지정일 9,900 · 월별 19,900 · 신년 29,900 · 인생 49,900원)
- **콘텐츠 제공 시점**: 결제 승인 즉시 디지털 풀이 공개 (서버 미저장, 사주 입력값은 브라우저 한정)
- **잠금 상태 저장**: 브라우저 `localStorage` (`saju_paid_unlocked_<cat>_v3`)
  - 디바이스 간 동기화는 추후 회원 도입 시 별도 추가
- **법적 근거**: 「전자상거래법」 제17조 제2항 제5호 → 제공 시작된 디지털 콘텐츠의 청약 철회 제한
  - 결제 동의 화면에서 사전 동의 4종 필수 체크

## 2. 시스템 구성

```
[브라우저]                          [Cloudflare Workers]                   [토스페이먼츠]
  │                                                                            │
  │  ① 잠금 화면에서 [결제하기] 클릭                                            │
  │                                                                            │
  │  ② 결제 동의 모달 — 약관·환불·즉시제공 동의 4종 체크                         │
  │                                                                            │
  │  ③ TossPayments(clientKey).requestPayment() ───────────────────────────────► (결제창)
  │                                                                            │
  │ ◄────── (사용자 카드 입력 → 토스 결제창 처리) ─────────────────────────────│
  │                                                                            │
  │  ④ successUrl 리디렉션 (?paymentKey, ?orderId, ?amount, ?cat)              │
  │                                                                            │
  │  ⑤ POST /confirm { paymentKey, orderId, amount, category }                 │
  │ ──────────────────────────────► [payment-worker.js]                        │
  │                                       │                                    │
  │                                       │  카테고리·금액 검증                 │
  │                                       │  토스 secret 키로 confirm 호출  ──►│
  │                                       │ ◄────── 승인 응답 ────────────────│
  │                                       │  status === 'DONE' 확인            │
  │                                       │                                    │
  │ ◄────── { ok:true, payment } ─────────┘                                    │
  │                                                                            │
  │  ⑥ setUnlockedFor(category) → 카테고리 결과 즉시 노출                       │
```

## 3. 단계별 상세

### ① 결제 트리거
- 위치: `index.html` 의 `renderPaidLock(category, saju)` → `<button class="lock-pay" onclick="openPaymentConsent('${category}')">`
- 카테고리: `daypick` / `monthly` / `newyear` / `life`

### ② 결제 동의 모달
- HTML: `<div class="pay-overlay" id="payOverlay">` (share 모달 다음에 위치)
- 동의 4종 (모두 필수):
  1. 이용약관 (`/legal/terms.html`)
  2. 개인정보처리방침 (`/legal/privacy.html`)
  3. 결제·환불 정책 (`/legal/refund.html`)
  4. 콘텐츠 즉시 제공 & 청약 철회 제한 동의
- 전체 동의 체크 시 4종 일괄 체크
- 4종 모두 체크되어야 `결제하기` 버튼 활성화

### ③ 토스 SDK 호출 — `startTossPayment()`
- orderId 생성: `SMBT-<cat>-<YYYYMMDDhhmmss>-<rnd6>` (최대 64자)
- requestPayment 파라미터:
  - method: `'카드'` (간편결제 추가 시 `tp.requestPayment('카드')` 외에 분기)
  - amount, orderId, orderName, successUrl, failUrl
- successUrl: 현재 페이지 + `?pay=success&cat=<category>`
  - 토스가 자동으로 `paymentKey, orderId, amount` 쿼리를 부착

### ④ 리턴 처리 — `_handlePaymentReturn()`
- 페이지 로드 시 query string 검사
  - `pay=fail` → alert 후 URL 정리
  - `pay=success` → ⑤로 진행

### ⑤ 결제 승인 검증 — `payment-worker.js` `/confirm`
- 요청: `{ paymentKey, orderId, amount, category }`
- 검증:
  1. CORS Origin 화이트리스트
  2. category 유효성
  3. amount === 카테고리 등록 가격 (위조 방지)
  4. 토스 API `/v1/payments/confirm` 호출 (server-side secret key)
  5. 응답 `status === 'DONE'`
- 응답: `{ ok: true, payment: { orderId, category, amount, status, method, approvedAt, receiptUrl } }`
- (권장) Cloudflare KV로 orderId 중복 차단

### ⑥ 잠금 해제 & 결과 노출
- `setUnlockedFor(category)` → localStorage 저장
- 캐시된 `_saju` / `_meta` 있으면 즉시 결과 패널로 이동
- 없으면 사용자가 다시 사주 입력 시 자동 해제 상태로 진입

## 4. 환경 변수 / 키 관리

### 클라이언트 (`index.html`)
| 상수 | 위치 | 값 |
|---|---|---|
| `TOSS_CLIENT_KEY` | `index.html` 결제 흐름 블록 | 토스 대시보드 > 클라이언트 키 (`live_ck_...` / 테스트 `test_ck_...`) |
| `PAYMENT_CONFIRM_URL` | 동일 | 결제 워커 배포 후 발급된 URL (예: `https://payment.saju-mbti.workers.dev/confirm`) |

### 워커 (`worker/payment-worker.js`)
| Secret | 등록 명령 | 값 |
|---|---|---|
| `TOSS_SECRET_KEY` | `wrangler secret put TOSS_SECRET_KEY --config wrangler.payment.toml` | 토스 시크릿 키 (절대 클라이언트 노출 X) |
| `ALLOWED_ORIGIN` | `wrangler secret put ALLOWED_ORIGIN --config wrangler.payment.toml` | `https://saju-mbti-9h1.pages.dev` (커스텀 도메인 추가 시 콤마 구분) |

## 5. 배포 절차

1. **약관·정책 페이지 운영자 정보 교체**
   - `legal/terms.html`, `legal/privacy.html`, `legal/refund.html` 의 `[운영자명]`·`[사업자등록번호]`·`[대표자명]`·`[사업장 주소]` 등 placeholder 실제 값으로 수정
   - `index.html` 푸터의 같은 placeholder 도 수정
2. **토스페이먼츠 가맹점 등록**
   - 사업자등록증·통신판매업 신고증 업로드 → 심사 (영업일 기준 1~3일)
   - 클라이언트 키 / 시크릿 키 발급
3. **결제 워커 배포**
   ```bash
   cd worker
   wrangler login
   wrangler secret put TOSS_SECRET_KEY --config wrangler.payment.toml
   wrangler secret put ALLOWED_ORIGIN --config wrangler.payment.toml
   wrangler deploy --config wrangler.payment.toml
   ```
   - 배포 후 출력된 `https://payment-worker.<your>.workers.dev` URL 확보
4. **`index.html` 키 교체**
   - `TOSS_CLIENT_KEY` 를 발급받은 키로 (테스트는 `test_ck_...`, 운영은 `live_ck_...`)
   - `PAYMENT_CONFIRM_URL` 을 워커 URL + `/confirm` 으로
5. **테스트 결제 → 운영 전환**
   - 테스트 키로 카드 결제 → 잠금 해제까지 end-to-end 검증
   - 환불 정책 시뮬레이션 (테스트 결제 취소 → 토스 대시보드)
   - 운영 키로 교체 후 실결제 1건 테스트
6. **통신판매업 신고 (정부24)**
   - 사업자 등록 + 도메인 + 약관 페이지 URL 으로 신고
   - 신고증 발급 후 약관·푸터의 신고번호 placeholder 교체

## 6. 운영 체크리스트 (월 단위)

- [ ] 결제·환불 분쟁 0건 또는 7일 이내 처리 (한국소비자원 분쟁조정 회피)
- [ ] 토스 대시보드 정산 내역 vs 자체 로그 (KV 사용 시) 일치 확인
- [ ] `localStorage` 데이터를 사용자가 삭제 시 재결제 안내 (FAQ 문구)
- [ ] 약관 개정 시 시행일 7일 전 (불리한 변경은 30일 전) 공지

## 7. 향후 개선 후보

- **회원 도입 시**: localStorage 대신 사용자 ID 기반 unlock 영속화 (디바이스 간 동기화)
- **간편결제 분기**: `tp.requestPayment('카드'|'간편결제'|'계좌이체')` 선택 UI
- **재구매 할인**: KV 에 결제 이력 누적 → 두 번째 구매부터 자동 할인
- **번들 패키지**: 4개 카테고리 묶음 (예: 59,900원) 옵션 추가
- **세금계산서 자동 발급**: 사업자 고객용 — 토스 비즈머니 또는 별도 어드민

## 8. 관련 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 결제 동의 모달, 토스 SDK 호출, success/fail 콜백 |
| `legal/terms.html` | 이용약관 |
| `legal/privacy.html` | 개인정보처리방침 |
| `legal/refund.html` | 결제·환불 정책 |
| `worker/payment-worker.js` | 결제 승인 검증 백엔드 |
| `worker/wrangler.payment.toml` | 워커 배포 설정 |
| `PAYMENT_FLOW.md` | 본 문서 |
