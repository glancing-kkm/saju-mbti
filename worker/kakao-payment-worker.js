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
  newyear: 19000,
  gunghap: 5900,
  name: 9900,
  life: 24000,
  chatpack1: 1000,
  chatpack3: 2500,
  chatpack5: 4000,
  chatpack10: 7000,
};
const MONTHLY_MAX = 6;
const MONTHLY_UNIT = 2000;

function isAmountValid(category, amount) {
  if (category === 'monthly') {
    if (amount % MONTHLY_UNIT !== 0) return false;
    const cnt = amount / MONTHLY_UNIT;
    return cnt >= 1 && cnt <= MONTHLY_MAX;
  }
  return CATEGORY_PRICE[category] === amount;
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

    return json({ ok: false, code: 'NOT_FOUND', message: 'Endpoint not found' }, 404, corsHeaders);
  },
};

// ─── 결제 준비 ───
async function handleReady(request, env, cid, corsHeaders) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, code: 'BAD_JSON', message: 'Invalid JSON' }, 400, corsHeaders); }

  const { category, amount, partnerOrderId, partnerUserId, itemName, approvalUrl, cancelUrl, failUrl } = body || {};
  if (!category || typeof amount !== 'number' || !partnerOrderId || !partnerUserId || !itemName || !approvalUrl) {
    return json({ ok: false, code: 'MISSING_FIELDS', message: 'category, amount, partnerOrderId, partnerUserId, itemName, approvalUrl required' }, 400, corsHeaders);
  }
  if (!CATEGORY_PRICE[category]) {
    return json({ ok: false, code: 'UNKNOWN_CATEGORY', message: `Unknown category: ${category}` }, 400, corsHeaders);
  }
  if (!isAmountValid(category, amount)) {
    return json({ ok: false, code: 'AMOUNT_MISMATCH', message: `Amount mismatch for ${category}` }, 400, corsHeaders);
  }

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

  const { tid, partnerOrderId, partnerUserId, pgToken, category, amount } = body || {};
  if (!tid || !partnerOrderId || !partnerUserId || !pgToken) {
    return json({ ok: false, code: 'MISSING_FIELDS', message: 'tid, partnerOrderId, partnerUserId, pgToken required' }, 400, corsHeaders);
  }
  // 카테고리·금액 재검증 (위조 방지)
  if (category && amount != null && !isAmountValid(category, amount)) {
    return json({ ok: false, code: 'AMOUNT_MISMATCH', message: `Amount mismatch` }, 400, corsHeaders);
  }

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
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const allowOrigin = allowed.length === 0 ? '*' : (allowed.includes(origin) ? origin : allowed[0]);
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(extraHeaders || {}) },
  });
}
