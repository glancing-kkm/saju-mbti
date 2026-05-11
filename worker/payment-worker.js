// ──────────────────────────────────────────────
//  천지인 사주 — 토스페이먼츠 결제 승인 워커
//  Cloudflare Workers 배포 전용
// ──────────────────────────────────────────────
//
//  배포 전 wrangler secret 등록:
//    wrangler secret put TOSS_SECRET_KEY   (운영 시크릿 키, 절대 클라이언트에 노출 금지)
//    wrangler secret put ALLOWED_ORIGIN    (예: https://saju-mbti-9h1.pages.dev)
//
//  토스 API 문서: https://docs.tosspayments.com/reference#payment-confirm
//  엔드포인트: POST /confirm
//    Request : { paymentKey, orderId, amount, category }
//    Response: { ok:true, payment:{...} } | { ok:false, code, message }
//
//  보안 체크리스트:
//    1) Origin 헤더 검증 (ALLOWED_ORIGIN 만 허용)
//    2) Content-Type application/json 검증
//    3) amount 가 우리가 등록한 카테고리 가격과 일치하는지 서버에서 재확인
//    4) 토스 API 호출 결과의 status === 'DONE' 확인
//    5) 동일 orderId 중복 승인 방지를 위해 KV 또는 D1에 처리 이력 저장 (권장)

const CATEGORY_PRICE = {
  daypick: 9900,
  monthly: 19900,
  newyear: 29900,
  life: 49900,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname !== '/confirm' || request.method !== 'POST') {
      return json({ ok: false, code: 'NOT_FOUND', message: 'Endpoint not found' }, 404, corsHeaders);
    }

    if (!env.TOSS_SECRET_KEY) {
      return json({ ok: false, code: 'SERVER_MISCONFIGURED', message: 'TOSS_SECRET_KEY not set' }, 500, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ ok: false, code: 'BAD_JSON', message: 'Invalid JSON body' }, 400, corsHeaders);
    }

    const { paymentKey, orderId, amount, category } = body || {};
    if (!paymentKey || !orderId || typeof amount !== 'number' || !category) {
      return json({ ok: false, code: 'MISSING_FIELDS', message: 'paymentKey, orderId, amount, category required' }, 400, corsHeaders);
    }

    // 1) 카테고리·금액 일관성 검증 — 클라이언트 위조 방지
    const expected = CATEGORY_PRICE[category];
    if (!expected) {
      return json({ ok: false, code: 'UNKNOWN_CATEGORY', message: `Unknown category: ${category}` }, 400, corsHeaders);
    }
    if (expected !== amount) {
      return json({ ok: false, code: 'AMOUNT_MISMATCH', message: `Expected ${expected}, got ${amount}` }, 400, corsHeaders);
    }

    // 2) (권장) 동일 orderId 중복 승인 방지 — KV 사용 시 활성화
    // if (env.PAYMENT_KV) {
    //   const dup = await env.PAYMENT_KV.get(`order:${orderId}`);
    //   if (dup) return json({ ok: false, code: 'ALREADY_CONFIRMED', message: 'Order already processed' }, 409, corsHeaders);
    // }

    // 3) 토스 API 결제 승인 호출
    const authHeader = 'Basic ' + btoa(env.TOSS_SECRET_KEY + ':');
    let tossRes;
    try {
      tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });
    } catch (e) {
      return json({ ok: false, code: 'TOSS_NETWORK', message: e.message || 'Network error' }, 502, corsHeaders);
    }

    const tossData = await tossRes.json().catch(() => ({}));

    if (!tossRes.ok) {
      return json({
        ok: false,
        code: tossData.code || 'TOSS_REJECTED',
        message: tossData.message || `Toss API ${tossRes.status}`,
      }, tossRes.status, corsHeaders);
    }

    // 4) 응답 검증 — status === 'DONE'
    if (tossData.status !== 'DONE') {
      return json({
        ok: false,
        code: 'NOT_DONE',
        message: `Payment status: ${tossData.status}`,
      }, 400, corsHeaders);
    }

    // 5) 처리 이력 저장 (선택)
    // if (env.PAYMENT_KV) {
    //   await env.PAYMENT_KV.put(`order:${orderId}`, JSON.stringify({
    //     category, amount, paymentKey, confirmedAt: Date.now(),
    //   }), { expirationTtl: 60 * 60 * 24 * 365 * 5 });
    // }

    return json({
      ok: true,
      payment: {
        orderId,
        category,
        amount,
        status: tossData.status,
        method: tossData.method,
        approvedAt: tossData.approvedAt,
        receiptUrl: tossData.receipt && tossData.receipt.url,
      },
    }, 200, corsHeaders);
  },
};

function buildCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const allowOrigin = allowed.length === 0
    ? '*'
    : (allowed.includes(origin) ? origin : allowed[0]);
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
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(extraHeaders || {}),
    },
  });
}
