// ──────────────────────────────────────────────
//  천지인 사주 — 카카오페이 결제 승인 워커 (신규 API)
//  Cloudflare Workers 배포 전용
// ──────────────────────────────────────────────
//
//  Endpoint:
//    POST /ready    — 결제 준비 (tid + next_redirect_url 반환)
//    POST /approve  — 결제 승인 (pg_token으로 최종 승인)
//
//  배포 전 wrangler secret 등록:
//    wrangler secret put KAKAO_SECRET_KEY   (카카오페이 SECRET KEY, biz.kakaopay.com에서 발급)
//    wrangler secret put KAKAO_CID          (가맹점 식별 코드 — 테스트: TC0ONETIME)
//    wrangler secret put ALLOWED_ORIGIN     (예: https://saju-mbti-9h1.pages.dev)
//
//  카카오페이 API 문서: https://developers.kakaopay.com/docs/payment/online/use-info
//
//  결제 흐름:
//    1. 클라이언트 → /ready POST {category, amount, partnerOrderId, partnerUserId, itemName, returnUrl}
//    2. Worker → kakaopay /ready API → {tid, next_redirect_mobile_url}
//    3. 클라이언트 → next_redirect_url로 redirect → 사용자가 카카오페이 앱/웹에서 결제
//    4. 콜백 returnUrl?pg_token=xxx&orderId=xxx 로 돌아옴
//    5. 클라이언트 → /approve POST {tid, partnerOrderId, partnerUserId, pgToken, category, amount}
//    6. Worker → kakaopay /approve API → 결제 완료 (status='SUCCESS_PAYMENT')

// 카테고리당 단가 (원). monthly는 월당 단가
const CATEGORY_PRICE = {
  daypick: 1500,
  monthly: 2000, // 월당 — 2000 × 1~6개월
  newyear: 1500,
  gunghap: 1000,
  name: 1500,
  life: 1500,
  chatpack3: 1500,
  chatpack5: 2000,
  chatpack7: 3000,
  tarot3: 1500,
  tarot5: 2000,
  tarot10: 3000,
  'astro-birth-basic': 1500,
  'astro-love-marriage': 1500,
  'astro-career-money': 1500,
  'astro-yearly': 1500,
  'astro-full-report': 2500,
};
const MONTHLY_MAX = 6;
const MONTHLY_UNIT = 2000;
const AUGUST_990_PROMO_PRICE = 990;
const AUGUST_CHAT_PACK_PRICE = { chatpack3: 990, chatpack5: 1490, chatpack7: 1990 };
const AUGUST_990_PROMO_START_MS = Date.parse('2026-07-31T15:00:00.000Z');
const AUGUST_990_PROMO_END_MS = Date.parse('2026-08-31T15:00:00.000Z');
function isAugust990Promo(nowMs = Date.now()) {
  return nowMs >= AUGUST_990_PROMO_START_MS && nowMs < AUGUST_990_PROMO_END_MS;
}
function augustPromoPriceForCategory(category) {
  return AUGUST_CHAT_PACK_PRICE[category] || AUGUST_990_PROMO_PRICE;
}

// 공유 할인코드 — 최대 차감액 (서버 강제 캡)
const MAX_COUPON_AMOUNT = 1500;
const REVIEW_MIN_LENGTH = 30;
const REVIEW_MAX_LENGTH = 500;
const REVIEW_RATE_LIMIT_SEC = 600;        // 같은 sajuId/userId 10분 1회
const REVIEW_IP_DAILY_LIMIT = 5;          // 같은 IP 24시간 5건
const REVIEW_TTL_SEC = 90 * 24 * 60 * 60; // KV 후기 90일 보관

// 공유 프로모션 코드 — 서버 발급·검증·1회용
const SHARE_COUPON_AMOUNT = 1500;             // 공유 할인액
const PROMO_TTL_SEC = 30 * 24 * 60 * 60;      // 코드 유효 30일
const PROMO_KV_TTL_SEC = 35 * 24 * 60 * 60;   // KV 보관(used 추적 여유)
const SHARE_IP_DAILY_LIMIT = 8;               // 같은 IP 24h 공유코드 발급 한도
const PROMO_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동문자 제외

// 결제액과 쿠폰액이 합쳐서 원가가 되는지 검증 (서버에서 쿠폰 금액 강제)
function isAmountValid(category, amount, couponAmount = 0, nowMs = Date.now()) {
  if (!CATEGORY_PRICE[category]) return false;
  const c = Number(couponAmount) || 0;
  if (c < 0 || c > MAX_COUPON_AMOUNT) return false;
  const gross = amount + c;
  if (isAugust990Promo(nowMs)) return gross === augustPromoPriceForCategory(category);
  if (category === 'monthly') {
    if (gross % MONTHLY_UNIT !== 0) return false;
    const cnt = gross / MONTHLY_UNIT;
    return cnt >= 1 && cnt <= MONTHLY_MAX;
  }
  return CATEGORY_PRICE[category] === gross;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!env.KAKAO_SECRET_KEY) {
      return json({ ok: false, code: 'SERVER_MISCONFIGURED', message: 'KAKAO_SECRET_KEY not set' }, 500, corsHeaders);
    }

    const cid = env.KAKAO_CID || 'TC0ONETIME'; // 기본: 테스트 가맹점

    if (url.pathname === '/ready' && request.method === 'POST') {
      return await handleReady(request, env, cid, corsHeaders);
    }
    if (url.pathname === '/approve' && request.method === 'POST') {
      return await handleApprove(request, env, cid, corsHeaders);
    }
    if (url.pathname === '/promo/issue-share' && request.method === 'POST') {
      return await handleIssueShare(request, env, corsHeaders);
    }
    if (url.pathname === '/promo/validate' && request.method === 'POST') {
      return await handlePromoValidate(request, env, corsHeaders);
    }
    if (url.pathname === '/promo/redeem' && request.method === 'POST') {
      return await handlePromoRedeem(request, env, corsHeaders);
    }

    return json({ ok: false, code: 'NOT_FOUND', message: 'Endpoint not found' }, 404, corsHeaders);
  },
};

// ─── 결제 준비 ───
async function handleReady(request, env, cid, corsHeaders) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, code: 'BAD_JSON', message: 'Invalid JSON' }, 400, corsHeaders); }

  const { category, amount, partnerOrderId, partnerUserId, itemName, approvalUrl, cancelUrl, failUrl, couponAmount, couponCode } = body || {};
  if (!category || typeof amount !== 'number' || !partnerOrderId || !partnerUserId || !itemName || !approvalUrl) {
    return json({ ok: false, code: 'MISSING_FIELDS', message: 'category, amount, partnerOrderId, partnerUserId, itemName, approvalUrl required' }, 400, corsHeaders);
  }
  if (!CATEGORY_PRICE[category]) {
    return json({ ok: false, code: 'UNKNOWN_CATEGORY', message: `Unknown category: ${category}` }, 400, corsHeaders);
  }
  if (!isAmountValid(category, amount, couponAmount || 0)) {
    return json({ ok: false, code: 'AMOUNT_MISMATCH', message: `Amount mismatch for ${category}` }, 400, corsHeaders);
  }
  // 쿠폰 사전 검증 (사용 처리는 /approve에서) — 위조 할인 차단
  const couponPre = await verifyCouponForPayment(env, couponCode, couponAmount || 0, category, amount);
  if (!couponPre.ok) return json({ ok: false, code: couponPre.code, message: couponPre.message }, couponPre.status || 400, corsHeaders);

  const reqBody = {
    cid,
    partner_order_id: partnerOrderId,
    partner_user_id: partnerUserId,
    item_name: itemName.substring(0, 100),
    quantity: 1,
    total_amount: amount,
    tax_free_amount: 0,
    approval_url: approvalUrl,
    cancel_url: cancelUrl || approvalUrl + '&result=cancel',
    fail_url: failUrl || approvalUrl + '&result=fail',
  };

  let res;
  try {
    res = await fetch('https://open-api.kakaopay.com/online/v1/payment/ready', {
      method: 'POST',
      headers: {
        'Authorization': `SECRET_KEY ${env.KAKAO_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    });
  } catch (e) {
    return json({ ok: false, code: 'KAKAO_NETWORK', message: e.message || 'Network error' }, 502, corsHeaders);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return json({ ok: false, code: data.error_code || 'KAKAO_REJECTED', message: data.error_message || `Kakao API ${res.status}` }, res.status, corsHeaders);
  }

  return json({
    ok: true,
    tid: data.tid,
    nextRedirectMobileUrl: data.next_redirect_mobile_url,
    nextRedirectPcUrl: data.next_redirect_pc_url,
    androidAppScheme: data.android_app_scheme,
    iosAppScheme: data.ios_app_scheme,
    createdAt: data.created_at,
  }, 200, corsHeaders);
}

// ─── 결제 승인 ───
async function handleApprove(request, env, cid, corsHeaders) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, code: 'BAD_JSON', message: 'Invalid JSON' }, 400, corsHeaders); }

  const { tid, partnerOrderId, partnerUserId, pgToken, category, amount, couponAmount, couponCode } = body || {};
  if (!tid || !partnerOrderId || !partnerUserId || !pgToken) {
    return json({ ok: false, code: 'MISSING_FIELDS', message: 'tid, partnerOrderId, partnerUserId, pgToken required' }, 400, corsHeaders);
  }
  // 카테고리·금액 재검증 (위조 방지) — 쿠폰 금액 포함
  if (category && amount != null && !isAmountValid(category, amount, couponAmount || 0)) {
    return json({ ok: false, code: 'AMOUNT_MISMATCH', message: `Amount mismatch` }, 400, corsHeaders);
  }
  // 쿠폰 검증 — 실제 코드 존재·미사용·금액 일치 (위조 할인 차단)
  const cAmt = Number(couponAmount) || 0;
  const couponChk = await verifyCouponForPayment(env, couponCode, cAmt, category, amount, partnerOrderId);
  if (!couponChk.ok) return json({ ok: false, code: couponChk.code, message: couponChk.message }, couponChk.status || 400, corsHeaders);

  const reqBody = {
    cid,
    tid,
    partner_order_id: partnerOrderId,
    partner_user_id: partnerUserId,
    pg_token: pgToken,
  };

  let res;
  try {
    res = await fetch('https://open-api.kakaopay.com/online/v1/payment/approve', {
      method: 'POST',
      headers: {
        'Authorization': `SECRET_KEY ${env.KAKAO_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    });
  } catch (e) {
    return json({ ok: false, code: 'KAKAO_NETWORK', message: e.message || 'Network error' }, 502, corsHeaders);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return json({ ok: false, code: data.error_code || 'KAKAO_REJECTED', message: data.error_message || `Kakao API ${res.status}` }, res.status, corsHeaders);
  }

  // 결제 승인 성공 → 보상코드 1회용 처리 (최선노력; 같은 주문 재요청은 멱등)
  if (couponChk.rec && !(couponChk.rec.used && couponChk.rec.orderId === partnerOrderId)) {
    couponChk.rec.used = true;
    couponChk.rec.usedAt = Date.now();
    couponChk.rec.orderId = partnerOrderId;
    try { await savePromo(env, couponChk.rec); } catch (e) {}
  }

  // 카카오페이 승인 응답: aid, tid, cid, sid?, partner_order_id, partner_user_id, payment_method_type, amount, item_name, ...
  return json({
    ok: true,
    payment: {
      aid: data.aid,
      tid: data.tid,
      orderId: data.partner_order_id,
      category,
      amount: data.amount && data.amount.total,
      paymentMethod: data.payment_method_type,
      itemName: data.item_name,
      approvedAt: data.approved_at,
    },
  }, 200, corsHeaders);
}

function buildCorsHeaders(request, env) {
  const origin = normalizeOrigin(request.headers.get('Origin') || '');
  const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => normalizeOrigin(s)).filter(Boolean);
  const allowOrigin = allowed.length === 0 ? '*' : (allowed.includes(origin) ? origin : allowed[0]);
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(extraHeaders || {}) },
  });
}

// ═════════════════════════════════════════════════════════════
//  후기(Review) 시스템 — KV 저장, 관리자 검토 후 정적 REVIEWS 반영
// ═════════════════════════════════════════════════════════════

// sajuId 형식: "<gender>_<8자 한글기둥 또는 XX>"  예: male_갑자을축병인정묘
const SAJU_ID_RE = /^[a-zA-Z]+_[가-힣XxA-Za-z0-9]{8,16}$/;

function sanitizeText(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/<[^>]*>/g, '').replace(/[\x00-\x1f\x7f]/g, '').trim();
}

function maskNickname(n) {
  const s = sanitizeText(n).slice(0, 10);
  if (s.length === 0) return '익명 님';
  const head = s.slice(0, 1);
  return head + '** 님';
}

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function genReviewId(sajuId, text) {
  const h = await sha256Hex(sajuId + '|' + text);
  return 'rv_' + h.slice(0, 16);
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}

// 단순 rate limit — KV에 키 존재하면 차단. TTL로 자동 해제.
async function checkRateLimit(env, key, ttlSec) {
  if (!env.REVIEWS_KV) return { ok: true };
  const v = await env.REVIEWS_KV.get(key);
  if (v) return { ok: false, key };
  await env.REVIEWS_KV.put(key, '1', { expirationTtl: ttlSec });
  return { ok: true };
}

// IP 일일 한도 — 같은 IP가 24h 내 N건 초과 시 차단
async function checkIpDailyLimit(env, ip) {
  if (!env.REVIEWS_KV || ip === 'unknown') return { ok: true };
  const day = new Date().toISOString().slice(0, 10);
  const key = `ip_review_count:${ip}:${day}`;
  const cur = parseInt((await env.REVIEWS_KV.get(key)) || '0', 10) || 0;
  if (cur >= REVIEW_IP_DAILY_LIMIT) return { ok: false };
  await env.REVIEWS_KV.put(key, String(cur + 1), { expirationTtl: 86400 });
  return { ok: true };
}

// ─── /review — 후기 제출 ───
async function handleReviewSubmit(request, env, corsHeaders) {
  if (!env.REVIEWS_KV) {
    return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED', message: '후기 시스템이 일시 점검 중입니다.' }, 503, corsHeaders);
  }
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, code: 'BAD_JSON', message: 'Invalid JSON' }, 400, corsHeaders); }

  const { sajuId, cat, stars, text, nickname, partnerUserId } = body || {};
  if (!sajuId || !cat || !stars || !text || !partnerUserId) {
    return json({ ok: false, code: 'MISSING_FIELDS', message: 'sajuId, cat, stars, text, partnerUserId required' }, 400, corsHeaders);
  }
  if (!SAJU_ID_RE.test(sajuId)) {
    return json({ ok: false, code: 'BAD_SAJU_ID', message: 'Invalid sajuId format' }, 400, corsHeaders);
  }
  if (!CATEGORY_PRICE[cat]) {
    return json({ ok: false, code: 'UNKNOWN_CATEGORY', message: `Unknown category: ${cat}` }, 400, corsHeaders);
  }
  const s = parseInt(stars, 10);
  if (!(s >= 1 && s <= 5)) {
    return json({ ok: false, code: 'BAD_STARS', message: 'stars must be 1~5' }, 400, corsHeaders);
  }
  const cleanText = sanitizeText(text);
  if (cleanText.length < REVIEW_MIN_LENGTH || cleanText.length > REVIEW_MAX_LENGTH) {
    return json({ ok: false, code: 'BAD_TEXT_LENGTH', message: `text ${REVIEW_MIN_LENGTH}~${REVIEW_MAX_LENGTH} chars` }, 400, corsHeaders);
  }
  const maskedNick = maskNickname(nickname);

  // 차단 리스트 확인
  const blocked = await env.REVIEWS_KV.get(`review_blocked:${sajuId}`);
  if (blocked) {
    return json({ ok: false, code: 'BLOCKED', message: '후기 작성이 제한된 사주입니다.' }, 403, corsHeaders);
  }

  // 사주ID 기준 1회 제한
  // 인덱스 키로 빠르게 확인
  const submittedFlag = await env.REVIEWS_KV.get(`review_submitted:${sajuId}`);
  if (submittedFlag) {
    return json({ ok: false, code: 'DUPLICATE', message: '이미 후기를 작성하신 사주입니다.' }, 409, corsHeaders);
  }

  // Rate limit (sajuId, userId 별도)
  const rlSaju = await checkRateLimit(env, `ratelimit:review:saju:${sajuId}`, REVIEW_RATE_LIMIT_SEC);
  if (!rlSaju.ok) return json({ ok: false, code: 'RATE_LIMIT', message: '잠시 후 다시 시도해 주세요.' }, 429, corsHeaders);
  const rlUser = await checkRateLimit(env, `ratelimit:review:user:${partnerUserId}`, REVIEW_RATE_LIMIT_SEC);
  if (!rlUser.ok) return json({ ok: false, code: 'RATE_LIMIT', message: '잠시 후 다시 시도해 주세요.' }, 429, corsHeaders);

  // IP 일일 한도
  const ip = getClientIp(request);
  const ipCheck = await checkIpDailyLimit(env, ip);
  if (!ipCheck.ok) {
    return json({ ok: false, code: 'IP_LIMIT', message: '오늘 후기 작성 한도를 초과했습니다.' }, 429, corsHeaders);
  }

  const ts = Date.now();
  const reviewId = await genReviewId(sajuId, cleanText);

  // Idempotency: 동일 reviewId가 이미 있으면 그대로 반환
  const existing = await env.REVIEWS_KV.get(`review_id_idx:${reviewId}`);
  if (existing) {
    const rc = await getOrMintReviewCode(env, sajuId, partnerUserId);
    return json({
      ok: true, reviewId,
      coupon: { code: (rc && rc.code) || null, amount: MAX_COUPON_AMOUNT, expiresAt: (rc && rc.expiresAt) || (ts + 30 * 86400 * 1000) },
      message: '후기가 이미 접수되어 있습니다.',
    }, 200, corsHeaders);
  }

  const record = {
    reviewId, sajuId, cat, stars: s,
    text: cleanText, nickname: maskedNick, partnerUserId,
    ip, ua: (request.headers.get('User-Agent') || '').slice(0, 200),
    status: 'pending', createdAt: ts,
  };

  const reviewKey = `review:${sajuId}:${ts}`;
  await env.REVIEWS_KV.put(reviewKey, JSON.stringify(record), { expirationTtl: REVIEW_TTL_SEC });
  await env.REVIEWS_KV.put(`review_idx:pending:${ts}`, reviewKey, { expirationTtl: REVIEW_TTL_SEC });
  await env.REVIEWS_KV.put(`review_id_idx:${reviewId}`, reviewKey, { expirationTtl: REVIEW_TTL_SEC });
  await env.REVIEWS_KV.put(`review_submitted:${sajuId}`, ts.toString()); // 영구 (중복방지)

  const rc = await getOrMintReviewCode(env, sajuId, partnerUserId);
  return json({
    ok: true,
    reviewId,
    coupon: { code: (rc && rc.code) || null, amount: MAX_COUPON_AMOUNT, expiresAt: (rc && rc.expiresAt) || (ts + 30 * 86400 * 1000) },
    message: '후기가 접수되었습니다. 검토 후 게시됩니다.',
  }, 200, corsHeaders);
}

// ─── /review/check — 사주ID 사전 중복 확인 ───
async function handleReviewCheck(request, env, corsHeaders) {
  if (!env.REVIEWS_KV) {
    // KV 없으면 클라이언트 localStorage만으로 동작 (열린 상태)
    return json({ ok: true, alreadySubmitted: false, kvEnabled: false }, 200, corsHeaders);
  }
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, code: 'BAD_JSON', message: 'Invalid JSON' }, 400, corsHeaders); }
  const { sajuId } = body || {};
  if (!sajuId || !SAJU_ID_RE.test(sajuId)) {
    return json({ ok: false, code: 'BAD_SAJU_ID', message: 'Invalid sajuId' }, 400, corsHeaders);
  }
  const flag = await env.REVIEWS_KV.get(`review_submitted:${sajuId}`);
  const blocked = await env.REVIEWS_KV.get(`review_blocked:${sajuId}`);
  return json({ ok: true, alreadySubmitted: !!flag, blocked: !!blocked, kvEnabled: true }, 200, corsHeaders);
}

// ─── /admin/reviews?token=X&status=pending|approved|rejected ───
async function handleAdminReviews(request, env, corsHeaders) {
  if (!env.ADMIN_TOKEN || !env.REVIEWS_KV) {
    return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, 503, corsHeaders);
  }
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || request.headers.get('X-Admin-Token');
  if (!token || token !== env.ADMIN_TOKEN) {
    return json({ ok: false, code: 'UNAUTHORIZED' }, 401, corsHeaders);
  }
  const status = url.searchParams.get('status') || 'pending';
  if (!['pending', 'approved', 'rejected', 'published'].includes(status)) {
    return json({ ok: false, code: 'BAD_STATUS' }, 400, corsHeaders);
  }
  const cursor = url.searchParams.get('cursor') || undefined;
  const list = await env.REVIEWS_KV.list({ prefix: `review_idx:${status}:`, limit: 100, cursor });
  const items = [];
  for (const k of list.keys) {
    const reviewKey = await env.REVIEWS_KV.get(k.name);
    if (!reviewKey) continue;
    const raw = await env.REVIEWS_KV.get(reviewKey);
    if (raw) {
      try { items.push(JSON.parse(raw)); } catch (e) {}
    }
  }
  return json({
    ok: true, status, items,
    cursor: list.list_complete ? null : list.cursor,
  }, 200, corsHeaders);
}

// ═════════════════════════════════════════════════════════════
//  보상 프로모션 코드 — 서버 발급·검증·1회용 (REVIEWS_KV 재사용)
// ═════════════════════════════════════════════════════════════

function wonStr(n) { return Number(n || 0).toLocaleString('en-US'); }

function normalizePromoCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}
function promoKey(code) { return `promo:${normalizePromoCode(code)}`; }

function genPromoCode(prefix) {
  let s = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) s += PROMO_CODE_ALPHABET[bytes[i] % PROMO_CODE_ALPHABET.length];
  return `${prefix}-${s}`;
}

async function loadPromo(env, code) {
  if (!env.REVIEWS_KV || !code) return null;
  const raw = await env.REVIEWS_KV.get(promoKey(code));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
async function savePromo(env, rec) {
  await env.REVIEWS_KV.put(promoKey(rec.code), JSON.stringify(rec), { expirationTtl: PROMO_KV_TTL_SEC });
}

// 코드 발급 (충돌 시 재시도). idxKey가 있으면 멱등 인덱스도 기록.
async function mintPromo(env, { type, amount, partnerUserId, sajuId, channel, idxKey }) {
  const now = Date.now();
  const expiresAt = now + PROMO_TTL_SEC * 1000;
  const prefix = type === 'share' ? 'SHARE' : 'REVIEW';
  for (let i = 0; i < 8; i++) {
    const code = genPromoCode(prefix);
    if (await env.REVIEWS_KV.get(promoKey(code))) continue; // 충돌 회피
    const rec = {
      code, type, amount, used: false, usedAt: null, orderId: null,
      expiresAt, partnerUserId: partnerUserId || null, sajuId: sajuId || null,
      channel: channel || null, createdAt: now,
    };
    await savePromo(env, rec);
    if (idxKey) await env.REVIEWS_KV.put(idxKey, code, { expirationTtl: PROMO_KV_TTL_SEC });
    return rec;
  }
  return null;
}

// 후기 보상코드 — 사주별 1개 (멱등)
async function getOrMintReviewCode(env, sajuId, partnerUserId) {
  if (!env.REVIEWS_KV) return null;
  const idxKey = `promo_review_idx:${sajuId}`;
  const existing = await env.REVIEWS_KV.get(idxKey);
  if (existing) {
    const rec = await loadPromo(env, existing);
    if (rec) return rec;
  }
  return await mintPromo(env, { type: 'review', amount: MAX_COUPON_AMOUNT, partnerUserId, sajuId, idxKey });
}

// 코드 상태 검증 (사용 처리 안 함). amount를 주면 적용 가능(결제액>할인액) 여부도 확인.
function evalPromo(rec, amount) {
  if (!rec) return { ok: false, code: 'NOT_FOUND', message: '등록된 보상코드를 찾을 수 없어요.' };
  if (rec.type !== 'share' || rec.amount !== SHARE_COUPON_AMOUNT) return { ok: false, code: 'DISABLED', message: '더 이상 사용할 수 없는 코드예요.' };
  if (rec.used) return { ok: false, code: 'USED', message: '이미 사용한 보상코드예요.' };
  if (!(rec.expiresAt > Date.now())) return { ok: false, code: 'EXPIRED', message: '유효기간이 지난 보상코드예요.' };
  if (typeof amount === 'number' && amount < rec.amount) {
    return { ok: false, code: 'MIN_AMOUNT', message: `${wonStr(rec.amount)}원 이상 상품에 사용할 수 있어요.` };
  }
  return { ok: true };
}

// 결제(/ready·/approve) 공용 쿠폰 검증. couponAmount<=0이면 통과(코드 불필요).
// 반환: { ok, code?, message?, status?, rec? }  rec는 approve에서 used 처리에 사용.
async function verifyCouponForPayment(env, couponCode, couponAmount, category, amount, orderId) {
  const cAmt = Number(couponAmount) || 0;
  if (cAmt <= 0) return { ok: true, rec: null };
  if (!env.REVIEWS_KV) return { ok: false, code: 'SERVICE_NOT_CONFIGURED', message: '보상 시스템이 일시 점검 중입니다.', status: 503 };
  if (!couponCode) return { ok: false, code: 'COUPON_REQUIRED', message: '보상코드 정보가 없어요.', status: 400 };
  const rec = await loadPromo(env, couponCode);
  // 같은 주문으로 이미 사용된 코드면 멱등 허용 (approve 재시도 대비)
  if (orderId && rec && rec.used && rec.orderId === orderId) return { ok: true, rec };
  const gross = (typeof amount === 'number') ? amount + cAmt : undefined;
  const ev = evalPromo(rec, gross);
  if (!ev.ok) return { ok: false, code: 'INVALID_COUPON', message: ev.message, status: 400 };
  if (rec.amount !== cAmt) return { ok: false, code: 'COUPON_AMOUNT_MISMATCH', message: '할인 금액이 보상코드와 달라요.', status: 400 };
  return { ok: true, rec };
}

// ─── /promo/issue-share — 공유 보상코드 발급 ───
async function handleIssueShare(request, env, corsHeaders) {
  if (!env.REVIEWS_KV) {
    return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED', message: '보상 시스템이 일시 점검 중입니다.' }, 503, corsHeaders);
  }
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, code: 'BAD_JSON', message: 'Invalid JSON' }, 400, corsHeaders); }

  const { partnerUserId, sajuId, channel } = body || {};
  if (!partnerUserId || !sajuId || !channel) {
    return json({ ok: false, code: 'MISSING_FIELDS', message: 'partnerUserId, sajuId, channel required' }, 400, corsHeaders);
  }
  if (!SAJU_ID_RE.test(sajuId)) {
    return json({ ok: false, code: 'BAD_SAJU_ID', message: 'Invalid sajuId' }, 400, corsHeaders);
  }
  const ch = String(channel).toLowerCase();
  if (!/^[a-z]{1,16}$/.test(ch)) {
    return json({ ok: false, code: 'BAD_CHANNEL', message: 'Invalid channel' }, 400, corsHeaders);
  }

  // 멱등 — 같은 사주·채널이면 기존 코드 반환
  const idxKey = `promo_share_idx:${sajuId}:${ch}`;
  const existingCode = await env.REVIEWS_KV.get(idxKey);
  if (existingCode) {
    const rec = await loadPromo(env, existingCode);
    if (rec && rec.type === 'share' && rec.amount === SHARE_COUPON_AMOUNT && !rec.used && rec.expiresAt > Date.now()) {
      return json({ ok: true, code: rec.code, amount: rec.amount, type: 'share', expiresAt: rec.expiresAt, reused: true }, 200, corsHeaders);
    }
  }

  // IP 일일 한도
  const ip = getClientIp(request);
  if (ip !== 'unknown') {
    const day = new Date().toISOString().slice(0, 10);
    const ipKey = `ip_promo_share:${ip}:${day}`;
    const cur = parseInt((await env.REVIEWS_KV.get(ipKey)) || '0', 10) || 0;
    if (cur >= SHARE_IP_DAILY_LIMIT) {
      return json({ ok: false, code: 'IP_LIMIT', message: '오늘 공유 보상 발급 한도를 초과했어요.' }, 429, corsHeaders);
    }
    await env.REVIEWS_KV.put(ipKey, String(cur + 1), { expirationTtl: 86400 });
  }

  const rec = await mintPromo(env, { type: 'share', amount: SHARE_COUPON_AMOUNT, partnerUserId, sajuId, channel: ch, idxKey });
  if (!rec) return json({ ok: false, code: 'MINT_FAILED', message: '코드 발급에 실패했어요. 잠시 후 다시 시도해 주세요.' }, 500, corsHeaders);
  return json({ ok: true, code: rec.code, amount: rec.amount, type: 'share', expiresAt: rec.expiresAt }, 200, corsHeaders);
}

// ─── /promo/validate — 코드 검증 (결제 전 입력 확인) ───
async function handlePromoValidate(request, env, corsHeaders) {
  if (!env.REVIEWS_KV) {
    return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED', message: '보상 시스템이 일시 점검 중입니다.' }, 503, corsHeaders);
  }
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, code: 'BAD_JSON', message: 'Invalid JSON' }, 400, corsHeaders); }

  const { code, amount } = body || {};
  if (!code) return json({ ok: false, code: 'EMPTY', message: '프로모션 코드를 입력해 주세요.' }, 400, corsHeaders);
  const rec = await loadPromo(env, code);
  const ev = evalPromo(rec, typeof amount === 'number' ? amount : undefined);
  if (!ev.ok) return json({ ok: false, code: ev.code, message: ev.message }, 200, corsHeaders);
  return json({ ok: true, code: rec.code, amount: rec.amount, type: rec.type, expiresAt: rec.expiresAt }, 200, corsHeaders);
}

// 할인으로 결제액이 0원이 된 주문을 검증하고 코드를 소진한다.
async function handlePromoRedeem(request, env, corsHeaders) {
  if (!env.REVIEWS_KV) {
    return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED', message: '보상 시스템이 일시 점검 중입니다.' }, 503, corsHeaders);
  }
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, code: 'BAD_JSON', message: 'Invalid JSON' }, 400, corsHeaders); }
  const { code, category, partnerOrderId, partnerUserId } = body || {};
  if (!code || !category || !partnerOrderId || !partnerUserId) {
    return json({ ok: false, code: 'MISSING_FIELDS', message: '할인코드와 주문 정보가 필요해요.' }, 400, corsHeaders);
  }
  if (!isAmountValid(category, 0, SHARE_COUPON_AMOUNT)) {
    return json({ ok: false, code: 'AMOUNT_MISMATCH', message: '이 상품에는 무료 할인을 적용할 수 없어요.' }, 400, corsHeaders);
  }
  const checked = await verifyCouponForPayment(env, code, SHARE_COUPON_AMOUNT, category, 0, partnerOrderId);
  if (!checked.ok) return json({ ok: false, code: checked.code, message: checked.message }, checked.status || 400, corsHeaders);
  checked.rec.used = true;
  checked.rec.usedAt = Date.now();
  checked.rec.orderId = partnerOrderId;
  checked.rec.partnerUserId = checked.rec.partnerUserId || partnerUserId;
  await savePromo(env, checked.rec);
  return json({ ok: true, orderId: partnerOrderId, amount: 0, discount: SHARE_COUPON_AMOUNT }, 200, corsHeaders);
}
