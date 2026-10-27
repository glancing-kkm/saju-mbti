// ──────────────────────────────────────────────────────────────────
//  사주 채팅 Cloudflare Worker — 역술가 1:1 질의응답 백엔드
//  배포 후 받은 URL을 index.html 의 WORKER_URL 상수에 등록하세요.
//  외부 모델 API 키는 Worker 환경변수 OPENAI_API_KEY / ANTHROPIC_API_KEY / HERMES_API_KEY 로 보관됩니다.
// ──────────────────────────────────────────────────────────────────
import puppeteer from '@cloudflare/puppeteer';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://saju-mbti-9h1.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};
const QNA_ANSWER_MAX_CHARS = 1300;
const QNA_STANDARD_ANSWER_LENGTH = '800~1,000자';
const QNA_PREMIUM_ANSWER_LENGTH = '1,000~1,200자';
const LANGUAGE_META = {
  ko: {
    code: 'ko',
    label: 'Korean',
    instruction: 'Write the final answer in Korean only. Use warm, friendly Korean honorific style.',
  },
  en: {
    code: 'en',
    label: 'English',
    instruction: 'Write the final answer in natural English only. Keep Korean saju terms only when they are part of the birth chart labels, and explain them plainly.',
  },
  zh: {
    code: 'zh',
    label: 'Chinese',
    instruction: 'Write the final answer in natural Simplified Chinese only. Keep Korean saju terms only when they are part of the birth chart labels, and explain them plainly.',
  },
  ja: {
    code: 'ja',
    label: 'Japanese',
    instruction: 'Write the final answer in natural Japanese only. Keep Korean saju terms only when they are part of the birth chart labels, and explain them plainly.',
  },
};

// 캐릭터 상담 — 클라이언트는 상담사 키만 보내고, 말투 지시문은 서버에만 둔다(임의 지시문 주입 방지).
// master는 기본 역술가라 추가 지시가 없다. 모든 상담사는 친근 존댓말·본인 호칭·전문용어(십신·격국) 풀어 쓰기 규칙을 그대로 따른다.
const COUNSELORS = {
  master: '',
  unni: `상담사 캐릭터: 「달님 언니」
- 연애·재회·관계 고민을 다정하게 들어주는 언니 같은 상담사로 답하세요.
- 첫 문장은 질문자의 마음을 알아주는 공감 한 문장으로 시작하고, 바로 다음 문장에서 결론을 분명히 말하세요.
- 존댓말(~예요/~해요/~세요)을 지키되 말끝을 부드럽게 하세요. 가끔 "언니가 보기엔"처럼 스스로를 언니라고 불러도 좋아요.
- 이모지와 반말은 쓰지 마세요. 상대를 미워하거나 집착하도록 부추기지 말고, 본인을 아끼는 선택을 응원하세요.`,
  senior: `상담사 캐릭터: 「직설 선배」
- 돈·일·진로 고민에 군더더기 없이 답하는 회사 선배 같은 상담사로 답하세요.
- 첫 문단은 결론만 두 문장 이내로 말하세요. 위로보다 현실 점검을 앞세우고, 마지막 문단에는 이번 주에 할 행동 세 가지를 문장으로 주세요.
- 문장은 짧게, 존댓말(~예요/~해요/~세요)은 유지하세요. 비꼬거나 겁주지 말고, 단호하지만 예의 있게 말하세요.`,
  halmae: `상담사 캐릭터: 「복 할머니」
- 가족·아이·건강·살림 고민을 푸근하게 들어주는 할머니 같은 상담사로 답하세요.
- 존댓말(~예요/~해요/~세요)을 지키고, "아이고" 같은 감탄은 한 번까지만 쓰세요.
- 잠·밥·사람 관계 같은 생활 속 지혜를 곁들이고, 마지막은 짧은 덕담으로 맺으세요.
- 건강 질문에는 생활 관리 방향만 말하고 진료를 꼭 권하세요. 아이 이야기는 아이의 속도를 믿어주는 쪽으로 말하세요.`
};
function counselorKeyOf(value) {
  return Object.prototype.hasOwnProperty.call(COUNSELORS, value) ? value : 'master';
}

// 하루 사용량 — 성공한 AI 요청을 종류별로 센다(한국 날짜 기준). 보는 법: node tools/usage-report.js
// usage:YYYY-MM-DD:종류 → 횟수. 동시에 몰리면 조금 적게 셀 수 있어 추세를 보는 용도로 쓴다.
function usageType(path, body) {
  if (path === '/reading') return `reading:${String((body && body.category) || '').slice(0, 30)}`;
  if (path === '/tarot-reading') return 'tarot';
  if (path === '/astrology-reading') return 'astrology';
  if (path === '/portrait') return 'portrait';
  if (path === '/report-pdf') return 'report-pdf';
  if (path === '/' || path === '') return `chat:${String((body && body.category) || 'life').slice(0, 30)}`;
  return '';
}
async function countUsage(env, type) {
  if (!type || !env.SAJU_QNA_CACHE) return;
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const key = `usage:${day}:${type}`;
  try {
    const n = Number(await env.SAJU_QNA_CACHE.get(key)) || 0;
    // 목록 조회만으로 횟수를 볼 수 있게 metadata에도 같은 값을 둔다
    await env.SAJU_QNA_CACHE.put(key, String(n + 1), { expirationTtl: 120 * 24 * 3600, metadata: { n: n + 1 } });
  } catch {}
}

export default {
  async fetch(request, env, ctx) {
    let peek = null;
    if (request.method === 'POST') { try { peek = await request.clone().json(); } catch {} }
    const res = await routeRequest(request, env);
    if (res && res.ok && request.method === 'POST') {
      const job = countUsage(env, usageType(new URL(request.url).pathname, peek));
      if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
    }
    return res;
  },
};

async function routeRequest(request, env) {
  {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'POST only' }, 405);
    }
    // 결제 후 AI 풀이 — 결제 확인 토큰이 있어야 하고, 실제로 글을 돌려줬을 때만 한 번으로 센다
    const PAID_TEXT_ROUTES = { '/reading': handleReading, '/tarot-reading': handleTarotReading, '/astrology-reading': handleAstrologyReading };
    if (PAID_TEXT_ROUTES[url.pathname]) {
      let peek = null;
      try { peek = await request.clone().json(); } catch {}
      const gate = await requirePaid(env, peek, 'text', PAID_TEXT_LIMIT);
      if (gate.error) return gate.error;
      const res = await PAID_TEXT_ROUTES[url.pathname](request, env);
      if (res && res.ok) await gate.commit();
      return res;
    }
    if(url.pathname==='/report-email-status')return json({available:reportEmailAvailable(env)});
    if(url.pathname==='/report-email')return handleReportEmail(request,env);
    if (url.pathname === '/chat-usage') return handleChatUsage(request,env);
    if (url.pathname === '/portrait') {
      return handlePortrait(request, env);
    }
    if (url.pathname === '/report-pdf') {
      return handleReportPdf(request, env);
    }
    if (url.pathname === '/translate') {
      // 언어 선택 메뉴를 내린 뒤로 쓰지 않는 기능 — 남이 호출해 비용이 나가지 않게 닫아 둔다(다시 쓸 때 handleTranslate 연결)
      return json({ error: '번역 기능은 지금 쓰지 않아요.', code: 'TRANSLATE_DISABLED' }, 410);
    }
    const hermesEnabled = env.HERMES_API_URL && (env.AI_PROVIDER || '').toLowerCase() === 'hermes';
    if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !hermesEnabled && !env.AI) {
      return json({ error: '서비스가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'JSON 본문이 필요합니다.' }, 400);
    }

    const { question, sajuContext, category, clientId, deviceFingerprint, sajuId, freeQuestion, language } = body;
    const counselor = category === 'qna' ? counselorKeyOf(body.counselor) : 'master';
    if (!question || typeof question !== 'string') {
      return json({ error: '질문이 비어있습니다.' }, 400);
    }
    if (!sajuContext || typeof sajuContext !== 'object') {
      return json({ error: '사주 정보가 누락되었습니다.' }, 400);
    }

    const chatCategory = typeof category === 'string' ? category : 'life';
    const lang = normalizeLanguage(language);
    const freeGuardKeys = []; // 별도 상담에는 무료 질문을 제공하지 않는다.
    if (freeGuardKeys.length && await qnaFreeGuardUsed(env, freeGuardKeys)) {
      return json({ error: '무료 질문은 이미 사용했어요. 계속 질문하려면 질문권을 충전해 주세요.', code: 'QNA_FREE_USED' }, 402);
    }
    // 무료 질문이 아니면 결제(질문권·풀이)를 확인한다. 답을 돌려줄 때만 한 번으로 센다.
    const chatGate = freeGuardKeys.length ? { commit: async () => {} } : await requirePaidChat(env, request, body);
    if (chatGate.error) return chatGate.error;
    const cacheKey = await qnaCacheKey({ question, sajuContext, category: chatCategory, language: lang.code, counselor });
    const cached = await qnaCacheGet(env, cacheKey);
    if (cached) {
      if (freeGuardKeys.length) await qnaFreeGuardMark(env, freeGuardKeys); await chatGate.commit();
      return json({ answer: normalizeQnaAnswer(cached.answer), provider: cached.provider || 'cache', cached: true });
    }

    const route = chooseQnaModel(question, sajuContext, env);
    const systemPrompt = buildSystemPrompt(sajuContext, chatCategory, lang) + (COUNSELORS[counselor] ? `\n\n${COUNSELORS[counselor]}` : '');
    const userPrompt = buildQnaUserPrompt(question, sajuContext, chatCategory, route, lang);

    try {
      if (hermesEnabled) {
        try {
          const result = await callHermesAgent({
            baseUrl: env.HERMES_API_URL,
            apiKey: env.HERMES_API_KEY || '',
            systemPrompt,
            userPrompt,
          });
          const answer = normalizeQnaAnswer(result.text);
          await qnaCacheSet(env, cacheKey, { answer, provider: 'hermes' });
          if (freeGuardKeys.length) await qnaFreeGuardMark(env, freeGuardKeys); await chatGate.commit();
          return json({ answer: answer || '답변을 생성하지 못했습니다.', provider: 'hermes', usage: result.usage || null });
        } catch (e) {
          console.warn('Hermes QNA failed, trying other providers:', e && e.message);
        }
      }

      if (env.OPENAI_API_KEY) {
        try {
          const result = await callOpenAIResponses({
            apiKey: env.OPENAI_API_KEY,
            model: route.model,
            systemPrompt,
            userPrompt,
            maxOutputTokens: route.maxOutputTokens,
            reasoningEffort: route.reasoningEffort,
            verbosity: route.verbosity,
          });
          const answer = normalizeQnaAnswer(result.text);
          await qnaCacheSet(env, cacheKey, { answer, provider: 'openai', model: route.model });
          if (freeGuardKeys.length) await qnaFreeGuardMark(env, freeGuardKeys); await chatGate.commit();
          return json({
            answer: answer || '답변을 생성하지 못했습니다.',
            provider: 'openai',
            model: route.model,
            route: route.name,
            usage: result.usage || null,
          });
        } catch (e) {
          console.warn('OpenAI QNA failed, falling back to Anthropic if available:', e && e.message);
          if (!env.ANTHROPIC_API_KEY) throw e;
        }
      }

      if (env.ANTHROPIC_API_KEY) {
        const apiResp = await callAnthropicWithRetry({
          apiKey: env.ANTHROPIC_API_KEY,
          body: {
            model: 'claude-sonnet-4-6',
            max_tokens: route.maxOutputTokens || 1800,
            system: [
              {
                type: 'text',
                text: systemPrompt,
                // 같은 사주에 대해 5번 질문할 때 시스템 프롬프트(약 1.5K tokens) 캐시
                cache_control: { type: 'ephemeral' },
              },
            ],
            messages: [{ role: 'user', content: userPrompt }],
          },
        });

        if (!apiResp.ok) {
          const errText = await apiResp.text();
          console.warn('Anthropic QNA failed, falling back to Workers AI if available:', apiResp.status, errText.slice(0, 240));
        } else {
          const data = await apiResp.json();
          const text = (data.content || [])
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('\n')
            .trim();

          const answer = normalizeQnaAnswer(text) || '답변을 생성하지 못했습니다.';
          await qnaCacheSet(env, cacheKey, { answer, provider: 'anthropic' });
          if (freeGuardKeys.length) await qnaFreeGuardMark(env, freeGuardKeys); await chatGate.commit();
          return json({
            answer,
            provider: 'anthropic',
            usage: data.usage || null,
          });
        }
      }

      if (env.AI) {
        const result = await callWorkersAIChat({
          ai: env.AI,
          model: env.WORKERS_AI_QNA_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8',
          systemPrompt,
          userPrompt,
          maxTokens: route.maxOutputTokens || 1400,
        });
        if (result.text) {
          const answer = normalizeQnaAnswer(result.text);
          await qnaCacheSet(env, cacheKey, { answer, provider: 'workers-ai', model: result.model });
          if (freeGuardKeys.length) await qnaFreeGuardMark(env, freeGuardKeys); await chatGate.commit();
          return json({ answer, provider: 'workers-ai', model: result.model, usage: result.usage || null });
        }
      }

      if (chatGate.fail) await chatGate.fail();
      return json({ error: '답변을 잠시 생성하지 못했습니다.', code: 'AI_TEMPORARY_UNAVAILABLE' }, 503);
    } catch (e) {
      console.error('Worker error:', e);
      if (chatGate.fail) await chatGate.fail();
      return json({ error: '답변을 잠시 생성하지 못했습니다.', code: 'AI_TEMPORARY_UNAVAILABLE' }, 503);
    }
  }
}

// 결제 후 프로필 카드용 인상 이미지 — 정해진 항목만 받아 서버에서 문장을 만든다(임의 프롬프트 차단)
const PORTRAIT_DAILY_LIMIT = 20;
const PORTRAIT_ORDER_LIMIT = 9; // 결제 1건에 카드 2~3장 · 여러 기기에서 다시 열어도 넉넉하게
// 결제 워커가 서명한 결제 확인 토큰을 검사한다(같은 PAID_TOKEN_SECRET). 맞으면 {o:주문번호,c,e}를 돌려준다.
function b64urlDecode(s) {
  const t = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}
async function verifyPaidToken(env, token) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(env.PAID_TOKEN_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('HMAC', key, b64urlDecode(sig), enc.encode(body)))) return null;
    const p = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    return p && p.o && Number(p.e) > Date.now() ? p : null;
  } catch {
    return null;
  }
}
// 결제한 사람만 — 비밀키가 설정돼 있으면 결제 확인 토큰을 요구하고, 주문 1건당 요청 수를 bucket별로 제한한다.
// 통과하면 {commit} 을 돌려준다. 실제로 AI 결과를 돌려줄 때 commit()으로 한 번을 센다.
async function requirePaid(env, body, bucket, limit) {
  if (!env.PAID_TOKEN_SECRET) return { commit: async () => {} };
  const paid = await verifyPaidToken(env, body && body.paidToken);
  if (!paid) return { error: json({ error: '결제한 풀이에서만 쓸 수 있어요.', code: 'NEED_PAYMENT' }, 403) };
  if (!env.SAJU_QNA_CACHE) return { commit: async () => {} };
  const key = `paid-use:${bucket}:${String(paid.o).slice(0, 80)}`;
  let used = 0;
  try { used = Number(await env.SAJU_QNA_CACHE.get(key)) || 0; } catch {}
  if (used >= limit) return { error: json({ error: '이 결제로 쓸 수 있는 횟수를 모두 썼어요.', code: 'PAID_LIMIT' }, 429) };
  return { commit: async () => { try { await env.SAJU_QNA_CACHE.put(key, String(used + 1), { expirationTtl: 40 * 24 * 3600 }); } catch {} } };
}
// 채팅 질문 — 결제한 토큰 여러 개 중 아직 횟수가 남은 첫 토큰을 쓴다.
// 질문권은 구매한 N회, 인생총운·신년운세는 해당 주문에 포함된 1회만 제공한다.
function chatLimitOf(paid){const m=/^chatpack(\d+)$/.exec(String(paid&&paid.c||''));return m?Number(m[1]):['life','newyear'].includes(paid&&paid.c)?1:0;}
async function handleChatUsage(request,env){
  let b;try{b=await request.json();}catch(e){return json({error:'JSON 본문이 필요합니다.'},400);}
  if(!env.SAJU_QNA_CACHE)return json({error:'사용량을 확인하지 못했어요.'},503);
  const tokens=[b.activeReadingToken,...(Array.isArray(b.paidTokens)?b.paidTokens:[])].filter(Boolean),grants=[];
  for(const token of [...new Set(tokens)].slice(0,12)){
    const p=await verifyPaidToken(env,token);if(!p)continue;
    const pack=/^chatpack\d+$/.test(p.c);
    if(!pack&&!(token===b.activeReadingToken&&p.c===b.category&&['life','newyear'].includes(p.c)))continue;
    if(pack&&await env.SAJU_QNA_CACHE.get('refunded:'+String(p.o).slice(0,80)))continue; // 자동 환불된 질문권
    const used=Number(await env.SAJU_QNA_CACHE.get('paid-use:chat:'+String(p.o).slice(0,80)))||0;
    grants.push({orderId:p.o,category:p.c,limit:chatLimitOf(p),used});
  }
  return json({grants});
}
async function requirePaidChat(env, request, body){
  if(!env.PAID_TOKEN_SECRET)return {commit:async()=>{}};
  const category=String(body&&body.category||'life');
  const candidates=[body&&body.activeReadingToken,...(Array.isArray(body&&body.paidTokens)?body.paidTokens:[]),body&&body.paidToken].filter(Boolean);
  for(const token of [...new Set(candidates)].slice(0,12)){
    const paid=await verifyPaidToken(env,token);if(!paid)continue;
    const pack=/^chatpack\d+$/.test(paid.c);
    // 보고서에 포함된 1회는 해당 보고서를 질문할 때만 쓴다.
    if(!pack&&!((token===body.activeReadingToken||!Object.prototype.hasOwnProperty.call(body,'activeReadingToken'))&&paid.c===category&&['life','newyear'].includes(category)))continue;
    const limit=chatLimitOf(paid);if(!limit)continue;
    if(!env.SAJU_QNA_CACHE)return {error:json({error:'질문권 사용량을 확인하지 못했어요. 잠시 후 다시 시도해주세요.',code:'CHAT_USAGE_UNAVAILABLE'},503)};
    if(pack&&await env.SAJU_QNA_CACHE.get('refunded:'+String(paid.o).slice(0,80)))continue; // 자동 환불된 질문권은 더 쓰지 않는다
    const key='paid-use:chat:'+String(paid.o).slice(0,80);
    const req=String(body.requestId||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
    const requestBytes=new TextEncoder().encode(JSON.stringify({question:body.question,category,context:body.sajuContext}));
    const requestHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',requestBytes)),x=>x.toString(16).padStart(2,'0')).join('');
    const receipt=req?key+':request:'+req+':'+requestHash:'';
    if(receipt&&await env.SAJU_QNA_CACHE.get(receipt))return {commit:async()=>{}};
    const used=Number(await env.SAJU_QNA_CACHE.get(key))||0;if(used>=limit)continue;
    // fail — 질문권으로 물었는데 시스템 오류로 답을 못 드린 경우. 결제 워커가 '사용 0회 + 오류 기록 + 승인 24시간 경과' 주문을 자동 환불한다.
    const fail=pack?async()=>{try{const ek='chat-error:'+String(paid.o).slice(0,80),prev=JSON.parse(await env.SAJU_QNA_CACHE.get(ek)||'null');await env.SAJU_QNA_CACHE.put(ek,JSON.stringify({n:((prev&&prev.n)||0)+1,first:(prev&&prev.first)||Date.now(),last:Date.now()}),{expirationTtl:40*24*3600});}catch(e){}}:async()=>{};
    return {fail,commit:async()=>{await env.SAJU_QNA_CACHE.put(key,String(used+1),{expirationTtl:40*24*3600});if(receipt)await env.SAJU_QNA_CACHE.put(receipt,'1',{expirationTtl:40*24*3600});}};
  }
  return {error:json({error:'무료 질문을 사용했거나 질문권이 없어요. 질문권을 충전하면 이어서 물어볼 수 있어요.',code:'QNA_NEED_PAYMENT'},402)};
}
// PDF 템플릿 보고서 — JSON 모양을 스키마로 고정해 끊기거나 깨진 답을 막는다
const REPORT_TPL_FORMAT = {
  type: 'json_schema',
  name: 'report_sections',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['sections', 'fields'],
    properties: {
      sections: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'paragraphs'], properties: { id: { type: 'string' }, paragraphs: { type: 'array', items: { type: 'string' } } } } },
      fields: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'text'], properties: { id: { type: 'string' }, text: { type: 'string' } } } },
    },
  },
};
// 주문 1건당 AI 글 요청 한도 — 심층 해석·PDF 리포트 5장·질문 답·궁합 여러 번을 넉넉히 감싼다
const PAID_TEXT_LIMIT = 40;

// PDF 리포트 — 화면에서 짠 A4 쪽 HTML을 Cloudflare 브라우저로 인쇄해 글자가 살아 있는 PDF로 돌려준다.
// 결제한 주문만, 주문 1건당 PDF_ORDER_LIMIT번. 무료 플랜 한도(하루 10분)를 넘거나 실패하면 화면이 예전 방식(이미지 PDF)으로 만든다.
const PDF_ORDER_LIMIT = 8;
const PDF_MAX_HTML = 3 * 1024 * 1024;
const PDF_ALLOWED_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
async function handleReportPdf(request, env) {
  if (!env.BROWSER) return json({ error: 'PDF 서비스가 아직 준비되지 않았어요.', code: 'PDF_RENDER_UNAVAILABLE' }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'JSON 본문이 필요합니다.' }, 400); }
  const gate = await requirePaid(env, b, 'pdf', PDF_ORDER_LIMIT);
  if (gate.error) return gate.error;
  let html = String((b && b.html) || '');
  if (!/^<!doctype html>/i.test(html) || html.length > PDF_MAX_HTML) return json({ error: '보고서 내용이 올바르지 않아요.', code: 'PDF_BAD_HTML' }, 400);
  // 보고서는 글과 그림뿐이다 — 스크립트와 이벤트 속성은 지우고, 글꼴 말고는 바깥 요청을 막는다
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  let browser;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      let host = '';
      try { host = new URL(req.url()).hostname; } catch {}
      if (req.url().startsWith('data:') || PDF_ALLOWED_HOSTS.has(host)) req.continue();
      else req.abort();
    });
    await page.setViewport({ width: 794, height: 1123 });
    // 한글 웹폰트는 조각 파일이 많아 networkidle을 기다리면 오래 걸린다 — 문서를 연 뒤 레이아웃을 한 번 잡고 글꼴만 기다린다
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.evaluate(() => Promise.race([
      (async () => { document.body.getBoundingClientRect(); await document.fonts.ready; })(),
      new Promise((r) => setTimeout(r, 15000)),
    ]));
    const pdf = await page.pdf({ width: '794px', height: '1123px', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await gate.commit();
    return new Response(pdf, { headers: { ...CORS_HEADERS, 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.warn('report pdf failed:', e && e.message);
    const quota = /limit|quota|429|rate/i.test(String(e && e.message));
    return json({ error: 'PDF를 잠시 만들지 못했어요.', code: quota ? 'PDF_RENDER_LIMIT' : 'PDF_RENDER_FAILED' }, 503);
  } finally {
    if (browser) { try { await browser.close(); } catch {} }
  }
}

// PDF를 보관하지 않고 사용자가 요청한 주소 한 곳에 첨부해 보낸다.
function reportEmailAvailable(env){return !!(env.PAID_TOKEN_SECRET&&env.SAJU_QNA_CACHE&&env.REPORT_EMAIL_FROM&&((env.EMAIL&&typeof env.EMAIL.send==='function')||env.RESEND_API_KEY));}
const REPORT_EMAIL_MAX=12*1024*1024;
async function handleReportEmail(request,env){
  if(!env.PAID_TOKEN_SECRET||!env.SAJU_QNA_CACHE)return json({error:'이메일 발송을 준비 중이에요.',code:'EMAIL_UNAVAILABLE'},503);
  if(!reportEmailAvailable(env))return json({error:'이메일 발송을 준비 중이에요. PDF는 저장하기로 받을 수 있어요.',code:'EMAIL_UNAVAILABLE'},503);
  if(Number(request.headers.get('Content-Length'))>REPORT_EMAIL_MAX+20000)return json({error:'첨부 가능한 PDF 크기를 넘었어요.'},413);
  let data;try{
    if(!request.body)throw new Error('empty');
    const reader=request.body.getReader(),chunks=[];let total=0;
    for(;;){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>REPORT_EMAIL_MAX+20000){await reader.cancel();return json({error:'첨부 가능한 PDF 크기를 넘었어요.'},413);}chunks.push(part.value);}
    const payload=new Uint8Array(total);let offset=0;for(const chunk of chunks){payload.set(chunk,offset);offset+=chunk.byteLength;}
    data=await new Response(payload,{headers:{'Content-Type':request.headers.get('Content-Type')||''}}).formData();
  }catch(e){return json({error:'파일과 이메일 주소를 확인해 주세요.'},400);}
  const token=String(data.get('paidToken')||''),paid=await verifyPaidToken(env,token);
  const allowed=new Set(['life','newyear','gunghap','name','ziwei','topic-love','topic-money','topic-career','topic-marriage','topic-reunion','topic-study','topic-child','topic-children','topic-health'].map(c=>'pdf-'+c));
  if(!paid||!allowed.has(paid.c)||await env.SAJU_QNA_CACHE.get('refunded:'+String(paid.o).slice(0,80)))return json({error:'결제한 PDF 리포트에서 보내 주세요.',code:'NEED_PAYMENT'},403);
  const to=String(data.get('email')||'').trim(),file=data.get('pdf');
  if(to.length>254||!/^[^\s@<>\r\n,;]+@[^\s@<>\r\n,;]+\.[^\s@<>\r\n,;]+$/.test(to))return json({error:'이메일 주소를 확인해 주세요.'},400);
  if(!file||typeof file.arrayBuffer!=='function'||file.size<10||file.size>REPORT_EMAIL_MAX)return json({error:'12MB 이하 PDF 파일을 첨부해 주세요.'},400);
  const bytes=await file.arrayBuffer();
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return json({error:'올바른 PDF 파일이 아니에요.'},400);
  const prefix=new TextEncoder().encode(paid.o+'|'+to.toLowerCase()+'|'),hashInput=new Uint8Array(prefix.length+bytes.byteLength);hashInput.set(prefix);hashInput.set(new Uint8Array(bytes),prefix.length);
  const digest=await crypto.subtle.digest('SHA-256',hashInput);
  const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const receipt='report-email:'+id;
  if(await env.SAJU_QNA_CACHE.get(receipt))return json({ok:true,alreadySent:true});
  const gate=await requirePaid(env,{paidToken:token},'report-email',3);if(gate.error)return gate.error;
  const filename=String(file.name||'천지인_사주_리포트.pdf').replace(/[\r\n\x00-\x1f/\\"]/g,'_').slice(0,140).replace(/(?:\.pdf)?$/i,'.pdf');
  const message={from:{email:env.REPORT_EMAIL_FROM,name:'천지인 사주'},to,subject:'요청하신 사주 풀이 PDF 리포트예요',text:'요청하신 PDF 리포트를 첨부했어요. 생활 장면과 사주 근거, 실천할 행동을 함께 읽어 보세요. 이 메일은 입력하신 주소로 요청한 리포트를 전달하는 일회성 메일이에요.',html:'<p>요청하신 <strong>사주 풀이 PDF 리포트</strong>를 첨부했어요.</p><p>생활 장면과 사주 근거, 실천할 행동을 함께 읽어 보세요.</p><p>입력하신 주소로 요청한 리포트를 전달하는 일회성 메일이에요.</p>'};
  try{
    if(env.EMAIL&&typeof env.EMAIL.send==='function'){
      await env.EMAIL.send({...message,attachments:[{content:bytes,filename,type:'application/pdf',disposition:'attachment'}]});
    }else{
      let binary='';const arr=new Uint8Array(bytes);for(let i=0;i<arr.length;i+=8192)binary+=String.fromCharCode(...arr.subarray(i,i+8192));
      const resp=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'saju-report-'+id},body:JSON.stringify({...message,from:'천지인 사주 <'+env.REPORT_EMAIL_FROM+'>',attachments:[{filename,content:btoa(binary)}]}),signal:AbortSignal.timeout(25000)});
      if(!resp.ok)throw new Error('provider rejected');
    }
  }catch(e){return json({error:'이메일을 보내지 못했어요. 주소를 확인하고 다시 시도해 주세요.',code:'EMAIL_SEND_FAILED'},502);}
  await gate.commit();
  // 주소·파일·사주 정보는 저장하지 않는다. 재시도 중복 방지용 해시만 남긴다.
  try{await env.SAJU_QNA_CACHE.put(receipt,'sent',{expirationTtl:86400});}catch(e){console.warn('report email receipt unavailable');}
  return json({ok:true});
}

async function handlePortrait(request, env) {
  if (!env.AI) return json({ error: '이미지 생성 서비스가 아직 준비되지 않았습니다.' }, 500);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'JSON 본문이 필요합니다.' }, 400); }
  const kind = ['love', 'helper', 'foe'].includes(b && b.kind) ? b.kind : 'love';
  const who = b && b.gender === 'female' ? 'woman' : 'man';
  const age = Math.max(18, Math.min(85, Math.round(Number(b && b.age) || 30)));
  const LOOK = ['tall with a slender, clean-lined face', 'a bright expression and clear, vivid eyes', 'a sturdy build and a gentle, warm face', 'sharp, well-defined features and a neat style', 'soft eyes and a calm, quiet aura'];
  const look = LOOK[Math.max(0, Math.min(4, Math.floor(Number(b && b.look) || 0)))];
  const STYLE = {
    love: 'warm natural smile, approachable and kind, smart casual outfit',
    helper: 'trustworthy mature mentor, kind and confident smile, business casual blazer',
    foe: 'neutral natural expression, everyday professional outfit, no threatening or criminal stereotypes',
  };
  // 결제한 사람만 — 주문 1건당 장수 제한
  const gate = await requirePaid(env, b, 'portrait', PORTRAIT_ORDER_LIMIT);
  if (gate.error) return gate.error;
  // 같은 접속 주소에서 하루에 만들 수 있는 장수를 제한한다(결제 1건에 2~3장, 여러 풀이를 봐도 넉넉하게)
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const limitKey = ip && env.SAJU_QNA_CACHE ? `portrait-limit:${day}:${ip}` : '';
  let used = 0;
  if (limitKey) {
    try { used = Number(await env.SAJU_QNA_CACHE.get(limitKey)) || 0; } catch {}
    if (used >= PORTRAIT_DAILY_LIMIT) return json({ error: '오늘 만들 수 있는 이미지를 모두 썼어요. 내일 다시 볼 수 있어요.', code: 'PORTRAIT_LIMIT' }, 429);
  }
  const countries={'대한민국':'Korean','한국':'Korean',KR:'Korean','일본':'Japanese',JP:'Japanese','중국':'Chinese',CN:'Chinese','미국':'American',US:'American','영국':'British',GB:'British','베트남':'Vietnamese',VN:'Vietnamese'};
  const nationality=countries[b&&b.country]||'Korean';
  const traits=String(b&&b.traits||'').replace(/[<>\n\r]/g,' ').slice(0,180);
  const prompt = `Photorealistic unretouched RAW color photograph, documentary DSLR photo, NOT a painting or illustration. Portrait photograph of a fictional ${nationality} ${who} around ${age} years old with ${look}, ${traits}, ${STYLE[kind]}, unique identity variation ${Math.abs(Number(b&&b.seed)||0)}, upper body, slightly angled toward the camera, soft natural window light, shallow depth of field, modern everyday setting, muted background, 85mm lens, realistic skin pores, fine facial hair, visible age-appropriate wrinkles, asymmetrical natural facial features, ordinary real-life appearance, candid everyday person rather than a fashion model, realistic eyes and teeth, no beauty retouching, no smoothing, no CGI, no 3D render, no anime, no drawing, no painted texture, not a celebrity, no text, no watermark`;
  try {
    let out;
    for(let attempt=0;attempt<2;attempt++){
      const form=new FormData();form.set('prompt',prompt);form.set('width','1024');form.set('height','1024');form.set('seed',String(Math.abs(Math.trunc(Number(b&&b.seed)||1))%2147483647));
      const multipart=new Response(form);
      try{out=await env.AI.run('@cf/black-forest-labs/flux-2-klein-9b',{multipart:{body:multipart.body,contentType:multipart.headers.get('content-type')}});break;}
      catch(e){if(attempt||!/3043|internal server|temporar/i.test(String(e&&e.message)))throw e;await new Promise(r=>setTimeout(r,250));}
    }
    const img = out && out.image;
    if (!img) throw new Error('empty image');
    if (limitKey) { try { await env.SAJU_QNA_CACHE.put(limitKey, String(used + 1), { expirationTtl: 2 * 24 * 3600 }); } catch {} }
    await gate.commit();
    return json({ ok: true, image: `data:image/jpeg;base64,${img}` });
  } catch (e) {
    console.warn('portrait failed:', e && e.message);
    return json({ error: '이미지를 잠시 만들지 못했어요.', code: 'PORTRAIT_UNAVAILABLE' }, 503);
  }
}

async function handleReading(request, env) {
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.AI) {
    return json({ error: '개인화 리딩 서비스가 아직 준비되지 않았습니다.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON 본문이 필요합니다.' }, 400);
  }

  const { category, sajuContext, meta, language } = body || {};
  const allowed = new Set(['life', 'life-core', 'newyear', 'newyear-core', 'gunghap', 'life-gunghap', 'report-life', 'report-love', 'report-money', 'report-career', 'report-health', 'topic-answer', 'reading-deep', 'report-tpl']);
  if (!allowed.has(category)) {
    return json({ error: '지원하지 않는 리딩 카테고리입니다.' }, 400);
  }
  if (!sajuContext || typeof sajuContext !== 'object') {
    return json({ error: '사주 정보가 누락되었습니다.' }, 400);
  }

  const lang = normalizeLanguage((meta && meta.language) || language);
  const promptMeta = { ...(meta || {}), language: lang };
  const systemPrompt = buildReadingSystemPrompt(category, promptMeta);
  const userPrompt = buildReadingUserPrompt(category, sajuContext, promptMeta);
  const coreReading = isCoreReadingCategory(category);

  try {
    // 핵심 리딩(life-core/newyear-core)은 3,000~4,200자 한국어를 요구한다.
    // 한국어는 토큰이 촘촘해서 이 분량만 4,000~5,000 출력 토큰이 필요하고,
    // gpt-5 계열은 추론 토큰까지 같은 예산에서 빼 쓴다. 예산이 모자라면 본문이 잘린 채 돌아온다.
    // report-tpl(PDF 템플릿 보고서)은 한 번에 소제목 10개 안팎 × 3문단을 JSON으로 받는다 — 한국어 8천~1만 자
    const READING_MAX_TOKENS = category === 'report-tpl' ? 16000 : category === 'reading-deep' ? 14000 : coreReading ? 8000 : 2400;
    const ANTHROPIC_READING_MAX_TOKENS = category === 'report-tpl' ? 12000 : category === 'reading-deep' ? 9000 : coreReading ? 6000 : 2400;
    // 잘린 본문은 폴백 대상 — 클라이언트가 정적 상세 카드를 지우지 않도록 truncated 를 같이 내려준다.
    let truncatedFallback = null;

    if (env.OPENAI_API_KEY) {
      try {
        const result = await callOpenAIResponses({
          apiKey: env.OPENAI_API_KEY,
          model: coreReading ? (env.OPENAI_READING_CORE_MODEL || env.OPENAI_MODEL || 'gpt-5.4-mini') : (env.OPENAI_MODEL || 'gpt-5.4-mini'),
          systemPrompt,
          userPrompt,
          maxOutputTokens: READING_MAX_TOKENS,
          reasoningEffort: coreReading && category !== 'report-tpl' ? 'medium' : 'low',
          verbosity: category === 'report-tpl' ? 'high' : 'medium',
          format: category === 'report-tpl' ? REPORT_TPL_FORMAT : null,
        });
        if (result.text && !result.truncated) {
          return json({ ok: true, provider: 'openai', text: result.text, truncated: false, usage: result.usage || null });
        }
        console.warn('OpenAI reading truncated or empty, trying next provider:', category, 'len=' + (result.text || '').length);
        if (result.text) truncatedFallback = { provider: 'openai', text: result.text, usage: result.usage || null };
        if (!env.ANTHROPIC_API_KEY && !env.AI) {
          return json({ ok: true, provider: 'openai', text: result.text, truncated: true, usage: result.usage || null });
        }
      } catch (e) {
        console.warn('OpenAI reading failed, falling back to Anthropic if available:', e && e.message);
        if (!env.ANTHROPIC_API_KEY && !env.AI) throw e;
      }
    }

    if (env.ANTHROPIC_API_KEY) {
      const apiResp = await callAnthropicWithRetry({
        apiKey: env.ANTHROPIC_API_KEY,
        body: {
          model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
          max_tokens: ANTHROPIC_READING_MAX_TOKENS,
          system: [{ type: 'text', text: systemPrompt }],
          messages: [{ role: 'user', content: userPrompt }],
        },
      });
      if (apiResp.ok) {
        const data = await apiResp.json();
        const text = (data.content || [])
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim();
        const truncated = data.stop_reason === 'max_tokens';
        if (text && !truncated) {
          return json({ ok: true, provider: 'anthropic', text, truncated: false, usage: data.usage || null });
        }
        console.warn('Anthropic reading truncated or empty, trying Workers AI:', category, 'stop_reason=' + data.stop_reason);
        if (text && !truncatedFallback) truncatedFallback = { provider: 'anthropic', text, usage: data.usage || null };
      } else {
        const errText = await apiResp.text();
        console.warn('Reading Anthropic failed, falling back to Workers AI if available:', apiResp.status, errText.slice(0, 240));
      }
    }
    if (env.AI) {
      const result = await callWorkersAIChat({
        ai: env.AI,
        model: env.WORKERS_AI_READING_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8',
        systemPrompt,
        userPrompt,
        maxTokens: READING_MAX_TOKENS,
      });
      if (result.text) return json({ ok: true, provider: 'workers-ai', model: result.model, text: result.text, truncated: false, usage: result.usage || null });
    }
    // 어느 제공자도 완결된 본문을 못 냈으면, 있는 것이라도 truncated 로 표시해서 내려준다.
    // 클라이언트는 이걸 보고 AI 카드는 띄우되 정적 상세 카드를 그대로 유지한다.
    if (truncatedFallback) {
      return json({ ok: true, provider: truncatedFallback.provider, text: truncatedFallback.text, truncated: true, usage: truncatedFallback.usage });
    }
    return json({ error: '개인화 리딩을 잠시 생성하지 못했습니다.', code: 'AI_READING_TEMPORARY_UNAVAILABLE' }, 503);
  } catch (e) {
    console.error('Reading worker error:', e);
    return json({ error: '개인화 리딩을 잠시 생성하지 못했습니다.', code: 'AI_READING_TEMPORARY_UNAVAILABLE' }, 503);
  }
}

async function handleTarotReading(request, env) {
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.AI) {
    return json({ error: '타로 리딩 서비스가 아직 준비되지 않았습니다.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON 본문이 필요합니다.' }, 400);
  }

  const input = body && body.input && typeof body.input === 'object' ? body.input : body;
  if (!input || typeof input.question !== 'string' || !input.question.trim()) {
    return json({ error: '타로 질문이 비어있습니다.' }, 400);
  }
  if (!Array.isArray(input.cards) || !input.cards.length || input.cards.length > 10) {
    return json({ error: '선택된 카드 정보가 올바르지 않습니다.' }, 400);
  }

  const lang = normalizeLanguage(body && (body.language || body.targetLanguage));
  const cardCount = input.cards.length;
  const maxOutputTokens = cardCount >= 10 ? 7600 : cardCount >= 5 ? 4800 : 3200;
  const systemPrompt = buildTarotReadingSystemPrompt(lang);
  const userPrompt = buildTarotReadingUserPrompt(input, lang) + skipSectionsNote(body && body.skipSections);

  try {
    if (env.OPENAI_API_KEY) {
      try {
        const result = await callOpenAIResponses({
          apiKey: env.OPENAI_API_KEY,
          model: env.OPENAI_TAROT_MODEL || 'gpt-5.4-mini',
          systemPrompt,
          userPrompt,
          maxOutputTokens,
          reasoningEffort: cardCount >= 10 ? 'medium' : 'low',
          verbosity: 'medium',
        });
        return json({ ok: true, provider: 'openai', resultMarkdown: result.text || '', text: result.text || '', usage: result.usage || null });
      } catch (e) {
        console.warn('OpenAI tarot reading failed, falling back to Anthropic if available:', e && e.message);
        if (!env.ANTHROPIC_API_KEY) throw e;
      }
    }

    if (env.ANTHROPIC_API_KEY) {
      const apiResp = await callAnthropicWithRetry({
        apiKey: env.ANTHROPIC_API_KEY,
        body: {
          model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
          max_tokens: maxOutputTokens,
          system: [{ type: 'text', text: systemPrompt }],
          messages: [{ role: 'user', content: userPrompt }],
        },
      });
      if (apiResp.ok) {
        const data = await apiResp.json();
        const text = (data.content || [])
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim();
        return json({ ok: true, provider: 'anthropic', resultMarkdown: text, text, usage: data.usage || null });
      }
      const errText = await apiResp.text();
      console.warn('Tarot Anthropic failed, falling back to Workers AI if available:', apiResp.status, errText.slice(0, 240));
    }

    if (env.AI) {
      const result = await callWorkersAIChat({
        ai: env.AI,
        model: env.WORKERS_AI_TAROT_MODEL || env.WORKERS_AI_READING_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8',
        systemPrompt,
        userPrompt,
        maxTokens: maxOutputTokens,
      });
      if (result.text) {
        return json({ ok: true, provider: 'workers-ai', model: result.model, resultMarkdown: result.text, text: result.text, usage: result.usage || null });
      }
    }

    return json({ error: '타로 리딩을 잠시 생성하지 못했습니다.', code: 'AI_TAROT_TEMPORARY_UNAVAILABLE' }, 503);
  } catch (e) {
    console.error('Tarot reading worker error:', e);
    return json({ error: '타로 리딩을 잠시 생성하지 못했습니다.', code: 'AI_TAROT_TEMPORARY_UNAVAILABLE' }, 503);
  }
}

const KO_READING_STYLE = `한국어 문체 규칙 (모든 문장에 적용):
- 친근한 존댓말로 쓴다. 문장 끝은 "~예요 / ~이에요 / ~해요 / ~돼요 / ~세요"를 기본으로 하고, "~입니다 / ~합니다"는 쓰지 않는다.
- 사용자는 "당신" 대신 "본인"이라고 부른다.
- 한 문장은 50자 안쪽으로 짧게 끊는다. 한 문단은 3~5문장으로 쓴다.
- 전문 용어(하우스, 애스펙트, 트랜짓, 상승궁, 정방향·역방향, 메이저·마이너 아르카나 등)는 처음 나올 때 바로 쉬운 말로 풀어 쓴다. 예: "7하우스, 그러니까 결혼과 동반자를 보여주는 자리"
- 추상적인 설명 뒤에는 일상의 비유를 하나씩 붙인다. 예: "직장에서 든든한 선배가 옆에 있어 주는 것과 비슷해요."
- '결'이라는 단어를 단독 명사로 쓰지 않는다. 대신 '분위기'를 쓴다.
- 줄표(—)와 괄호 설명은 최소로 쓴다.
- "흐름을 맞추세요", "잘 대화하세요", "가능성이 열려 있어요"만으로 결론을 끝내지 않는다. 해석에 사용한 실제 카드·행성·사주 근거를 하나 고르고, 그 근거가 드러날 수 있는 생활 장면과 확인할 조건을 쓴다.
- 조언은 행동+대상+방법으로 쓴다. 예: "대화하세요" 대신 "약속을 바꿀 때 이유와 다시 만날 시간을 함께 전하세요". 금전은 비용·상환·기간 중 무엇을 비교할지, 직업은 역할·보상·마감 중 무엇을 합의할지 짚는다.
- 구체성을 위해 입력에 없는 과거 사건·금액·날짜·상대의 속마음을 만들지 않는다. 가능성은 조건부 장면으로 설명하고 실제 확인 방법을 함께 준다. 같은 교훈을 모든 섹션에 반복하지 않는다.
- 섹션 끝에 "한 줄 정리" 같은 요약 줄은 쓰지 않는다. 마지막 섹션만 오늘 바로 할 행동 한 가지로 마무리한다.`;

function buildTarotReadingSystemPrompt(language = 'ko') {
  const lang = normalizeLanguage(language);
  return `너는 15년 경력의 전문 타로 리더다.

너의 역할은 사용자가 입력한 질문과 선택한 카드, 스프레드 위치를 바탕으로 현실적이고 따뜻한 타로 리딩을 제공하는 것이다.
출력 언어 규칙: ${languageInstruction(lang)}
${lang.code === 'ko' ? '' : `The final visible answer must be entirely in ${lang.label}. Translate every section title, heading, label, and sentence into ${lang.label}. Do not leave Korean headings such as "질문 요약", "전체 흐름 요약", "카드별 해석", "현실적인 조언", or "주의할 점" in the response. Korean card names may appear only when paired with the English card name or when needed as source evidence.`}

반드시 지켜야 할 원칙:
1. 카드 의미를 단순 나열하지 말고 질문과 연결해서 해석한다.
2. 각 카드는 반드시 해당 위치의 의미와 함께 해석한다.
3. 여러 장의 카드는 하나의 흐름과 이야기로 연결한다.
4. 너무 단정적으로 말하지 않는다.
5. 불안감이나 공포를 과도하게 조장하지 않는다.
6. "무조건", "반드시", "100%" 같은 표현을 피한다.
7. 죽음, 탑, 악마, 달 같은 카드도 상징적으로 해석한다.
8. 건강 문제는 의학적 진단처럼 말하지 않는다.
9. 금전/투자 문제는 투자 지시처럼 말하지 않는다.
10. 연애/재회 문제는 희망고문하지 않고 현실적인 가능성과 조언을 함께 준다.
11. 문체는 따뜻하지만 가볍지 않게 작성한다.
12. 유료 리딩처럼 충분히 구체적이고 깊이 있게 작성한다.
${lang.code === 'ko' ? '\n' + KO_READING_STYLE + '\n' : ''}
응답은 Markdown 본문만 반환한다. 코드블록, JSON, 부가 설명은 쓰지 않는다.`;
}

// 결제 전 미리보기에서 이미 보여 준 섹션 — 다시 쓰지 않게 알려 준다
function skipSectionsNote(list) {
  const items = (Array.isArray(list) ? list : []).map((s) => String(s || '').replace(/[\r\n<>]/g, ' ').trim().slice(0, 40)).filter(Boolean).slice(0, 4);
  return items.length ? `\n\n이미 화면에 작성된 섹션: ${items.join(', ')}\n이 섹션들은 다시 쓰지 말고, 그 다음 번호의 섹션부터 같은 형식("# 번호. 제목")으로 끝까지 작성하세요.` : '';
}

function buildTarotReadingUserPrompt(input, language = 'ko') {
  const lang = normalizeLanguage(language);
  const cards = input.cards.map((card) => ({
    positionIndex: card.positionIndex,
    positionLabel: card.positionLabel,
    positionMeaning: card.positionMeaning,
    cardNameKo: card.cardNameKo,
    cardNameEn: card.cardNameEn,
    orientation: card.orientation,
    keywords: Array.isArray(card.keywords) ? card.keywords : [],
    baseMeaning: card.baseMeaning,
    categoryMeaning: card.categoryMeaning,
    advice: card.advice,
    warning: card.warning,
  }));
  const count = cards.length;
  const lengthGuide = count >= 10
    ? '2,500~4,000자. 복잡한 흐름, 내면, 외부 환경, 최종 결과까지 깊이 있게 다룬다.'
    : count >= 5
      ? '1,800~2,500자. 현재 상황, 장애물, 숨겨진 흐름, 조언, 결과가 충분히 드러나야 한다.'
      : '1,200~1,800자. 간결하지만 핵심이 명확해야 한다.';
  const depthGuide = count >= 10
    ? `10장 켈틱크로스는 프리미엄 리딩이다.
- 각 카드 해석은 짧게 끝내지 말고, 위치 의미와 질문을 함께 엮어 설명한다.
- "카드 조합 해석"은 과거, 현재, 내면, 외부 환경, 기대와 두려움, 최종 흐름이 어떻게 이어지는지 길게 풀어준다.
- "질문에 대한 최종 답변"은 가장 깊은 섹션으로 작성하고, 가능성, 조건, 시기감, 사용자가 바꿀 수 있는 부분을 함께 다룬다.
- "현실적인 조언"과 "다음 행동 가이드"는 일반론이 아니라 질문 상황에 맞춘 구체 행동으로 작성한다.`
    : count >= 5
      ? `5장 리딩은 표준 유료 리딩이다.
- 현재 상황, 장애물, 숨겨진 흐름, 조언, 가까운 결과가 서로 어떻게 연결되는지 분명히 보여준다.
- 3장 리딩보다 카드 조합 해석과 최종 답변을 더 자세히 작성한다.
- 조언은 최소 3가지로, 감정 조절, 대화/실행 방식, 확인해야 할 현실 조건을 나누어 제안한다.`
      : `3장 리딩은 빠른 핵심 리딩이다.
- 질문의 핵심 답을 먼저 잡고, 과거/현재/미래 또는 상황/조언/결과 흐름을 간결하게 연결한다.
- 카드별 설명은 길게 늘리지 말고 최종 답변과 바로 이어지게 작성한다.
- 조언은 짧지만 바로 실행할 수 있게 쓴다.`;

  return `사용자의 질문:
${input.question}

질문 카테고리:
${input.questionCategory || 'general'}
선택한 타로 주제: ${input.topicTitle||input.topic||'자유 질문'}
${input.topic==='newyear'?`보고 싶은 해: ${input.targetYear||new Date().getFullYear()}년`:''}
${['child','children','health'].includes(input.topic)?'아이의 나이에 맞게 설명하고, 진단·임신 여부·태아 성별·건강 결과는 확정하지 말 것. 생활 관리와 가족의 소통을 중심으로 설명할 것.':''}

선택한 스프레드:
${input.spreadName || `${count}장 리딩`}

스프레드 설명:
${input.spreadDescription || ''}

선택된 카드:
${JSON.stringify(cards, null, 2)}

출력 언어:
${languageInstruction(lang)}
${lang.code === 'ko' ? '' : `All headings below are structural source labels only. In the final answer, translate them naturally into ${lang.label} and do not output Korean section titles.`}

아래 구조로 Markdown 타로 리딩을 작성해줘.

# 1. 질문 요약
사용자의 질문이 어떤 고민인지 2~3문장으로 정리해줘.

# 2. 전체 흐름 요약
선택된 카드들이 전체적으로 어떤 흐름을 보여주는지 먼저 설명해줘.

# 3. 카드별 해석
각 카드를 아래 형식으로 해석해줘.

## {{positionLabel}} - {{cardNameKo}}
- 핵심키워드: {{keyword1}}, {{keyword2}}, {{keyword3}}

이 위치가 질문 안에서 어떤 역할을 하는지 먼저 자연스럽게 설명해줘. 이어서 이 카드가 왜 이 위치에서 나왔는지, 사용자의 질문과 어떻게 연결되는지 이야기하듯 풀어줘.

# 4. 카드 조합 해석
카드들이 서로 연결될 때 어떤 이야기를 만드는지 설명해줘. 단순히 카드 의미를 나열하지 말고, 흐름으로 연결해줘.

# 5. 질문에 대한 최종 답변
사용자의 질문에 직접 답해줘. 단, 너무 단정하지 말고 가능성과 조건을 함께 말해줘.

# 6. 현실적인 조언
사용자가 지금 실제로 할 수 있는 행동을 3가지 정도 제안해줘. 단, 번호 목록으로 나열하지 말고 하나의 상담 문단처럼 자연스럽게 이어서 설명해줘.

# 7. 주의할 점
지금 조심해야 할 태도, 오해, 성급한 행동을 설명해줘.

# 8. 다음 행동 가이드
오늘부터 바로 적용할 수 있는 구체적인 다음 행동을 알려줘.

작성 조건:
- 전체 분량은 ${lengthGuide}
- 상품별 깊이 기준:
${depthGuide}
- 위 분량 범위를 넘길 것 같으면 각 섹션을 조금 압축하되, 절대 중간에 끊지 말고 "# 8. 다음 행동 가이드"까지 완결한다.
- 마지막 문장은 조언이 자연스럽게 마무리되는 완성 문장으로 끝낸다.
- 토큰 한도가 부족하다고 느껴지면 카드별 해석을 조금 줄이고, 카드 조합 해석과 최종 답변을 우선한다.
- 개조식 표현은 카드별 해석의 "핵심키워드" 한 줄에만 사용한다.
- "위치 의미:", "카드 핵심:", "질문과 연결한 해석:" 같은 항목형 라벨은 쓰지 않는다.
- 핵심키워드 외의 모든 풀이는 서술식, 이야기식, 대화식 문장으로 작성한다.
- 현실적인 조언도 번호 목록 대신 문장으로 이어서 작성한다.
- 사용자의 질문에 직접 연결해서 쓸 것
- 카드 이름을 자연스럽게 언급할 것
- 너무 미신적이거나 공포스럽게 쓰지 말 것
- 상담을 받는 느낌으로 쓸 것
- 연애/재회는 상대 마음을 확정하지 말고 가능성과 대화 흐름 중심으로 볼 것
- 직장/이직은 준비 상태와 리스크를 함께 볼 것
- 재물/투자는 투자 지시가 아니라 수입, 지출, 계약, 욕심, 안정성 중심으로 볼 것
- 선택 질문은 감정적 선택과 현실적 선택 기준을 구분할 것`;
}

async function handleAstrologyReading(request, env) {
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.AI) {
    return json({ error: '점성술 리딩 서비스가 아직 준비되지 않았습니다.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON 본문이 필요합니다.' }, 400);
  }

  const { chart, transit, productType, language, partnerChart, synastryAspects, targetYear, yearTransits, question } = body || {};
  if (!chart || typeof chart !== 'object' || !Array.isArray(chart.planets) || !chart.birthInfo) {
    return json({ error: '계산된 출생차트 데이터가 필요합니다.' }, 400);
  }
  const lang = normalizeLanguage(language);
  const systemPrompt = buildAstrologyReadingSystemPrompt(lang);
  if (!ASTRO_READING_TOPICS[ASTRO_PRODUCT_ALIAS[productType]||productType]) return json({ error: '점성술 주제를 확인해주세요.' }, 400);
  if (productType==='gunghap'&&(!partnerChart||!Array.isArray(partnerChart.planets)||!partnerChart.birthInfo)) return json({ error: '궁합은 상대방 출생차트도 필요해요.' }, 400);
  const userPrompt = buildAstrologyReadingUserPrompt({ chart, transit, productType, partnerChart, synastryAspects, targetYear, yearTransits, question, language: lang }) + skipSectionsNote(body && body.skipSections);
  const premium = ['life','newyear','full-report','yearly'].includes(productType);
  const maxOutputTokens = premium ? 5200 : 2800;

  try {
    if (env.OPENAI_API_KEY) {
      try {
        const result = await callOpenAIResponses({
          apiKey: env.OPENAI_API_KEY,
          model: env.OPENAI_ASTROLOGY_MODEL || 'gpt-5.4-mini',
          systemPrompt,
          userPrompt,
          maxOutputTokens,
          reasoningEffort: premium ? 'medium' : 'low',
          verbosity: 'medium',
        });
        return json({ ok: true, provider: 'openai', resultMarkdown: result.text || '', text: result.text || '', usage: result.usage || null });
      } catch (e) {
        console.warn('OpenAI astrology reading failed, falling back to Anthropic if available:', e && e.message);
        if (!env.ANTHROPIC_API_KEY) throw e;
      }
    }

    if (env.ANTHROPIC_API_KEY) {
      const apiResp = await callAnthropicWithRetry({
        apiKey: env.ANTHROPIC_API_KEY,
        body: {
          model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
          max_tokens: maxOutputTokens,
          system: [{ type: 'text', text: systemPrompt }],
          messages: [{ role: 'user', content: userPrompt }],
        },
      });
      if (apiResp.ok) {
        const data = await apiResp.json();
        const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        return json({ ok: true, provider: 'anthropic', resultMarkdown: text, text, usage: data.usage || null });
      }
      const errText = await apiResp.text();
      console.warn('Astrology Anthropic failed, falling back to Workers AI if available:', apiResp.status, errText.slice(0, 240));
    }

    if (env.AI) {
      const result = await callWorkersAIChat({
        ai: env.AI,
        model: env.WORKERS_AI_ASTROLOGY_MODEL || env.WORKERS_AI_READING_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8',
        systemPrompt,
        userPrompt,
        maxTokens: maxOutputTokens,
      });
      if (result.text) {
        return json({ ok: true, provider: 'workers-ai', model: result.model, resultMarkdown: result.text, text: result.text, usage: result.usage || null });
      }
    }

    return json({ error: '점성술 리딩을 잠시 생성하지 못했습니다.', code: 'AI_ASTROLOGY_TEMPORARY_UNAVAILABLE' }, 503);
  } catch (e) {
    console.error('Astrology reading worker error:', e);
    return json({ error: '점성술 리딩을 잠시 생성하지 못했습니다.', code: 'AI_ASTROLOGY_TEMPORARY_UNAVAILABLE' }, 503);
  }
}

function buildAstrologyReadingSystemPrompt(language = 'ko') {
  const lang = normalizeLanguage(language);
  return `너는 20년 경력의 전문 점성술사다.

너는 사용자의 출생차트와 현재 Transit 데이터를 바탕으로 점성술 리딩을 제공한다.
출력 언어 규칙: ${languageInstruction(lang)}
${lang.code === 'ko' ? '' : `The final visible answer must be entirely in ${lang.label}. Translate every section title, heading, label, and sentence into ${lang.label}. Do not leave Korean headings such as "출생차트 핵심 요약", "성격과 기질", "현재 운의 흐름", or "종합 결론" in the response. Keep planet/sign labels only as technical evidence when needed, and explain them in ${lang.label}.`}

중요 원칙:
1. 행성 위치, 별자리, 하우스, 애스펙트는 이미 계산된 데이터만 사용한다.
2. 없는 데이터를 추측하지 않는다.
3. 출생시간이 없는 경우 ASC와 하우스 해석을 하지 않는다.
4. 점성술 표현을 사용하되 일반 사용자가 이해하기 쉽게 설명한다.
5. 너무 단정적으로 말하지 않는다.
6. 건강, 투자, 법률 문제는 조심스럽게 표현한다.
7. 불안감을 과도하게 조장하지 않는다.
8. 유료 리딩처럼 충분히 구체적으로 작성한다.
9. 계산 오류를 보정하거나 새로운 행성 위치를 만들어내지 않는다.
${lang.code === 'ko' ? '\n' + KO_READING_STYLE + '\n' : ''}
응답은 Markdown 본문만 반환한다. 코드블록, JSON, 부가 설명은 쓰지 않는다.`;
}

const ASTRO_READING_TOPICS={
  "life": {
    "label": "총운 점성술",
    "focus": "타고난 기질과 인생 전반의 흐름",
    "sections": [
      "타고난 기질",
      "현재의 인생 과제",
      "숨은 강점",
      "조심할 패턴",
      "앞으로의 방향"
    ]
  },
  "newyear": {
    "label": "신년 점성술",
    "focus": "선택한 해의 기회와 주의할 흐름",
    "sections": [
      "한 해의 출발",
      "성장할 분야",
      "주의할 흐름",
      "도움이 되는 태도",
      "한 해의 마무리"
    ]
  },
  "gunghap": {
    "label": "궁합 점성술",
    "focus": "두 사람의 끌림과 차이, 관계의 방향",
    "sections": [
      "나의 관계 방식",
      "상대의 관계 방식",
      "잘 맞는 부분",
      "함께 맞출 부분",
      "관계의 방향"
    ]
  },
  "love": {
    "label": "연애 점성술",
    "focus": "인연과 마음이 가까워지는 흐름",
    "sections": [
      "나의 마음",
      "그 사람의 마음",
      "관계를 막는 것",
      "숨은 감정",
      "앞으로의 흐름"
    ]
  },
  "marriage": {
    "label": "결혼 점성술",
    "focus": "결혼 준비와 함께 맞출 생활 기준",
    "sections": [
      "나의 준비",
      "상대의 준비",
      "함께 맞출 것",
      "현실적인 조언",
      "결혼의 흐름"
    ]
  },
  "reunion": {
    "label": "재회 점성술",
    "focus": "멀어진 인연과 다시 다가갈 때의 태도",
    "sections": [
      "나의 지금 마음",
      "그 사람의 지금 마음",
      "남은 문제",
      "다가갈 때의 조언",
      "앞으로의 흐름"
    ]
  },
  "money": {
    "label": "재물 점성술",
    "focus": "돈을 버는 방식과 지출, 기회",
    "sections": [
      "지금 돈의 흐름",
      "새는 곳",
      "숨은 기회",
      "현실적인 조언",
      "앞으로의 흐름"
    ]
  },
  "career": {
    "label": "직업 점성술",
    "focus": "적성과 일하는 방식, 취업과 이직",
    "sections": [
      "지금 일의 상태",
      "걸림돌",
      "숨은 강점",
      "직업 선택의 조언",
      "앞으로의 흐름"
    ]
  },
  "study": {
    "label": "학업/시험 점성술",
    "focus": "학습 습관과 집중력, 실전 준비",
    "sections": [
      "현재 학습 흐름",
      "막히는 공부 습관",
      "숨은 학습 강점",
      "시험 준비 조언",
      "앞으로의 방향"
    ]
  },
  "child": {
    "label": "우리 아이 점성술",
    "focus": "아이의 기질과 재능, 양육과 소통",
    "sections": [
      "아이의 기질",
      "아이의 관심사",
      "소통이 막히는 지점",
      "부모가 도울 일",
      "성장의 방향"
    ]
  },
  "children": {
    "label": "자녀(임신) 점성술",
    "focus": "자녀와의 인연, 가족 계획과 마음의 준비",
    "sections": [
      "가족 계획의 현재",
      "마음의 부담",
      "함께 맞출 기준",
      "생활 속 준비",
      "앞으로의 방향"
    ]
  },
  "health": {
    "label": "건강 점성술",
    "focus": "생활 리듬과 휴식, 관리해야 할 습관",
    "sections": [
      "현재 생활 리듬",
      "쌓인 부담",
      "휴식이 필요한 부분",
      "바꿀 생활 습관",
      "관리의 방향"
    ]
  }
};
const ASTRO_PRODUCT_ALIAS={'birth-basic':'life','full-report':'life','love-marriage':'love','career-money':'career',yearly:'newyear'};
function buildAstrologyReadingUserPrompt({chart,transit,productType,language,partnerChart,synastryAspects,targetYear,yearTransits,question}){
  const lang=normalizeLanguage(language),key=ASTRO_PRODUCT_ALIAS[productType]||productType;
  const topic=ASTRO_READING_TOPICS[key]||ASTRO_READING_TOPICS.life;
  const hasTime=!(chart.birthInfo&&chart.birthInfo.birthTimeUnknown);
  const sections=key==='life'?['타고난 성향과 강점','관계와 사랑','일과 재물','인생의 성장 과제','현재 흐름과 실천']:
    key==='newyear'?['선택한 해의 전체 흐름','상반기와 하반기','일과 돈의 기회','관계와 생활의 변화','한 해를 위한 실천']:
    key==='gunghap'?['두 사람의 관계 방식','끌리는 부분과 차이','대화와 감정의 궁합','함께 맞출 생활 기준','관계를 위한 실천']:
    [topic.label+'의 타고난 성향',topic.focus,'현재 흐름과 기회','조심할 패턴',topic.label+'을 위한 실천'];
  return `상품 유형: ${topic.label}
출력 언어: ${languageInstruction(lang)}
집중할 주제: ${topic.focus}. 다른 주제의 일반론을 늘어놓지 말고 이 주제의 구체적인 해석에 집중하세요.
사용자가 적은 상황과 질문: ${String(question||'별도 질문 없음')}
계산된 출생차트: ${JSON.stringify(chart)}
계산된 기준 트랜짓: ${JSON.stringify(transit||{})}
${key==='gunghap'?`계산된 상대방 출생차트: ${JSON.stringify(partnerChart||{})}\n계산된 두 차트 사이 각도: ${JSON.stringify(synastryAspects||[])}\n두 사람의 실제 행성 관계를 비교하세요. 상대방 정보가 없는 관계를 지어내지 마세요. 상대방 시간을 모르면 상대방 ASC·하우스 해석은 하지 마세요.`:''}
${key==='newyear'?`보고 싶은 해: ${targetYear||new Date().getFullYear()}년\n계산된 해당 연도 월별 행성 위치: ${JSON.stringify(yearTransits||[])}\n현재 연도가 아닌 위에서 선택한 해를 기준으로 설명하세요. 제공되지 않은 날짜나 행성 위치를 만들어내지 마세요.`:''}
${key==='child'?'아이의 실제 나이와 발달 단계에 맞게 양육·기질·학습·또래 관계로 설명하세요. 성인의 취업·결혼 문제로 바꾸지 마세요.':''}
${['health','children'].includes(key)?'질병 진단, 임신 가능 여부나 임신 시기, 태아 성별, 생존 여부를 예언하거나 보장하지 마세요. 생활 습관·마음의 준비·가족 소통 관점으로 설명하고, 의학적 판단은 진료를 통해 확인하도록 안내하세요.':''}
본인 출생시간 사용 가능: ${hasTime?'제공된 ASC·하우스만 사용':'ASC·하우스 해석 금지. 달 위치 오차 가능성 안내'}
행성 위치와 각도는 주어진 계산값만 사용하세요. 합격·투자 수익·재회·임신 등을 확정하지 마세요.
응답은 Markdown 본문만 쓰고, 아래 제목 순서에 맞춰 ${['life','newyear'].includes(key)?'3,000~4,000':'1,500~2,000'}자 안팎으로 친근하게 설명하세요.
# 1. 출생차트 핵심 요약
${sections.map((h,i)=>'# '+(i+2)+'. '+h).join('\n')}`;
}

async function handleTranslate(request, env) {
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.AI) {
    return json({ error: '번역 서비스가 아직 준비되지 않았습니다.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON 본문이 필요합니다.' }, 400);
  }

  const lang = normalizeLanguage(body && (body.targetLanguage || body.language));
  if (lang.code === 'ko') return json({ ok: true, texts: Array.isArray(body.texts) ? body.texts : [] });

  const texts = (Array.isArray(body.texts) ? body.texts : [])
    .slice(0, 220)
    .map((t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 4000));
  if (!texts.length) return json({ ok: true, texts: [] });

  const systemPrompt = `You are a translation engine for a saju fortune web app.
Translate Korean UI and reading text into ${lang.label}.
Rules:
- Return strict JSON only: an array of strings with the same length and order as the input.
- Preserve numbers, dates, prices, emojis, HTML entity-like text, and standalone birth-chart labels.
- Do not add explanations, markdown, bullets, or extra keys.
- Keep the tone warm and advisory.`;
  const userPrompt = JSON.stringify({ targetLanguage: lang.label, texts });

  try {
    let raw = '';
    if (env.OPENAI_API_KEY) {
      try {
        const result = await callOpenAIResponses({
          apiKey: env.OPENAI_API_KEY,
          model: env.OPENAI_TRANSLATE_MODEL || env.OPENAI_MODEL || 'gpt-5.4-mini',
          systemPrompt,
          userPrompt,
          maxOutputTokens: 12000,
          reasoningEffort: 'low',
          verbosity: 'low',
        });
        raw = result.text || '';
      } catch (e) {
        console.warn('OpenAI translate failed, falling back to Anthropic if available:', e && e.message);
        if (!env.ANTHROPIC_API_KEY) throw e;
      }
    }
    if (!raw && env.ANTHROPIC_API_KEY) {
      const apiResp = await callAnthropicWithRetry({
        apiKey: env.ANTHROPIC_API_KEY,
        body: {
          model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
          max_tokens: 12000,
          system: [{ type: 'text', text: systemPrompt }],
          messages: [{ role: 'user', content: userPrompt }],
        },
      });
      if (apiResp.ok) {
        const data = await apiResp.json();
        raw = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      } else {
        const errText = await apiResp.text();
        console.warn('Anthropic translate failed, falling back to Workers AI if available:', apiResp.status, errText.slice(0, 240));
      }
    }
    if (!raw && env.AI) {
      const result = await env.AI.run(env.WORKERS_AI_TRANSLATE_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 9000,
      });
      raw = extractWorkersAIText(result);
    }
    if (!raw) return json({ error: '번역 서비스 일시 오류' }, 502);
    const translated = parseJsonArrayText(raw);
    if (!Array.isArray(translated)) throw new Error('translation parse failed');
    return json({ ok: true, texts: texts.map((t, i) => String(translated[i] || t)) });
  } catch (e) {
    console.error('Translate worker error:', e);
    return json({ error: '번역 생성 중 오류가 발생했습니다.' }, 500);
  }
}


function isCoreReadingCategory(category) {
  return category === 'life-core' || category === 'newyear-core' || category === 'reading-deep' || /^report-/.test(String(category || ''));
}

function normalizeLanguage(input) {
  const raw = typeof input === 'string' ? input : input && (input.code || input.worker || input.lang);
  const code = String(raw || 'ko').toLowerCase().replace(/^cn$/, 'zh').replace(/^jp$/, 'ja');
  return LANGUAGE_META[code] || LANGUAGE_META.ko;
}

function languageInstruction(input) {
  return normalizeLanguage(input).instruction;
}

function parseJsonArrayText(raw) {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.texts)) return parsed.texts;
  } catch {}
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }
  return null;
}

function extractWorkersAIText(result) {
  if (!result) return '';
  if (typeof result === 'string') return result.trim();
  if (typeof result.response === 'string') return result.response.trim();
  if (typeof result.result === 'string') return result.result.trim();
  if (typeof result.text === 'string') return result.text.trim();
  if (Array.isArray(result.choices)) {
    return result.choices
      .map((c) => (c && c.message && c.message.content) || c.text || '')
      .join('\n')
      .trim();
  }
  if (Array.isArray(result.output)) {
    return result.output
      .flatMap((item) => item.content || [])
      .map((part) => part.text || '')
      .join('\n')
      .trim();
  }
  return '';
}

function normalizeQnaAnswer(text, maxChars = QNA_ANSWER_MAX_CHARS) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized || normalized.length <= maxChars) return normalized;

  const hardCut = normalized.slice(0, maxChars).trim();
  const sentenceEnders = ['.', '!', '?', '。', '！', '？', '요.', '다.', '죠.', '세요.'];
  let best = -1;
  for (const marker of sentenceEnders) {
    const idx = hardCut.lastIndexOf(marker);
    if (idx > best) best = idx + marker.length;
  }
  const minUseful = Math.floor(maxChars * 0.72);
  if (best >= minUseful) return hardCut.slice(0, best).trim();

  const lastBreak = Math.max(
    hardCut.lastIndexOf('\n\n'),
    hardCut.lastIndexOf('\n'),
    hardCut.lastIndexOf(' ')
  );
  if (lastBreak >= minUseful) return hardCut.slice(0, lastBreak).trim();
  return hardCut;
}

async function callWorkersAIChat({ ai, model, systemPrompt, userPrompt, maxTokens = 1400 }) {
  if (!ai) return { text: '', model };
  try {
    const result = await ai.run(model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
    });
    return { text: extractWorkersAIText(result), model, usage: result && result.usage ? result.usage : null };
  } catch (e) {
    console.warn('Workers AI QNA failed:', e && e.message);
    return { text: '', model };
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function callOpenAIResponses({ apiKey, model, systemPrompt, userPrompt, maxOutputTokens = 1800, reasoningEffort = 'low', verbosity = 'medium', format = null }) {
  const body = {
    model,
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_output_tokens: maxOutputTokens,
  };
  if (/^gpt-5/i.test(model)) {
    body.reasoning = { effort: reasoningEffort };
    body.text = { verbosity };
  }
  if (format) body.text = { ...(body.text || {}), format };
  const resp = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('OpenAI API error:', resp.status, errText);
    throw new Error(`OpenAI API error ${resp.status}`);
  }

  const data = await resp.json();
  const text =
    data.output_text ||
    (data.output || [])
      .flatMap((item) => item.content || [])
      .map((part) => part.text || '')
      .join('\n')
      .trim();
  // max_output_tokens 로 끊긴 응답은 문장이 중간에 잘려 있다.
  // (gpt-5 계열은 추론 토큰도 이 예산을 함께 쓰므로 본문이 통째로 비는 경우도 있다.)
  const truncated = data.status === 'incomplete' || !!(data.incomplete_details && data.incomplete_details.reason);
  return { text, usage: data.usage || null, truncated };
}

function chooseQnaModel(question, ctx, env = {}) {
  const q = String(question || '');
  const premiumPattern = /(결혼|이혼|재혼|배우자|궁합|이직|퇴사|창업|사업|승진|계약|소송|재판|부동산|투자|대출|건강|수술|임신|출산|자녀|진로|직업|돈|재물|올해|내년|시기|언제)/;
  const longOrContextHeavy = q.length >= 120 || String(ctx && ctx.detailedReading || '').length > 9000;
  const premium = premiumPattern.test(q) || longOrContextHeavy;
  return premium
    ? {
        name: 'premium',
        model: env.OPENAI_QNA_PREMIUM_MODEL || 'gpt-5.5',
        reasoningEffort: 'medium',
        verbosity: 'medium',
        maxOutputTokens: 2200,
        answerLength: QNA_PREMIUM_ANSWER_LENGTH,
      }
    : {
        name: 'standard',
        model: env.OPENAI_QNA_MODEL || 'gpt-5.4-mini',
        reasoningEffort: 'low',
        verbosity: 'medium',
        maxOutputTokens: 1800,
        answerLength: QNA_STANDARD_ANSWER_LENGTH,
      };
}

function buildQnaUserPrompt(question, ctx, category, route = {}, language = 'ko') {
  return `카테고리: ${category || 'life'}
출력 언어: ${languageInstruction(language)}

사용자 질문:
${question}

위 질문에 답하세요. 답변은 본인의 사주 원국, 현재 10년 흐름, 올해 흐름, 화면 풀이 요약과 모순되지 않아야 합니다.
답변 길이는 공백 포함 ${route.answerLength || QNA_STANDARD_ANSWER_LENGTH}를 목표로 하되, 반드시 ${QNA_ANSWER_MAX_CHARS}자 이내에서 완결하세요.
마지막 문장은 중간에 끊기지 않게 자연스럽게 마무리하세요. 내용이 많으면 세부 설명을 줄이고 결론·이유·행동 조언만 남기세요.`;
}

async function callHermesAgent({ baseUrl, apiKey, systemPrompt, userPrompt }) {
  const url = String(baseUrl || '').replace(/\/$/, '');
  const resp = await fetch(url + '/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_output_tokens: 2200,
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    console.error('Hermes API error:', resp.status, errText);
    throw new Error(`Hermes API error ${resp.status}`);
  }
  const data = await resp.json();
  const text =
    data.output_text ||
    data.answer ||
    data.text ||
    (data.output || [])
      .flatMap((item) => item.content || [])
      .map((part) => part.text || '')
      .join('\n')
      .trim();
  return { text, usage: data.usage || null };
}

async function qnaCacheKey({ question, sajuContext, category, language, counselor }) {
  const src = JSON.stringify({
    v: 4,
    // 기본 상담사는 키를 비워 기존 캐시를 그대로 쓴다
    counselor: counselor && counselor !== 'master' ? counselor : undefined,
    language: normalizeLanguage(language).code,
    category,
    question: String(question || '').trim().replace(/\s+/g, ' '),
    birth: sajuContext && sajuContext.birth,
    pillars: sajuContext && sajuContext.pillars,
    daeun: sajuContext && sajuContext.daeun,
    sewoon: sajuContext && sajuContext.sewoon,
    qaExtra: sajuContext && sajuContext.qaExtra,
    situation: sajuContext && sajuContext.situation,
  });
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src));
  return 'qna:' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function qnaCacheGet(env, key) {
  if (!env.SAJU_QNA_CACHE || !key) return null;
  try {
    const raw = await env.SAJU_QNA_CACHE.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('QNA cache get failed:', e && e.message);
    return null;
  }
}

async function qnaCacheSet(env, key, value) {
  if (!env.SAJU_QNA_CACHE || !key || !value || !value.answer) return;
  try {
    await env.SAJU_QNA_CACHE.put(key, JSON.stringify({ ...value, cachedAt: Date.now() }), { expirationTtl: 24 * 60 * 60 });
  } catch (e) {
    console.warn('QNA cache put failed:', e && e.message);
  }
}

async function qnaFreeGuardKeys({ request, sajuContext, clientId, deviceFingerprint, sajuId }) {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    request.headers.get('X-Real-IP') ||
    '';
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';
  const device = String(deviceFingerprint || '').slice(0, 900);
  const legacySajuBase = {
    v: 3,
    sajuId: String(sajuId || ''),
    birth: sajuContext && sajuContext.birth,
    pillars: sajuContext && sajuContext.pillars,
  };
  const candidates = [];
  if (clientId) candidates.push(['client-global-v1', { clientId: String(clientId) }]);
  if (ip) candidates.push(['ip-global-v1', { ip }]);
  if (device || ua || lang) candidates.push(['device-global-v1', { device, ua, lang }]);
  if (clientId || ip || device) candidates.push(['person-global-v1', { clientId: String(clientId || ''), ip, device, ua, lang }]);

  // 기존 배포에서 이미 기록된 "사주별 무료 사용" 키도 함께 확인해 현재 사주 재무료를 막는다.
  if (clientId) candidates.push(['client', { ...legacySajuBase, clientId: String(clientId) }]);
  if (ip) candidates.push(['ip', { ...legacySajuBase, ip }]);
  candidates.push(['saju-client-ip', { ...legacySajuBase, clientId: String(clientId || ''), ip }]);
  const keys = [];
  for (const [kind, value] of candidates) {
    const src = JSON.stringify({ kind, value });
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src));
    keys.push('qna-free:' + kind + ':' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''));
  }
  return keys;
}

async function qnaFreeGuardUsed(env, keys) {
  if (!env.SAJU_QNA_CACHE || !Array.isArray(keys) || !keys.length) return false;
  try {
    for (const key of keys) {
      if (await env.SAJU_QNA_CACHE.get(key)) return true;
    }
    return false;
  } catch (e) {
    console.warn('QNA free guard get failed:', e && e.message);
    return false;
  }
}

async function qnaFreeGuardMark(env, keys) {
  if (!env.SAJU_QNA_CACHE || !Array.isArray(keys) || !keys.length) return;
  try {
    const value = JSON.stringify({ usedAt: Date.now() });
    await Promise.all(keys.map((key) => env.SAJU_QNA_CACHE.put(key, value, { expirationTtl: 24 * 60 * 60 })));
  } catch (e) {
    console.warn('QNA free guard put failed:', e && e.message);
  }
}

// Anthropic API 호출 + 일시적 오류 자동 재시도
// 재시도 대상: 403 (권한 캐시 미스), 408/425/429 (속도 제한·타임아웃), 5xx (서버 일시 장애), 네트워크 예외
// 재시도 안 함: 400 (잘못된 요청), 401 (잘못된 키), 404 — 재시도해도 안 풀리는 영구 오류
async function callAnthropicWithRetry({ apiKey, body, maxAttempts = 3 }) {
  const transientStatuses = new Set([403, 408, 425, 429, 500, 502, 503, 504, 524]);
  const backoffsMs = [300, 800]; // 1차 실패 후 300ms, 2차 실패 후 800ms

  let lastResp = null;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        if (attempt > 1) console.log(`Anthropic recovered on attempt ${attempt}`);
        return resp;
      }

      lastResp = resp;
      // 영구 오류이거나 마지막 시도면 그대로 반환
      if (!transientStatuses.has(resp.status) || attempt === maxAttempts) {
        return resp;
      }
      console.warn(`Anthropic transient ${resp.status}, retrying (attempt ${attempt}/${maxAttempts})`);
    } catch (e) {
      lastError = e;
      if (attempt === maxAttempts) throw e;
      console.warn(`Anthropic network error: ${e.message}, retrying (attempt ${attempt}/${maxAttempts})`);
    }

    // 백오프 + 지터(±20%)
    const base = backoffsMs[attempt - 1] || backoffsMs[backoffsMs.length - 1];
    const jitter = base * (0.8 + Math.random() * 0.4);
    await new Promise((r) => setTimeout(r, jitter));
  }

  // 이론상 도달 안 함 — 마지막 응답 또는 예외 반환
  if (lastResp) return lastResp;
  throw lastError || new Error('역술가 서비스 호출 실패 (재시도 한도 초과)');
}

function buildReadingSystemPrompt(category, meta) {
  const lang = normalizeLanguage(meta && meta.language);
  const toneRule = lang.code === 'ko'
    ? `- 한국어 친근 존댓말로만 씁니다. "~예요 / ~이에요 / ~돼요 / ~해요 / ~세요"를 자연스럽게 쓰세요.
- 상담자를 "본인"이라고 부르세요. "당신"은 쓰지 마세요.`
    : `- ${languageInstruction(lang)}
- Use a warm, friendly advisory tone that feels like a skilled fortune reader speaking naturally.
- Do not call the user "당신". Use a natural second-person expression in the target language.`;
  const categoryGuide = {
    life: '인생총운 첫머리에 들어갈 개인화 리딩입니다. 본인의 성향, 돈과 일의 선택 기준, 관계에서 반복되는 패턴, 현재 흐름을 먼저 짚으세요.',
    'life-core': '인생총운의 주요 해석 문단 대부분을 AI로 다시 고도화하는 리딩입니다. 기존 계산형 풀이를 단순 요약하지 말고, 핵심 바탕·성향·재물·직업·연애·건강·인간관계·직업 적성·현재 10년 흐름·올해 흐름·평생 타임라인 요약·개운법을 본인 맞춤으로 재작성하세요. 사주판, 표, 점수, 차트는 화면에 따로 남으므로 문장 해석에 집중하세요.',
    newyear: `${meta.targetYear || '올해'} 신년운세 첫머리에 들어갈 개인화 리딩입니다. 한 해의 변화, 관계·일·돈에서 특히 눈여겨볼 흐름, 조심할 선택 습관을 짚으세요.`,
    'newyear-core': `${meta.targetYear || '올해'} 신년운세의 주요 해석 문단 대부분을 AI로 다시 고도화하는 리딩입니다. 기존 계산형 풀이를 바탕으로 올해 총론·재물·직업·연애·인간관계·건강·12개월 흐름·기회 시기·주의 시기·올해 행동 가이드를 본인 맞춤으로 재작성하세요. 점수 링, 월별 점수표, 차트는 화면에 따로 남으므로 문장 해석에 집중하세요.`,
    gunghap: '별도 궁합 카테고리 첫머리에 들어갈 개인화 리딩입니다. 두 사람의 끌림, 피로가 쌓이는 지점, 결혼·장기 관계 가능성, 바로 실천할 대화 방식을 짚으세요.',
    'life-gunghap': '인생총운 내부 궁합 결과 첫머리에 들어갈 개인화 리딩입니다. 본인 인생 흐름 안에서 이 관계가 어떤 의미인지, 가까워지는 방식과 조심할 반복 패턴을 짚으세요.',
    'reading-deep': '결제 후 공개되는 심층 해석입니다. 섹션 자료의 각 섹션마다, 화면에 이미 보이는 문장(visible)에 자연스럽게 이어지는 깊은 해석 문단과 한 줄 정리를 새로 쓰세요. facts에 적힌 계산 결과(시기·숫자·성향·사람)는 빠짐없이 녹여 쓰되 문장은 새로 쓰고, facts에 없는 날짜·숫자는 지어내지 마세요. visible 문장을 그대로 반복하지 마세요. 일반론이 아니라 이 사람에게만 해당하는 장면과 행동으로 콕 집어 쓰세요.',
    'topic-answer': `주제별 운세(${meta.topic || '주제'})에서 상담자가 직접 적은 질문에 답하는 문단입니다. 질문에 정면으로 답하세요. 첫 문장은 결론, 이어서 사주에서 그렇게 보는 이유, 언제(계산된 연·월 인용), 어떻게 하면 좋은지를 상담자의 구체적인 상황에 맞춰 쓰세요. 질문과 관계없는 일반론으로 채우지 마세요.`,
    'report-tpl': `유료 PDF 보고서(${String((meta && meta.reportName) || '사주').slice(0, 20)})의 본문 일부를 씁니다. 보고서 목차의 소제목마다 이 사람에게만 해당하는 풀이를 쓰세요. 아래 "화면 풀이 요약"과 "계산 결과"에 있는 시기·점수·성향·사람을 근거로 삼고, 소제목이 묻는 내용에 정면으로 답하세요. 같은 문장이나 같은 시기를 소제목마다 되풀이하지 마세요.`,
    'report-life': 'PDF 평생 사주 리포트에 들어갈 심층 장(章)입니다. 인생 전체를 관통하는 그릇, 인생에서 크게 열리는 기회의 시기, 평생 조심할 함정, 나이대별 전략을 시기와 장면으로 콕 집어 쓰세요.',
    'report-love': 'PDF 리포트의 연애·결혼 심층 장입니다. 사랑하는 방식, 운명의 상대 모습, 만나는 때와 장소, 반복되는 실수, 결혼과 가정을 구체적인 연·월과 장면으로 콕 집어 쓰세요.',
    'report-money': 'PDF 리포트의 재물 심층 장입니다. 돈의 그릇, 돈이 들어오는 길, 돈이 새는 길, 잘 맞는 자산 관리 성향, 재물이 크게 움직이는 시기를 구체적으로 콕 집어 쓰세요. 특정 상품 추천이나 확정적인 투자 판단은 하지 마세요.',
    'report-career': 'PDF 리포트의 일·커리어 심층 장입니다. 타고난 적성, 잘 맞는 일터, 이직·승진의 때, 일에서 만나는 귀인과 조심할 사람, 10년 커리어 전략을 구체적으로 콕 집어 쓰세요.',
    'report-health': 'PDF 리포트의 건강 심층 장입니다. 타고난 체질, 약한 곳과 관리법, 조심할 시기, 생활 처방, 마음 건강을 관리와 예방 관점으로 쓰세요. 진단이나 병명 단정은 하지 마세요.',
  };
  const reportSections = {
    'report-life': '[타고난 그릇], [인생에서 크게 열리는 기회], [평생 조심할 함정], [나이대별 전략], [천기의 마지막 조언]',
    'report-love': '[사랑하는 방식], [운명의 상대], [만나는 때와 장소], [연애에서 반복되는 실수], [결혼과 가정]',
    'report-money': '[돈의 그릇], [돈이 들어오는 길], [돈이 새는 길], [잘 맞는 자산 관리], [재물이 크게 움직이는 시기]',
    'report-career': '[타고난 적성], [잘 맞는 일터], [이직·승진의 때], [일터의 귀인과 조심할 사람], [10년 커리어 전략]',
    'report-health': '[타고난 체질], [약한 곳과 관리법], [조심할 시기], [생활 처방], [마음 건강]',
  };
  const coreSections = category === 'life-core'
    ? (lang.code === 'ko'
      ? '[핵심 바탕], [성향·그릇], [재물], [직업·사업], [연애·결혼], [건강], [인간관계], [직업 적성], [현재 10년 흐름], [올해 흐름], [평생 타임라인 요약], [개운법]'
      : 'Use natural translated equivalents of: Core foundation, Character and capacity, Wealth, Career and business, Love and marriage, Health, Relationships, Career aptitude, Current 10-year flow, This year flow, Lifetime timeline summary, Practical remedy. Put each translated section title in square brackets.')
    : (lang.code === 'ko'
      ? '[올해 총론], [재물], [직업·사업], [연애·관계], [인간관계], [건강], [12개월 흐름], [기회 시기], [주의 시기], [올해 행동 가이드]'
      : 'Use natural translated equivalents of: Overall year, Wealth, Career and business, Love and relationships, Social relationships, Health, 12-month flow, Opportunity timing, Caution timing, Action guide for the year. Put each translated section title in square brackets.');
  const outputGuide = category === 'report-tpl'
    ? `출력 형식:
- 아래 JSON 한 개만 출력하세요. 코드블록, 설명 문장은 쓰지 마세요.
- {"sections":[{"id":"섹션 id 그대로","paragraphs":["문단","문단","문단","문단"]}],"fields":[{"id":"필드 id","text":"내용"}]}
- 섹션 자료의 모든 섹션을 같은 순서로 넣고 id는 바꾸지 마세요. 섹션마다 paragraphs는 4개, 문단마다 4~5문장으로 쓰고 문단 하나가 공백 포함 260자 이상이 되게 하세요. 한 섹션은 1,100자 안팎이에요. 짧게 줄이지 마세요.
- 첫 문단은 소제목에 답하는 생활 장면과 핵심 결론, 둘째 문단은 사주에서 그렇게 보는 짧은 근거, 셋째 문단은 그 장점이 부담으로 바뀌는 구체적인 상황, 넷째 문단은 본인이 선택할 수 있는 행동으로 쓰세요. 각 장면은 가능성의 예시로 쓰고 이미 일어난 일처럼 단정하지 마세요.
- fields에는 필드 자료의 모든 id를 하나씩 넣고, 각 필드의 지시(ask)와 글자 수(max) 안에서 쓰세요.
- 문단과 필드 안에 줄바꿈, 마크다운, 번호, 따옴표 장식을 넣지 마세요. 문장 안에서 무언가를 인용할 때는 작은따옴표(')를 그대로 쓰고 역슬래시를 붙이지 마세요.
- 정관·편관·정재·편재·식신·상관·비견·겁재·정인·편인과 '~격' 같은 사주 유형 이름은 쓰지 말고 쉬운 말로 풀어 쓰세요.`
    : category === 'reading-deep'
    ? `출력 형식:
- 아래 JSON 한 개만 출력하세요. 코드블록, 설명 문장은 쓰지 마세요.
- {"sections":[{"id":"섹션 id 그대로","paragraphs":["문단","문단","문단"]}]}
- 섹션 자료에 있는 모든 섹션을 같은 순서로 넣고, id는 바꾸지 마세요.
- 섹션마다 paragraphs는 3개, 문단마다 3~4문장으로 쓰세요. facts의 구체적인 내용(직업명·시기·방법 등)을 빠뜨리지 마세요.
- 문단 안에 줄바꿈, 마크다운, 번호를 넣지 마세요.`
    : category === 'topic-answer'
    ? `출력 형식:
- 제목, 마크다운, 번호, 불릿 없이 문단만 출력하세요.
- 4~6문단, 문단당 2~3문장, 전체 공백 포함 900~1,500자로 작성하세요.
- 첫 문장은 질문에 대한 결론으로 시작하세요.
- 핵심 시기(계산값)의 연·월을 한 번 이상 그대로 인용하고, 같은 시기를 반복하지 마세요.
- 마지막 문단은 오늘 바로 할 수 있는 행동 한 가지로 마무리하세요.`
    : reportSections[category]
    ? `출력 형식:
- 섹션 제목은 대괄호로 감싸서 사용하세요: ${reportSections[category]}
- 각 섹션은 3~5문단, 문단당 2~4문장으로 작성하세요.
- 전체는 공백 포함 2,500~3,200자 정도로 작성하세요.
- 핵심 시기(계산값)가 있으면 연·월을 그대로 인용해 언제 무엇을 하면 좋은지 콕 집어 쓰세요.
- 마크다운 제목, 번호, 불릿은 쓰지 마세요.`
    : isCoreReadingCategory(category)
    ? `출력 형식:
- 섹션 제목은 대괄호로 감싸서 사용하세요.
- ${coreSections}
- 각 섹션은 2~4문장으로 작성하세요.
- 전체는 공백 포함 ${category === 'life-core' ? '3,000~4,200자' : '2,600~3,600자'} 정도로 작성하세요.
- 마크다운 제목, 번호, 불릿은 쓰지 마세요.`
    : `출력 형식:
- 제목, 마크다운, 번호, 불릿 없이 문단만 출력하세요.
- 5~8문단, 문단당 2~4문장으로 작성하세요.
- 첫 문단은 바로 핵심 결론으로 시작하세요.
- 마지막 문단은 ${lang.code === 'ko' ? '"아래에서는 ..."으로 이어지는 자연스러운 유료 본문 연결 문장' : 'a natural transition sentence in the selected language that invites the user to continue reading the detailed paid content'}으로 마무리하세요.`;
  return `당신은 한국 사주 풀이 서비스의 유료 콘텐츠를 보강하는 전문 리딩 작가입니다.

목표:
- 기존 계산형 사주풀이를 바탕으로, 사용자가 "내 얘기 같다"고 느낄 개인화 문단을 작성합니다.
- ${categoryGuide[category] || ''}
- 사용자가 아래의 긴 카드들을 더 읽고 싶게 만들되, 내용은 실제 사주 구조와 화면 풀이 요약에 근거해야 합니다.

말투와 표현 규칙:
- 출력 언어: ${languageInstruction(lang)}
${toneRule}
- 정관, 편관, 정재, 편재, 정인, 편인, 식신, 상관, 비견, 겁재, 격국, 희신, 기신, 공망 같은 전문용어는 본문에 그대로 쓰지 말고 쉬운 말로 풀어 쓰세요.
- 사주팔자, 연주·월주·일주·시주, 천간·지지, 일간, 일지, 오행, 용신, 대운, 세운 같은 기본 사주 용어는 그대로 쓰세요. 처음 나올 때만 괄호로 짧게 풀어 주세요. 예: 대운(10년마다 바뀌는 큰 흐름)
- 글자 개수나 글자 뜻 같은 이론 설명은 근거 한두 문장으로 줄이고, 본문은 구체적인 연·월, 실제로 겪을 장면, 바로 할 행동으로 콕 집어 말하세요.
- 단독 명사 "결"은 쓰지 마세요. "분위기", "흐름", "방식"으로 바꾸세요. 단, 결론·결정·결혼·결실 같은 복합어는 괜찮습니다.
- 공포 조장, 사망 시기, 확정 의료·법률·투자 판단은 하지 마세요.
- 생활 장면 → 짧은 사주 근거 → 선택할 행동의 순서로 풀어 주세요. 직업은 업무와 평가, 재물은 지출과 계약, 관계는 대화와 생활, 건강은 수면과 회복처럼 영역마다 다른 장면을 쓰세요.
- 흐름·기운·분위기라는 추상어를 연속해서 쓰지 마세요. 짧은 핵심 문장과 두세 문장의 설명을 섞고, 모든 단락을 같은 어미나 그래서·다만으로 시작하지 마세요. 행동은 한 번에 하나만 제안하세요.
- 두루뭉술한 위로나 일반론으로 채우지 말고, 입력된 생년월일시·사주팔자·현재 흐름·올해 흐름에서 보이는 선택 패턴을 구체적으로 말하세요.

${outputGuide}`;
}

// 클라이언트가 계산해 보낸 핵심 시기
function timingText(ctx) {
  return String((ctx && ctx.timing) || '').replace(/[\r\n]+/g, ' ').replace(/[<>]/g, '').trim().slice(0, 600);
}

// 클라이언트가 보낸 지금 상황 — 짧은 한 줄만 받는다
function situationText(ctx) {
  return String((ctx && ctx.situation) || '').replace(/[\r\n]+/g, ' ').replace(/[<>]/g, '').trim();
}

function buildReadingUserPrompt(category, ctx, meta) {
  const lang = normalizeLanguage(meta && meta.language);
  const reading = String(ctx.detailedReading || '').slice(0, isCoreReadingCategory(category) ? 18000 : 12000);
  const task = category === 'report-tpl'
    ? `보고서: ${String(meta.reportName || '').slice(0, 20)}\n계산 결과: ${String(meta.facts || '').replace(/[<>]/g, '').slice(0, 2400)}\n\n섹션 자료(JSON): ${JSON.stringify(Array.isArray(meta.sections) ? meta.sections.slice(0, 16).map((s) => ({ id: String(s.id || '').slice(0, 24), chapter: String(s.chapter || '').slice(0, 40), title: String(s.title || '').slice(0, 60), hint: String(s.hint || '').slice(0, 300) })) : [])}\n\n필드 자료(JSON): ${JSON.stringify(Array.isArray(meta.fields) ? meta.fields.slice(0, 40).map((f) => ({ id: String(f.id || '').slice(0, 24), ask: String(f.ask || '').slice(0, 120), max: Math.max(8, Math.min(240, Number(f.max) || 60)) })) : [])}\n\n위 섹션과 필드를 모두 채워 JSON으로만 답하세요.`
    : category === 'reading-deep'
    ? `섹션 자료(JSON): ${JSON.stringify(Array.isArray(meta.sections) ? meta.sections.slice(0, 14).map((s) => ({ id: String(s.id || '').slice(0, 40), title: String(s.title || '').slice(0, 80), visible: String(s.visible || '').slice(0, 450), facts: String(s.facts || '').slice(0, 1000) })) : [])}\n\n위 섹션마다 심층 해석을 써서 JSON으로만 답하세요. 풀이 종류: ${String(meta.readingKind || '').slice(0, 20)}.`
    : category === 'topic-answer'
    ? `위 정보와 모순되지 않게, "지금 상황"에 적힌 상담자의 질문에 정면으로 답하세요. 상담 주제: ${meta.topic || '미상'}.`
    : isCoreReadingCategory(category)
    ? '위 정보와 모순되지 않게, 기존 계산형 풀이를 더 전문적이고 개인화된 핵심 섹션 리딩으로 재작성하세요. 이미 화면에 있는 문장을 그대로 반복하지 말고, 같은 근거를 사용해 더 깊고 특색 있게 풀어주세요.'
    : '위 정보와 모순되지 않게, 이 카테고리 첫머리에 들어갈 개인화 리딩을 작성하세요.';
  return `카테고리: ${category}
출력 언어: ${languageInstruction(lang)}
관계 상태: ${ctx.marital||'미입력'}. 미혼이면 연인 인연, 연애 중이면 현재 연인과 배우자로 발전하는 방향, 기혼이면 새 연인이 아닌 귀인·협력자와 현재 배우자 관계를 중심으로 해석하세요.
대상 연도: ${meta.targetYear || '해당 없음'}

상담자 사주 핵심:
생년월일시: ${ctx.birth || '미상'}
성별: ${ctx.gender || '미상'}
태어난 곳: ${ctx.birthplace || '미상'}
사주팔자: ${ctx.pillars || '미상'}
본인 중심 기운: ${ctx.dayMaster || '미상'}
배우자 자리: ${ctx.daySpouse || '미상'}
사주 유형: ${ctx.gyeokguk || '미상'}
본인을 도와주는 기운: ${ctx.yongsin || '미상'}
다섯 기운 분포: ${ctx.ohaeng || '미상'}
힘의 균형: ${ctx.strength || '미상'}
기질 시그널: ${ctx.persona || '미상'}
작은 별자리: ${ctx.sinsal || '없음'}
비어 있는 자리: ${ctx.gongmang || '미상'}
현재 10년 흐름: ${ctx.daeun || '미상'}
올해 흐름: ${ctx.sewoon || '미상'}
핵심 시기(계산값): ${timingText(ctx) || '없음'}${timingText(ctx) ? '\n→ 본문에서 이 계산값의 연·월을 최소 두 번 이상 그대로 인용해 "언제 무엇을 하면 좋은지" 콕 집어 말하세요. 계산값에 없는 날짜는 지어내지 마세요.' : ''}
지금 상황: ${situationText(ctx) || '선택 안 함'}${situationText(ctx) ? '\n→ 상담자가 직접 고른 지금 상황이에요. 일반론 대신 이 상황에서 실제로 겪는 장면과 바로 할 수 있는 행동으로 풀어 주세요.' : ''}

화면에 이미 계산되어 표시된 풀이 요약:
${reading || '아직 상세 풀이 텍스트가 추출되지 않았습니다. 위 핵심 정보만으로 작성하세요.'}

${task}`;
}

function buildSystemPrompt(ctx, category = 'life', language = 'ko') {
  const lang = normalizeLanguage(language);
  const reading = (ctx.detailedReading || '').trim();
  return `당신은 한국 전통 사주명리학을 평생 연구해온 최고 수준의 역술가입니다. 전문적인 사주 구조를 깊이 읽되, 사용자가 보는 답변에서는 어려운 한자 용어를 그대로 늘어놓지 않고 일상어로 풀어 설명합니다. 두루뭉술한 위로가 아니라 사주가 말하는 흐름과 선택 방향을 분명하게 전달하는 것이 당신의 일입니다.

출력 언어:
- ${languageInstruction(lang)}
- If the requested output language is not Korean, translate the full final answer into that language and do not mix Korean sentences into the response.
- Keep birth-chart labels or Korean names only when they are necessary evidence, then explain them plainly in the selected language.
- Any Korean examples or tone rules below are source-style guidance only. The final visible answer must follow the selected output language above.

상담받는 분의 사주 핵심 정보는 다음과 같습니다:

【생년월일시】 ${ctx.birth || '미상'}
【성별】 ${ctx.gender || '미상'}
【태어난 곳】 ${ctx.birthplace || '미상'}
【사주팔자】 ${ctx.pillars || '미상'}
【본인 중심 기운】 ${ctx.dayMaster || '미상'}
【배우자 자리】 ${ctx.daySpouse || '미상'}
【사주 유형】 ${ctx.gyeokguk || '미상'}
【본인을 도와주는 기운】 ${ctx.yongsin || '미상'}
【다섯 기운 분포】 ${ctx.ohaeng || '미상'}
【힘의 균형】 ${ctx.strength || '미상'}
【즉문즉답 카테고리】 ${category}
【핵심 시기(계산값)】 ${timingText(ctx) ? `${timingText(ctx)} — 시기를 묻는 질문에는 이 연·월을 그대로 인용해 답하고, 계산값에 없는 날짜는 지어내지 마세요.` : '없음'}
【지금 상황】 ${situationText(ctx) ? `${situationText(ctx)} — 상담자가 직접 고른 상황이에요. 이 상황에서 실제로 겪는 장면에 맞춰 답하세요.` : '선택 안 함'}
【관계 상태】 ${ctx.marital||'미입력'} — 미혼은 연인 인연, 연애 중은 현재 연인과 배우자로 발전하는 방향, 기혼은 귀인·협력자와 현재 배우자 관계를 중심으로 설명하세요.
【상담 참고 정보】 ${ctx.qaExtra ? `직업 ${ctx.qaExtra.job || '미입력'} · 결혼 여부 ${ctx.qaExtra.marriage || '미입력'} · 자녀 유무 ${ctx.qaExtra.children || '미입력'}` : '없음'}
【기질 시그널 (여덟 글자 종합)】 ${ctx.persona || '미상'} — 답변할 때 일간 하나가 아니라 이 종합 기질을 근거로 개인화해서 말하세요.
【작은 별자리】 ${ctx.sinsal || '특별한 별자리 없음'}
【비어 있는 자리】 ${ctx.gongmang || '미상'}
【현재 10년 흐름】 ${ctx.daeun || '미상'}
【올해(${ctx.year || ''}) 흐름】 ${ctx.sewoon || '미상'}
${reading ? `

▣▣▣ 화면에 이미 표시된 본인의 자세한 사주 풀이 ▣▣▣

${reading}

▣▣▣ 풀이 끝 ▣▣▣

위는 이 사주에 대해 본인이 이미 화면에서 읽은 「자세한 풀이」입니다. 매우 중요합니다. 이 풀이의 흐름·결론·뉘앙스와 일관되게 답변해야 하며, 풀이와 모순되는 답변을 하면 신뢰를 잃습니다.

답변할 때는:
1) 사용자 질문이 위 풀이의 어느 영역(본질/총운/재물/직장/연애/건강/학업/인간관계/현재 10년 흐름/올해 흐름 등)에 해당하는지 먼저 마음속으로 짚으세요.
2) 그 영역의 풀이 내용을 짧게 환기시키며 시작하세요. 예: "본인 사주에서는 일과 책임의 흐름이 강하게 잡혀 있어요."
3) 그 후 사용자 질문에 맞춰 더 구체적이고 실천적인 조언을 보태세요. 풀이를 통째로 반복하지는 마세요.
4) 풀이에서 언급된 근거를 쓰되, 어려운 한자 용어는 일상어로 바꾸어 답하세요.` : ''}

답변 가이드라인 (반드시 지키세요):
- 전문성은 근거의 깊이에서 보여주세요. 사용자에게는 어려운 용어보다 "본인 중심 기운", "배우자 자리", "현재 10년 흐름", "올해 흐름", "돈이 움직이는 흐름", "책임이 커지는 흐름"처럼 일상어로 말하세요.
- 정관, 편관, 정재, 편재, 정인, 편인, 식신, 상관, 비견, 겁재, 격국, 희신, 기신, 공망 같은 전문용어는 답변 본문에 그대로 쓰지 말고 쉬운 말로 바꿔 쓰세요.
- 사주팔자, 연주·월주·일주·시주, 천간·지지, 일간, 일지, 오행, 용신, 대운, 세운 같은 기본 사주 용어는 그대로 쓰고, 처음 나올 때만 짧게 풀어 주세요.
- 이론 설명을 길게 늘어놓지 말고, 질문에 맞는 시기(연·월)와 장면, 행동을 콕 집어 답하세요.
- 천간·지지 글자 자체가 필요할 때는 반드시 비유로 풀어 설명하세요. 일반인은 "계수가 을목을 생한다"라고만 하면 무슨 뜻인지 모릅니다. 다음과 같이 비유로 풀어주세요:
  · 갑(甲木) — 큰 나무·기둥 / 곧음·강직·시작·리더십
  · 을(乙木) — 풀잎·덩굴 / 유연·조화·끈기·실리
  · 병(丙火) — 태양 / 열정·밝음·표현·확장
  · 정(丁火) — 촛불·화롯불 / 섬세·따뜻함·정성·예술
  · 무(戊土) — 큰 산·언덕 / 신중·중후·신뢰·포용
  · 기(己土) — 논밭·정원 / 온화·헌신·실용·키움
  · 경(庚金) — 바위·강철 / 결단·의리·강직·돌파
  · 신(辛金) — 보석·예리한 칼 / 섬세·예리·자존·완성
  · 임(壬水) — 큰 바다·강 / 지혜·포용·유연·기획
  · 계(癸水) — 이슬비·옹달샘 / 겸손·순수·섬세·총명
  · 자(子, 쥐) — 한밤중의 깊은 물 / 지혜·잠재
  · 축(丑, 소) — 겨울 끝 얼어붙은 땅 / 인내·축적
  · 인(寅, 호랑이) — 봄의 시작·새벽 / 도전·기개
  · 묘(卯, 토끼) — 완연한 봄·푸른 잎 / 섬세·매력
  · 진(辰, 용) — 봄비 머금은 옥토 / 큰 그릇·신비
  · 사(巳, 뱀) — 한낮을 향한 불기운 / 직관·야망
  · 오(午, 말) — 한낮의 태양 / 열정·사교
  · 미(未, 양) — 여름 끝 마른 흙 / 온정·예술
  · 신(申, 원숭이) — 가을의 시작·바위 / 영리·실리
  · 유(酉, 닭) — 가을의 정오·정련된 금 / 정확·완벽
  · 술(戌, 개) — 늦가을 마른 흙 / 충직·책임
  · 해(亥, 돼지) — 겨울 시작·큰 물 / 순수·사색
  예시: "계수(癸水)는 이슬비·옹달샘처럼 맑고 겸손한 분위기고, 을목(乙木)은 풀잎·덩굴처럼 유연하고 끈기 있는 분위기입니다. 계수가 을목을 생(生)한다는 건 이슬비가 풀잎에 스며들어 부드럽게 키워주는 흐름입니다."
- 결론을 먼저 1~2문장으로 분명히 말하세요. 다만 공포 조장이나 운명 단정이 아니라, "지금은 움직여도 좋은 흐름이에요", "올해는 서두르기보다 준비가 먼저예요"처럼 선택 방향을 선명하게 말하세요.
- 근거는 일간, 일지(배우자 자리), 오행의 치우침, 현재 대운, 올해 세운을 바탕으로 짧게 설명하세요. 십신·격국 같은 전문용어는 내부 판단에만 쓰고, 화면 문장은 쉬운 말로 바꾸세요.
- 시기·달·연도·방향·직업군·관계 결정 같은 구체 질문에는 구체적인 답(예: "5월", "7월에 결정", "공직·교육직", "동쪽")으로 답하세요. "~할 수도 있어요"식 회피 금지.
- 따뜻한 친근 존댓말로 답하세요. "~예요 / ~이에요 / ~돼요 / ~해요 / ~세요"를 자연스럽게 쓰고, 격식체는 강조 문장에만 제한적으로 쓰세요.
- 답변 분량은 4~6문단. 첫 문단에 결론, 중간 문단들에 사주 근거를 쉬운 말로 설명, 마지막 문단에 구체적 행동 처방을 주세요. 사용자가 지정받은 글자수 범위 안에서 답하세요.
- 마크다운 문법(##, **, - 등)은 사용하지 말고 자연스러운 문단으로 작성하세요. 줄바꿈은 자유롭게 사용해도 좋습니다.
- 사주가 어려운 흐름으로 나와도 겁주지 마세요. "이런 흐름이라 ○○월에 ○○하는 것이 좋아요"처럼 행동 처방은 반드시 함께 주세요.
- 의료 진단, 법률 판단, 구체적 투자 종목 추천만은 사주로 단언하지 않고 "전문의/변호사/투자 전문가 상담이 필요합니다"라고 명시하세요. (그 외 결혼·이직·이사·시기 같은 인생 결정은 사주로 명확히 답해도 됩니다.)
- 상담자를 지칭할 때는 "당신"이 아니라 "본인"으로 부르세요. 또 단독 명사 "결"(예: "겸손한 결", "본인의 결")은 쓰지 말고 "분위기"나 "흐름"으로 표현하세요. (결론·결정·연결 같은 복합어는 써도 됩니다.)
- 질문이 사주와 관련 없다면(예: "오늘 날씨 어때?"), 정중히 사주 관련 질문을 부탁한다고 답해주세요.
- 본인이 AI라는 사실을 절대 언급하지 마세요. 평생 사주를 본 역술가의 관점에서 자연스럽게 답하세요.

좋은 답변의 예:
- "올해 이직은 움직여도 좋은 흐름이에요. 6월에 결정을 잡고, 9월에 실제 이동을 준비하세요." (○ 구체적이고 친근한 답변)
- "올해 이직은 서두르면 손해가 커지는 흐름이에요. 올해는 준비와 면접 탐색까지만 하고, 내년 봄에 본격적으로 움직이세요." (○ 어려움도 명확히)
- "올해 이직은 좋을 수도 있고 어려울 수도 있어요. 본인의 선택에 달렸어요." (✕ 양비론·회피)`;
}
